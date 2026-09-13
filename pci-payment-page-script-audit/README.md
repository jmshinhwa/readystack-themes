# PCI Payment Page Script Audit

![PCI Payment Page Script Audit: requirement 6.4.3 and 11.6.1 on your checkout markup](https://getreadystack.com/img/promo/sku17800_result_card.jpg)

PCI DSS 4.0.1 requirements 6.4.3 and 11.6.1 have been mandatory since 2025-03-31, and the PCI SSC revised FAQ 1331 on 2026-08-04 so a QSA agreement alone no longer marks them not applicable. This reads a checkout page and names every script that has no authorization method, no integrity method and no inventory row.

## What it finds

```
checkout.html
   5  error  CSP lives in a <meta> tag - report-uri and report-to are ignored there, so 11.6.1 can never alert.
   5  error  script-src allows https: - every host on the internet is an authorized script source.
   7  error  googletagmanager.com - a container can add a script after the inventory was signed (6.4.3).
   9  error  jquery@latest - a moving version, so no integrity hash stays true between assessments.
  10  error  static.hotjar.com - a session recorder on a page that has a card field.
  11  info   js.stripe.com - loaded without SRI on purpose; needs an inventory row, not a hash.
  22  error  document.createElement("script") - SRI does not apply, and no scan of the HTML can see it.
```

## What it does for free

- Audit the open checkout page against all 26 script-security rules, with the line number, the PCI requirement it fails and the fix
- Audit just the block of markup you selected
- Reopen the last findings panel

## With a licence

- **Export the dated 6.4.3 script inventory as CSV, JSON or HTML** — Writes the inventory into the workspace as a file with a date on it - the artifact an assessor asks for and a findings panel can never be.
- **Audit every payment page in the repository in one pass** — An inventory has to cover all payment pages, not the one template you happen to have open - checkout, wallet, subscription-update and the partials they include.
- **Machine output your CI can fail a build on** — Emits JSON with a non-zero exit when an unauthorized script appears, so a new marketing tag cannot reach production between assessments.
- **Re-audit on every save** — Runs the same 26 rules when the template is saved, so a pasted snippet is caught while it is being written.
- **Add your own rules and script allowlist** — Your approved vendor domains and your internal patterns run alongside the 26 that ship inside.

Full workspace sweep and report: free for 7 days from your first sweep, then a licence key.

## Install

```
ext install pci-payment-page-script-audit
```
