# SPF & DMARC Record Lint

![SPF & DMARC Record Lint](https://getreadystack.com/img/promo/sku66280_result_card.jpg)

**DMARC was rewritten on 21 May 2026.** RFC 9989 and RFC 9990 obsoleted RFC 7489, and the `pct=` tag — the one every staged-rollout guide written before 2026 tells you to use — was removed (RFC 9989 Appendix A.6). A receiver following the current spec ignores it. So the record you published as `p=reject; pct=10` is not a 10% experiment any more: it is a full reject on 100% of your mail, and nothing in your zone file, your `dig` output or a language model trained on the old guides will tell you. You find out from the customer whose invoice bounced.

An SPF record that needs eleven DNS lookups has the same shape of problem: it is a perfectly valid line of text, and receivers return **PermError** past ten lookups (RFC 7208 §4.6.4) — which most of them treat as *this domain has no SPF at all*. If DMARC was passing on SPF alignment alone, DMARC fails with it.

This extension reads the records where you actually write them — BIND zone files, Terraform `aws_route53_record` / `cloudflare_record` blocks, Kubernetes and Ansible YAML, `.env` files, docs — and runs **19 checks** against every `v=spf1`, `v=DMARC1` and `v=DKIM1` string it finds. It counts the lookup-costing mechanisms itself (`include`, `a`, `mx`, `ptr`, `exists`, `redirect=`), so you see the number before the record is published, on a domain that does not resolve yet.

Everything runs locally. No DNS queries, no network calls, no telemetry, no account.

## What the 19 checks look for

**DMARC, current spec (RFC 9989 / RFC 9990, IETF, May 2026)** — `pct=` still published, now ignored, so a staged rollout is running at full policy (§A.6) · `t=y` test mode left on, which applies the policy one level below the one you published (§4.7) · `np=none`, which switches off the policy for the non-existent subdomains a spoofer picks first (§4.7) · `rua=` pointing at a mailbox outside your domain, which needs a `_report._dmarc` authorisation record at the destination or the reports are silently dropped (RFC 9990 §4) · no `p=` tag, which under DMARCbis is now read as `p=none` instead of voiding the record (§4.7) · `p=none` · no `rua=` · a record published anywhere other than `_dmarc.<domain>` (§4.5) · `sp=none` under an enforced parent policy.

**SPF** — more than 10 DNS-lookup mechanisms (PermError, RFC 7208 §4.6.4) · 7 or more already spent in the record itself, before nested includes · `+all` or a bare `all` · the deprecated `ptr` mechanism (§5.5) · no `all` and no `redirect=` terminal · a second `v=spf1` record on the same owner name (§4.5) · a single quoted TXT string longer than 255 characters (RFC 1035 §3.3.14).

**DKIM** — an empty `p=` (a revoked key, RFC 6376 §3.6.1) · a `p=` blob short enough to be a 1024-bit key or smaller (RFC 8301 §3.2) · `t=y` test mode left on a live selector.

Every finding names the RFC section, the publishing body and the date, the line number, and the edit that fixes it.

## How it runs

Open a zone file and run **SPF & DMARC Record Lint: Check this file** from the Command Palette. Findings appear in the Problems panel on the exact line, plus a written summary in the output channel. Nothing is limited, timed or watermarked: the file in front of you is checked in full, every time, by all 19 rules.

The workspace sweep — every `*.zone`, `*.tf`, `*.yaml` and `*.txt` in the folder, checked in one pass and written out as one dated Markdown audit report you keep, attach to a change ticket and file as the evidence that the policy was enforced on that date — is the part that asks for a licence key. $29 once, one key per person or CI seat, 7-day full refund: https://buy.polar.sh/polar_cl_lTz1ceauyoB7vrNgatSTcYZd8Oyia1VfFLlxg3fcI1A

A freelance email-deliverability specialist bills $50–$150 an hour, and the first hour goes on reading the records you already have.

## Sample

`_fixtures/dirty.zone` in this repository is a four-record zone of the kind that is usually live. Measured on 2026-09-16: **11 findings — 8 errors and 3 warnings** across 4 records — an SPF record needing 11 DNS lookups with a `ptr` in it, a second `v=spf1` record on the same name ending in `+all`, a DMARC record carrying `pct=10`, `t=y`, `sp=none` and `np=none` with its `rua=` pointed at a vendor domain, and a DKIM selector whose key has been revoked to an empty `p=`. `_fixtures/clean.zone` is the same zone after the fixes: **0 findings** on 3 records.

Free web version, same engine byte for byte: https://getreadystack.com/tools/spf-dmarc-record-lint

Offline. Local. No account.
