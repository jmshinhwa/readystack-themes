# TLS Cert Lifetime Lint

![TLS Cert Lifetime Lint - SC-081v3 renewal check](https://getreadystack.com/img/promo/sku30369_result_card.jpg)

Finds the 12 settings that break when public TLS certificates fall to 100 days on 2027-03-15: openssl -days, Terraform, cert-manager, late expiry alerts, HPKP, TLS 1.0/1.1, SHA-1, RSA-1024.

## What it finds

```
openssl req -x509 -newkey rsa:1024 -sha1 -days 365 -nodes -keyout edge.key -out edge.crt

resource "tls_self_signed_cert" "edge" {
  validity_period_hours = 8760
}

spec:
  duration: 8760h

- alert: CertExpiringSoon
  expr: cert_expiry_days < 14

# runbook: public TLS certificates are valid for 398 days, so we renew once a year.
```

## What it does for free

- Names the exact date each setting stops working - 2026-03-15 (200 days), 2027-03-15 (100 days), 2029-03-15 (47 days)
- Reads openssl commands, Terraform, cert-manager YAML, nginx and Apache config, Go tls.Config and Prometheus alert rules
- Shows every finding in the open file with its line number - nothing is held back or blurred
- Catches runbooks and comments that still quote the retired 397, 398 or 825-day maximum
- Separates what is already broken today from what breaks on the next milestone

## With a licence

- **The whole repository, not one open file** — Opens every file in the workspace, honouring max_files and exclude_glob.
- **Take the findings away as CSV, JSON or HTML** — Writes the report into the workspace so it can go to a ticket or an auditor.
- **CI JSON a pipeline can fail on** — Writes machine-readable findings so a pull request is blocked before merge.

[**Get the full version - $29**](https://buy.polar.sh/polar_cl_SnmEdHDa8OjzORnIjOry1XW7LZozu9qDBYIIc1eBSB5) - $29 once, one licence key per person or team seat, 7-day full refund.

Full workspace sweep and report: free for 7 days from your first sweep, then a licence key.


## Install

```
ext install tls-cert-lifetime-lint
```
