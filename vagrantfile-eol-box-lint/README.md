# Vagrantfile EOL Box Lint

![Vagrantfile EOL Box Lint — finds the line](https://getreadystack.com/img/promo/vagrantfile-eol-box-lint_demo.gif)

![Vagrantfile EOL Box Lint](https://getreadystack.com/img/promo/sku326300_result_card.jpg)

**6 findings in 1 file:** the sample Vagrantfile in this repo has six lines that point at an OS past end of support. That includes `debian/bullseye64`: Debian 11 LTS ended on 2026-08-31.

Vagrantfile EOL Box Lint reads each `config.vm.box` (plus `box:` / `:box =>` hash entries) and flags boxes whose operating system is past end of support. For every finding you get the line, the end-of-support date, how many days ago it passed and the box to move to. It ships 15 rules: 14 OS releases and the `mirrorlist.centos.org` line that CentOS 7 provisioning scripts still call.

Hub page and web version: https://getreadystack.com/tools/vagrantfile-eol-box-lint

## Why this matters now

- **Debian 11 (bullseye) LTS ended 2026-08-31.** `debian/bullseye64` labs stopped getting security fixes this month.
- **CentOS 7 ended 2024-06-30.** `mirrorlist.centos.org` no longer answers, so `yum install` steps in a provision block fail on a fresh `vagrant up`.
- **Ubuntu 20.04 standard support ended 2025-05-31** and **FreeBSD 13 ended 2026-04-30**.

`vagrant box outdated` only tells you whether a newer *version of the same box* exists. It never tells you that the OS inside the box has reached end of support. A chatbot trained before 2026-08-31 still describes Debian 11 as supported.

## The 15 rules

| Rule | OS / line | End of support | Move to |
|---|---|---|---|
| ubuntu-12.04 | Ubuntu 12.04 (precise) | 2017-04-28 | bento/ubuntu-24.04 |
| ubuntu-14.04 | Ubuntu 14.04 (trusty) | 2019-04-30 | bento/ubuntu-24.04 |
| ubuntu-16.04 | Ubuntu 16.04 (xenial) | 2021-04-30 | bento/ubuntu-24.04 |
| ubuntu-18.04 | Ubuntu 18.04 (bionic) | 2023-05-31 | bento/ubuntu-24.04 |
| ubuntu-20.04 | Ubuntu 20.04 (focal) | 2025-05-31 | bento/ubuntu-24.04 |
| debian-8 | Debian 8 (jessie) | 2020-06-30 | Debian 12 or 13 box |
| debian-9 | Debian 9 (stretch) | 2022-06-30 | Debian 12 or 13 box |
| debian-10 | Debian 10 (buster) | 2024-06-30 | Debian 12 or 13 box |
| debian-11 | Debian 11 (bullseye) LTS | 2026-08-31 | Debian 12 or 13 box |
| centos-6 | CentOS 6 | 2020-11-30 | almalinux/9 or rockylinux/9 |
| centos-7 | CentOS 7 | 2024-06-30 | almalinux/9 or rockylinux/9 |
| centos-8 | CentOS Linux 8 | 2021-12-31 | almalinux/9 or rockylinux/9 |
| centos-stream-8 | CentOS Stream 8 | 2024-05-31 | almalinux/9, rockylinux/9, Stream 9 |
| freebsd-13 | FreeBSD 13 | 2026-04-30 | FreeBSD 14 box |
| centos-mirrorlist | mirrorlist.centos.org in a provision line | 2024-06-30 | vault.centos.org |

Box names are matched by release number or codename, so `ubuntu/focal64`, `bento/ubuntu-20.04` and `generic/ubuntu2004` all hit the same rule. If an end-of-support date is less than 180 days away, the finding is a warning instead of an error.

## Sample result (1 file, 6 findings)

```
L5   ubuntu/focal64                 Ubuntu 20.04  ended 2025-05-31 (484 days ago)
L16  centos/7                       CentOS 7      ended 2024-06-30 (819 days ago)
L19  mirrorlist.centos.org          CentOS 7      ended 2024-06-30 (819 days ago)
L24  debian/bullseye64              Debian 11 LTS ended 2026-08-31 (27 days ago)
L28  bento/debian-10.13             Debian 10     ended 2024-06-30 (819 days ago)
L32  freebsd/FreeBSD-13.2-RELEASE   FreeBSD 13    ended 2026-04-30 (150 days ago)
```
Measured on 2026-09-27. A clean Vagrantfile using `bento/ubuntu-24.04`, `almalinux/9` and `debian/bookworm64` gives 0 findings.

## Usage

Open any `Vagrantfile`. Findings show up in the Problems panel as you edit, and nothing is uploaded. The free tier checks the open Vagrantfile completely. A licence key adds a scan of every Vagrantfile in the workspace at once, plus one exported migration report for the whole lab.

## Yardstick

Doing this by hand means opening every Vagrantfile, working out which OS each box name maps to, and checking 14 separate vendor end-of-support pages.

## Limits

The lint checks box names and one known dead mirror. It does not boot the box. Custom box names that hide the OS (for example `acme/base`) are not matched.
