# Kinetic Labs theme — what you can change yourself

Everything in this guide is done in **Online Store → Themes → Customise**, or in
**Settings → Custom data**. None of it needs a developer.

If you want something that isn't in here, ask before anyone edits code — there is a good chance
it already exists as a setting you haven't found.

---

## The short version

| I want to… | Where |
|---|---|
| Change a colour | Theme settings → Colours |
| Change a heading, price, or any words on a page | Click the section in the editor |
| Add, remove or reorder anything on a page | Drag the sections and blocks in the left panel |
| Change how much space a section takes up | That section → Section padding |
| Change a dose, ingredient or nutrition figure | Settings → Custom data → Metaobjects |
| Change what the filters on a collection page are | The Search & Discovery app |
| Change the legal disclaimer | Theme settings → Compliance |

---

## 1. Colours

**Theme settings → Colours.**

The theme ships with four **colour schemes**. Every section has a **Colour scheme** setting, so
you change a section's whole look by picking a different scheme — you never set a colour on an
individual section.

| Scheme | Looks like |
|---|---|
| `scheme-1` | The default warm off-white page |
| `scheme-surface` | The slightly darker "raised" band, used for the label comparison |
| `scheme-inverse` | Dark graphite with light text, used for the subscribe banner |
| `scheme-support` | Deep sage with light text |

Inside each scheme you can change:

- **Background**, **Raised surface**, **Hairline** — the surfaces
- **Body text**, **Muted text** — the two text weights
- **Accent** — clay orange. Buttons and links.
- **Support** — sage. Secondary badges.
- **Data** — electric blue. **This one is reserved for dosage figures.** Don't use it for
  buttons, links or decoration; the whole point is that when a customer sees blue, it's a
  number.

> **Before you change a colour, check the contrast.** The palette that shipped was tuned so
> every text colour is legible against every background it can land on (WCAG AA, 4.5:1). Paste
> your new colour and the background into any contrast checker; if it comes back under 4.5,
> some customers won't be able to read it.

---

## 2. Type

**Theme settings → Typography.**

Three faces do three jobs:

- **Display** (Fraunces) — headings, used sparingly
- **Body** (Inter) — everything you read
- **Data** (JetBrains Mono) — every price, dose, serving count and nutrition value

You can adjust:

- **Heading scale** (90–130%) and **Body scale** (90–120%) — nudges the whole system at once,
  without breaking how text resizes on phones
- **Heading weight** — light, regular or medium
- **Data letter spacing**

**Use the Kinetic Labs brand fonts** is on by default. Turning it off swaps in fonts from
Shopify's library — useful if brand fonts ever change, but the layout is tuned for these three.

The data face itself is fixed. That's deliberate: it has *tabular figures*, meaning every digit
is the same width, so columns of doses and prices line up. A proportional font would make the
supplement facts panel look ragged.

---

## 3. Spacing and layout

**Theme settings → Layout** sets the global frame: page width, side padding (separately for
mobile and desktop), corner radius, border thickness, and the base spacing unit that every gap
in the theme is a multiple of.

**Every section has its own padding controls** — top and bottom, for desktop and mobile
independently. They're at the bottom of each section's settings, under **Section padding**.
This is how you tighten or open up a page without touching anything else.

---

## 4. Building pages

Every page is built from **sections** you can add, remove and drag into any order. There are
41 of them. The ones specific to this brand:

| Section | What it does |
|---|---|
| **Dosage panel** | The signature comparison bars. Pick a product; the bars come from its dose records. |
| **Key ingredients** | Ingredient name, dose and one-line mechanism, from the product's metafield |
| **Supplement facts** | The nutrition panel, as a real table |
| **Ingredient philosophy** | The "typical label vs our label" side-by-side |
| **Goal grid** | The five training-goal tiles |
| **Certification strip** | The badge row, with an optional batch-lookup field |
| **Review highlight** | Testimonial cards (or your review app's live widget) |
| **Subscribe promo** | The savings banner |
| **Product quiz** | The five-step finder |
| **Testing process** | Numbered process steps |
| **COA lookup** | Batch-number search |
| **Ingredient index** | The full glossary grid |

Plus the usual: rich text, image with text, multi-column, slideshow, video, newsletter, FAQ,
collapsible content, blog posts, Instagram grid, and an **Apps** section for anything an app
provides.

### The product page

The right-hand column of the product page is made of **blocks** you can reorder or remove
individually: breadcrumb, title, rating, positioning line, flavour picker, size picker,
purchase options, quantity, add to cart, trust row, inventory status, share.

Don't like the quantity selector above the button? Drag it below. Don't want a share link?
Delete the block. Everything below the fold — ingredients, dosage bars, supplement facts, how
to use, FAQ, reviews, recommendations — is a separate section you can reorder the same way.

---

## 5. Product content

The content that makes this brand's product pages work lives in **metafields**, not in the
theme. Edit it on the product itself, under **Metafields** at the bottom of the product page in
your admin.

| Field | What it drives |
|---|---|
| Positioning line | The one-liner under the product title |
| Servings per container | Price per serving, everywhere it appears |
| Serving size | The supplement facts caption |
| Supplement facts | The nutrition table |
| Key ingredients | The "What's in it, and why" section |
| Dose comparison | The dosage bars |
| Allergens / Certifications / Banned-substance tested | The small-print section and trust row |
| How to use | Timing and stacking |
| Goal tags | Which goal filter the product appears under |
| Product FAQ | The product's own questions |

> **Price per serving is calculated, never typed.** It's the price divided by servings per
> container, worked out fresh every time the page loads. Change the price and it updates itself.
> If a 2kg tub has a different serving count from the 1kg, set **Servings per container** on the
> *variant* as well as the product.

### Shared content: metaobjects

**Settings → Custom data → Metaobjects.** These are written once and reused everywhere:

- **Ingredient** — name, how it works, clinical dose, research links. Each one gets its own page.
- **Dose record** — our dose vs the studied dose vs the industry average. This is what draws the bars.
- **Nutrient row** — one line of a supplement facts panel.
- **Certification** — badge, name, description.
- **FAQ entry** — a question and answer you can attach to any product or page.
- **COA batch** — batch number, test date, certificate PDF.

Add a new ingredient once and it's available to every product, and it appears on the glossary
page automatically.

---

## 6. Things that are deliberately not editable

A few things are locked down on purpose. If one of them is blocking you, that's a conversation
worth having rather than a setting worth adding.

- **The supplement facts panel is a real table, never an uploaded image.** An image of a
  nutrition panel can't be found by Google, can't be translated, can't be read aloud by a
  screen reader, goes blurry when zoomed, and needs a designer every time a figure changes.
  If you have a panel as artwork, the figures need typing into metaobjects once.
- **The data colour is reserved for figures.** See section 1.
- **The regulatory disclaimer can be edited but not removed.** Theme settings → Compliance.
  It's translatable per market under Settings → Languages, so different regions can carry
  different wording.
- **Price per serving can't be typed by hand.** See section 5.

---

## 7. Apps

The theme leaves clean slots for apps rather than half-building their features. After you
install an app, add its block in the editor:

| App type | Where to add its block |
|---|---|
| Reviews (star widget) | Product page → Product information → Add block → your app |
| Reviews (full list) | Product page → the **Apps** section near the bottom |
| Subscriptions | Product page → Product information → Add block |
| Back-in-stock | Product page → Product information → Add block |
| Instagram feed | Add an **Apps** section wherever you want the feed |
| Loyalty / trust badges | Footer → Add block, or an **Apps** section |

Subscription *management* — where a customer skips a delivery or swaps a flavour — is the
subscription app's own portal. Put its URL in **Account section → Subscription portal URL** and
the account page will link out to it.

---

## 8. Multi-market and translation

Every word the theme itself produces lives in the language files, so **Settings → Languages →
Manage translations** covers the entire storefront, including button labels and error messages.

Two market-specific things worth knowing:

- **The announcement bar can target markets.** Each message block has a **Show in market**
  field — enter market handles separated by commas, or leave it blank to show everywhere.
- **The disclaimer is per-market.** Translate it under each market's language.

The country and currency selector can be switched on in the header, the footer, or the
announcement bar.

---

## 9. If something looks wrong

| Symptom | Usual cause |
|---|---|
| Dosage bars missing on a product | No dose records attached to `Dose comparison` on that product |
| No price per serving | `Servings per container` empty on the product (and the variant) |
| No star ratings | Review app not installed, or hasn't synced yet |
| No filters on collection pages | Filters not set up in the Search & Discovery app |
| Flavour swatches not showing | The product's option isn't named `Flavour` — either rename the option, or change the option name in the picker block's settings |
| Ingredient pages 404 | The `ingredient` metaobject doesn't have storefront access turned on |
| Empty section in the editor with a hint message | That section needs metafield content it can't find yet — the hint only shows to you, never to customers |
