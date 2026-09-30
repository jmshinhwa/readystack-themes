# FerretDB Migration Lint — MongoDB SSPL gate

![FerretDB Migration Lint — MongoDB SSPL gate](https://getreadystack.com/img/promo/sku397071_result_card.jpg)

**ferretdb migration check** for SaaS and platform teams that self-host MongoDB behind a hosted product and want to move to FerretDB. It reads `docker-compose.yml`, Helm `values.yaml`, `Dockerfile` and driver code (JavaScript, TypeScript, Python) and marks every line that either runs an SSPL MongoDB server or calls a command FerretDB 2.7 does not implement, with the fix next to it.

Home page and the free web version: https://getreadystack.com/tools/ferretdb-migration-lint

## Why this exists

MongoDB's SSPL FAQ says every MongoDB Community Server release on or after **October 16, 2018**, including patch releases of older versions, is licensed under the Server Side Public License. SSPL Section 13: if you make the functionality of the program available to third parties as a service, you must publish the Service Source Code of the whole service at no charge: management software, user interfaces, APIs, automation, monitoring, backup, storage and hosting software. The FAQ adds that there is no copyleft condition for other SaaS applications that only use MongoDB as a database, so the question is where your product sits.

FerretDB is an Apache-2.0 server that speaks the MongoDB wire protocol and stores data in PostgreSQL with the DocumentDB extension. Swapping the image is the easy part. The hard part is the init script and the application code: FerretDB 2.7 marks commitTransaction, abortTransaction, every role management command, grantRolesToUser, convertToCapped, killOp, setParameter, profile and the bulkWrite command as "Not implemented yet". A chatbot that rewrites `image: mongo:7.0` does not read the init script three screens further down.

## What it checks (19 rules)

| Rule | What it finds |
|---|---|
| mongo-official-image | `image: mongo`, `FROM mongo`, Helm `repository: mongo` (SSPL) |
| mongodb-community-server-image | `mongodb/mongodb-community-server` (SSPL) |
| bitnami-mongodb | Bitnami MongoDB image or chart (SSPL inside) |
| mongod-binary | `command: mongod`, `mongodb-org` packages |
| mongo-initdb-env | `MONGO_INITDB_ROOT_*`, which FerretDB never reads |
| replica-set-bootstrap | `--replSet`, `rs.initiate()`, `replSetInitiate` |
| transactions | `startTransaction`, `withTransaction`, `commitTransaction`, `abortTransaction` (JS and Python) |
| role-management | `createRole`, `dropRole`, `updateRole`, `grantPrivilegesToRole`, `rolesInfo` and the rest |
| user-role-grants | `grantRolesToUser`, `revokeRolesFromUser` |
| capped-conversion | `convertToCapped`, `cloneCollectionAsCapped` |
| client-bulkwrite | client-level `bulkWrite` command |
| kill-op | `killOp` |
| set-parameter | `setParameter` and `--setParameter` |
| profiler | `setProfilingLevel`, `profile:`, `--profile` |
| server-admin | `logRotate`, `shutdown`, `connPoolStats`, `dropConnections`, `logApplicationMessage` |
| x509-auth | `MONGODB-X509`, `authenticate` command |
| kill-sessions-by-pattern | `killAllSessionsByPattern` (not fully implemented) |
| ferretdb-floating-tag | `ghcr.io/ferretdb/ferretdb` without a full tag such as 2.7.0 |
| ferretdb-without-documentdb | FerretDB with no PostgreSQL + DocumentDB service or URL |

On the sample `docker-compose.yml` shipped with the extension (a mongo:7.0 service with an inline init script) it reports **14 findings, 9 of them errors**. On the FerretDB version of the same file it reports none.

## Use

1. Open a compose file, values file, Dockerfile or driver source file.
2. Run **FerretDB Migration Lint: Check this file** from the Command Palette. Findings appear in the Problems panel with the line and the fix.
3. Or paste the file into the free web version: it runs the same engine in your browser and uploads nothing.

## Sources

- MongoDB, Server Side Public License and SSPL FAQ: https://www.mongodb.com/legal/licensing/server-side-public-license
- FerretDB v2.7 compatibility table: https://docs.ferretdb.io/migration/compatibility/
- FerretDB Docker installation (image tags): https://docs.ferretdb.io/installation/ferretdb/docker/
- FerretDB repository, Apache License 2.0: https://github.com/FerretDB/FerretDB

This lint reads text; it is not legal advice about your SSPL position. Yardstick: DOJ's Fitzpatrick Matrix rates a 15-year litigator at $851/hour for billing year 2026, and an SSPL question usually starts with that hour.

## Full version

With a licence key, the workspace migration report scans every compose, values, Dockerfile and driver file in the repo in one pass and exports one Markdown report (file, line, rule, fix) for the migration pull request: [workspace migration report](https://getreadystack.com/api/buy/cl/polar_cl_skEvFrYWoVDgQxKYdhE5QlI69aZv00p6fElgz0KkRck), $29 once, one licence key per person or team seat.
