# EN 18031 / PSTI Device Config Lint

![EN 18031 / PSTI Device Config Lint](https://getreadystack.com/img/promo/sku56722_result_card.jpg)

Since **1 August 2025**, radio and connected devices placed on the EU market have to meet the cybersecurity requirements of **Delegated Regulation (EU) 2022/30** under the Radio Equipment Directive — Article 3(3)(d) network protection, 3(3)(e) personal data and privacy, 3(3)(f) protection from fraud. The harmonised standards cited for those three limbs are **EN 18031-1, EN 18031-2 and EN 18031-3**. In the UK, the **PSTI** regime has been in force since **29 April 2024**: no universal default passwords, a published vulnerability-reporting contact, and a published minimum period for security updates. Enforcement sits with the OPSS, and the penalties in the PSTI Act 2022 reach **10 million pounds or 4% of qualifying worldwide revenue**.

Most of that verdict is decided by files you already have in the repository: the device manifest, the shipped `device.yaml` / `prj.conf` / `mosquitto.conf` defaults, the OTA block, the `#define`s in firmware headers. This extension reads those files and names, per line, which requirement they fail and which clause the fix belongs to.

## What it checks — 19 rules

**RED Art. 3(3)(d) / EN 18031-1 — network protection and secure update**
`telnet_enabled` · `default_password` · `hardcoded_credential` · `anonymous_mqtt` · `update_signature_off` · `update_over_http` · `open_wireless` · `debug_interface_on`

**RED Art. 3(3)(e) / EN 18031-2 — personal data and privacy**
`tls_verification_disabled` · `telemetry_without_consent` · `plaintext_upload` · `pii_in_logs`

**RED Art. 3(3)(f) / EN 18031-3 — protection from fraud**
`control_api_unauthenticated`

**UK PSTI Schedule 1**
`missing_security_contact` (para. 2) · `missing_support_period` (para. 3) · `support_period_lapsed` (para. 3, compared against today's date)

**Citations that are wrong rather than missing**
`wrong_harmonised_standard` — EN 303 645 is the ETSI consumer-IoT baseline, not a harmonised standard under the delegated regulation.
`en18031_part_missing` — EN 18031 cited with no part; the parts are not interchangeable.
`stale_red_date` — the requirements were deferred to 1 August 2025 by (EU) 2023/2444; a plan still carrying August 2024 was never revisited.

## Measured on the bundled fixtures

`_fixtures/dirty.yaml` is a 39-line shipped-defaults file for a fictional cellular gateway. The lint returns **19 findings — 15 errors and 4 warnings**, each with a line number. `_fixtures/clean.yaml` is the same device configured correctly and returns **0 findings**. The `support_until: 2026-06-30` line in the dirty fixture reports as lapsed 75 days before 2026-09-13; change the date and the finding changes with it, because the rule is evaluated against today, not against a fixed string.

## Commands

- **EN 18031 / PSTI: Check This File** — lints the file in the active editor and lists every finding with its line and clause.
- **EN 18031 / PSTI: Scan Workspace and Export Evidence Pack** — walks every matching config in the workspace and writes a dated report (Markdown + CSV) mapping each finding to its article and clause, for your own file and for the test lab. This one asks for a licence key: <https://buy.polar.sh/polar_cl_emwwfBdWf6ejmN3mkS2he4RXewtmFcnVjaJqB4T0s7P>

## Scope

A lint is not a conformity assessment. It reads text and reports what the text says, which is the part a person burns a half day on before anyone opens a standard. Judgement, testing and the declaration of conformity stay with you and your notified body.

Hub page: <https://getreadystack.com/tools/en18031-psti-lint>

Licence: see LICENSE.txt.
