# Age Gate Lint — UK Online Safety Act age assurance

![Age Gate Lint — UK Online Safety Act](https://getreadystack.com/img/promo/sku119983_result_card.jpg)

Open an HTML file that carries an age gate. The extension reads the markup and the inline
script, and names every part of that gate which Ofcom does not count as **highly effective
age assurance**, with the line number and the clause it fails.

## What the duty actually says

The Online Safety Act 2023 requires services that publish or host content harmful to
children — pornography, and the priority categories that include vapes, alcohol, gambling
and knives — to use highly effective age assurance. Ofcom's guidance has applied since
**25 July 2025**. The guidance is explicit about what does not qualify: self-declaration
("I am over 18"), a birth date typed by the visitor, general disclaimers ("by entering this
site you confirm…"), and payment methods that under-18s can also hold. The listed methods
that do qualify include photo-ID matching, facial age estimation, open banking, mobile
network operator checks and digital identity wallets. Enforcement sits with Ofcom, whose
penalty ceiling is £18 million or 10% of qualifying worldwide revenue, whichever is greater.

Most age gates on small storefronts were written before any of this and still decide
everything in the browser. That is the gap this tool reads for.

## The 8 rules

| rule | what it catches |
| --- | --- |
| `self_declared_click` | a tick box or button where the visitor answers for themselves |
| `dob_self_entry` | a date-of-birth field used as the gate |
| `client_side_gate` | the pass kept in `localStorage` / `sessionStorage` |
| `long_lived_pass` | a cookie `max-age` of months or years, so the check never repeats |
| `gate_removed_in_browser` | restricted markup already in the DOM, uncovered by a class toggle |
| `payment_card_as_proof` | a card treated as proof of age |
| `disclaimer_only` | a warning sentence standing in for a check |
| `no_assurance_provider` | a page that gates on its own, with no listed method anywhere in it |

Each finding carries a severity, the line, the Ofcom clause, and one sentence on what the
gate would have to do instead.

## Free and full

The free command reads **the file you have open** and finishes that job: every weak point in
that page, named. The full version reads **every HTML file in the workspace in one pass** and
writes a dated evidence report you keep — the file list, the findings per file, the rule set
and the date it was run.

## Yardstick

A freelance web developer bills about $60/hour, and a manual pass over one storefront's gate
plus a written note is roughly half a day.

## Same brain in the browser

The rule engine (`ext/engine.js` + `ext/rules.json`) is the same file that runs the free web
page, so a finding here and a finding there are the same finding.

Hub: https://getreadystack.com/tools/age-gate-lint

## Limits

This reads markup and inline script. It cannot see your server, so a page that gates
correctly server-side and ships no restricted markup reads as clean — which is the point.
It is a lint, not legal advice.
