// Variant IDs explicitly opt products into full, quantity-specific bundle names.
let mappingPromise;
let resolvedMapping;

export function loadBundleLabels() {
  mappingPromise ??= fetch(window.themeVariables.bundleLabels.url, { cache: "no-cache" }).then((response) => {
    if (!response.ok) throw new Error("Unable to load bundle label mapping");
    return response.json().then((mapping) => (resolvedMapping = mapping));
  }).catch((error) => {
    mappingPromise = undefined;
    throw error;
  });
  return mappingPromise;
}

export function bundleLabelFor(mapping, variantId, quantity) {
  const options = mapping.variants[String(variantId)];
  const count = Number(quantity);
  if (!options || !Number.isSafeInteger(count) || count < 1) return "";
  if (typeof options[String(count)] === "string") return options[String(count)];

  // An explicit "5+" entry applies to five or more units. Exact matches win;
  // otherwise choose the highest configured threshold that the line qualifies for.
  const threshold = Object.keys(options)
    .filter((key) => /^[1-9]\d*\+$/.test(key) && Number(key.slice(0, -1)) <= count)
    .sort((a, b) => Number(b.slice(0, -1)) - Number(a.slice(0, -1)))[0];
  return typeof options[threshold] === "string" ? options[threshold] : "";
}

export function bundleLabelForForm(mapping, form) {
  const variantId = form.elements.namedItem("id")?.value;
  const options = mapping.variants[String(variantId)];
  if (!options) return "";
  const scope = form.closest(".shopify-section") || form;
  const selected = scope.querySelector('[data-rbrselector="discountInfoV3RadioButton"]:checked');
  if (selected) {
    const description = selected.closest('[data-rbrselector="discountInfoV3"]')
      ?.querySelector('[data-rbrselector="discountInfoV3Description"] span')?.textContent.trim();
    // Resolve the actual app selection against the configured full names. A
    // quantity field can still say 1 when the app will expand it into a bundle.
    return Object.values(options).find((name) => name === description) || "";
  }
  return bundleLabelFor(mapping, variantId, form.elements.namedItem("quantity")?.value || 1);
}

function updateBundleForm(form, mapping) {
  const name = bundleLabelForForm(mapping, form);
  let input = form.querySelector("input[data-bundle-property]");
  if (!name) {
    input?.remove();
    return "";
  }
  if (!input) {
    input = document.createElement("input");
    input.type = "hidden";
    input.setAttribute("data-bundle-property", "");
    form.append(input);
  }
  input.name = `properties[${mapping.propertyName}]`;
  if (input.value !== name) input.value = name;
  return name;
}

export async function prepareBundleForm(form) {
  return updateBundleForm(form, await loadBundleLabels());
}

// Seed real form properties on load and app rerenders. The formdata event also
// resolves the live selection synchronously, before Fast Bundle intercepts it.
document.addEventListener("formdata", (event) => {
  if (!resolvedMapping || !event.target.matches('form[action*="/cart/add"]')) return;
  const name = updateBundleForm(event.target, resolvedMapping);
  if (name) event.formData.set(`properties[${resolvedMapping.propertyName}]`, name);
});
if (typeof MutationObserver !== "undefined") {
  loadBundleLabels().then((mapping) => {
    const refreshForms = () => document.querySelectorAll('form[action*="/cart/add"]')
      .forEach((form) => updateBundleForm(form, mapping));
    refreshForms();
    new MutationObserver(refreshForms).observe(document.documentElement, {
      childList: true, subtree: true, attributes: true, attributeFilter: ["checked"]
    });
    for (const type of ["click", "change", "variant:change"]) {
      document.addEventListener(type, () => queueMicrotask(refreshForms), { capture: true });
    }
  }).catch(console.error);
}

// Serialize property writes and read the live cart again after every update.
let syncQueue = Promise.resolve();
let synchronizing = false;
let updating = false;
let updatePromise = Promise.resolve();

function setBusy() {
  document.documentElement.toggleAttribute("data-bundle-cart-busy", synchronizing || updating);
}

export function runBundleCartUpdate(action) {
  if (updating) return;
  updating = true;
  setBusy();
  updatePromise = Promise.resolve().then(action).finally(() => {
    updating = false;
    setBusy();
  });
  return updatePromise;
}

// Ignore further quantity edits while a previous cart transaction is settling.
for (const type of ["click", "change"]) {
  document.addEventListener(type, (event) => {
    if (!(synchronizing || updating) || !event.target.closest('line-item-quantity, product-form [type="submit"]')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (type === "change") event.target.closest("quantity-selector")?.restoreDefaultValue();
  }, { capture: true });
}

async function readCart() {
  const response = await fetch(`${Shopify.routes.root}cart.js`, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to read cart");
  return response.json();
}

async function postCart(path, body, headers = {}) {
  const response = await fetch(`${Shopify.routes.root}cart/${path}.js`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Unable to update bundle property (${response.status})`);
  return response.json();
}

function sellingPlanId(item) {
  return item.selling_plan_allocation?.selling_plan?.id;
}

function sameUnderlyingLine(a, b) {
  return a.variant_id === b.variant_id && sellingPlanId(a) === sellingPlanId(b) &&
    JSON.stringify(a.properties || {}) === JSON.stringify(b.properties || {});
}

function baseGroupKey(item, mapping) {
  const properties = { ...item.properties };
  delete properties[mapping.propertyName];
  return JSON.stringify([item.variant_id, sellingPlanId(item), Object.entries(properties).sort(([a], [b]) => a.localeCompare(b))]);
}

function priceBuckets(cart, item, mapping) {
  const key = baseGroupKey(item, mapping), buckets = new Map();
  for (const line of cart.items.filter((entry) => baseGroupKey(entry, mapping) === key)) {
    const price = line.final_price ?? line.discounted_price ?? line.price;
    const bucket = buckets.get(price) || { item: line, price, quantity: 0, count: 0 };
    bucket.quantity += line.quantity;
    bucket.count++;
    buckets.set(price, bucket);
  }
  return [...buckets.values()];
}

function fragmentedPriceGroup(cart, mapping) {
  return cart.items.find((item) => mapping.variants[String(item.variant_id)] && priceBuckets(cart, item, mapping)
    .some((bucket) => bucket.count > 1 && bundleLabelFor(mapping, item.variant_id, bucket.quantity)));
}

// A discount may expose multiple price allocations sharing one properties object.
// Rebuild only that variant/plan/customization group as distinct saved lines. Add
// the full-price allocation first so the discounted package stays first in cart.
async function separateDiscountAllocations(cart, item, mapping) {
  const groupKey = baseGroupKey(item, mapping);
  const groupItems = (state) => state.items.filter((line) => baseGroupKey(line, mapping) === groupKey);
  const groupQuantity = (state) => groupItems(state).reduce((sum, line) => sum + line.quantity, 0);
  const quantityBefore = groupQuantity(cart);
  const buckets = priceBuckets(cart, item, mapping).sort((a, b) => b.price - a.price);
  const add = (entry) => postCart("add", { items: [entry] }, { "X-Fastbundle-Request": "yes" });
  const sellingPlan = sellingPlanId(item);
  const asEntry = (quantity, properties) => ({ id: item.variant_id, quantity, properties, ...(sellingPlan ? { selling_plan: sellingPlan } : {}) });
  try {
    let current = cart;
    for (let attempt = 0; groupItems(current).length; attempt++) {
      if (attempt >= 30) throw new Error("Unable to separate discount allocations");
      const before = groupQuantity(current);
      await postCart("change", { id: groupItems(current)[0].key, quantity: 0 });
      current = await readCart();
      if (groupQuantity(current) >= before) throw new Error("Bundle allocation removal did not reduce quantity");
    }
    for (const bucket of buckets) {
      await add(asEntry(bucket.quantity, {
        ...bucket.item.properties,
        [mapping.propertyName]: bundleLabelFor(mapping, item.variant_id, bucket.quantity)
      }));
    }
    if (groupQuantity(await readCart()) !== quantityBefore) throw new Error("Bundle line quantities changed unexpectedly");
  } catch (error) {
    // Read first: a failed/ambiguous response must not blindly add duplicate units.
    const missing = quantityBefore - groupQuantity(await readCart());
    if (missing > 0) await add(asEntry(missing, { ...item.properties }));
    await window.detectBundleDiscounts();
    throw error;
  }
}

export function synchronizeBundleProperties(cartContent) {
  const run = async () => {
    synchronizing = true;
    setBusy();
    let loading = false;
    try {
      const mapping = await loadBundleLabels();
      let cart = await readCart();
      if (!cart.items.some((item) => mapping.variants[String(item.variant_id)])) {
        if (cartContent?.sections) cart.sections = cartContent.sections;
        return { cart, changed: false };
      }
      const needsUpdate = cart.items.some((item) => mapping.variants[String(item.variant_id)] &&
        (item.properties?.[mapping.propertyName] || "") !== bundleLabelFor(mapping, item.variant_id, item.quantity));
      if (!needsUpdate && !fragmentedPriceGroup(cart, mapping)) {
        if (cartContent?.sections) cart.sections = cartContent.sections;
        return { cart, changed: false };
      }
      if (typeof window.detectBundleDiscounts !== "function") {
        throw new Error("Fast Bundle discount recalculation is not ready");
      }
      loading = true;
      document.dispatchEvent(new CustomEvent("theme:loading:start", { bubbles: true }));
      // This is the same recalculation entry point called by Fast Bundle's widget.
      await window.detectBundleDiscounts();
      cart = await readCart();
      let changed = false;
      const seen = new Set();
      for (let attempt = 0; attempt < 30; attempt++) {
        const index = cart.items.findIndex((item) => mapping.variants[String(item.variant_id)] &&
          (item.properties?.[mapping.propertyName] || "") !== bundleLabelFor(mapping, item.variant_id, item.quantity));
        const fragmented = fragmentedPriceGroup(cart, mapping);
        if (index < 0 && !fragmented) {
          if (cartContent?.sections) {
            const sections = Object.keys(cartContent.sections).join(",");
            const response = await fetch(`${Shopify.routes.root}?sections=${encodeURIComponent(sections)}`, { cache: "no-store" });
            if (!response.ok) throw new Error("Unable to refresh cart sections");
            cart.sections = await response.json();
          }
          return { cart, changed };
        }
        const state = JSON.stringify(cart.items.map((item) => [item.key, item.quantity, item.properties]));
        if (seen.has(state)) throw new Error("Bundle property updates did not converge");
        seen.add(state);
        const item = fragmented || cart.items[index];
        const name = bundleLabelFor(mapping, item.variant_id, item.quantity);
        const properties = { ...item.properties, [mapping.propertyName]: name };
        const sharedProperties = cart.items.some((other) => other !== item && sameUnderlyingLine(item, other) &&
          bundleLabelFor(mapping, other.variant_id, other.quantity) !== name);
        if (sharedProperties || fragmented) {
          await separateDiscountAllocations(cart, item, mapping);
        } else {
          await postCart("change", { line: index + 1, quantity: item.quantity, properties });
        }
        await window.detectBundleDiscounts();
        cart = await readCart();
        changed = true;
      }
      throw new Error("Bundle property updates exceeded their limit");
    } finally {
      if (loading) document.dispatchEvent(new CustomEvent("theme:loading:end", { bubbles: true }));
      synchronizing = false;
      setBusy();
    }
  };
  syncQueue = syncQueue.catch(() => {}).then(run);
  return syncQueue;
}

export async function showBundlePropertyError(error) {
  console.error(error);
  const mapping = await loadBundleLabels();
  window.alert(mapping.errorMessage);
}

// Catch app-originated additions and rerenders as well as restored carts.
let refreshTimer;
function schedulePropertySync() {
  if (synchronizing || updating) return;
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    if (synchronizing || updating) return;
    try {
      const result = await synchronizeBundleProperties();
      if (result.changed) {
        if (window.themeVariables.settings.pageType === "cart") window.location.reload();
        else document.dispatchEvent(new CustomEvent("cart:refresh"));
      }
    } catch (error) {
      console.error(error);
    }
  }, 300);
}
document.addEventListener("cart-drawer:refreshed", schedulePropertySync);
window.addEventListener("load", schedulePropertySync);

// The theme's normal checkout must wait for properties and discounts to settle.
const submittingForms = new WeakSet();
const approvedCheckoutClicks = new WeakSet();
document.addEventListener("click", async (event) => {
  const submitter = event.target.closest('[name="checkout"]');
  if (!submitter || approvedCheckoutClicks.has(submitter)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (submitter.getAttribute("aria-busy") === "true") return;
  submitter.setAttribute("aria-busy", "true");
  try {
    await updatePromise.catch(() => {});
    await synchronizeBundleProperties();
    approvedCheckoutClicks.add(submitter);
    if (submitter.form) submittingForms.add(submitter.form);
    // Resume the app's original click/checkout handling after persistence.
    submitter.click();
  } catch (error) {
    await showBundlePropertyError(error);
  } finally {
    approvedCheckoutClicks.delete(submitter);
    if (submitter.form) submittingForms.delete(submitter.form);
    submitter.removeAttribute("aria-busy");
  }
}, { capture: true });
document.addEventListener("submit", async (event) => {
  if (event.submitter?.name !== "checkout" || submittingForms.has(event.target)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const form = event.target, submitter = event.submitter;
  submitter.setAttribute("aria-busy", "true");
  try {
    await updatePromise.catch(() => {});
    await synchronizeBundleProperties();
    submittingForms.add(form);
    form.requestSubmit(submitter);
  } catch (error) {
    await showBundlePropertyError(error);
  } finally {
    submittingForms.delete(form);
    submitter.removeAttribute("aria-busy");
  }
}, { capture: true });
