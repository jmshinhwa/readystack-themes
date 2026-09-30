# AlmaLinux Migration Lint — CentOS 7/8

![AlmaLinux Migration Lint — CentOS 7/8 — finds the line](https://getreadystack.com/img/promo/almalinux-migration-lint_demo.gif)

![AlmaLinux Migration Lint — CentOS 7/8](https://getreadystack.com/img/promo/sku389576_result_card.jpg)

**AlmaLinux migration check for the files that still build CentOS Linux 7 and 8.** It reads Dockerfiles, Containerfiles, Vagrantfiles, yum `.repo` files, kickstarts, shell provisioning scripts and Ansible YAML, and marks every line that stops working when the host or image moves to AlmaLinux 8 or 9. Each finding carries the AlmaLinux fix on the same line.

Free web version and write-up: https://getreadystack.com/tools/almalinux-migration-lint

## Why now

- CentOS Linux 8 reached end of life on December 31, 2021.
- CentOS Stream 8 reached end of life on May 31, 2024.
- CentOS Linux 7 reached end of life on June 30, 2024. After end of life the content was removed from the mirrors and moved to vault.centos.org, a frozen archive.
- mirrorlist.centos.org no longer answers, so an old bootstrap script stops at its first `yum` call with "Cannot find a valid baseurl".
- AlmaLinux 8 is supported until 2029 and AlmaLinux 9 until 2032 (AlmaLinux FAQ).

## What it checks (21 rules)

| Area | Rules |
|---|---|
| Images | `centos:7`, `centos:8` / `centos:latest`, `centos:stream8`, Vagrant `centos/7` boxes |
| Repos | `mirrorlist.centos.org`, `mirror.centos.org` paths, `vault.centos.org` stopgaps, CentOS GPG keys, EPEL 7, hard-coded `el7` RPMs |
| Packages removed in EL8/9 | SCL / `devtoolset-N` / `rh-*`, `yum-cron`, `ntp` / `ntpdate`, `network-scripts`, `authconfig`, the EL7 `docker` package, unversioned `python-*` packages and `#!/usr/bin/python` |
| OS detection | `ansible_distribution == "CentOS"`, `/etc/centos-release`, `grep CentOS /etc/redhat-release` |
| Licence path | `convert2rhel` / `subscription-manager register` (RHEL needs a paid subscription per server) |

Each rule names the replacement: `almalinux:9`, `mirrors.almalinux.org`, `dnf install epel-release`, `gcc-toolset-N`, `dnf-automatic.timer`, `chrony`, `nmcli`, `authselect`, `podman`, `python3-pip`, `ansible_os_family == 'RedHat'`, `/etc/os-release` with `ID_LIKE`.

## Example

The bundled sample `bootstrap.sh` (26 lines, written for CentOS 7) gives 15 findings from 12 rules: 13 errors and 2 warnings. The clean AlmaLinux 9 version of the same script gives 0.

```
L5  error  centos7-image      docker pull centos:7          -> docker pull almalinux:9
L11 error  dead-mirrorlist    mirrorlist.centos.org         -> mirrors.almalinux.org mirrorlist
L15 error  epel7              epel-release-latest-7         -> dnf install epel-release
L17 error  yum-cron           yum-cron                      -> dnf-automatic.timer
L20 error  scl-devtoolset     scl enable devtoolset-11      -> gcc-toolset-N
L21 error  authconfig         authconfig --enablesssd       -> authselect select sssd
```

## Use

Open a file and run **AlmaLinux Migration Lint: Check this file**. Findings show in the Problems panel. Everything runs offline; no file leaves the machine.

Every finding in the open file is free, with no key. Scanning the whole workspace in one pass and exporting one migration report for the change ticket needs a licence key ($29 once, one key per person or team seat): https://getreadystack.com/api/buy/cl/polar_cl_E7s1yXN8TTsXTg4qiaoSemryY96mVKUKEndde3SnB0z

## Yardstick

The paid alternative is to convert to Red Hat Enterprise Linux: a RHEL Server Standard subscription is US$878.90 per server per year on the Red Hat Store (SKU RH00004). AlmaLinux is free to run.

## Limits

It reads text line by line. It does not run `leapp` pre-upgrade checks, inspect installed RPMs on a live host, or judge third-party repos beyond the ones named above. For an in-place CentOS 7 host, AlmaLinux's ELevate project does one major version per step.
