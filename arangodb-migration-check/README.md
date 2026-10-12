# ArangoDB Migration Check: Neo4j End-of-Life Map

![ArangoDB Migration Check: Neo4j End-of-Life Map](https://getreadystack.com/img/promo/sku605945_result_card.jpg)

**Six Neo4j ties found in one 23-line docker-compose.yml:** two end-of-life images, one Enterprise licence line, one floating `latest` tag, one 5.26 LTS image and one Bolt URI. Each line comes with its end-of-life date and the ArangoDB, Memgraph or FalkorDB line that replaces it.

Neo4j 2026.06 reached end of life on **2026-07-30**. Neo4j 4.4 LTS ended on **2025-11-30**. Neo4j's monthly release lines lose support when the next one ships (2026.08 ended 2026-09-21). On 2026-10-11 only two lines are supported: the newest monthly line (2026.09) and 5.26 LTS, which is supported until **2028-06-06**. Source: https://endoflife.date/neo4j

## What it finds (13 rules)

| Rule | Line it flags | Replacement line |
|---|---|---|
| neo4j-image-end-of-life | `image: neo4j:2026.06`, `FROM neo4j:4.4` | `image: arangodb:3.12` · `memgraph/memgraph:3.13.2` · `falkordb/falkordb:6.0.2` |
| neo4j-image-lts-526 | `image: neo4j:5.26.x` (note; warning 365 days before 2028-06-06; error after) | same |
| neo4j-image-floating-tag | `image: neo4j:latest` or no tag | same |
| neo4j-image-monthly-line | `image: neo4j:2026.09` (supported until the next line ships) | same |
| neo4j-enterprise-licence-line | `NEO4J_ACCEPT_LICENSE_AGREEMENT: "yes"` | remove; Enterprise Edition runs under Neo4j's commercial licence |
| neo4j-plugins-apoc | `NEO4J_PLUGINS: '["apoc"]'` | list the apoc.* calls; ArangoDB runs AQL, not Cypher |
| neo4j-bolt-uri | `bolt://`, `neo4j://`, `neo4j+s://` | `http://arangodb:8529` (or `bolt://memgraph:7687`) |
| neo4j-driver-js / -python / -java / -go / -dotnet | `neo4j-driver`, `neo4j`, `org.neo4j.driver`, `neo4j-go-driver`, `Neo4j.Driver` | `arangojs`, `python-arango`, `com.arangodb:arangodb-java-driver`, `github.com/arangodb/go-driver/v2`, `ArangoDBNetStandard` |
| neo4j-helm-chart | `helm.neo4j.com` | ArangoDB Kubernetes operator (kube-arangodb) |

Memgraph speaks Bolt, so if you move to Memgraph the Neo4j drivers and URIs stay and only the host changes. ArangoDB serves HTTP on port 8529 and uses its own drivers.

## How to use

1. Open a docker-compose.yml, Dockerfile, Helm values file, package.json, requirements.txt, pyproject.toml, pom.xml, build.gradle, go.mod, .csproj or .env file.
2. Run **ArangoDB Migration Check: Scan this file** from the Command Palette. Each Neo4j tie shows in the Problems panel with its line, its end-of-life date and the replacement line.
3. The as-of date defaults to today. Set a later date to see which lines turn into errors when 5.26 LTS ends.

The free scan of the open file is complete on its own: every tie, every date, every replacement line, no key needed.

## With a licence key

The whole workspace in one migration plan, with each Neo4j item mapped to its replacement; a dated end-of-life exposure report for the company (how many projects, since when); and a CI gate that fails a build that adds new Neo4j use. One payment, one key per person or team seat: [workspace plan, exposure report and CI gate](https://getreadystack.com/api/buy/cl/polar_cl_guhn96Rdd7HDTzyonR6ZA79xMHJBGWifxWzWg39JiFP).

## Yardstick

Staying on managed Neo4j: AuraDB Business Critical starts at $0.20/GB/hour and AuraDB Professional at $0.09/GB/hour (neo4j.com/pricing, checked 2026-10-11).

## Sources

- Neo4j release lines and end-of-life dates: https://endoflife.date/neo4j
- Neo4j Docker image and `NEO4J_ACCEPT_LICENSE_AGREEMENT`: https://github.com/neo4j/docker-neo4j
- ArangoDB image: https://hub.docker.com/_/arangodb · drivers: arangojs, python-arango, arangodb-java-driver, go-driver, arangodb-net-standard on github.com/arangodb

Web version (same engine, runs in your browser): https://getreadystack.com/tools/arangodb-migration-check
