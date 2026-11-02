// Names and quantity rules come from Fast Bundle's storefront offers, never a
// merchant-maintained variant/quantity table. JSON contains presentation only.
let mappingPromise;
let resolvedMapping;
const productRequests = new Map();
const offerCacheMs = 30000;
const selectedOptionSelector = '[data-rbrselector^="discountInfo"][data-rbrselector$="RadioButton"]:checked';

export function loadBundleLabels() {
  mappingPromise ??= fetch(window.themeVariables.bundleLabels.url, { cache: "no-cache" }).then(async (response) => {
    if (!response.ok) throw new Error("Unable to load bundle label settings");
    const settings = await response.json();
    return (resolvedMapping = { ...settings, variants: {}, products: {} });
  }).catch((error) => {
    mappingPromise = undefined;
    throw error;
  });
  return mappingPromise;
}

// This is the endpoint used by the installed Fast Bundle SDK's getBundles().
export function bundleOffersUrl(productId, handle) {
  const shop = Shopify.shop || window.FastBundleConf?.domain;
  if (!shop) throw new Error("Shop identity is unavailable for bundle discovery");
  const query = new URLSearchParams({
    shop, product_id: String(productId), url: handle ? `${Shopify.routes.root}products/${handle}` : `${Shopify.routes.root}cart`,
    is_preview: "false", lang: Shopify.locale || document.documentElement.lang || "en"
  });
  return `https://api.fastbundle.co/v3/product-bundles/?${query}`;
}

export function offersForProduct(bundles, productId) {
  if (!Array.isArray(bundles)) throw new Error("Invalid Fast Bundle offer response");
  const variants = {};
  for (const bundle of bundles) {
    // Quantity selectors use the app's bogo/volume model. Other bundle types
    // don't describe a per-product quantity selection and must stay untouched.
    if (bundle.enabled === false || bundle.type !== "bogo") continue;
    const item = bundle.items?.find((entry) => String(entry.id) === String(productId));
    if (!item || item.is_add_on) continue;
    const discounts = [...(bundle.discounts || [])].sort((a, b) => a.quantity - b.quantity);
    const rules = discounts.map((offer, index) => ({
      ...offer, bundleId: String(bundle.id), productId: String(productId), productTitle: item.title,
      min: Number(offer.quantity),
      max: offer.max_quantity == null || (index === discounts.length - 1 && bundle.has_quantity_cap === false)
        ? Infinity : Number(offer.max_quantity)
    })).filter((offer) => Number.isSafeInteger(offer.min) && offer.min > 0 && offer.max >= offer.min &&
      typeof offer.description === "string" && offer.description.trim());
    const excluded = new Set((item.excluded_variants || []).map((value) => String(value.id ?? value)));
    for (const variant of item.variants || []) {
      if (excluded.has(String(variant.id))) continue;
      (variants[String(variant.id)] ??= []).push(...rules);
    }
  }
  return variants;
}

async function discoverProduct(mapping, productId, handle, refresh = false) {
  if (!productId) return;
  const key = `${Shopify.locale || ""}:${productId}`;
  let request = productRequests.get(key);
  if (!request || (refresh || Date.now() - request.time > offerCacheMs) && !request.pending) {
    request = { time: Date.now(), pending: true };
    request.promise = (async () => {
      const response = await fetch(bundleOffersUrl(productId, handle), {
        cache: "no-store", credentials: "omit", headers: { "FB-SHOP-DOMAIN": Shopify.shop || window.FastBundleConf?.domain }
      });
      if (!response.ok) throw new Error(`Unable to discover Fast Bundle offers (${response.status})`);
      const variants = offersForProduct(await response.json(), productId);
      for (const variantId of mapping.products[productId] || []) delete mapping.variants[variantId];
      Object.assign(mapping.variants, variants);
      mapping.products[productId] = Object.keys(variants);
    })().catch((error) => {
      productRequests.delete(key);
      throw error;
    }).finally(() => { request.pending = false; });
    productRequests.set(key, request);
  }
  await request.promise;
}

export function offerLabel(offer, quantity) {
  if (!offer) return "";
  const values = {
    quantity, discount: offer.value, x: quantity, y: offer.value,
    "product name": offer.free_gift?.product?.title || offer.productTitle || "",
    product_name: offer.free_gift?.product?.title || offer.productTitle || ""
  };
  return offer.description.replace(/\{(quantity|discount|x|y|product name|product_name)\}/g, (_, key) => values[key]).trim();
}

export function bundleLabelFor(mapping, variantId, quantity) {
  const count = Number(quantity);
  if (!Number.isSafeInteger(count) || count < 1) return "";
  const offers = (mapping.variants[String(variantId)] || []).filter((offer) => count >= offer.min && count <= offer.max);
  if (new Set(offers.map((offer) => offer.bundleId)).size > 1) {
    throw new Error("Multiple Fast Bundle quantity offers apply to the same product");
  }
  const offer = offers.sort((a, b) => b.min - a.min)[0];
  return offerLabel(offer, count);
}

function productForForm(form) {
  const productId = form.elements.namedItem("product-id")?.value;
  // Product forms include their product ID on quick-buy/recommendation cards too.
  return { productId, variantId: form.elements.namedItem("id")?.value };
}

async function discoverForm(mapping, form) {
  const { productId, variantId } = productForForm(form);
  if (!productId || !variantId) return;
  const handle = String(window.FastBundleConf?.pid) === String(productId)
    ? window.location.pathname.match(/\/products\/([^/]+)/)?.[1] : undefined;
  const selected = form.closest(".shopify-section")?.querySelector(selectedOptionSelector);
  const unknownSelection = selected &&
    !(mapping.variants[String(variantId)] || []).some((offer) => String(offer.id) === String(selected.id));
  return discoverProduct(mapping, productId, handle, Boolean(unknownSelection));
}

export function bundleLabelForForm(mapping, form) {
  const variantId = form.elements.namedItem("id")?.value;
  const options = mapping.variants[String(variantId)];
  if (!options?.length) return "";
  const scope = form.closest(".shopify-section") || form;
  const selected = scope.querySelector(selectedOptionSelector);
  if (selected) {
    const offer = options.find((entry) => String(entry.id) === String(selected.id));
    if (!offer) throw new Error("Selected Fast Bundle option was not discovered");
    const description = selected.closest('[data-rbrselector^="discountInfo"]:not([data-rbrselector$="RadioButton"]):not([data-rbrselector$="Radio"])')
      ?.querySelector('[data-rbrselector^="discountInfo"][data-rbrselector$="Description"] span')?.textContent.trim();
    // Preserve the app's rendered/localized wording, including warehouse gifts.
    return description || offerLabel(offer, offer.min);
  }
  return bundleLabelFor(mapping, variantId, form.elements.namedItem("quantity")?.value || 1);
}

function updateBundleForm(form, mapping) {
  const name = bundleLabelForForm(mapping, form);
  let input = form.querySelector("input[data-bundle-property]");
  if (!name) { input?.remove(); return ""; }
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
  const mapping = await loadBundleLabels();
  await discoverForm(mapping, form);
  return updateBundleForm(form, mapping);
}

// The app can handle a button click before the theme's submit handler. If the
// catalog is still loading, resume that same click only after the property exists.
const preparedClicks = new WeakSet();
const pendingClicks = new WeakSet();
document.addEventListener("click", async (event) => {
  const button = event.target.closest('button[type="submit"], input[type="submit"]');
  const form = button?.form;
  if (!form?.matches('form[action*="/cart/add"]') || preparedClicks.has(button)) return;
  if (pendingClicks.has(button)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  const { productId } = productForForm(form);
  const selected = form.closest(".shopify-section")?.querySelector(selectedOptionSelector);
  const variantId = form.elements.namedItem("id")?.value;
  const knownSelection = !selected || resolvedMapping?.variants[String(variantId)]?.some((offer) => String(offer.id) === String(selected.id));
  if (!productId || resolvedMapping?.products[productId] && knownSelection) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  pendingClicks.add(button);
  try {
    await prepareBundleForm(form);
    preparedClicks.add(button);
    button.click();
  } catch (error) {
    await showBundlePropertyError(error);
  } finally {
    preparedClicks.delete(button);
    pendingClicks.delete(button);
  }
}, { capture: true });

document.addEventListener("formdata", (event) => {
  if (!resolvedMapping || !event.target.matches('form[action*="/cart/add"]')) return;
  const name = updateBundleForm(event.target, resolvedMapping);
  if (name) event.formData.set(`properties[${resolvedMapping.propertyName}]`, name);
  else event.formData.delete(`properties[${resolvedMapping.propertyName}]`);
});
if (typeof MutationObserver !== "undefined") {
  let scheduled = false;
  const refreshForms = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(async () => {
      scheduled = false;
      const forms = [...document.querySelectorAll('form[action*="/cart/add"]')];
      await Promise.allSettled(forms.map((form) => prepareBundleForm(form)));
    });
  };
  refreshForms();
  new MutationObserver(refreshForms).observe(document.documentElement, {
    childList: true, subtree: true, attributes: true, attributeFilter: ["checked"]
  });
  for (const type of ["click", "change", "variant:change"]) document.addEventListener(type, refreshForms, { capture: true });
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

// The app can expose one package as several price allocations. Resolve its name
// from total product quantity, never from the size of an individual allocation.
function baseGroupKey(item, mapping) {
  const properties = { ...item.properties };
  delete properties[mapping.propertyName];
  return JSON.stringify([item.product_id || item.variant_id, sellingPlanId(item),
    Object.entries(properties).sort(([a], [b]) => a.localeCompare(b))]);
}

export function namesForCart(cart, mapping) {
  const groups = new Map();
  for (const item of cart.items) {
    if (!mapping.variants[String(item.variant_id)]?.length) continue;
    const key = baseGroupKey(item, mapping);
    groups.set(key, (groups.get(key) || 0) + item.quantity);
  }
  return cart.items.map((item) => {
    if (mapping.variants[String(item.variant_id)]?.length) {
      return bundleLabelFor(mapping, item.variant_id, groups.get(baseGroupKey(item, mapping)));
    }
    // A successfully discovered product with no current offer must not keep an
    // obsolete warehouse instruction after the merchant removes that offer.
    return mapping.products[item.product_id] && item.properties?.[mapping.propertyName] ? "" : undefined;
  });
}

export function synchronizeBundleProperties(cartContent, { refreshOffers = false } = {}) {
  const run = async () => {
    synchronizing = true;
    setBusy();
    let loading = false;
    try {
      const mapping = await loadBundleLabels();
      let cart = await readCart();
      const products = new Map(cart.items.map((item) => [item.product_id, item]));
      await Promise.all([...products.values()].map((item) =>
        discoverProduct(mapping, item.product_id, item.handle, refreshOffers)));
      let changed = false;
      const seen = new Set();
      for (let attempt = 0; attempt < 50; attempt++) {
        const names = namesForCart(cart, mapping);
        const index = cart.items.findIndex((item, i) => names[i] !== undefined &&
          (item.properties?.[mapping.propertyName] || "") !== names[i]);
        if (index < 0) {
          if (cartContent?.sections) {
            if (changed) {
              const sections = Object.keys(cartContent.sections).join(",");
              const response = await fetch(`${Shopify.routes.root}?sections=${encodeURIComponent(sections)}`, { cache: "no-store" });
              if (!response.ok) throw new Error("Unable to refresh cart sections");
              cart.sections = await response.json();
            } else cart.sections = cartContent.sections;
          }
          return { cart, changed };
        }
        if (typeof window.detectBundleDiscounts !== "function") throw new Error("Fast Bundle discount recalculation is not ready");
        if (!loading) {
          loading = true;
          document.dispatchEvent(new CustomEvent("theme:loading:start", { bubbles: true }));
        }
        const state = JSON.stringify(cart.items.map((item) => [item.key, item.quantity, item.properties]));
        if (seen.has(state)) throw new Error("Bundle property updates did not converge");
        seen.add(state);
        const item = cart.items[index];
        await postCart("change", { line: index + 1, quantity: item.quantity,
          properties: { ...item.properties, [mapping.propertyName]: names[index] } });
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
    await synchronizeBundleProperties(undefined, { refreshOffers: true });
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
    await synchronizeBundleProperties(undefined, { refreshOffers: true });
    submittingForms.add(form);
    form.requestSubmit(submitter);
  } catch (error) {
    await showBundlePropertyError(error);
  } finally {
    submittingForms.delete(form);
    submitter.removeAttribute("aria-busy");
  }
}, { capture: true });
