# SQL Server Docker Licence Lint (MSSQL_PID)

![SQL Server Docker Licence Lint (MSSQL_PID) — finds the line](https://getreadystack.com/img/promo/mssql-container-licence-lint_demo.gif)

![SQL Server Docker Licence Lint (MSSQL_PID)](https://getreadystack.com/img/promo/sku322126_result_card.jpg)

Checks the `mcr.microsoft.com/mssql/server` containers in your docker-compose files, Kubernetes YAML and Dockerfiles for SQL Server licence gaps, and prints the list-price exposure next to each one.

Measured on the sample compose file shipped with this extension: an 8-core production container with MSSQL_PID unset: $60,492 Enterprise or $15,780 Standard.

Web version and rule notes: https://getreadystack.com/tools/mssql-container-licence-lint

## Why this exists

The official image reads its edition from one environment variable. Docker Hub documents it as `MSSQL_PID (default: Developer)`. Leave it out, and a production database quietly runs an edition that Microsoft licenses for development and test only. Code assistants copy the `docker run` example from the documentation, which sets `MSSQL_PID='Developer'`, straight into production compose files. A licence audit counts the cores that container could use.

## What it checks (13 rules)

| Rule | What it flags | Source |
|---|---|---|
| pid_unset | image with no MSSQL_PID, so it runs Developer | Docker Hub: MSSQL_PID (default: Developer) |
| pid_developer_prod | Developer, StandardDeveloper or EnterpriseDeveloper in a file that says prod / production / live | Microsoft editions page |
| pid_evaluation | Evaluation edition | Evaluation edition is available for 180 days |
| pid_web | Web edition outside a hosting (SPLA) agreement | Microsoft pricing page: Web is hosting only |
| pid_enterprise_legacy | legacy Enterprise (Server + CAL) PID, capped at 20 cores | Microsoft MSSQL_PID table |
| product_key_committed | a #####-#####-#####-#####-##### key in the repository | Microsoft MSSQL_PID table |
| core_minimum | fewer than 4 CPUs on a paid edition: a 2-CPU Standard container is billed 4 core licences: $7,890 | four core licences per virtual OSE |
| no_cpu_limit | paid edition with no CPU limit: every host core must be licensed | Microsoft 2022 pricing page |
| standard_core_cap | Standard above 24 cores (2022) or 32 cores (2025): 40 CPUs on Standard 2022: 16 cores that do no work, $31,560 | Microsoft editions page |
| express_core_cap | Express above 4 cores (1,410 MB buffer pool, 50 GB database) | Microsoft editions page |
| eula_missing | no ACCEPT_EULA, so the container exits on start | Microsoft environment variables page |
| tag_unpinned | `:latest` or no tag, so edition limits can change under you | 2022 vs 2025 tables |
| pid_2025_only | StandardDeveloper / EnterpriseDeveloper on a pre-2025 image | Microsoft MSSQL_PID table |

Yardstick used for every dollar figure: SQL Server 2022 list price, Enterprise $15,123 and Standard $3,945 per 2-core pack. Cores are rounded up to 2-core packs with the 4-core minimum applied.

## Worked example

```yaml
services:
  orders-db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - ACCEPT_EULA=Y
      - ASPNETCORE_ENVIRONMENT=Production
    deploy:
      resources:
        limits:
          cpus: "8"
```

Result: `pid_unset` on line 3, with an 8-core production container with MSSQL_PID unset: $60,492 Enterprise or $15,780 Standard. Add `MSSQL_PID=Standard` (or `EnterpriseCore`) and the finding goes away. Pick the edition you actually own licences for.

## Free and full version

Free, no key: Every finding and the per-container list-price exposure for the open file, in the editor and in the free web page, with no key.

Full version: Workspace sweep: every compose, Kubernetes and Dockerfile in the workspace checked at once, with a written Markdown report of each SQL Server container finding and its list-price exposure, ready to hand to a licence auditor. One licence key per person or team seat, $29 once: https://buy.polar.sh/polar_cl_DzCbdny3aDGMKFdMkOdguhRSGbgiNeZeNnCSh0b7UhV

## Limits

This is a lint, not legal advice. It reads the files and has no view of your Microsoft agreement, Software Assurance or licence mobility rights. Treat every dollar figure as list-price exposure. What you actually owe depends on your agreement.
