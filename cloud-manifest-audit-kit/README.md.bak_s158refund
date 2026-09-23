# Manifest Snippets + Removed-API Audit (8 Sets)

![Manifest Snippets + Removed-API Audit (8 Sets)](https://getreadystack.com/img/promo/sku9753_result_card.jpg)

**Your editor does not reject a removed apiVersion. The cluster does, at deploy time.**

AKS supports a GA Kubernetes version for twelve months. When your cluster is about to fall out of that window it is upgraded for you — and a PodDisruptionBudget still on `policy/v1beta1` is refused, a CronJob still on `batch/v1beta1` silently never runs again. Your editor never said a word about either.

This pack says it, on the line, while you are typing it.

```yaml
apiVersion: policy/v1beta1          #  ← flagged, line 1
kind: PodDisruptionBudget
---
image: registry.internal/api:latest #  ← flagged, line 9
serviceAccountName: default         #  ← flagged, line 10
DB_PASSWORD: hunter2supersecret     #  ← flagged, line 14
```

**28 rules** across 8 file families — Kubernetes and Helm, Azure IoT Edge, MicroProfile and Liberty, T-SQL, MAUI, R — and **40 snippet blocks** written against the API versions that still exist.

## Free, and complete for the file you have open

- The open manifest is checked whole against **all 28 rules**, with line numbers
- **All 40 blocks** expand at the cursor
- Every rule and every prefix is listed on demand

No key. No limit. No watermark, no trial counter, nothing held back.

## With a licence — the same rules, at repo scale

| | Free | Licence |
|---|---|---|
| Rules that run | all 28 | all 28 |
| How much is checked | the open file | **every file in the workspace** |
| Your team's own rules | — | **banned registries, required labels** |
| Findings leave as a file | — | **CSV, JSON or HTML report** |

A licence changes the **scale**, never the quality of the check.

**[Unlock the whole-repo scan — $29 once](https://buy.polar.sh/polar_cl_0EI3dcWH2UgJOSuTbAEdRrIUxrnBcdXX6Sa2T2EJ5og)**

A managed Kubernetes security platform starts at $45 per developer per month. A 2026 cloud security-audit hour benchmarks at $275. This is $29, once — 7-day refund.

## Install

```
ext install cloud-manifest-audit-kit
```
