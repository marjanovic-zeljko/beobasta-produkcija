# Theme Context: Prestige

Generated: 2026-11-02 08:49 UTC
Last analyzed: 2026-11-02 08:49 UTC

## Theme Information

- **Name:** Prestige
- **Version:** 10.10.1
- **Author:** Maestrooo
- **Type:** Shopify 2.0 Hybrid

## Complete File Inventory

### Blocks (11 files)

Total: 11

**Content Blocks (3):**
button.liquid, heading.liquid, rich-text.liquid

**Media Blocks (2):**
image.liquid, video.liquid

**Parent/Container Blocks (1):**
button-group.liquid

**Utility Blocks (5):**
accordion.liquid, badge.liquid, icon.liquid, liquid.liquid, page-content.liquid

### Sections (68 files)

Total: 68

**Blog (6):**
blog-posts.liquid, blog-slider.liquid, main-article.liquid, main-blog.liquid, prev-next-blog-posts.liquid, related-blog-articles.liquid

**Cart/Checkout (2):**
cart-drawer.liquid, main-cart.liquid

**Collection (5):**
collection-banner.liquid, collection-list.liquid, featured-collections.liquid, main-collection.liquid, main-list-collections.liquid

**Content (12):**
faq-two-column.liquid, faq.liquid, hero-banner.liquid, image-testimonial-slider.liquid, image-with-text-block.liquid, image-with-text-overlay.liquid, image-with-text.liquid, images-with-text-scroll.liquid, rich-text.liquid, slideshow.liquid, testimonials.liquid, video.liquid

**Header/Footer (5):**
announcement-bar.liquid, custom-footer.liquid, custom-header.liquid, footer.liquid, header.liquid

**Main Content (12):**
main-customers-account.liquid, main-customers-activate-account.liquid, main-customers-addresses.liquid, main-customers-login.liquid, main-customers-order.liquid, main-customers-register.liquid, main-customers-reset-password.liquid, main-gift-card.liquid, main-not-found.liquid, main-page.liquid, main-password.liquid, main-search.liquid

**Product (4):**
featured-product.liquid, main-product.liquid, recently-viewed-products.liquid, related-products.liquid

**Utility (22):**
_blocks.liquid, apps.liquid, before-after.liquid, contact.liquid, countdown-condensed.liquid, countdown.liquid, custom-liquid.liquid, fruit-comparison.liquid, logo-list.liquid, media-grid.liquid, multi-column.liquid, multiple-media-with-text.liquid, newsletter-popup.liquid, newsletter.liquid, predictive-search.liquid, privacy-banner.liquid, quick-order-list.liquid, scrolling-content.liquid, shop-the-look.liquid, tabs.liquid, text-with-icons.liquid, timeline.liquid

### Snippets (55 files)

Total: 55

**Component Snippets (39):**
accordion.liquid, active-facets.liquid, address-form.liquid, banner.liquid, blog-post-card.liquid, button.liquid, buy-buttons.liquid, cart-discount.liquid, checkbox.liquid, css-variables.liquid, direction.liquid, facets.liquid, free-shipping-bar.liquid, header-search.liquid, header-sidebar.liquid, input.liquid, inventory.liquid, js-variables.liquid, line-item.liquid, localization-selector.liquid, mega-menu-images.liquid, mega-menu.liquid, microdata-schema.liquid, option-value.liquid, pagefly-main-css.liquid, pagefly-main-js.liquid, pagination.liquid, pickup-availability.liquid, predictive-search-result-item.liquid, quantity-selector.liquid, relatedblogs.liquid, section-header.liquid, select.liquid, shadow-dom-templates.liquid, share-buttons.liquid, shipping-estimator.liquid, surface.liquid, vendor.liquid, volume-pricing-table.liquid

**Icon Snippets (1):**
icon.liquid

**Product Snippets (14):**
complementary-products.liquid, media.liquid, price-list.liquid, price-range.liquid, product-badges.liquid, product-card-horizontal.liquid, product-card-placeholder.liquid, product-card.liquid, product-gallery.liquid, product-info.liquid, product-quick-buy.liquid, product-rating.liquid, social-media.liquid, variant-picker.liquid

**Utility Snippets (1):**
social-meta-tags.liquid

### Templates

templates/404.json, templates/article.json, templates/blog.json, templates/cart.json, templates/collection.json, templates/customers/account.json, templates/customers/activate_account.json, templates/customers/addresses.json, templates/customers/login.json, templates/customers/order.json, templates/customers/register.json, templates/customers/reset_password.json, templates/gift_card.liquid, templates/index.json, templates/list-collections.json, templates/page.contact.json, templates/page.faq.json, templates/page.json, templates/page.list-collections.json, templates/page.sveze-voce.json, templates/password.json, templates/product.caj.json, templates/product.json, templates/product.pre-order.json, templates/search.json

### Assets Summary

- **.css:** 2
- **.js:** 4
- **.liquid:** 2
- **.txt:** 1

### Locales

locales/ar.json, locales/cs.json, locales/da.json, locales/de.json, locales/el.json, locales/en.default.json, locales/en.default.schema.json, locales/es.json, locales/fi.json, locales/fr.json, locales/fr.schema.json, locales/he.json, locales/it.json, locales/ja.json, locales/ko.json, locales/lt.json, locales/lv.json, locales/nb.json, locales/nl.json, locales/pl.json, locales/pt-BR.json, locales/ro.json, locales/ru.json, locales/sk.json, locales/sl.json, locales/sr.json, locales/sv.json, locales/tr.json, locales/uk.json, locales/zh-CN.json, locales/zh-TW.json

### Layout Files

layout/password.liquid, layout/theme.liquid

### Config Files

config/settings_data.json, config/settings_schema.json

## Nested Blocks Support

Theme-block child renderers detected; verify their schemas and actual nesting during manual discovery.

blocks/button-group.liquid

## Code Patterns

- **Liquid translation quotes:** single
- **CSS methodology:** BEM-like/custom component classes detected
- **JavaScript files:** 4

## Component Systems

Deep component discovery not included in this baseline script. Run `$shopify-analyze --deep` when component relationships, parameters, or web component behavior matter.

### Render Frequency

- `icon`: 123 render calls
- `button`: 59 render calls
- `input`: 38 render calls
- `section-header`: 19 render calls
- `surface`: 19 render calls
- `banner`: 18 render calls
- `blog-post-card`: 11 render calls
- `accordion`: 10 render calls
- `product-card`: 9 render calls
- `select`: 8 render calls
- `predictive-search-result-item`: 8 render calls
- `pagination`: 7 render calls

## Notable Features

Add manually during Codex analysis when unusual architecture, app integrations, or theme-specific constraints are discovered.

## Applied Learnings

Load `~/.codex/learnings.md` and `.codex/learnings.md` during manual analysis and summarize relevant items here.

## Development Notes

- Run `$shopify-analyze` to refresh this context.
- Run `$shopify-analyze --deep` for reusable component-system discovery.
- Run `$shopify-theme-context` to check staleness.

## Automatically discovered bundle names (2026-11-02)

- `assets/bundle-labels.js` discovers each product's current Fast Bundle quantity offers from the SDK's public `v3/product-bundles/` endpoint using Shopify shop, locale and product identity. No product IDs, quantities or package names are configured in production code. `assets/bundle-labels.json` contains only the public property key (`Paket`) and localized error message.
- The installed SDK 1.29.23 identifies quantity selectors as `type: bogo`; discovery reads their enabled offers, variant exclusions, IDs, descriptions, minimum/maximum quantities and final uncapped tier. Other app bundle types are not quantity selectors and are left alone. Conflicting overlapping quantity bundles reject rather than guess a warehouse instruction.
- Product forms are discovered from their `product-id`/`id` fields, including products outside the current PDP. Initial form data uses the selected app option ID and its rendered label. Clicks made before discovery completes wait for it; `formdata` writes the live label into the initial add request. The theme's product-form handler also awaits discovery before setting its loading state. Radio selectors cover the app's discountInfo versions, not generated CSS classes.
- Cart sync discovers cart products independently of prior PDP visits. In-page offer requests are cached for 30 seconds; new selected IDs trigger discovery and checkout always revalidates current app data. Removed offers clear obsolete Paket text; API errors reject checkout synchronization rather than silently accept stale instructions.
- Cart names resolve from total product quantity within a selling-plan/customization group, spanning variants and app price allocations. Every allocation of that package gets its full package name. Property-only `cart/change.js` writes preserve all other properties, units and selling plans. The earlier remove/re-add allocation rebuilding was removed.
- Fast Bundle's exposed `window.detectBundleDiscounts()` hook is retained after property writes. This public storefront endpoint/hook integration is based on the installed SDK, not a versioned official integration contract; recheck after app changes. The theme never adds a thermos: warehouse staff read the saved gift wording and include it manually.
- Cart drawer and cart page omit only Paket from presentation using `hide_bundle_property: true`; checkout/customer order presentation retains the saved public property. There is no display-only label substitute.
- Tests: 12 automated regression cases cover actual public offer fixtures, all current tea/strawberry tiers, renamed copy, additional sixth/seventh tiers, new product/variant IDs, initial form serialization, increasing/decreasing cart quantities, price splits, customizations/plans, removed offers and failure recovery. The opt-in live HTTP test passed against both supplied products, discovering current offers and verifying saved properties through quantities 1–7 and back down in a separate cookie jar; its cart is cleared in finally. That API test stubs the browser discount hook and does not verify rendered UI or app discount recalculation.
- Browser QA completed after reconnecting: tea quantities 1 → 7 → 4 save current app names and preserve current app pricing; the five-tea selection reaches checkout as `Paket: 5 čajeva + 🎁 GRATIS TERMOS`, quantity 5, total 4,950 RSD. Strawberry quantities 1 → 6 → 4 preserve the live names, frozen property, and app discounts (quantity 6 total 5,712 RSD). Apricots, which were never in the former manual map, pass all quantities 1–5 plus 5 → 6 → 5 → 4. Apricot checkout after a 5 → 6 edit shows `Paket: 6 kilograma (ili više)`, quantity 6, discount 599.82 RSD and total 2,940.18 RSD. Paket is hidden in cart presentation. Both browser test carts were emptied. Screenshots saved under /tmp/beobasta-auto-discovery-*.png. Shopify Order Admin and accelerated checkout remain unverified; no order was submitted or theme published.
