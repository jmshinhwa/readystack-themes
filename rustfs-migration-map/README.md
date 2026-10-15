# RustFS Migration Map: MinIO to RustFS

![rustfs migration map: MinIO to RustFS for compose, Helm and Terraform](https://getreadystack.com/img/promo/sku672964_result_card.jpg)

**One ordinary docker-compose.yml with MinIO gives 6 findings, and each one comes with the exact RustFS line that replaces it.** The map uses 15 rules and covers docker-compose, Dockerfile, Helm `values.yaml`, `Chart.yaml` and Terraform `.tf` files.

More detail and the free web version: https://getreadystack.com/tools/rustfs-migration-map

## Why now

The `minio/minio` GitHub repository was archived in April 2026 and says *"THIS REPOSITORY IS NO LONGER MAINTAINED."* The community edition is AGPLv3 and is distributed as source code only. The legacy pre-compiled binaries *"will not receive updates."* Commercial or proprietary use goes to MinIO AIStor licensing.

RustFS (`rustfs/rustfs`, Apache-2.0) is S3-compatible and uses the same ports, 9000 for S3 and 9001 for the console. Its configuration names are different, though. Swapping only the image tag leaves you with a container that ignores `MINIO_ROOT_USER`, health checks that probe a path that does not exist, and encrypted objects that RustFS cannot read.

## What it finds (free, no key)

Open a file and run **RustFS Map: Check this file**. Every MinIO line is listed with its line number and the replacement:

| MinIO line | RustFS line |
|---|---|
| `image: quay.io/minio/minio:RELEASE…` | `image: rustfs/rustfs:1.0.1` |
| `command: server /data --console-address ":9001"` | `RUSTFS_VOLUMES=/data`, `RUSTFS_ADDRESS=0.0.0.0:9000`, `RUSTFS_CONSOLE_ADDRESS=0.0.0.0:9001`, `RUSTFS_CONSOLE_ENABLE=true` |
| `MINIO_ROOT_USER` | `RUSTFS_ACCESS_KEY` |
| `MINIO_ROOT_PASSWORD` | `RUSTFS_SECRET_KEY` |
| `MINIO_KMS_SECRET_KEY` | copy objects out decrypted over the S3 API first, then use a RustFS KMS backend (Vault or AWS KMS) |
| `/minio/health/live` | `http://<host>:9000/health` |

The 15 rules also cover `minio/mc`, `minio/operator`, `bitnami/minio`, the `charts.min.io` Helm repository (replaced by `https://charts.rustfs.com`, chart `rustfs` 1.0.1), `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY`, `MINIO_VOLUMES`, `MINIO_BROWSER`, legacy `dl.min.io` downloads and the `aminueza/minio` Terraform provider.

## Things the image swap does not tell you

- The RustFS container runs as UID/GID `10001:10001`. Bind-mounted data, log and TLS directories must be writable by that user.
- MinIO on-disk compatibility is a preview feature (`rio-v2`) and is not in the default build. Copy objects through the S3 API (rclone or any S3 client) instead of remounting the MinIO data directory.
- The RustFS sample default credential `rustfsadmin` is public. Always set `RUSTFS_ACCESS_KEY` and `RUSTFS_SECRET_KEY`.

Every replacement line comes from the RustFS repository (README and `docker-compose.yml`) and from `charts.rustfs.com`. Each rule stores its source URL.

## Yardstick

Staying on a supported MinIO build means AIStor, which MinIO prices by quote. RustFS costs nothing to run under Apache-2.0. This map shows the cost of moving: the exact lines to change.

## Full version (licence key)

The free check covers one file, completely. The full version covers the **whole workspace**: a dated MinIO-to-RustFS migration plan that maps every item across all files to its replacement, plus a CI gate that fails a build when it adds new MinIO use. The team key adds the company exposure report: how many projects still pull MinIO, since when, and what each one needs. [Full version](https://getreadystack.com/api/buy/cl/polar_cl_lmXjr3q76k4kAd5d2ofWJW0ASRcbS6mnQ5nk33HZQmK)

## Privacy

Everything runs locally. Your files never leave VS Code or the browser tab.
