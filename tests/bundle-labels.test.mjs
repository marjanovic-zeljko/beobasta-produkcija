import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const settings = JSON.parse(fs.readFileSync(new URL("../assets/bundle-labels.json", import.meta.url)));
const fixtures = JSON.parse(fs.readFileSync(new URL("./fixtures/fast-bundle-offers.json", import.meta.url)));
let liveOffers = structuredClone(fixtures), lines = [], failDiscovery = false, failChange = false;
let requests = [], listeners = {};
globalThis.document = {
  documentElement: { lang: "en", toggleAttribute() {} },
  addEventListener(name, callback) { (listeners[name] ??= []).push(callback); }, dispatchEvent() {}
};
globalThis.window = {
  themeVariables: { bundleLabels: { url: "/settings.json" }, settings: {} },
  location: { pathname: "/cart" }, addEventListener() {}, async detectBundleDiscounts() {}
};
globalThis.Shopify = { shop: "beobasta.myshopify.com", locale: "en", routes: { root: "/" } };

function view() {
  return { items: structuredClone(lines), total_price: lines.reduce((sum, item) => sum + item.quantity * item.final_price, 0) };
}
globalThis.fetch = async (url, options = {}) => {
  requests.push({ url, options });
  if (url === "/settings.json") return { ok: true, json: async () => settings };
  if (String(url).startsWith("https://api.fastbundle.co/")) {
    if (failDiscovery) { failDiscovery = false; return { ok: false, status: 503 }; }
    const productId = new URL(url).searchParams.get("product_id");
    return { ok: true, json: async () => structuredClone(liveOffers.find((entry) => entry.productId === productId)?.bundles || []) };
  }
  if (url === "/cart.js") return { ok: true, json: async () => view() };
  if (url === "/?sections=drawer") return { ok: true, json: async () => ({ drawer: "Fresh property HTML" }) };
  if (url !== "/cart/change.js") throw new Error(`Unexpected request ${url}`);
  if (failChange) { failChange = false; return { ok: false, status: 422 }; }
  const body = JSON.parse(options.body);
  const item = lines[body.line - 1];
  assert.equal(body.quantity, item.quantity, "Property persistence must not change units");
  // Model Shopify allocations that share a single underlying properties object.
  for (const other of lines) if (other.backing === item.backing) other.properties = structuredClone(body.properties);
  return { ok: true, json: async () => view() };
};
const api = await import("../assets/bundle-labels.js");
const teaId = 46782280401140;
const strawberryId = 47143144915188;
const productId = "8985013453044";
const mapping = () => ({ ...settings, products: {}, variants: Object.assign({}, ...fixtures.map((entry) => api.offersForProduct(entry.bundles, entry.productId))) });
const line = (qty, properties = {}, extra = {}) => ({ key: `line-${Math.random()}`, backing: "tea", product_id: Number(productId), handle: "caj-cistac", variant_id: teaId, quantity: qty, properties, final_price: 99000, ...extra });
const refresh = () => api.synchronizeBundleProperties(undefined, { refreshOffers: true });

// Fixtures are public storefront offer fields captured on 2026-11-02, rather
// than a second manually maintained list used by production code.
test("discovers all real tea/strawberry options and formats app templates", () => {
  const m = mapping();
  assert.equal(api.bundleLabelFor(m, teaId, 1), "1 čaj Čistač (21 dan)");
  for (const qty of [2, 3, 4]) assert.equal(api.bundleLabelFor(m, teaId, qty), `${qty} čaja`);
  assert.equal(api.bundleLabelFor(m, teaId, 5), "5 čajeva + 🎁 GRATIS TERMOS");
  assert.equal(api.bundleLabelFor(m, strawberryId, 6), "🔥 6 kilograma (ili više)");
  for (const qty of [0, -1, 1.5, NaN]) assert.equal(api.bundleLabelFor(m, teaId, qty), "");
  assert.equal(api.bundleLabelFor(m, "no-offer", 3), "");
});

test("real apricot offers are discovered without a production mapping entry", () => {
  const fixture = fixtures.find((entry) => entry.productId === "15431663550708");
  const variants = api.offersForProduct(fixture.bundles, fixture.productId);
  const variantId = Object.keys(variants)[0];
  for (const qty of [1, 2, 3, 4, 5, 6]) {
    assert.equal(api.bundleLabelFor({ variants }, variantId, qty), qty === 1 ? "1 kilogram" : `${qty} kilograma${qty >= 5 ? " (ili više)" : ""}`);
  }
});

test("new sixth/seventh options, renamed copy and unrelated product IDs need no JSON edits", () => {
  const bundle = structuredClone(fixtures[0].bundles[0]);
  bundle.items[0].id = 123456;
  bundle.items[0].variants = [{ id: 987654 }];
  bundle.discounts[0].description = "Novo ime za prvi paket";
  for (const qty of [6, 7]) bundle.discounts.push({ id: `new-${qty}`, quantity: qty, max_quantity: qty, description: `${qty} komada + POKLON`, value: 0 });
  const m = { variants: api.offersForProduct([bundle], 123456) };
  assert.equal(api.bundleLabelFor(m, 987654, 1), "Novo ime za prvi paket");
  assert.equal(api.bundleLabelFor(m, 987654, 6), "6 komada + POKLON");
  assert.equal(api.bundleLabelFor(m, 987654, 7), "7 komada + POKLON");
  assert.deepEqual(Object.keys(settings).sort(), ["errorMessage", "propertyName"]);
});

test("respects app quantity caps, exclusions, disabled offers and invalid responses", () => {
  const bundle = structuredClone(fixtures[0].bundles[0]);
  bundle.has_quantity_cap = true;
  let m = { variants: api.offersForProduct([bundle], productId) };
  assert.equal(api.bundleLabelFor(m, teaId, 6), "");
  bundle.items[0].excluded_variants = [teaId];
  assert.deepEqual(api.offersForProduct([bundle], productId), {});
  bundle.items[0].excluded_variants = [];
  bundle.enabled = false;
  assert.deepEqual(api.offersForProduct([bundle], productId), {});
  assert.throws(() => api.offersForProduct({}, productId), /Invalid/);
});

test("initial form uses discovered option ID and rendered copy with stale quantity=1", () => {
  const m = mapping();
  let offer, description;
  const form = {
    elements: { namedItem: (name) => ({ value: name === "id" ? String(teaId) : "1" }) },
    closest: () => ({ querySelector: () => ({ id: offer.id, closest: () => ({ querySelector: () => ({ textContent: description }) }) }) })
  };
  const options = m.variants[teaId];
  for (const option of [...options, ...options.toReversed()]) {
    offer = option;
    description = api.offerLabel(offer, offer.min);
    assert.equal(api.bundleLabelForForm(m, form), description);
  }
  description = "Tek promenjen naziv + TERMO ŠOLJA";
  assert.equal(api.bundleLabelForForm(m, form), description);
});

test("form preparation and serialization include the app label in the original add payload", async () => {
  let input;
  const selected = { id: 855795, closest: () => ({ querySelector: () => ({ textContent: "5 čajeva + 🎁 GRATIS TERMOS" }) }) };
  const form = {
    elements: { namedItem: (name) => ({ value: name === "product-id" ? productId : name === "id" ? String(teaId) : "1" }) },
    closest: () => ({ querySelector: () => selected }),
    matches: () => true,
    querySelector: () => input,
    append: (element) => { input = element; }
  };
  document.createElement = () => ({ setAttribute() {} });
  const name = await api.prepareBundleForm(form);
  assert.equal(name, "5 čajeva + 🎁 GRATIS TERMOS");
  assert.equal(input.name, "properties[Paket]");
  assert.equal(input.value, name);
  const formData = new FormData();
  for (const listener of listeners.formdata) listener({ target: form, formData });
  assert.equal(formData.get("properties[Paket]"), name);
});

test("restored cart discovers its product without a previous PDP visit; qty 1→7→1 tracks live rules", async () => {
  liveOffers = structuredClone(fixtures);
  for (const qty of [6, 7]) liveOffers[0].bundles[0].discounts.push({ id: qty, quantity: qty, max_quantity: qty, description: `{quantity} čajeva + NOV POKLON`, value: 0 });
  for (const qty of [1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1]) {
    lines = [line(qty, { Paket: "staro", __is_frozen: "true", Note: "Keep" })];
    const result = await refresh();
    const expected = api.bundleLabelFor({ variants: api.offersForProduct(liveOffers[0].bundles, productId) }, teaId, qty);
    assert.equal(result.cart.items[0].properties.Paket, expected);
    assert.equal(result.cart.items[0].properties.Note, "Keep");
    assert.equal(result.cart.items[0].properties.__is_frozen, "true");
    assert.equal(result.cart.items[0].quantity, qty);
  }
});

test("split allocations and multiple variants receive the total package name without remove/re-add", async () => {
  liveOffers = structuredClone(fixtures);
  const otherVariant = 98765;
  liveOffers[0].bundles[0].items[0].variants.push({ id: otherVariant });
  const custom = { Paket: "4 čaja", Note: "Keep" };
  const plan = { selling_plan: { id: 77 } };
  lines = [line(4, custom, { final_price: 84000, selling_plan_allocation: plan }), line(1, custom, { selling_plan_allocation: plan }),
    line(1, { Note: "Other customization" }, { variant_id: otherVariant, backing: "other", selling_plan_allocation: plan }),
    line(2, {}, { product_id: 111, variant_id: 111, backing: "untouched", handle: "plain-product" })];
  const total = view().total_price;
  const start = requests.length;
  const result = await refresh();
  assert.deepEqual(result.cart.items.slice(0, 2).map((entry) => entry.properties.Paket), Array(2).fill("5 čajeva + 🎁 GRATIS TERMOS"));
  assert.equal(result.cart.items[2].properties.Paket, "1 čaj Čistač (21 dan)");
  assert.equal(result.cart.total_price, total);
  assert.deepEqual(result.cart.items[3].properties, {});
  assert.ok(requests.slice(start).every((request) => !/cart\/(add|clear)/.test(request.url)));
  const writes = requests.filter((request) => request.url === "/cart/change.js").length;
  await api.synchronizeBundleProperties();
  assert.equal(requests.filter((request) => request.url === "/cart/change.js").length, writes);
});

test("updates renamed app copy on checkout refresh and refreshes returned section HTML", async () => {
  liveOffers = structuredClone(fixtures);
  liveOffers[0].bundles[0].discounts[4].description = "{quantity} ČAJEVA + NOVA PORUKA MAGACINU";
  lines = [line(5, { Paket: "staro" })];
  const result = await api.synchronizeBundleProperties({ sections: { drawer: "Stale" } }, { refreshOffers: true });
  assert.equal(result.cart.items[0].properties.Paket, "5 ČAJEVA + NOVA PORUKA MAGACINU");
  assert.equal(result.cart.sections.drawer, "Fresh property HTML");
});

test("cart discovery automatically includes a newly configured product and its extra tiers", async () => {
  const bundle = structuredClone(fixtures[0].bundles[0]);
  bundle.id = 999;
  bundle.items[0].id = 123456;
  bundle.items[0].variants = [{ id: 987654 }];
  bundle.discounts = [1, 2, 6, 7].map((quantity) => ({ id: quantity, quantity, max_quantity: quantity, description: "{quantity} novih proizvoda + 🎁", value: 0 }));
  liveOffers.push({ productId: "123456", bundles: [bundle] });
  lines = [line(7, {}, { product_id: 123456, variant_id: 987654, handle: "brand-new-product" })];
  const result = await refresh();
  assert.equal(result.cart.items[0].properties.Paket, "7 novih proizvoda + 🎁");
});

test("removed app offers clear obsolete warehouse instructions", async () => {
  liveOffers = structuredClone(fixtures);
  liveOffers[0].bundles = [];
  lines = [line(5, { Paket: "5 čajeva + 🎁 GRATIS TERMOS", Note: "Keep" })];
  await refresh();
  assert.equal(lines[0].properties.Paket, "");
  assert.equal(lines[0].properties.Note, "Keep");
  liveOffers = structuredClone(fixtures);
});

test("discovery/write failures reject instead of allowing stale checkout, and a retry recovers", async () => {
  lines = [line(2, { Paket: "staro" })];
  failDiscovery = true;
  await assert.rejects(refresh(), /discover Fast Bundle/);
  assert.equal(lines[0].properties.Paket, "staro");
  failChange = true;
  await assert.rejects(refresh(), /Unable to update/);
  await refresh();
  assert.equal(lines[0].properties.Paket, "2 čaja");
});
