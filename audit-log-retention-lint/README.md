# Audit Log Retention Lint (PCI DSS, CERT-In)

![Audit Log Retention Lint (PCI DSS, CERT-In) — finds the line](https://getreadystack.com/img/promo/audit-log-retention-lint_demo.gif)

![Audit Log Retention Lint (PCI DSS, CERT-In)](https://getreadystack.com/img/promo/sku303425_result_card.jpg)

Your log pipeline is written in YAML, and the number that decides whether your audit trail survives an assessment is one line in it: `retention_period: 744h`, `RetentionInDays: 30`, `--audit-log-maxage=30`. This extension reads those lines in the file you have open and tells you, with the line number, which ones delete logs sooner than the rule you are held to.

Tool page: https://getreadystack.com/tools/audit-log-retention-lint

## What it checks (9 rules)

| Rule | Where it looks |
|---|---|
| loki-retention-period | Grafana Loki `limits_config.retention_period` |
| loki-stream-period | Loki `retention_stream` `period` overrides |
| log-group-retention-days | `RetentionInDays` (AWS::Logs::LogGroup, SAM), Serverless `logRetentionInDays`, Azure `retentionInDays` |
| gcp-bucket-retention-days | Config Connector `LoggingLogBucket` `retentionDays` |
| ilm-delete-min-age | Elasticsearch ILM / OpenSearch ISM delete phase `min_age` |
| k8s-audit-log-maxage | kube-apiserver `--audit-log-maxage` |
| s3-log-expiration | S3 lifecycle `ExpirationInDays` on a log, audit or trail bucket |
| s3-cold-transition | S3 lifecycle transition to GLACIER or DEEP_ARCHIVE before the immediately-available window ends |
| cert-in-region | `region` / `location` outside India when the file declares the cert-in profile |

Durations are read the way the tools read them: `744h` is 31 days, `8760h` is 365 days, `90d`, `2w` and `1y` all work, plain integers are days.

## Which rule applies

Put one comment line at the top of the file. Without it the extension uses PCI DSS.

```yaml
# log-retention: pci-dss, cert-in
```

| Profile | Source | Minimum |
|---|---|---|
| pci-dss | PCI DSS v4.0.1 Requirement 10.5.1 | audit log history at least 12 months, the most recent three months immediately available (365 / 90 days) |
| cert-in | CERT-In Directions of 28 April 2022 under s.70B(6) IT Act, direction (iv) | logs of all ICT systems for a rolling 180 days, kept within Indian jurisdiction |
| m-21-31 | OMB Memorandum M-21-31 | 12 months active storage plus 18 months cold storage (913 days total, 365 active) |

When several profiles are listed, the strictest minimum wins for each check.

## Example

The sample file `_fixtures/dirty.yaml` (Loki, CloudFormation, S3, kube-apiserver and ILM in one file) returns 7 findings under PCI DSS: 6 errors and 1 warning. Loki `retention_period: 744h` is 31 days against 365; the payments stream override `period: 168h` is 7 days; `RetentionInDays: 30`; an S3 audit bucket that moves logs to GLACIER after 30 days and deletes them after 180; `--audit-log-maxage=30`; and an ILM delete phase at `min_age: 90d`. The fixed file returns 0.

## What is free and what needs a key

Free, no key: every finding in the open file, in the Problems panel, with the clause and the value that passes. The same engine runs in the browser at the tool page.

With a licence key: the workspace sweep, which walks every YAML file in the folder and writes one Markdown evidence table (file, line, value, minimum, clause) you can hand to a QSA or an auditor. [Licence key](https://buy.polar.sh/polar_cl_73892EssmeKJZXapgXXgmOIMw47IdPQLP1lWX0gxfLm) · $29 once · one licence key per person or team seat.

Yardstick: one hour of a lawyer with 15 years' experience is $851 on the DOJ Fitzpatrick Matrix (billing year 2026).

## Limits

The extension reads configuration text. It does not query your cloud account, so a retention changed in a console after deploy is not seen. It does not decide whether a system is in PCI scope. It does not know about retention set in Terraform HCL or JSON policies unless they are in a YAML file.

## Commands

- Check this file
- Sweep workspace and write report (licence)
- Enter licence key
