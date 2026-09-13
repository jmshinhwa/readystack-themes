# Base Image EOL Lint

![Base Image EOL Lint - Dockerfile and CI end-of-life check](https://getreadystack.com/img/promo/sku29827_result_card.jpg)

Marks every base image in your Dockerfiles, compose files and CI workflows whose security patches have already stopped - or stop before 13 November 2026 - and prints the tag that replaces it.

## What it finds

```
# web/Dockerfile
FROM node:20-alpine
# api/Dockerfile
FROM python:3.10-slim
# .github/workflows/ci.yml
    runs-on: ubuntu-20.04
# docker-compose.yml
    image: postgres:14
# services/report/Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0

```

## What it does for free

- Checks the whole file you have open against all 21 rules
- Checks just the lines you select
- Every finding carries a severity and the tag that replaces it
- Lists all 21 rules with the dates behind them

## With a licence

- **Every Dockerfile, compose file and workflow in the repository** — One command reads the whole workspace instead of the file you have open, so a 40-service monorepo answers in one pass.
- **A dated CSV, JSON or HTML report** — Writes the findings to a file you can attach to a change ticket or an audit record, with the date it was produced.
- **JSON output that fails the build** — Machine-readable findings so a CI job can block a merge that reintroduces an unpatched base image.

[**Get the full version - $29**](https://buy.polar.sh/polar_cl_brZKgBkvnYrEIMElB5Ynt5gGEnqmTjvx9r9ZX3ljztR) - $29 once, one licence key per person or team seat, 7-day full refund.

Full workspace sweep and report: free for 7 days from your first sweep, then a licence key.


## Install

```
ext install base-image-eol-lint
```
