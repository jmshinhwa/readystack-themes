# Opt-Out Signal Lint

![Opt-Out Signal Lint for US State Privacy Laws](https://getreadystack.com/img/promo/sku33667_result_card.jpg)

Finds the ad and analytics code that keeps firing after a visitor’s browser has already sent Global Privacy Control.

## What it finds

```
// analytics/tags.js
export function boot(user, region) {
  if (navigator.doNotTrack === '1') return;
  gtag('consent', 'default', { ad_storage: 'granted', ad_user_data: 'granted' });
  gtag('config', 'AW-11423998', { allow_google_signals: true });
  fbq('init', '318844221', { em: user.email, ph: user.phone });
  ttq.load('CJK4L3BC77U');
  if (region === 'CA') showLink('Do Not Sell My Personal Information');
}
```

## What it does for free

- Audit the open file against all 20 rules — every line, no cap
- Audit just the lines you selected
- Read every rule and the corrected code it suggests

## With a licence

- **Whole-workspace sweep** — every file in the repository, not only the one you have open
- **CSV, JSON or HTML report** — the finding list as a file you own, for the ticket or the auditor
- **CI gate** — machine-readable output and an exit code, so a fixed leak cannot merge back in

Osano, the nearest hosted consent platform, starts at $199/month.

[**Get the full version — $29**](https://buy.polar.sh/polar_cl_gj151VTqWFpXoYSJLn1MtTGUJrDV3N8bEeFLH4cORhY) - $29 once, one licence key per person or team seat, 7-day full refund.

Full workspace sweep and report: free for 7 days from your first sweep, then a licence key.


## Install

```
ext install optout-signal-lint
```
