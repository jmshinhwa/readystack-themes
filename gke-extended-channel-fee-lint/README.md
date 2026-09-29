# GKE Extended Channel Fee Lint — Terraform

![GKE Extended Channel Fee Lint — Terraform — finds the line](https://getreadystack.com/img/promo/gke-extended-channel-fee-lint_demo.gif)

![GKE Extended Channel Fee Lint — Terraform](https://getreadystack.com/img/promo/sku356776_result_card.jpg)

GKE Extended channel fee check for Terraform. It reads `google_container_cluster` and `google_container_node_pool` blocks in `.tf` files, resolves the pinned GKE minor version (a string, a `var.` default or a `google_container_engine_versions` `version_prefix`) and compares it with the GKE release schedule. Each finding names the fee, the date it starts, the date GKE force-upgrades the cluster and the fix. 14 rules, offline, no account.

Web version (same engine): https://getreadystack.com/tools/gke-extended-channel-fee-lint

Yardstick: Google bills GKE extended support at $0.50 per cluster per hour on top of the $0.10 cluster management fee, $0.60 per cluster per hour in total (GKE pricing page).

## What it found in the sample

The sample 117-line Terraform file in this repository (`_fixtures/dirty.tf`, checked with today = 2026-09-28) gives **15 findings: 10 errors, 3 warnings, 2 info**. Three clusters on the Extended channel are already past end of standard support; over their full extended periods they cost **$10,476** in extended period fees ($3,480 for 1.32, $3,348 for 1.31, $3,648 for 1.33). The fixed file (`_fixtures/clean.tf`, all clusters on 1.35) gives 0.

| Terraform line | Fix |
|---|---|
| `min_master_version = var.gke_version (1.32, EXTENDED)` | $3,480 extended period; upgrade to 1.35 |
| `min_master_version = "1.31.7-gke.1265000" (EXTENDED)` | forced upgrade 2026-10-22; $3,348 period |
| `version_prefix = "1.33." (EXTENDED)` | $3,648 extended period since 2026-08-12 |
| `channel = "UNSPECIFIED"` | removed June 14, 2027; use REGULAR |
| `enable_autopilot = true + EXTENDED` | Autopilot can't enroll; use REGULAR |
| `image_type = "WINDOWS_LTSC_CONTAINERD"` | Windows pools can't use EXTENDED |

## The GKE facts it uses

- Clusters on the Extended release channel can stay on a minor version for up to 24 months: 14 months of standard support, then about 10 more months of extended support.
- During the extended support period Google charges the GKE extended period cluster management fee: **$0.50 per cluster per hour**, in addition to the $0.10 cluster management fee, **$0.60 per cluster per hour in total**. There is no extra charge on the Extended channel during standard support.
- Around 2 months before the end of extended support GKE begins upgrading clusters to the next minor. At the end of extended support it upgrades every cluster still on that minor, regardless of blocking issues, and maintenance exclusions can't be configured past that date.
- "No channel" is deprecated and will be removed on June 14, 2027.
- Autopilot clusters, alpha clusters, explicitly-enabled Kubernetes beta APIs, Windows Server node pools and Config Connector can't be used in the Extended channel.

Release schedule used (end of standard support → end of extended support): 1.30 2025-09-30 → 2026-07-30 · 1.31 2026-01-16 → 2026-10-22 · 1.32 2026-04-27 → 2027-02-11 · 1.33 2026-08-12 → 2027-06-12 · 1.34 2027-01-25 → 2027-11-25 · 1.35 2027-04-11 → 2028-02-11 · 1.36 2027-08-09 → 2028-06-09. Source: cloud.google.com/kubernetes-engine/docs/release-schedule, read 2026-09-28.

## The 14 rules

1. **gke-extended-fee-active** (error) — Cluster "<name>" is on the Extended channel with GKE <minor>, which left standard support on <end of standard support>.
2. **gke-extended-fee-soon** (warn) — Cluster "<name>" is on the Extended channel with GKE <minor>.
3. **gke-forced-upgrade-near** (error) — Cluster "<name>" runs GKE <minor>, whose extended support ends on <end of extended support> ({days} days after {today}).
4. **gke-version-past-extended** (error) — Resource "<name>" pins GKE <minor>.
5. **gke-past-standard-not-extended** (warn) — Cluster "<name>" pins GKE <minor> on the <channel> channel.
6. **gke-no-channel-deprecated** (warn) — Cluster "<name>" sets release_channel to UNSPECIFIED ("No channel").
7. **gke-extended-autopilot** (error) — Cluster "<name>" sets enable_autopilot = true with channel = "EXTENDED".
8. **gke-extended-alpha** (error) — Cluster "<name>" sets enable_kubernetes_alpha = true with channel = "EXTENDED".
9. **gke-extended-beta-apis** (error) — Cluster "<name>" has an enable_k8s_beta_apis block with channel = "EXTENDED".
10. **gke-extended-config-connector** (error) — Cluster "<name>" enables config_connector_config with channel = "EXTENDED".
11. **gke-extended-windows-pool** (error) — Node pool "<name>" uses image_type <image> on cluster "<cluster>", which is on channel = "EXTENDED".
12. **gke-exclusion-past-extended** (warn) — Cluster "<name>" has a maintenance_exclusion ending <date>, after the end of extended support for GKE <minor> (<end of extended support>).
13. **gke-nodepool-past-standard** (warn) — Node pool "<name>" pins version <minor>, which left standard support on <end of standard support> (extended support ends <end of extended support>)..
14. **gke-extended-unpinned** (info) — Cluster "<name>" is on channel = "EXTENDED" without a min_master_version this file can resolve.

The fee figures are computed per cluster: days in the extended period × 24 hours × $0.50. The engine runs on your machine; nothing is uploaded.

## Free and full version

Free: every finding in the open Terraform file, with the GKE minor version, the fee start and forced-upgrade dates and the per-cluster fee, offline.

Full version ($29 once, one licence key per person or team seat): scan every `.tf` file in the workspace in one pass and export one GKE cluster cost report (every cluster, minor, fee and date in one Markdown file) for the upgrade ticket. Get it at https://getreadystack.com/api/buy/cl/polar_cl_EMqu8v3MwsyrOKLl82TkqO4I13cOYHt9ZRsg72h2HKf
