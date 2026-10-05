# helm chart lint Chart.yaml — Helm 4 Release Gate

**Every broken Chart.yaml line, with the line that replaces it.** Open a chart folder in VS Code and the Problems panel lists what `helm package` and `helm install` will trip on: a version that is not SemVer 2, an apiVersion v1 chart carrying v2-only fields, an unquoted appVersion YAML turns into a number, a kubeVersion range that only matches Kubernetes minors at or near end of life, and CI files still pinned to Helm 3.

Helm 3 gets bug fixes until 2026-07-08 and security fixes until 2026-11-11 (helm.sh, "Helm 4 Released"). After that date a pipeline that installs Helm 3 runs an unpatched client.

Hub page: https://getreadystack.com/tools/chart-yaml-release-gate

## What the sample chart shows

The bundled sample `Chart.yaml` (a payments-api chart) produces **6 findings** from **16 rules**:

| Line | Found | Replacement |
|---|---|---|
| L1 | `apiVersion: v1` | `apiVersion: v2` |
| L4 | `version: v2.4` (coerced to 2.4.0) | `version: 2.4.0` |
| L5 | `appVersion: 1.10` (read as the number 1.1) | `appVersion: "1.10"` |
| L6 | `kubeVersion: ">=1.25.0 <1.35.0"` (installs only on 1.34, end of life 2026-10-27) | `kubeVersion: ">=1.33.0-0"` (no upper cap below the newest minor) |
| L7 | `owner: platform-team` (not a Chart.yaml field) | `annotations: owner: "platform-team"` |
| L8 | `dependencies:` on a v1 chart | `apiVersion: v2` |

The same chart written to the Helm chart spec produces 0 findings.

## The 16 rules

1. apiVersion missing · 2. apiVersion v1 · 3. apiVersion neither v1 nor v2 · 4. name missing · 5. version missing · 6. version not SemVer 2 · 7. version coerced (leading `v`, fewer than 3 parts) · 8. `dependencies`/`type` on a v1 chart · 9. `type` not application/library · 10. dependency without name or version · 11. unquoted appVersion · 12. kubeVersion matching no supported Kubernetes minor · 13. kubeVersion matching only minors that reach end of life within 90 days · 14. top-level field outside the Chart.yaml spec (use `annotations`) · 15. `deprecated` not a boolean · 16. Helm 3 pinned in CI (`azure/setup-helm` version v3.x, `alpine/helm:3.x`, `HELM_VERSION=3.x`, `get-helm-3`).

Each finding names the line, the reason, and the replacement line.

## Yardstick

`helm lint` checks chart structure; it carries no table of Kubernetes end-of-life dates and no Helm 3 cut-off date. This extension does: Kubernetes 1.28 to 1.37 end-of-life dates from the Kubernetes release calendar, and the Helm 3 dates from helm.sh.

## Sources

- Chart.yaml fields, SemVer 2, apiVersion v1 vs v2, appVersion quoting, kubeVersion syntax, "additional fields are not allowed" since v3.3.2: https://helm.sh/docs/topics/charts/
- Helm 3 support dates: https://helm.sh/blog/helm-4-released/
- Helm 4.0.0 is built against the Kubernetes 1.34 client: https://helm.sh/docs/topics/version_skew/

## Free and team use

Free: every check above, on every Chart.yaml and CI YAML file, in the editor and on the web page, no key.
Team key: a dated Helm 4 readiness report (Markdown + JSON) covering every chart in the repo, plus a CI gate that fails the build on any finding — [team report](https://getreadystack.com/api/buy/cl/polar_cl_kucFyBvi1rLLBezWKPG8aE3rMnxS18iNfQJOg0iedeD).
