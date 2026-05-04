# Junaid Perfumes Benchmark

Source: https://sa.junaidperfumes.com/

Observed locally on 2026-05-04 as a benchmark for the factory's luxury fragrance vertical.

## Benchmark Signals

- Arabic storefront with English/language and multi-country currency affordances.
- Top announcement around free shipping and secure checkout.
- Dense fragrance navigation: men, women, unisex, try-and-decide, bakhoor, sets, oils, oud perfumes, musk, articles, new launches, and expert consultation.
- Home page is not a single product grid. It uses hero slides, best sellers, musk collection, bakhoor/incense sections, scent discovery/category tiles, and new launches.
- Product cards need support for image-heavy perfume merchandising, quick add, sold/out states, regular price/sale price display, and ratings.
- Product pages need fragrance-specific copy: product type, audience, size/volume, scent notes, delivery message, quantity controls, add to cart, and sample/free-kit style promos.

## Factory Translation

The benchmark is represented by:

- Fixture: `fragrance-luxury`
- Vertical: `luxury-fragrance`
- Gate: `node factory.js vertical gate`
- Theme gate from specs: `node factory.js vertical theme-gate <theme>`
- Manual theme gate: `node factory.js vertical theme-gate <theme> luxury-fragrance`
- Required experience: `fragrance-discovery`
- Optional/advanced experience: `scent-quiz`
- Preview coverage: included in `node factory.js preview <theme> --all-pages --all-fixtures`

The fixture intentionally uses synthetic product names and data inspired by the category structure, not scraped customer or merchant data.

## Acceptance Rule

A generated theme is not considered ready for this class of merchants unless it can pass:

```bash
node factory.js fixtures gate fragrance-luxury
node factory.js vertical gate luxury-fragrance
node factory.js vertical theme-gate <theme>
node factory.js vertical theme-gate <theme> luxury-fragrance
node factory.js experience gate <theme>
node factory.js preview <theme> --fixture=fragrance-luxury --all-pages
node factory.js coverage <theme>
node factory.js links <theme>
node factory.js browser <theme>
```

The required experience is intentionally not a visual clone. It translates the fragrance benchmark into reusable selling behavior: scent finder filters, note pyramid rendering, gift/sample prompts, comparison rows, and standard Salla add-to-cart links.

`scent-quiz` extends this benchmark as an optional factory innovation: a local quiz-like selling path that uses product scent metadata without external APIs and keeps the standard product URL, price, image, and add-to-cart action visible.
