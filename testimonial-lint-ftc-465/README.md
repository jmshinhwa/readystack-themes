# Testimonial Lint: FTC Fake Review Rule

![Testimonial Lint: FTC Fake Review Rule — finds the line](https://getreadystack.com/img/promo/testimonial-lint-ftc-465_demo.gif)

![Testimonial Lint: FTC Fake Review Rule](https://getreadystack.com/img/promo/sku300598_result_card.jpg)

**AI-drafted landing pages ship fake testimonials.** Testimonial Lint finds them in your source before a US customer (or the FTC) does: placeholder names, stock-photo avatars, lorem-ipsum quotes, hard-coded star ratings, rating-filtered review lists, rewards for 5-star reviews and disclosures hidden in a hover tooltip. 11 rules, each tied to a section of 16 CFR Part 465.

Free web version and docs: https://getreadystack.com/tools/testimonial-lint-ftc-465

## Why now

The FTC's Rule on the Use of Consumer Reviews and Testimonials (16 CFR Part 465, 89 FR 68077) has been in force since October 21, 2024. A knowing violation can cost up to **$53,088 per violation** (FTC Act 5(m)(1)(A), 16 CFR 1.98(d)); there was no inflation bump for 2026 (OMB M-26-11), so the 2025 figure still applies. Section 465.2 covers testimonials that misrepresent that the reviewer exists or used the product, and 465.1(a) counts a solo freelancer as a business.

## What it checks

| # | Rule | Severity | Section | What breaks | Fix |
|---|------|----------|---------|-------------|-----|
| 1 | `placeholder-reviewer` | error | 16 CFR 465.2(a)(1) | Placeholder reviewer name in a testimonial | Use the real customer's name (with consent on file) or remove the quote |
| 2 | `stock-avatar` | error | 16 CFR 465.2(a)(1) | Random stock face used as the reviewer's photo | Use the customer's own photo with permission, or initials |
| 3 | `placeholder-quote` | error | 16 CFR 465.2(a)(3) | Lorem-ipsum text shipped as a customer quote | Replace with the customer's own words, verbatim, from your records |
| 4 | `todo-fake-review` | error | 16 CFR 465.2(a) | Code marks these testimonials as made-up or generated | Delete them until real reviews exist; keep proof for each one you publish |
| 5 | `hardcoded-aggregate-rating` | warning | 16 CFR 465.2(b) | Hard-coded aggregateRating in JSON-LD | Compute ratingValue and reviewCount from the reviews actually submitted |
| 6 | `hardcoded-rated-testimonial` | warning | 16 CFR 465.2(b) | Star rating typed into source next to a quote | Load ratings from your review store, or keep the signed original for each |
| 7 | `verified-badge-static` | warning | 16 CFR 465.2(a)(2) | Static 'verified' badge not tied to an order | Show the badge only when an order record for that reviewer exists |
| 8 | `rating-filter-suppression` | error | 16 CFR 465.7(b) | Reviews filtered by star rating before display | Show all ratings, or filter only on neutral criteria (spam, abuse, off-topic) |
| 9 | `sentiment-incentive` | error | 16 CFR 465.4 | Reward offered for a 5-star or positive review | Offer the reward for any honest review, never tied to the rating |
| 10 | `hover-only-disclosure` | error | 16 CFR 465.1(c)(4) | Relationship disclosure hidden in a hover tooltip | Print the disclosure as visible text right next to the quote |
| 11 | `insider-testimonial` | warning | 16 CFR 465.5(b)(1) | Testimonial from your own staff or founder | Add a visible disclosure next to the quote, e.g. 'Written by our employee' |

## Sample result

On the bundled sample `Testimonials.jsx` (a typical AI-drafted testimonials section) the 11 rules give **13 findings: 8 errors and 5 warnings**. The clean sample, which loads reviews from a store, shows every rating and prints disclosures as visible text, gives 0.

## How to use

1. Open any `.html`, `.jsx`, `.tsx`, `.js`, `.ts`, `.vue`, `.svelte`, `.astro`, `.json`, `.md` or `.mdx` file.
2. Run **Testimonial Lint: FTC Fake Review Rule: Check this file** from the Command Palette. Findings appear in the Problems panel with the line, the section and the fix.
3. Fix the line, run it again.

The same engine runs in the browser at https://getreadystack.com/tools/testimonial-lint-ftc-465: paste the component, press Check.

## Free and licensed

Free, with no key: all 11 checks on the open file, every finding shown. Licensed: **Sweep workspace and write report** scans every matching file at once and writes a Markdown evidence report (file, line, section, fix) that you can hand to a lawyer or a client. $29 once, one licence key per person or team seat: [workspace sweep + evidence report](https://buy.polar.sh/polar_cl_PkYzWwsUX6ZktOMwUx6r9kzjgB9cqUmnzw40q2UCiVW).

## Yardstick

A 15-year litigator bills $851/hour on DOJ's Fitzpatrick Matrix (billing year 2026). This tool does not replace legal advice; it gives that hour a list of lines to read.

## Limits

Pattern checks cannot prove a testimonial is real or fake. A warning means "keep the proof": the signed original, the order record, the consent. Endorsement Guides (16 CFR Part 255) questions such as family relationships are out of scope.
