# SeaweedFS Migration Lint — MinIO Compose & K8s

![SeaweedFS Migration Lint — MinIO Compose & K8s — finds the line](https://getreadystack.com/img/promo/seaweedfs-migration-lint_demo.gif)

![SeaweedFS Migration Lint — MinIO Compose & K8s](https://getreadystack.com/img/promo/sku401366_result_card.jpg)

**SeaweedFS migration check for the files that run MinIO.** It reads docker-compose and Kubernetes YAML, .env files, shell scripts and Dockerfiles and marks every line that ties the setup to MinIO, with the SeaweedFS fix next to it. 17 rules, offline, no account.

The sample 41-line docker-compose.yml gives 17 findings: 1 error, 11 warnings, 5 info. The error is the image `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z`: the minio/minio repository is archived, its README says it is no longer maintained, and the last community release is RELEASE.2025-10-15T17-29-55Z. The clean 23-line compose on chrislusf/seaweedfs:4.48 gives 0.

Why it matters: MinIO is AGPL-3.0 since 2021-04-23 (commit "update license change for MinIO"). SeaweedFS is Apache-2.0 and SeaweedFS 4.48 shipped on 2026-09-28. SeaweedFS lists bucket notifications, bucket replication, S3 Select and lifecycle transition rules as not supported, its S3 gateway listens on 8333, and it does not read MINIO_* variables.

Free web version (same engine, runs in the browser): https://getreadystack.com/tools/seaweedfs-migration-lint

## What it checks (17 rules)

| Rule | Severity | What the line means | SeaweedFS fix |
|---|---|---|---|
| `minio-image` | error | MinIO server image. The minio/minio GitHub repository is archived and its README says it is no longer maintained; the last community release is RELEASE.2025-10-15T17-29-55Z and the community edition is now source-only, so this image gets no updates. | image: chrislusf/seaweedfs:4.48 (Apache-2.0, released 2026-09-28) with entrypoint weed. |
| `minio-source-build` | error | Builds MinIO from source, the only community path left. MinIO is AGPL-3.0 since the commit "update license change for MinIO" of 2021-04-23, and its README says all usage requires validation against AGPLv3 obligations, including release of modified code. | Build or pull SeaweedFS instead (Apache-2.0): chrislusf/seaweedfs:4.48, or go install github.com/seaweedfs/seaweedfs/weed@latest. |
| `minio-server-cmd` | warn | minio server command. SeaweedFS has no minio binary; one process can run master, volume server, filer and the S3 gateway. | entrypoint: weed · command: server -dir=/data -s3 (or weed s3 -filer=filer:8888 for a split setup). |
| `minio-console` | warn | MinIO Console setting. SeaweedFS has no MinIO Console; its web admin is a separate process. | weed admin -masters=master:9333 (Admin UI, default port 23646) and drop the 9001 port mapping. |
| `minio-root-credentials` | warn | MinIO root credentials. SeaweedFS does not read MINIO_* variables, so the gateway starts without these keys. | AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (read only when no -config is given), or an s3.json identity with actions ["Admin","Read","Write"] passed as -s3.config. |
| `minio-port-9000` | warn | Port 9000 is MinIO's S3 API port. The SeaweedFS S3 gateway listens on 8333 by default. | Map 8333:8333, or start with -s3.port=9000 to keep the old client port. |
| `minio-endpoint` | info | Client endpoint points at the MinIO service. | Point it at http://seaweedfs:8333 and keep path-style addressing unless the gateway runs with -domainName. |
| `mc-admin-iam` | warn | mc admin calls the MinIO admin API, which SeaweedFS does not implement. | SeaweedFS implements the IAM API on the S3 endpoint: aws iam create-user --endpoint-url http://seaweedfs:8333, or list identities in s3.json. |
| `bucket-notification` | warn | Bucket notification. SeaweedFS lists GetBucketNotificationConfiguration and PutBucketNotificationConfiguration as not supported, so this consumer stops receiving events. | Move the consumer to SeaweedFS filer metadata events (weed filer.meta.tail -pathPrefix=/buckets/<bucket>) or a ListObjectsV2 poll, and test it before cutover. |
| `bucket-replication` | warn | MinIO replication. SeaweedFS lists GetBucketReplication, PutBucketReplication and DeleteBucketReplication as not supported. | weed filer.sync -a=<filerA>:8888 -b=<filerB>:8888 (resumable continuous sync between two clusters). |
| `lifecycle-transition` | warn | Lifecycle transition to a remote tier. SeaweedFS supports PutBucketLifecycleConfiguration, but transition rules are not supported. | Keep expiry rules only (--expire-days) and plan cold-tier moves outside the S3 lifecycle API. |
| `s3-select` | warn | S3 Select. SeaweedFS lists SelectObjectContent as not supported. | GET the object and filter it in the job (DuckDB, pandas, jq). |
| `minio-kms` | warn | MinIO KMS/KES setting. SeaweedFS SSE-KMS talks to AWS KMS, Google Cloud KMS or OpenBao/Vault, not to KES. | Point SSE-KMS at OpenBao/Vault and copy encrypted objects through the S3 API (read from MinIO, write to SeaweedFS), never the drive folders. |
| `minio-domain` | info | MINIO_DOMAIN turns on virtual-host style bucket URLs. | weed s3 -domainName=<suffix> (or -s3.domainName with weed server) for {bucket}.{domainName} URLs. |
| `minio-identity` | info | MinIO OpenID or LDAP identity provider. | SeaweedFS STS supports AssumeRoleWithWebIdentity and AssumeRoleWithLDAPIdentity; configure it in the advanced IAM file passed as -iam.config. |
| `minio-healthcheck` | info | MinIO health endpoint; SeaweedFS serves its health check on /healthz and /status instead. | GET /healthz (or /status) on the S3 port 8333. |
| `minio-disk-format` | info | MinIO on-disk format (.minio.sys, xl.meta). SeaweedFS cannot read MinIO data folders. | Copy through the S3 API with rclone sync or mc mirror from MinIO to the SeaweedFS endpoint, then compare object counts. |

## How to use

1. Open a docker-compose.yml, Kubernetes manifest, .env file, shell script or Dockerfile.
2. Findings appear in the Problems panel with the line and the SeaweedFS fix.
3. Lines that start with `#` or `//` are skipped, so commented-out MinIO settings stay quiet.

## Free and full version

Free: every finding in the open file, with the MinIO line that blocks SeaweedFS and the SeaweedFS fix, offline, no account.

Full version: scan the whole workspace in one pass and export one Markdown migration report for the change ticket, $29 once, one licence key per person or team seat. Get a key: https://getreadystack.com/api/buy/cl/polar_cl_RUMPJtqxgGuqV9WMomFKo1YHdM1cfxvYx6tOb1A28Rl

Yardstick: DOJ's Fitzpatrick Matrix rates a 15-year litigator at $851/hour for billing year 2026, which is one hour of counsel reading MinIO's AGPL-3.0 obligations.

## Sources

- minio/minio README and repository status (archived, "no longer maintained", source-only distribution), GitHub, read 2026-09-29.
- minio/minio LICENSE history: commit "update license change for MinIO", 2021-04-23.
- SeaweedFS wiki, Amazon S3 API (supported and not supported operations) and S3 Credentials, read 2026-09-29.
- SeaweedFS source: weed/command/s3.go (port 8333, -domainName, -config), weed/command/server.go (-s3.port, -s3.config, -s3.domainName), weed/s3api/s3api_server.go (/healthz, /status).

Not legal advice. The linter reads configuration text; it does not contact your MinIO or SeaweedFS servers.
