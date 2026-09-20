# WordPress Privacy Lint (GDPR / DSGVO)

![WordPress Privacy Lint (GDPR / DSGVO)](https://getreadystack.com/img/promo/sku49970_result_card.jpg)

Your plugin's privacy duties are not the site owner's problem. When a WordPress site gets a
GDPR Art. 15 export request, WordPress walks every registered
`wp_privacy_personal_data_exporters` callback. If your plugin never registered one, the rows in
your custom table are simply not in the export, and the site owner is the one who answers for it.
The same goes for Art. 17 erasure, for the raw IP you wrote into that table, and for the font
stylesheet you enqueued from Google's servers.

This extension reads WordPress plugin and theme PHP and reports the **12 author-side rules** below.
It is a plain static check: a regex rule set, no network calls, no telemetry, nothing sent anywhere.

## The 12 rules

| Rule | What it looks for | Why |
| --- | --- | --- |
| `privacy-exporter-missing` | stores data, no `wp_privacy_personal_data_exporters` filter | GDPR Art. 15 · WP 4.9.6 privacy tools API |
| `privacy-eraser-missing` | stores data, no `wp_privacy_personal_data_erasers` filter | GDPR Art. 17 |
| `policy-content-missing` | collects data, never calls `wp_add_privacy_policy_content()` | site owner's policy cannot name your storage |
| `raw-ip-stored` | `$_SERVER['REMOTE_ADDR']` without `wp_privacy_anonymize_ip()` | an IP is personal data — CJEU Breyer, C-582/14 |
| `user-agent-stored` | raw `HTTP_USER_AGENT` | device fingerprint, GDPR Art. 4(1) |
| `google-fonts-server-side` | `fonts.googleapis.com` / `fonts.gstatic.com` | LG Muenchen I, 3 O 17493/20, 20 Jan 2022 — EUR 100 damages |
| `third-party-cdn-enqueue` | jsDelivr, unpkg, cdnjs, code.jquery.com, ajax.googleapis.com | visitor IP leaves before consent; also a WordPress.org review blocker |
| `analytics-injected` | GTM, GA, `gtag(`, `fbq(` from PHP | ePrivacy Art. 5(3) · TDDDG Sec. 25 |
| `phone-home-no-consent` | `wp_remote_post`/`get` to a hardcoded external URL | WordPress.org Detailed Plugin Guideline 7 · GDPR Art. 44 transfer |
| `cookie-before-consent` | `setcookie(` with no consent check on the line | ePrivacy Art. 5(3) · TDDDG Sec. 25 |
| `external-embed-no-consent` | YouTube, Vimeo, Google Maps embeds printed directly | contacts the provider on page load |
| `uninstall-cleanup-missing` | creates storage, no `register_uninstall_hook` / `uninstall.php` | GDPR Art. 5(1)(e) storage limitation |

## Measured on the bundled fixtures

`_fixtures/dirty.php` is a 38-line contact-form plugin of the kind an AI assistant writes when you
ask for "a WordPress form plugin that logs submissions". It produces **12 findings — 8 errors and
4 warnings** — one per rule. `_fixtures/clean.php` is the same plugin with the duties met, and
produces **0 findings**. Those two files are the yardstick: run them yourself before you trust the
rule set on your own code.

## Free scope

The free check covers one file completely. Open any PHP file, run
**WordPress Privacy Lint: Check this file**, and you get all 12 rules with the article and the fix
for each hit. Nothing is hidden, watermarked, time-limited or counted down. The same 12 rules also
run in the browser, with nothing installed:
<https://getreadystack.com/tools/wordpress-privacy-lint>

## Full version

The licence key adds a different axis, not a bigger slice of the same one: one run across **every**
PHP file in the plugin, and a dated audit report (Markdown and JSON) that you keep — for the
WordPress.org review reply and for your Art. 30 records. $29 once, one licence key per person or
team seat, 7-day full refund. Yardstick: a DSGVO code review by a German IT-law firm is commonly
billed at EUR 200 per hour. <https://buy.polar.sh/polar_cl_sZ2Bgyx7lAEhKmhzceABGE3rRlKWXaJxUrjPm48Q1KV>

## Not what this is

It is not legal advice, and it is not a consent-banner plugin. It reads your source and tells you
which of the 12 duties the source does not meet. Whether your processing has a lawful basis under
Art. 6 is a question for a lawyer, not a linter.
