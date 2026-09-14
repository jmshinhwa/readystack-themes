# Kubernetes Removed API Lint

![Kubernetes Removed API Lint](https://getreadystack.com/img/promo/sku53222_result_card.jpg)

Your assistant writes a Deployment. It writes `apiVersion: extensions/v1beta1`, because that is what most of the Kubernetes YAML ever published says. That apiVersion stopped being served in **Kubernetes 1.16**. `kubectl apply` answers `no matches for kind "Deployment" in version "extensions/v1beta1"` — and it answers that only on the cluster that already moved, which is usually the production one, usually mid-rollout.

This extension reads the manifest open in your editor and names every apiVersion the API server no longer serves, the minor release that removed it, and what replaces it.

## The 15 rules

| Removed in | What the lint catches |
|---|---|
| 1.16 | `extensions/v1beta1`, `apps/v1beta1`, `apps/v1beta2` workloads → `apps/v1` |
| 1.16 | `scheduler.alpha.kubernetes.io/critical-pod` → `priorityClassName` |
| 1.22 | `networking.k8s.io/v1beta1` Ingress → `networking.k8s.io/v1` (the backend block changed shape too) |
| 1.22 | `apiextensions.k8s.io/v1beta1` CRD → `apiextensions.k8s.io/v1`, one structural schema per version |
| 1.22 | webhooks, RBAC, CSRs, Leases, PriorityClass on `v1beta1` → `v1` |
| 1.22 / 1.27 | `storage.k8s.io/v1beta1`, and `CSIStorageCapacity` in 1.27 |
| 1.25 | `batch/v1beta1` CronJob → `batch/v1` |
| 1.25 | `policy/v1beta1` PodDisruptionBudget → `policy/v1` |
| 1.25 | PodSecurityPolicy, removed outright → Pod Security Admission labels |
| 1.25 | the seccomp alpha annotations stopped being honoured — the pod runs unconfined and nothing errors |
| 1.25 / 1.26 | `autoscaling/v2beta1`, `autoscaling/v2beta2` HPA → `autoscaling/v2` |
| 1.25 | `events.k8s.io`, `discovery.k8s.io`, `node.k8s.io` `v1beta1` → `v1` |
| 1.26 / 1.29 / 1.32 | `flowcontrol.apiserver.k8s.io` `v1beta1`, `v1beta2`, `v1beta3` → `v1` |
| — | `apps/v1` workload with no `spec.selector`: apps/v1 requires it and never defaults it |
| — | deprecated node labels and the `kubernetes.io/ingress.class` annotation |

## What it found in the sample bundle

The bundle in `_fixtures/dirty.yaml` is eight ordinary objects for one service. The lint reports **11 findings** over **6 distinct removed apiVersions**, and the oldest removal is **1.16** — so that bundle has not applied cleanly to a default cluster in a long time. `_fixtures/clean.yaml` is the same eight objects on current apiVersions and reports **0**.

## Why a cluster does not warn you first

`kubectl apply` validates against the cluster you are pointing at, not the one you will have after the upgrade. A manifest that still works is not a manifest that is current — deprecated APIs stay served for several releases and then stop, and managed control planes upgrade on the provider's calendar. Kubernetes ships three minor releases a year and patches each for about 14 months, so a chart that sat still for two years has usually crossed at least one removal line.

The lint runs offline, on the text in front of you, with no cluster connection and no `kubectl` context. It never contacts your API server.

## Free and licensed

Free, no key: check the manifest open in the editor against all 15 rules and get the replacement apiVersion for every hit. That is a finished answer for that file.

Licensed: sweep every manifest in the workspace and write one dated migration report, ordered by removal version, for the whole chart repo. Same 15 rules, workspace scope. $29 once, one licence key per person or CI seat, 7-day full refund.

A freelance Kubernetes consultant bills about 120 US dollars an hour, and reading one chart repo for beta apiVersions before an upgrade is most of a day.

More tools: https://getreadystack.com/tools/k8s-removed-api-lint
