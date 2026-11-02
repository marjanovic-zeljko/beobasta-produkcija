// Opt-in integration check: node --test tests/bundle-discovery.live.test.mjs
// BUNDLE_LIVE_TEST=1 enables real HTTP against the local preview and public app
// API. Uses a new cookie jar, clears only that isolated test cart, never checks out.
// This is API verification; it does not execute the app's browser discount hook.
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
const enabled = process.env.BUNDLE_LIVE_TEST === "1";

test("live offer discovery and persisted cart properties for both supplied products", { skip: !enabled, timeout: 180000 }, async () => {
  const nativeFetch = globalThis.fetch;
  const root = "http://127.0.0.1:9292";
  const cookies = new Map();
  const settings = JSON.parse(fs.readFileSync(new URL("../assets/bundle-labels.json", import.meta.url)));
  globalThis.document = { documentElement: { lang: "en", toggleAttribute() {} }, addEventListener() {}, dispatchEvent() {} };
  globalThis.window = { themeVariables: { bundleLabels: { url: "/bundle-settings" }, settings: {} }, addEventListener() {}, async detectBundleDiscounts() {} };
  globalThis.Shopify = { shop: "beobasta.myshopify.com", locale: "en", routes: { root: "/" }, currency: { active: "RSD", rate: "1.0" } };
  globalThis.fetch = async (url, options = {}) => {
    if (url === "/bundle-settings") return { ok: true, json: async () => settings };
    if (String(url).startsWith("https://api.fastbundle.co/")) return nativeFetch(url, { ...options, redirect: "error" });
    assert.ok(String(url).startsWith("/"), "Only the authorized local preview may receive cart requests");
    const response = await nativeFetch(`${root}${url}`, { ...options, redirect: "error", headers: {
      ...options.headers, Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; ")
    } });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0], separator = pair.indexOf("=");
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    return response;
  };
  const api = await import("../assets/bundle-labels.js");
  const json = async (path, body) => {
    const response = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {});
    assert.ok(response.ok, `Local Shopify request ${path} failed (${response.status})`);
    return response.json();
  };
  try {
    assert.equal((await json("/cart.js")).item_count, 0, "Test session must start with its own empty cart");
    for (const handle of ["caj-cistac", "smrznute-jagode-novo"]) {
      const product = await json(`/products/${handle}.js`);
      const response = await fetch(api.bundleOffersUrl(product.id, handle));
      assert.ok(response.ok);
      const bundles = await response.json();
      const variants = api.offersForProduct(bundles, product.id);
      const variantId = product.variants[0].id;
      const rules = variants[variantId];
      assert.ok(rules.length > 0, `${handle} should expose current app offers`);
      // Every real option, then upper-tier/cart decrement transitions.
      const counts = [...new Set([...rules.map((rule) => rule.min), 6, 7]), 6, 5, 4, 3, 2, 1];
      for (const [index, quantity] of counts.entries()) {
        if (index === 0) await json("/cart/add.js", { items: [{ id: variantId, quantity, properties: { IntegrationTest: "bundle-discovery" } }] });
        else {
          // The app can split a package into several price rows. Set the total
          // through updates to the variant rather than assuming one price row.
          await json("/cart/update.js", { updates: { [variantId]: quantity } });
        }
        const result = await api.synchronizeBundleProperties(undefined, { refreshOffers: true });
        assert.equal(result.cart.items.reduce((sum, item) => sum + item.quantity, 0), quantity);
        const expected = api.bundleLabelFor({ variants }, variantId, quantity);
        assert.ok(result.cart.items.every((item) => item.properties.Paket === expected));
        assert.ok(result.cart.items.every((item) => item.properties.IntegrationTest === "bundle-discovery"));
      }
      const clear = await json("/cart/clear.js", {});
      assert.equal(clear.item_count, 0);
    }
  } finally {
    await json("/cart/clear.js", {});
    globalThis.fetch = nativeFetch;
  }
});
