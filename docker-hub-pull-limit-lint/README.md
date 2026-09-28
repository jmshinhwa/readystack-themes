# Docker Hub Pull Limit Lint

![Docker Hub Pull Limit Lint — finds the line](https://getreadystack.com/img/promo/docker-hub-pull-limit-lint_demo.gif)

![Docker Hub Pull Limit Lint](https://getreadystack.com/img/promo/sku324640_result_card.jpg)

Finds every **anonymous Docker Hub pull** in GitHub Actions workflows, docker-compose files, GitLab CI, Kubernetes manifests and Dockerfiles, including the service containers that your `docker/login-action` step never covers.

Docker Hub limit (docs.docker.com/docker-hub/usage/pulls, checked 2026-09-27): **100 pulls per 6 hours per IPv4 address or IPv6 /64 subnet** for unauthenticated pulls, 200 per 6 hours for a signed-in Personal account, unlimited for Pro, Team and Business. A multi-arch image counts one pull per architecture. When the quota runs out the pull fails with `toomanyrequests`.

Web version and details: https://getreadystack.com/tools/docker-hub-pull-limit-lint

## Why a login step is not enough

GitHub Actions pulls **service containers**, the **job container** and **`docker://` action images** while the job is set up, before step one. A `docker/login-action` step cannot authenticate those pulls. They need a `credentials:` block on the container itself.

## What it checks (10 rules)

| Rule | File | Flags |
|---|---|---|
| gha-service-no-credentials | workflow | `services.*.image` on Docker Hub with no `credentials:` |
| gha-container-no-credentials | workflow | `container:` on Docker Hub with no `credentials:` |
| gha-docker-uri-action | workflow | `uses: docker://` image on Docker Hub |
| cli-pull-before-login | workflow, compose, GitLab CI | `docker pull/run/create` with no Docker Hub login earlier in the job |
| login-registry-not-hub | workflow | login goes to another registry while the job pulls from Docker Hub |
| self-hosted-shared-ip | workflow | self-hosted runners share one NAT IP quota |
| dockerfile-from-hub | Dockerfile | `FROM` a Docker Hub image (stage names skipped) |
| compose-image-hub | compose | `image:` resolving to docker.io |
| k8s-image-hub-no-pull-secret | Kubernetes | Docker Hub image with no `imagePullSecrets` |
| gitlab-image-hub-no-auth | GitLab CI | image with no `DOCKER_AUTH_CONFIG` or Dependency Proxy prefix |

An image counts as Docker Hub when it has no registry host (`node:20`, `hadolint/hadolint`) or its host is docker.io, index.docker.io, registry-1.docker.io or registry.hub.docker.com. Images with `${{ }}` or `$VAR` are skipped.

## Measured on the sample ci.yml

| Line that pulls anonymously | Fix |
|---|---|
| `container: node:20-bookworm` | credentials: on the job container |
| `image: postgres:16` (service) | credentials: on the service |
| `image: redis:7-alpine` (service) | credentials: or a mirror registry |
| `docker run hadolint/hadolint:v2.12.0` | docker/login-action before it |
| `uses: docker://koalaman/shellcheck:v0.10.0` | run: step after the login |
| `docker pull python:3.12-slim` | docker/login-action before it |

Six findings on the sample; 0 on the corrected version.

## Usage

Open a `.yml`, `.yaml` or `Dockerfile` and run **Docker Hub Pull Limit Lint — CI rate limit guard: Check this file** from the Command Palette. Findings appear in the Problems panel with the line and the fix.

Free: lint the open file with all 10 rules. Licence: scan the whole workspace in one run and export a Markdown pull inventory report. [Get the full version](https://buy.polar.sh/polar_cl_xEh5IeTeNYGk8do3WVOUYZxBSCx2BseojEiBQ38O9Ky): $29 once, one licence key per person or team seat.

Yardstick: Docker Pro is $9 per user per month billed yearly ($108 a year), and it only lifts the limit for pulls that log in.

## Source

Limits: https://docs.docker.com/docker-hub/usage/pulls/ · GitHub Actions `jobs.<job_id>.services.<service_id>.credentials` and `jobs.<job_id>.container.credentials`.
