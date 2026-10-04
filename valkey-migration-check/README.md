# Valkey Migration Check — ElastiCache Redis ties

![Valkey Migration Check — ElastiCache Redis ties](https://getreadystack.com/img/promo/sku424870_result_card.jpg)

Finds every line in your Terraform, CloudFormation, compose files and Dockerfiles that still ties you to Redis, and prints the Valkey line that replaces it.

Worked example: a 44-line `main.tf` returns 6 findings (3 errors, 3 warnings): a `redis5.0` parameter group, ElastiCache Redis OSS 5.0.6 and 4.0.10 (billed an 80% Extended Support premium since February 1, 2026), Redis OSS 6.2 (standard support ends January 31, 2027), a serverless cache on the redis engine and a `redis:7.4-alpine` image.

Web version and source list: https://getreadystack.com/tools/valkey-migration-check

## Before → after on the bundled main.tf

| Line | Redis line | Valkey fix |
|---|---|---|
| 4 | `family = "redis5.0"` | `family = "valkey8"` |
| 11 | `engine_version = "5.0.6"` | `engine = "valkey"` · `engine_version = "8.0"` |
| 20 | `engine_version = "4.0.10"` | `engine = "valkey"` · `engine_version = "8.0"` |
| 28 | `engine_version = "6.2"` | `engine = "valkey"` · `engine_version = "8.0"` |
| 35 | `engine = "redis"` (serverless) | `engine = "valkey"` |
| 42 | `image = "redis:7.4-alpine"` | `image = "valkey/valkey:8-alpine"` |

The fixed `main.tf` returns 0 findings.

## What it checks — 8 rules

| Rule | Severity | What it flags |
|---|---|---|
| elasticache-redis-oss-4-5 | error | `engine_version` / `EngineVersion` 4.x or 5.x on a redis ElastiCache cache — Extended Support billing since February 1, 2026 |
| elasticache-redis-oss-6 | warning, error from February 1, 2027 | Redis OSS 6.x — standard support ends January 31, 2027 |
| redis-4-5-parameter-group | error | `family = "redis5.0"`, `default.redis4.0`, `CacheParameterGroupFamily: redis5.0` |
| redis-6-7-parameter-group | warning | redis6.x / redis7 parameter group families |
| serverless-cache-on-redis | warning | ElastiCache Serverless on the redis engine |
| node-cache-on-redis-7 | warning | node-based cache on redis 7.x or with no pinned version |
| redis-image-source-available | warning | `redis:7.4+`, `redis:8`, `redis:latest` images in compose, Dockerfile, Kubernetes or ECS definitions |
| redis-stack-image | warning | `redis/redis-stack` and `redis/redis-stack-server` images |

The "as of" date changes the answer: before February 1, 2027 Redis OSS 6 is a warning, from that day an error; from February 1, 2028 the Redis OSS 4/5 message names the 160% year-3 premium.

## The yardstick

AWS's own example: a cache.m5.large node on Redis OSS 5 in US East (Ohio) costs $0.156/hr on demand, and Extended Support adds $0.1248/hr (80%) in years 1 and 2 — reserved-node discounts do not apply to that charge. AWS prices node-based ElastiCache for Valkey 20% lower and ElastiCache Serverless for Valkey 33% lower than the other engines.

## Sources

- ElastiCache Extended Support dates and premiums: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/extended-support-versions.html
- Extended Support charge example and reserved nodes: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/extended-support-charges.html
- Valkey pricing: https://aws.amazon.com/elasticache/pricing/
- Redis licences: https://redis.io/legal/licenses/

## Free and full version

Free: all 8 rules on the open file, in VS Code and on the web page, with the Valkey fix on every finding and no cap.

Full version ($29 once, one licence key per person or team seat): [scan every repo in the workspace and export a dated Markdown migration plan per repo](https://getreadystack.com/api/buy/cl/polar_cl_FdHdA1K6PeelujKUjhH82L91vARLJU65PFD1602Uq9C), each Redis tie mapped to its Valkey line.

## Commands

- **Check this file** — runs all 8 rules on the open `*.tf`, `*.yaml`, `*.yml`, `*.template`, `Dockerfile*` or `devcontainer.json`.
- **Sweep workspace and write report** — full version.
- **Enter licence key** — unlocks the workspace sweep.

Findings appear in the Problems panel with the rule id, the line and the fix. Nothing leaves your machine.
