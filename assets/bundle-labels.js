// Variant IDs explicitly opt products into full, quantity-specific bundle names.
let mappingPromise;

export function loadBundleLabels() {
  mappingPromise ??= fetch(window.themeVariables.bundleLabels.url, { cache: "no-cache" }).then((response) => {
    if (!response.ok) throw new Error("Unable to load bundle label mapping");
    return response.json();
  }).catch((error) => {
    mappingPromise = undefined;
    throw error;
  });
  return mappingPromise;
}

export function bundleLabelFor(mapping, variantId, quantity) {
  return mapping.variants[String(variantId)]?.[String(quantity)] || "";
}

// Shopify renders new line markup after the app recalculates/splits a cart.
// Each element reads that line's actual quantity; no cart/property writes.
class BundleLineLabel extends HTMLElement {
  connectedCallback() {
    loadBundleLabels().then((mapping) => {
      if (!this.isConnected) return;
      const name = bundleLabelFor(mapping, this.dataset.variantId, this.dataset.quantity);
      this.textContent = name && mapping.label ? `${mapping.label}: ${name}` : name;
      this.hidden = !name;
    }).catch(console.error);
  }
}

if (!window.customElements.get("bundle-line-label")) {
  window.customElements.define("bundle-line-label", BundleLineLabel);
}
