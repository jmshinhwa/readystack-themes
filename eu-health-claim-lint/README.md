# EU Health Claim Lint — Food & Supplement Pages

![EU Health Claim Lint — Food & Supplement Pages](https://getreadystack.com/img/promo/sku131024_result_card.jpg)

Scans the product page you have open — HTML, Markdown or MDX — for nutrition and health
claims that EU food law does not allow, and names the article that stops each one.

An AI writing assistant is a bad place to ask about this. It has read a great deal of food
marketing and very little of the Union Register, so it will happily write *boosts immunity*,
*detox*, *clinically proven* and *blend of EU and non-EU honeys* into a product page. Every
one of those is a finding here.

## What it checks

19 rules, drawn from four instruments:

- **Regulation (EC) No 1924/2006** on nutrition and health claims — Art. 6(1) evidence,
  Art. 9 comparative claims, Art. 10(1) Union Register only, Art. 10(2) accompanying
  information, Art. 10(3) general wellbeing references, Art. 12(b) rate or amount of weight
  loss, Art. 12(c) recommendations by individual health professionals, Art. 28(5)–(6)
  botanicals on hold, and the Annex conditions for nutrition claims.
- **Regulation (EU) No 1169/2011** (FIC) — Art. 7(3): food information must not attribute
  to a food the property of preventing, treating or curing a human disease.
- **Directive 2002/46/EC** on food supplements — Art. 6(3): the three statements that must
  appear on every supplement.
- **Directive (EU) 2024/1438** — the revised honey, fruit juice and jam labelling rules,
  applicable since 14 June 2026. Stock labelled before that date may be sold until it runs
  out. A web page is not stock.

The Annex thresholds are printed in the message, so you can fix the copy without opening
the Official Journal: low fat 3 g/100 g · fat-free 0.5 g/100 g · low sugars 5 g/100 g ·
sugars-free 0.5 g/100 g · source of protein 12 % of energy · high protein 20 % of energy ·
source of fibre 3 g/100 g · high fibre 6 g/100 g · low sodium 0.12 g/100 g ·
source of a vitamin 15 % NRV · high in a vitamin 30 % NRV · *light* and *reduced* need a
30 % difference plus a statement of what was reduced.

## How it behaves

Open a product page and run **EU Health Claim Lint: Check this file**. Findings appear in
the Problems panel on the line that carries the claim, each with the article and the
wording that would be lawful instead.

Rules tied to a date carry a `from` value. Before that date the rule reports as advance
notice; on and after it, at full severity. The date comes from the options passed to the
engine, so the same file can be checked against a past or a future day.

## The measure

Running the two fixtures shipped with this extension: `clean.html` returns 0 findings and
`dirty.html` returns 24 findings — 13 of them outright prohibitions — across 16 of the 19
rules. Those are the numbers quoted anywhere else about this tool.

## Free and paid

Checking the file you have open is the whole job and it is free: every rule, every finding,
every article, no key, no limit.

The paid layer moves on a different axis — scope and ownership. **EU Health Claim Lint:
Export compliance dossier** walks every product page in the workspace and writes one dated
Markdown and CSV dossier, per SKU, with the article citations, that you keep and hand to a
lawyer, a client or an authority. $29 once.

## Hub

https://getreadystack.com/tools/eu-health-claim-lint

## Limits worth knowing

This is a linter, not legal advice. It reads the text on the page; it cannot see your
specification sheet, so a nutrition claim it flags for a missing figure may be perfectly
true — it is telling you the figure is not on the page where a reader or an inspector would
look for it. National rules differ, particularly for botanicals and for the word
*probiotic*, and the tool says so rather than deciding for you.
