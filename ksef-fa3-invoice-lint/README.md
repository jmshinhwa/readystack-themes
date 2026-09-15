# KSeF FA(3) Invoice Lint

![KSeF FA(3) Invoice Lint](https://getreadystack.com/img/promo/sku68045_result_card.jpg)

Reads a Polish KSeF structured invoice XML and names every line the gateway will reject — with the value the FA(3) schema wants instead. Same engine in the editor and on the free web page: <https://getreadystack.com/tools/ksef-fa3-invoice-lint>

## Why this exists

Since 2026-02-01 KSeF accepts only the FA(3) structure (large taxpayers), and since 2026-04-01 it is the standard for every other active VAT payer. FA(3) lives at a different CRD template than FA(2): `http://crd.gov.pl/wzor/2025/06/25/13775/`, with `kodSystemowy="FA (3)"`, `wersjaSchemy="1-0E"` and `<WariantFormularza>3</WariantFormularza>`.

Most published examples — and most generated code — still carry the FA(2) namespace and the FA(2) attributes. The gateway does validate, but it answers after the call, with a schema code instead of a line number in your file. This extension answers in the editor, on the line.

The transitional period without financial sanctions runs to the end of 2026. From 2027-01-01 a KSeF failure can carry up to 100% of the VAT amount on the invoice, or 18.7% of the gross amount on a VAT-exempt invoice.

## What it checks — 18 rules

| Rule | What KSeF does with it |
| --- | --- |
| `fa3_namespace` | Root `<Faktura>` must carry `xmlns="http://crd.gov.pl/wzor/2025/06/25/13775/"` |
| `kod_systemowy` | `kodSystemowy="FA (3)"` — one space before the bracket |
| `wersja_schemy` | `wersjaSchemy="1-0E"` |
| `wariant_formularza` | `<WariantFormularza>` must be `3` |
| `data_wytworzenia` | `<DataWytworzeniaFa>` is `xs:dateTime`, not a bare date |
| `nip_format` | `<NIP>` is exactly 10 digits — no `PL`, no dashes |
| `kod_waluty` | `<KodWaluty>` is an ISO 4217 three-letter code |
| `p_1_data` | `<P_1>` is `yyyy-mm-dd`, not `dd.mm.yyyy` |
| `p_2_numer` | `<P_2>` invoice number present and non-empty |
| `rodzaj_faktury` | `VAT`, `KOR`, `ZAL`, `ROZ`, `UPR`, `KOR_ZAL`, `KOR_ROZ` |
| `decimal_comma` | Amounts use a dot — a locale comma is unparseable |
| `amount_space` | No thousands separators inside amount elements |
| `encoding_utf8` | Declaration must say `encoding="UTF-8"` |
| `adnotacje_flags` | `P_16`, `P_17`, `P_18`, `P_18A` each present and `1` or `2` |
| `korekta_ref` | A `KOR*` invoice must reference `<DaneFaKorygowanej>` |
| `placeholder_data` | Sample identifiers such as `1234567890` left in the file |
| `podmiot_nazwa` | `Podmiot1` and `Podmiot2` each identified with a name |
| `penalty_clock` | Counts the errors and the days left before 2027-01-01 |

## Measured on the shipped fixtures

- `_fixtures/clean.xml` — a valid FA(3) invoice: **0 findings**.
- `_fixtures/dirty.xml` — the same invoice as an ERP would emit it from FA(2)-shaped code: **23 findings, 22 of them blocking**, across 16 of the 18 rules. Six of those lines are the ones almost every generated file gets wrong: the namespace, `kodSystemowy`, `WariantFormularza`, the `PL 526-231-11-82` NIP, `5166,00` instead of `5166.00`, and a date-only `DataWytworzeniaFa`.
- Run on 2026-09-14, the `penalty_clock` line reads: *22 blocking errors, 109 days before KSeF penalties resume on 2027-01-01.*

## Free and full

Free, and complete on its own: one file — the invoice XML open in the editor, or pasted into the web page — with every finding, line numbers and the wanted value. No key, no account.

The full version works on a different axis, scope: `KSeF FA(3): Sweep Workspace` runs every invoice XML in the folder in one pass and writes a dated `REPORT.md` — file, line, rule, found value, wanted value — that you keep as your own record for the 2027 penalty regime.

Full version — $29 once, one licence key per person or CI seat, 7-day full refund: <https://buy.polar.sh/polar_cl_JEQ1km4V0rbblgu9hwXyGlYM9I06o2ERzguUP2O8bd9>

Yardstick: a mid-size KSeF ERP integration in Poland costs PLN 10,000 to PLN 50,000 and takes 2 to 4 months; most of that time is spent making the XML pass validation.

## Commands

- `KSeF FA(3): Check This File` — lint the active XML.
- `KSeF FA(3): Sweep Workspace` — every invoice XML plus the written report (full version).

## Sources

- FA(3) schema, CRD template `2025/06/25/13775`, mandatory from 2026-02-01 and 2026-04-01.
- Ministry of Finance: no financial sanctions during 2026; penalties from 2027-01-01, up to 100% of the invoice VAT (18.7% of gross on VAT-exempt invoices).
- Integration cost range: ELTE-S, *Ile kosztuje wdrożenie KSeF w 2026 roku*.

Not tax advice. Verify against the current Ministry of Finance publication before you file.
