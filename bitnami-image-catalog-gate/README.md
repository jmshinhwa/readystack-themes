# Bitnami Image Gate: Compose, Helm, Dockerfile

![Bitnami Image Gate: Compose, Helm, Dockerfile — finds the line](https://getreadystack.com/img/promo/bitnami-image-catalog-gate_demo.gif)

![Bitnami Image Gate: Compose, Helm, Dockerfile](https://getreadystack.com/img/promo/sku321056_result_card.jpg)

Finds the Bitnami image lines in your docker-compose files, Helm values and Dockerfiles that broke on **2025-09-29**, when Bitnami moved every versioned `docker.io/bitnami` tag into the frozen `docker.io/bitnamilegacy` archive.

Hub page and free web version: https://getreadystack.com/tools/bitnami-image-catalog-gate

Yardstick: Bitnami Secure Images, the subscription that keeps versioned Bitnami tags, is reported at $50,000 to $72,000 per year (Minimus, iits-consulting).

## What changed on 2025-09-29

- Versioned tags such as `bitnami/postgresql:15.4.0` left the public `docker.io/bitnami` catalog and now live under `docker.io/bitnamilegacy`.
- `docker.io/bitnamilegacy` receives no further updates. CVEs fixed after the move stay open there.
- Free images under `docker.io/bitnami` are published for development on the `latest` tag only.
- A cluster with the image cached keeps running. The failure waits for the next fresh node, autoscaling event, new CI runner or cache eviction, and then shows as `ImagePullBackOff` / `manifest unknown`.

## The 7 rules

| Rule | Severity | What it flags |
|---|---|---|
| BN01 | error | `image:`, `FROM`, `docker run/pull` with a versioned `docker.io/bitnami` tag |
| BN02 | error | any `bitnamilegacy/...` image (frozen, no updates) |
| BN03 | error | Helm values: `repository: bitnami/<app>` with a version `tag:` within the next five lines |
| BN04 | warning | Bitnami image with no tag or `:latest` (free tier is latest-only, for development) |
| BN05 | warning | `allowInsecureImages: true` (disables the chart's image verification) |
| BN06 | warning | Bitnami image pinned by `@sha256` digest from the old catalog |
| BN07 | info | chart pulled from `charts.bitnami.com/bitnami` or `oci://registry-1.docker.io/bitnamicharts` |

BN01 and BN03 carry the change date. With a check date before 2025-09-29 they drop to warnings marked "breaks on 2025-09-29"; from that date on they are errors.

## Measured on the bundled samples

The `dirty.yaml` sample (a docker-compose file plus a Helm `values-prod.yaml`) returns 6 findings, 4 errors and 2 warnings:

| Broken line | Fix |
|---|---|
| `image: bitnami/postgresql:15.4.0` | mirror the tag into your own registry |
| `image: docker.io/bitnami/redis:7.2` | upstream `redis:7.2` |
| `image: bitnamilegacy/kafka:3.6.1` | frozen archive: move to a maintained image |
| `image: bitnami/nginx@sha256:3f1a…` | re-resolve the digest from your mirror |
| `allowInsecureImages: true` | keep only for your own verified mirror |
| `repository: bitnami/mongodb` + `tag: 7.0.5` | override `image.registry` and `image.repository` |

The `clean.yaml` sample, with every image moved to a private mirror or an upstream image, returns 0 findings.

## How to use

1. Open a `docker-compose.yml`, `values.yaml` or `Dockerfile`.
2. Run **Bitnami Image Gate: Compose, Helm, Dockerfile: Check this file** from the Command Palette.
3. Each finding names the rule, the line, the image and the fix.

Comment lines starting with `#` are skipped. Nothing leaves your machine; the check runs locally.

## Free and full version

Free: scan the open Dockerfile, Compose or Helm values file and see every broken Bitnami line with its fix, no key needed.

Full version: scan every file in the workspace at once and export one Markdown migration report (file, line, image, replacement). $39 once, one licence key per person or team seat. [Get the full version](https://buy.polar.sh/polar_cl_FqAtCAEM5VWUyQWBiwGyJjkmmRDq7gGad7pln3lLDJl)

## Sources

- Bitnami announcement: https://github.com/bitnami/containers/issues/83267
- Bitnami charts announcement: https://github.com/bitnami/charts/issues/35164
- Pricing reports: https://www.minimus.io/post/the-bitnami-pricing-changes-what-you-need-to-know and https://iits-consulting.de/en/blog/the-great-bitnami-shift-what-the-new-costs-and-licenses-mean-for-end-users
