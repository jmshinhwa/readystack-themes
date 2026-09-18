# Payment Page Script Audit (PCI 6.4.3)

![PCI DSS 6.4.3 Payment Page Script Inventory Auditor](https://getreadystack.com/img/promo/sku20312_result_card.jpg)

Lists every script on your checkout page that has no integrity hash, no authorisation and no written justification - the three things PCI DSS 6.4.3 has required since 31 March 2025.

## What it does for free

- Check the open checkout page or template against all 22 rules and list every finding with its line number
- Check only the lines you select, for templates that assemble several includes
- List every rule that ships inside, so you can see exactly what was checked and what was not

## With a licence

- **Scan every template in the repository, not only the file that is open** — Requirement 6.4.3 covers every payment page you serve. One pass over the repository lists the scripts on all of them instead of you opening files one at a time.
- **Write the script inventory out as CSV, JSON or HTML** — Bullet three of 6.4.3 asks for a maintained written inventory. This writes it into the workspace as a file you can keep, diff and hand to your assessor.
- **Machine-readable output so the check can run in CI** — Requirement 11.6.1 asks for the check at least once every seven days. Running this in CI on a schedule is how a weekly check stops depending on someone remembering.

[Get the full version - $49](https://buy.polar.sh/polar_cl_3JweRl77lj7Lnb2RWmPjP2DpCF71WE5AcU4xO1lrAFh) - $49 once, one licence key per person or team seat, 7-day full refund.


## Install

```
ext install payment-page-script-audit
```
