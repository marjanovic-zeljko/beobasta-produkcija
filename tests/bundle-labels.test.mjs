import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const mapping = JSON.parse(fs.readFileSync(new URL("../assets/bundle-labels.json", import.meta.url)));
let lines, failAdd, nextId = 10, writes = 0;
const listeners = new Map();
globalThis.document = { documentElement: { toggleAttribute() {} }, addEventListener(name, callback) { listeners.set(name, callback); }, dispatchEvent() {} };
globalThis.window = { themeVariables: { bundleLabels: { url: "/mapping.json" }, settings: {} }, addEventListener() {}, async detectBundleDiscounts() {} };
globalThis.Shopify = { routes: { root: "/" } };

// Model a shared Shopify line exposed as full-price and discounted allocations.
// Changing properties on either allocation changes the shared backing line.
function view() {
  let eligible = 4;
  const items = [];
  for (const line of lines) {
    const discounted = line.variant_id === 46782280401140 ? Math.min(line.quantity, eligible) : 0;
    eligible -= discounted;
    for (const [quantity, price, suffix] of [[line.quantity - discounted, 99000, "full"], [discounted, 84000, "discount"]]) {
      if (quantity) items.push({ ...structuredClone(line), key: `${line.id}-${suffix}`, quantity, final_price: price });
    }
  }
  return { items, total_price: items.reduce((sum, item) => sum + item.quantity * item.final_price, 0) };
}

globalThis.fetch = async (url, options = {}) => {
  if (url === "/mapping.json") return { ok: true, json: async () => mapping };
  if (url === "/cart.js") return { ok: true, json: async () => view() };
  const body = JSON.parse(options.body);
  writes++;
  if (url === "/cart/change.js") {
    const current = view().items;
    const item = body.line ? current[body.line - 1] : current.find((entry) => entry.key === body.id);
    assert.ok(item, "Every update must use a current line reference");
    const underlying = lines.find((entry) => entry.id === item.id);
    underlying.quantity += body.quantity - item.quantity;
    if (body.properties) underlying.properties = body.properties;
    lines = lines.filter((entry) => entry.quantity > 0);
  } else if (url === "/cart/add.js") {
    assert.equal(options.headers["X-Fastbundle-Request"], "yes", "Re-add must not expand the active PDP offer");
    if (failAdd) { failAdd = false; return { ok: false, status: 422 }; }
    for (const entry of body.items) lines.unshift({ id: nextId++, variant_id: entry.id, quantity: entry.quantity, properties: entry.properties, ...(entry.selling_plan ? { selling_plan_allocation: { selling_plan: { id: entry.selling_plan } } } : {}) });
  } else {
    throw new Error(`Unexpected request ${url}`);
  }
  return { ok: true, json: async () => view() };
};

const { bundleLabelFor, bundleLabelForForm, synchronizeBundleProperties } = await import("../assets/bundle-labels.js");
const tea = (quantity, properties = { Paket: "4 čaja" }) => ({ id: 1, variant_id: 46782280401140, quantity, properties });

test("exact names and explicit thresholds retain the tea's upper boundary", () => {
  assert.equal(bundleLabelFor(mapping, 46782280401140, 1), "1 čaj Čistač (21 dan)");
  assert.equal(bundleLabelFor(mapping, 46782280401140, 5), "5 čajeva + 🎁 GRATIS TERMOS");
  assert.equal(bundleLabelFor(mapping, 46782280401140, 6), "");
  for (const quantity of [5, 6, 100]) assert.equal(bundleLabelFor(mapping, 47143144915188, quantity), "🔥 5 kilograma (ili više)");
  for (const quantity of [0, -1, 1.5, NaN]) assert.equal(bundleLabelFor(mapping, 47143144915188, quantity), "");
  assert.equal(bundleLabelFor({ variants: { x: { "5+": "five", "10+": "ten", 12: "exact" } } }, "x", 12), "exact");
});

test("initial form properties follow the app selection even when its quantity field is still 1", () => {
  let description = "1 čaj Čistač (21 dan)";
  let selected = true;
  const form = {
    elements: { namedItem: (name) => ({ value: name === "id" ? "46782280401140" : "1" }) },
    closest: () => ({ querySelector: () => selected ? { closest: () => ({ querySelector: () => ({ textContent: description }) }) } : null })
  };
  // Exercise every configured tea option in both directions, including gift copy.
  const names = Object.values(mapping.variants["46782280401140"]);
  for (const name of [...names, ...names.toReversed()]) {
    description = name;
    assert.equal(bundleLabelForForm(mapping, form), name);
  }
  selected = false;
  assert.equal(bundleLabelForForm(mapping, form), "1 čaj Čistač (21 dan)");
});

test("shared 4+1 allocations become separate persisted lines with the same quantity and discount", async () => {
  lines = [tea(5, { Paket: "4 čaja", __is_frozen: "true", Engraving: "Keep" }), { id: 2, variant_id: 999, quantity: 2, properties: { Note: "Untouched" } }];
  const before = view().total_price;
  const result = await synchronizeBundleProperties();
  const items = result.cart.items.filter((item) => item.variant_id === 46782280401140);
  assert.deepEqual(items.map((item) => [item.quantity, item.properties.Paket, item.final_price]), [[4, "4 čaja", 84000], [1, "1 čaj Čistač (21 dan)", 99000]]);
  assert.equal(result.cart.total_price, before);
  assert.ok(items.every((item) => item.properties.__is_frozen === "true" && item.properties.Engraving === "Keep"));
  assert.deepEqual(result.cart.items.find((item) => item.variant_id === 999).properties, { Note: "Untouched" });
  const previousWrites = writes;
  await synchronizeBundleProperties();
  assert.equal(writes, previousWrites, "Settled properties must not trigger more cart mutations");
});

test("failed allocation re-add restores missing quantity without duplication and can recover", async () => {
  lines = [tea(5)];
  failAdd = true;
  await assert.rejects(synchronizeBundleProperties(), /Unable to update/);
  assert.equal(lines.reduce((sum, item) => sum + item.quantity, 0), 5);
  await synchronizeBundleProperties();
  assert.equal(view().total_price, 435000);
  assert.deepEqual(view().items.map((item) => item.properties.Paket), ["4 čaja", "1 čaj Čistač (21 dan)"]);
});
