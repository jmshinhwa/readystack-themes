# Resend Migration Check: SendGrid code lint

![Resend Migration Check: SendGrid code lint — finds the line](https://getreadystack.com/img/promo/resend-migration-check_demo.gif)

![Resend Migration Check: SendGrid code lint](https://getreadystack.com/img/promo/sku405904_result_card.jpg)

Finds the Twilio SendGrid lines in your JavaScript, TypeScript and Python code that break when you move to Resend, and prints the Resend line to write instead, next to the line number.

Hub page: https://getreadystack.com/tools/resend-migration-check

## Why this exists

Twilio SendGrid retired its free Email API plan starting May 27, 2025 (source: https://www.twilio.com/en-us/changelog/sendgrid-free-plan); new accounts get a 60-day trial and paid Essentials plans start at $19.95 a month. Many projects are moving their transactional mail to Resend, which has a similar send call. The send call is the easy part. The lines that hurt are the ones with no Resend field: they still run, and they fail without an error.

## What it checks (18 rules)

| SendGrid line | Resend line |
|---|---|
| `require('@sendgrid/mail')`, `from sendgrid import ...` | `require('resend')`, `import resend` |
| `SENDGRID_API_KEY` | `RESEND_API_KEY` (a `re_` key) |
| `sgMail.setApiKey(key)`, `SendGridAPIClient(...)` | `new Resend(key)` |
| `https://api.sendgrid.com/v3/mail/send` | `POST https://api.resend.com/emails` with a flat body |
| `sendMultiple`, `personalizations` | `resend.batch.send([...])`, up to 100 emails per call, up to 50 addresses in `to` |
| `templateId: 'd-...'`, `dynamicTemplateData` | rebuild the template on Resend or send rendered `html` / `react` |
| `sendAt` (Unix seconds) | `scheduledAt` (ISO 8601 string); a hard-coded past timestamp is flagged against the date you set |
| `categories`, `customArgs` | `tags: [{ name, value }]` |
| `asm: { groupId }` | no field: keep your own suppression list |
| `trackingSettings` | open/click tracking is set per domain on Resend |
| `mailSettings.sandboxMode` | no field, so the email is really sent: use `delivered@resend.dev` in tests |
| `ipPoolName` | no field |
| `X-Twilio-Email-Event-Webhook-Signature`, `EventWebhook` | Svix headers `svix-id`, `svix-timestamp`, `svix-signature` |
| `e.event === 'bounce'`, `case 'spamreport':` | `e.type === 'email.bounced'`, `'email.complained'` |

Files that never mention SendGrid stay silent, and comment lines are skipped.

## Measured on the sample file

The sample `order-mail.js` (a Node.js receipt mailer with a bounce webhook, shipped in `_fixtures/dirty.js`) returns eight findings: the package import, `SENDGRID_API_KEY`, `setApiKey`, the `d-` template id, `sendAt`, the `asm` group, `sandboxMode`, and the `event === 'bounce'` branch. The migrated version (`_fixtures/clean.js`) returns zero.

## Free and full version

- Free: run **Resend Migration Check: Check this file** on the open file. Every finding shows in the Problems panel with its Resend replacement. No key, no limit.
- Full version: scans the whole workspace and exports one migration plan, every SendGrid use mapped to its Resend replacement, file by file. $29 once, one licence key per person or team seat: https://getreadystack.com/api/buy/cl/polar_cl_xOhImPHSteHX7SqaXxIkCtTMR6Nmb2Cvb947U0otllF

Yardstick: staying on SendGrid's paid Essentials plan starts at $19.95 a month.

The same engine runs in the free web version on the hub page: paste a file, pick a date, read the findings.
