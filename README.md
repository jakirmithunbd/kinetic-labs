# Kinetic Labs — Shopify theme

A custom Shopify Online Store 2.0 theme, built from scratch in Liquid to match the approved
prototype at <https://kinetic-labs-pure.base44.app/>.

The governing rule of the build: **a merchant with no code access can build, reorder and edit
every page in the theme editor.** Anything a merchant might reasonably want to change is a
section setting, a block setting, a theme setting, a metafield or a metaobject — never a Liquid
literal, and never an uploaded image of text.

---

## Contents

1. [Setup, in order](#1-setup-in-order)
2. [Metafield definitions](#2-metafield-definitions)
3. [Metaobject definitions](#3-metaobject-definitions)
4. [Search & Discovery configuration](#4-search--discovery-configuration)
5. [App block slots](#5-app-block-slots)
6. [Theme architecture](#6-theme-architecture)
7. [Design tokens](#7-design-tokens)
8. [Reports](#8-reports)
9. [Out of scope](#9-out-of-scope)
10. [Known limitations](#10-known-limitations)

---

## 1. Setup, in order

Do these in sequence. Steps 2–4 must be finished before the product page will render its
signature content, because that content lives in metafields.

### 1. Install the theme

```bash
shopify theme dev --store your-store.myshopify.com
```

```bash
shopify theme push --unpublished --theme "Kinetic Labs"
```

### 2. Create the metaobject definitions

Settings → Custom data → Metaobjects. Create all six from [section 3](#3-metaobject-definitions)
**before** the metafields, because several metafields reference them.

For `ingredient`, turn on **"Storefronts — make entries available"** and set the web page
template to `ingredient`. That is what gives each ingredient its own URL.

### 3. Create the product metafield definitions

Settings → Custom data → Products. Add every row in [section 2](#2-metafield-definitions),
exactly as named. The namespace is `custom` throughout.

Also add the one **variant** metafield — `custom.servings_per_container` — or price-per-serving
will be wrong for multi-size products.

### 4. Populate content

Fill in the ingredient, certification and dose records first, then attach them to products.
Seed content matching the prototype is listed in [section 8 of the brief](#seed-content).

### 5. Configure Search & Discovery

Install the free **Search & Discovery** app and set up the filters in
[section 4](#4-search--discovery-configuration). Filtering will not appear on collection pages
until you do — the theme reads `collection.filters` and renders whatever the app provides.

### 6. Create navigation menus

Navigation → create `main-menu` and `footer`. The header's mega menu block matches a top-level
item by title, so if you rename "Shop" you must update the block's **Top-level menu item**
setting to match.

### 7. Set the theme settings

Walk through `MERCHANT-GUIDE.md` with the client. At minimum set the logo, favicon, social
links and the regulatory disclaimer.

### 8. Install apps and place their blocks

See [section 5](#5-app-block-slots) for where each one goes.

---

## 2. Metafield definitions

All product metafields use the `custom` namespace.

| Key | Type | Required | Used by |
|---|---|---|---|
| `positioning_line` | Single line text | – | Product info → Positioning line block |
| `servings_per_container` | Integer | for price/serve | Price per serving everywhere |
| `serving_size` | Single line text | – | Supplement facts caption |
| `supplement_facts` | List of metaobject references → `nutrient_row` | – | Supplement facts table |
| `key_ingredients` | List of metaobject references → `ingredient` | – | Key ingredients section |
| `dose_comparison` | List of metaobject references → `dose_record` | – | Dosage bars (product + home) |
| `allergens` | Multi-line text | – | Allergens & certifications |
| `certifications` | List of metaobject references → `certification` | – | Allergens & certifications |
| `banned_substance_tested` | Boolean (true/false) | – | Trust row, allergens section |
| `how_to_use` | Rich text | – | How to use section |
| `goal_tags` | List of single line text | for filtering | Search & Discovery "Goal" filter |
| `product_faq` | List of metaobject references → `faq_entry` | – | Product FAQ + FAQPage JSON-LD |
| `coa_file` | File reference | – | Testing page / batch lookup |

### Variant metafield

| Key | Type | Why |
|---|---|---|
| `custom.servings_per_container` | Integer | A 2kg tub has more servings than a 1kg tub of the same product. The theme reads the **variant** value first and falls back to the product value, so single-size products only need the product-level field. |

> **Price per serving is never stored.** It is computed in Liquid as
> `variant.price ÷ servings_per_container` every time it renders, so it cannot drift from the
> price a customer actually pays. See `snippets/price-per-serving.liquid`.

### Review metafields

The theme reads the two standard keys that Judge.me, Okendo and Loox all write to. You do not
create these by hand — the review app does.

| Key | Type |
|---|---|
| `reviews.rating` | Rating |
| `reviews.rating_count` | Integer |

Ratings render nothing at all when these are absent, so the layout never reserves space for a
rating that will not arrive.

---

## 3. Metaobject definitions

### `ingredient`

The glossary entry. Gets its own storefront URL.

| Field | Type |
|---|---|
| `name` | Single line text |
| `mechanism` | Multi-line text or rich text |
| `clinical_dose` | Decimal |
| `unit` | Single line text (`g`, `mg`, `mcg`, `iu`, `ml`) |
| `references` | Rich text |
| `image` | File reference (image) |

**Storefront access:** on. **Web page template:** `ingredient`.

The ingredient page lists the products that contain it using the metaobject's *reverse
reference* to products — no tagging, no second list to maintain. This works automatically
because `custom.key_ingredients` points at these entries.

### `dose_record`

One row of the dosage panel — the component the whole brand argument rests on.

| Field | Type | Notes |
|---|---|---|
| `ingredient` | Metaobject reference → `ingredient` | Links the bar to the glossary page |
| `our_dose` | Decimal | What is actually in the product |
| `studied_dose` | Decimal | The clinically studied dose. Bars are a percentage of this. |
| `industry_average` | Decimal | Optional. Omit it and only the "OURS" bar renders. |
| `unit` | Single line text | `g`, `mg`, `mcg` |
| `citation` | Single line text | Optional, shown after the clinical dose caption |

Percentages are computed, not stored: `our_dose ÷ studied_dose × 100`.

### `nutrient_row`

One line of the supplement facts panel.

| Field | Type |
|---|---|
| `name` | Single line text |
| `amount` | Decimal |
| `unit` | Single line text |
| `daily_value` | Decimal (leave empty for "†  Daily value not established") |

### `certification`

| Field | Type |
|---|---|
| `name` | Single line text |
| `badge` | File reference (image) |
| `description` | Single line text |

### `faq_entry`

| Field | Type |
|---|---|
| `question` | Single line text |
| `answer` | Rich text |

Reusable: attach entries to `custom.product_faq` for a product, or pick them in the FAQ
section's **Questions** setting for a page.

### `coa_batch`

| Field | Type |
|---|---|
| `batch_number` | Single line text |
| `product` | Product reference |
| `test_date` | Date |
| `file` | File reference (PDF) |

Read [section 10](#10-known-limitations) before the batch list grows past a few hundred rows.

---

## 4. Search & Discovery configuration

Install the free **Search & Discovery** app, then Filters → Add filter for each of these. The
theme renders whatever the app exposes via `collection.filters`, so nothing here is hard-coded
and no theme change is needed to add or reorder a filter later.

| Filter | Source | Notes |
|---|---|---|
| Goal | Product metafield `custom.goal_tags` | The five goal collections |
| Format | Product type, or a `custom.format` metafield | Powder / capsule / stick |
| Dietary | Product tag | Vegan, dairy-free, stimulant-free |
| Flavour | Variant option **Flavour** | Must be named exactly `Flavour` — see below |
| Price | Price | Renders as a min/max range |

**Option naming matters in three places.** The option name is a merchant-editable setting
everywhere it is used, but the defaults assume the prototype's naming:

- Theme settings → Product cards → **Swatch option name** (default `Flavour`)
- Product info → Flavour picker block → **Option name** (default `Flavour`)
- Product info → Size picker block → **Option name** (default `Size`)

If your products use different option names, change these three settings rather than renaming
your products.

Also enable in the app: **product boosts**, **synonyms** (e.g. "creatine monohydrate" → "creatine"),
and **predictive search** across products, collections, pages and articles.

---

## 5. App block slots

The theme's job is to render apps well and reserve clean slots. It does not reimplement any of
them.

| Slot | Location | Typical app |
|---|---|---|
| Product info column | `sections/product-info.liquid` — accepts `@app` blocks alongside the theme blocks | Reviews star widget, subscription widget, back-in-stock |
| Reviews section | The **Apps** section preset on `templates/product.json` (anchor `#Reviews`) | Judge.me / Okendo / Loox review list |
| Review highlight | `sections/review-highlight.liquid` accepts `@app` blocks — add one and the placeholder testimonials step aside | Live review carousel |
| Article body | `sections/main-article.liquid` accepts `@app` blocks | Related-content, affiliate widgets |
| Footer | `sections/footer.liquid` accepts `@app` blocks | Trust badges, loyalty widget |
| Standalone | `sections/apps.liquid` — addable to any template, with its own heading and padding | UGC feed, loyalty panel, anything else |

The product page's rating block links to `#Reviews`, which is the anchor on the Apps section —
so the star widget at the top of the page jumps to the review list at the bottom with no
configuration.

---

## 6. Theme architecture

```
layout/          theme.liquid, password.liquid
templates/       *.json for every page type, plus metaobject/ and customers/
sections/        60 sections — 41 with presets, so they can be added anywhere
blocks/          15 theme blocks — the reorderable product info column
snippets/        29 component snippets
assets/          CSS per component, JS per behaviour, 3 self-hosted woff2 faces
config/          settings_schema.json, settings_data.json
locales/         en.default.json (UI strings), en.default.schema.json (editor labels)
```

### Component snippet library

`button` (in `base.css`), `price`, `price-per-serving`, `product-card`, `article-card`,
`option-picker`, `swatch`, `quantity-input`, `faq-accordion`, `pagination`, `breadcrumbs`,
`dosage-bar`, `format-dose`, `icon` (28 icons), `section-header`, `section-style`,
`cart-items`, `free-shipping-bar`, `shipping-estimator`, `facets`, `localization-form`,
`social-icons`, `address-fields`, `account-nav`, `hero-media`, `variant-json`, `meta-tags`,
`structured-data-global`, `structured-data-product`.

### How the two-column product page works

`product-gallery` and `product-info` are **separate sections**, so each keeps its own settings
and either can be removed. Shopify wraps every section in its own `<div>`, so they are paired
with a full-bleed CSS grid on `#MainContent` (see `component-product.css`).

The side-by-side rule only fires when the gallery is the first section and the info column
immediately follows it. Reorder them, or drop a section between them, and the page falls back
to a clean stacked layout instead of overlapping — a merchant cannot break it from the editor.

### How variant selection works

`snippets/variant-json.liquid` renders a payload in which **all money strings are already
formatted by Liquid**. JavaScript only swaps text; it never does arithmetic on prices. That
means Shopify Markets presentment currencies and B2B catalogue pricing are correct by
construction.

Option availability is recomputed on every change: a value is offered if some variant exists
matching it *plus every other currently selected option*. Sold-out combinations stay selectable
and show the sold-out state rather than silently doing nothing.

### Progressive enhancement

Every interactive part is an enhancement over markup that already works:

- Facet filtering is a `<form method="get">`; the pills are ordinary links; "load more" is a
  link to page 2. The catalogue is fully browsable and crawlable with JavaScript disabled.
- The variant picker is a real radio group — keyboard arrows work for free.
- Accordions are native `<details>`/`<summary>`.
- The localisation selector is a real form with a `<noscript>` submit button.
- Add-to-cart forms fall back to a normal POST if `cart.js` fails to load.

---

## 7. Design tokens

Extracted from the prototype's computed styles, then registered as Shopify colour schemes and
CSS custom properties.

| Token | Value | Role |
|---|---|---|
| `--color-background` | `#FAF8F4` | Warm off-white page background |
| `--color-surface` | `#F2EFE9` | Raised surface |
| `--color-text` | `#1C1C1A` | Deep graphite, all body text |
| `--color-text-muted` | `#706C65` | Warm grey, captions and meta |
| `--color-accent` | `#B34E35` | Clay orange, primary buttons and links |
| `--color-accent-strong` | `#94402C` | Pressed state |
| `--color-support` | `#64715B` | Sage, secondary surfaces |
| `--color-data` | `#2B4FD9` | **Electric blue — dosage figures only** |
| `--color-hairline` | `#E6E1D8` | Borders |

> **Three values were darkened from the prototype for accessibility.** `accent` `#C4553A →
> #B34E35`, `text_muted` `#8A857C → #706C65`, `support` `#7A8B6F → #64715B`. Hue and saturation
> are unchanged; only HSL lightness drops, by the minimum needed to clear WCAG AA at 4.5:1.
> The prototype's originals sit at 3.4–4.2:1, which fails AA for normal text — and the eyebrow
> labels and captions that use them are 10–11px. See [section 8](#8-reports) for the full audit.
>
> The electric blue the brief singled out is **fine as-is**: `#2B4FD9` on `#FAF8F4` is **6.14:1**.

**Typography** — three roles, self-hosted as latin-subset variable woff2 (147KB total):

| Role | Face | Used for |
|---|---|---|
| Display | Fraunces | Headings only, used with restraint |
| Body | Inter | All reading text |
| **Data** | JetBrains Mono | Every price, dose, serving count and nutrition value, with tabular figures so columns of numbers align |

Turn off **Use the Kinetic Labs brand fonts** in theme settings to switch to the Shopify font
library instead; the theme falls back cleanly.

**Spacing** is an 8px scale exposed as `--space-*`, with the base unit adjustable in settings.
Section padding is adjustable per section, top and bottom, desktop and mobile.

**Motion** is wrapped in `@media (prefers-reduced-motion: reduce)` throughout. Dosage bars draw
at full width instantly, slideshow autoplay never starts, and scroll reveals are disabled.

---

## 8. Reports

### Theme Check

```bash
shopify theme check
```

```
139 files inspected
0 errors
30 warnings — 29 × OrphanedSnippet, 1 × informational
```

**The 29 `OrphanedSnippet` warnings are false positives** in Shopify CLI 4.1.0. Each flagged
snippet is demonstrably referenced — `icon.liquid` alone is rendered by 30 files. Verify with:

```bash
grep -rl "render 'icon'" sections blocks snippets layout templates | wc -l
```

The check has been left enabled rather than suppressed in `.theme-check.yml`, so it keeps
catching genuinely orphaned snippets in future work.

### Accessibility — WCAG 2.1 AA

Contrast was computed from sRGB relative luminance across **all four colour schemes**, for
every foreground/background role pair the theme actually renders: 44 checks, **0 failures**,
all ≥ 4.5:1.

| Pair | Ratio |
|---|---|
| **Dosage figures** `#2B4FD9` on `#FAF8F4` | **6.14:1** |
| Dosage figures on surface `#F2EFE9` | 5.68:1 |
| Body text `#1C1C1A` on `#FAF8F4` | 16.09:1 |
| Muted text `#706C65` on `#FAF8F4` | 4.92:1 |
| Accent/links `#B34E35` on `#FAF8F4` | 4.88:1 |
| Button label `#FAF8F4` on `#B34E35` | 4.88:1 |

Other AA work in the build:

- Keyboard-navigable variant pickers (real radio groups), drawers (focus trap + Escape +
  focus restored to the opener), and accordions (native `<details>`).
- Visible `:focus-visible` ring in the data blue, suppressed for mouse users only.
- Correct heading order; one `<h1>` per page.
- `aria-modal`, `aria-expanded`, `aria-current`, `role="progressbar"`, `aria-live` regions.
- **Real text for every nutrition and dose value.** The supplement facts panel is a real
  `<table>` with `<caption>`, `scope="col"` and `scope="row"`. The dosage bars carry a
  visually-hidden sentence stating the dose in words — the bars are decoration over the top
  of it.
- Every `<img>` declares `width` and `height`: zero layout shift from images.

### Performance

| Metric | Value |
|---|---|
| Render-blocking CSS on first paint | **5.8 KB gzipped** (`base.css`) |
| All JavaScript | deferred; nothing blocks parsing |
| `theme.js` + `cart.js` gzipped | 7.9 KB |
| Self-hosted fonts | 147 KB, latin subset, `font-display: swap`, display + body preloaded |
| Third-party hosts | none, except YouTube/Vimeo when a merchant adds a video |
| Images | responsive `srcset` + `sizes`; 22 lazy, 7 eager (above-fold only) |
| jQuery | none |

Component CSS is split per section and requested only by the sections on the page. YouTube and
Vimeo embeds in the **Video** section are click-to-load against `youtube-nocookie.com`, so no
third-party script or cookie is fetched for a visitor who never presses play.

> **Lighthouse has not been run.** It needs a running storefront with real products and images,
> which requires the seed content in step 4. Run it against the preview URL once the
> development store is populated; the theme is built to the 90+ mobile budget (see the table
> above) but a number produced against an empty store would be meaningless.

---

## 9. Out of scope

The theme renders these well and reserves clean slots. It does not reimplement them.

| Need | Handled by |
|---|---|
| Subscription billing and customer portal | Shopify Subscriptions / Recharge / Skio |
| Review collection, moderation, photo reviews | Judge.me / Okendo / Loox |
| Instagram feed | UGC app |
| Back-in-stock alerts | Dedicated app |
| Loyalty and referrals | Smile.io / Yotpo |
| Email and SMS flows | Klaviyo |
| B2B approval workflow and company provisioning | Shopify B2B + provisioning app |
| Advanced bundle discounting | Shopify Functions app |

**The manage-subscription screen in the prototype is rendered by the subscription app's portal,
not by the theme.** `sections/main-account.liquid` has a **Subscription portal URL** setting that
links out to it cleanly. Do not attempt to rebuild it in Liquid — the theme cannot know real
billing state.

---

## 10. Known limitations

Three things a future developer should know before they hit them.

**1. Free-shipping threshold and Shopify Markets.** The threshold in theme settings is entered
in the store's default currency and compared against `cart.total_price`, which is in the
*presentment* currency. A store selling in one currency is fine. A store selling in several
should either set a per-market translation of `sections.cart.free_shipping_label` or turn the
bar off. See `snippets/free-shipping-bar.liquid`.

**2. COA batch lookup scales to hundreds, not thousands.** By default every `coa_batch` record
is rendered into the page as JSON and matched in the browser — instant, no backend. Past a few
hundred batches that payload gets heavy. The section has an **External endpoint** setting: fill
it in and the form posts the batch number to your own app or COA provider instead, and the
inline JSON is not rendered at all.

**3. The mega menu matches by title.** The header's mega menu block finds its menu item by
comparing titles, case-insensitively. Rename the menu item and you must update the block's
**Top-level menu item** setting to match. This is the trade-off for letting a merchant attach a
mega menu to any nav item without a code change.

---

## Seed content

Populate the development store with the prototype's exact content so the build can be reviewed
truthfully. Copy all body copy, headings, product descriptions and blog articles from the
prototype verbatim — the section presets in this theme already carry the prototype's copy as
defaults.

| Product | Price | Flavours | Sizes |
|---|---|---|---|
| Whey Isolate | $69 | Vanilla, Chocolate, Salted Caramel | 1kg, 2kg |
| Creatine Monohydrate | $39 | Unflavoured | 300g, 600g |
| Pre-Workout | $59 | Blue Raspberry, Mango, Watermelon | 30 serves |
| Greens Complex | $54 | Mint, Berry | 30 serves |
| Magnesium Sleep | $34 | Unflavoured | 60 caps |
| Electrolyte Hydration | $29 | Lemon, Grapefruit | 30 sticks |

Collections: five goal collections (Muscle & Strength, Endurance, Recovery, Sleep, Daily
Health), plus format collections and Best Sellers.

The Pre-Workout dose records from the prototype, for reference:

| Ingredient | Our dose | Studied dose | Industry average |
|---|---|---|---|
| L-Citrulline Malate | 8.00 g | 8 g | 3.04 g (38%) |
| Beta-Alanine | 3.20 g | 3.2 g | 1.09 g (34%) |
| Betaine Anhydrous | 2.50 g | 2.5 g | 0.70 g (28%) |
| L-Tyrosine | 1.50 g | 2 g | 0.50 g (25%) |
| Caffeine Anhydrous | 200 mg | 200 mg | 120 mg (60%) |
| L-Theanine | 200 mg | 250 mg | 75 mg (30%) |
