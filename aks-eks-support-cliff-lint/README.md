# AKS LTS & EKS Extended Support Lint for Terraform

![AKS LTS & EKS Extended Support Lint for Terraform](https://getreadystack.com/img/promo/sku326983_result_card.jpg)

Checks `aws_eks_cluster` and `azurerm_kubernetes_cluster` blocks in your `.tf` files against the published EKS and AKS Kubernetes version calendars, and tells you which clusters are already paying the extended-support rate, which ones AWS will upgrade on its own, and which AKS clusters ask for Long Term Support on a tier that does not include it.

Web version (same engine, runs in the browser): https://getreadystack.com/tools/aks-eks-support-cliff-lint

Yardstick: an EKS cluster in extended support is billed $0.60 per cluster-hour instead of $0.10 — $365 a month, $4,380 a year, per cluster. AKS Premium tier (required for LTS) is $0.60 per cluster-hour against $0.10 for Standard.

## Why this exists

`terraform validate` and `terraform plan` accept `version = "1.32"` on an EKS cluster without comment. When there is no `upgrade_policy` block, AWS defaults the cluster to `EXTENDED`, and billing switches to the extended rate at the start of the day standard support ends (UTC). Nothing in the plan output changes. On AKS, `support_plan = "AKSLongTermSupport"` is only available on `sku_tier = "Premium"`, and a version past community end of life without LTS gets platform support only: no Kubernetes security patches and no new clusters at that version.

## What it checks (9 rules)

| Rule | Severity | Fires when |
|---|---|---|
| eks-extended-billing | error | EKS version is past end of standard support and the policy is EXTENDED or missing; reports dollars billed so far |
| eks-forced-upgrade-soon | error | extended support ends within 90 days |
| eks-past-extended | error | version past extended support, or STANDARD policy past standard support (auto-upgrade) |
| eks-cliff-soon | warning | standard support ends within 90 days |
| aks-lts-needs-premium | error | `AKSLongTermSupport` without `sku_tier = "Premium"` |
| aks-out-of-support | error | AKS version past community end of life with LTS off |
| aks-lts-ended | error | AKS version past its LTS end of life |
| aks-eol-soon | warning | community end of life within 90 days, LTS off |
| aks-premium-unused | info | Premium tier bought for LTS while the version is still in community support |

## Calendars used (checked 2026-09-27)

EKS (end of standard / end of extended): 1.31 2025-11-26 / 2026-11-26 · 1.32 2026-03-23 / 2027-03-23 · 1.33 2026-07-29 / 2027-07-29 · 1.34 2026-12-02 / 2027-12-02 · 1.35 2027-03-27 / 2028-03-27 · 1.36 2027-08-02 / 2028-08-02. Source: docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html

AKS (community end of life / LTS end of life): 1.29 2025-03-31 / 2026-04-30 · 1.30 2025-08-22 / 2026-07-31 · 1.31 2025-11-01 / 2026-11-30 · 1.32 2026-03-31 / 2027-03-31 · 1.33 2026-07-31 / 2027-07-31 · 1.34 2026-11-30 / 2027-11-30 · 1.35 2027-03-31 / 2028-03-31 · 1.36 2027-06-30 / 2028-06-30 · 1.37 2027-10-31 / 2028-10-31. Month-only dates are the last day of that month, as Microsoft defines them. Source: learn.microsoft.com/azure/aks/supported-kubernetes-versions

## Worked example (sample file clusters.tf, today = 2026-09-27)

| Line in clusters.tf | Finding and fix |
|---|---|
| payments: `version = "1.32"`, no upgrade_policy | $2,256 extra since 2026-03-23; move to 1.35 or later |
| batch: `version = "1.31"`, EXTENDED | $3,660 extra since 2025-11-26; move to 1.35 or later |
| batch: extended ends 2026-11-26 | forced control-plane upgrade in 60 days |
| web: `version = "1.34"`, STANDARD | auto-upgrade on 2026-12-02 (66 days) |
| core: AKSLongTermSupport on Standard | LTS needs sku_tier = "Premium" |
| legacy: `kubernetes_version = "1.33.2"`, no LTS | past 2026-07-31 end of life |
| analytics: Premium + LTS on 1.35 | community support until 2027-03-31; Standard saves $365 a month |

## Free and full version

Free: lint the open `.tf` file, all 9 rules, every message, no key. Full version: scan the whole workspace and export a per-cluster CSV of fees, cliff dates and fixes for a platform or FinOps review — [get the full version](https://buy.polar.sh/polar_cl_h4hStvanMbFQkOvKD4EQ6BWS54rfLlOpDYCBB0UJnAI).

## Commands

Open the Command Palette and type the extension name to run the check on the active `.tf` file.

Prices are AWS and Azure list prices per cluster-hour in USD; your contract may differ.
