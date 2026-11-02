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

## Bundle label mapping (2026-11-02)

- `assets/bundle-labels.json` is the manually maintained source for the label prefix and exact names by Shopify variant ID and actual cart-line quantity. Only mapped variants display labels; unknown quantities have no invented fallback.
- `bundle-labels.js` defines `bundle-line-label`; `line-item.liquid` supplies each line's variant ID and quantity. The theme module imports it through the existing import map. Cart drawer and cart page share the snippet.
- This is a display mapping, not a persisted public line-item property. Keep names in sync with Fast Bundle manually. No cart mutation/interception or checkout changes are included.
- Browser tests: 3 -> 4 updates the label to 4 čaja (3,360 RSD); 4 -> 5 splits into 4 čaja plus 1 čaj Čistač (21 dan), total 4,350 RSD, original discount retained. Standalone cart rendering and app redistribution were also checked.
