# OpenVox Migration Check for Puppet

![OpenVox Migration Check for Puppet — finds the line](https://getreadystack.com/img/promo/openvox-migration-check_demo.gif)

![OpenVox Migration Check for Puppet](https://getreadystack.com/img/promo/sku400370_result_card.jpg)

**openvox migration: 6 findings in one 10-line Rocky 9 bootstrap script** — every Puppet package, repo, image and gem line that has to change before a fleet runs on OpenVox, each with the exact OpenVox replacement.

Hub page and free web version: https://getreadystack.com/tools/openvox-migration-check

## Why this exists

In November 2024 Perforce announced that new Puppet binaries would move to a private, licence-gated location (Puppet Core: a free developer licence covers up to 25 nodes, a subscription is needed above that). The last open source release to yum.puppetlabs.com and apt.puppetlabs.com was Puppet 8.10 on 2024-10-22. Open source Puppet 7 reached end of life on 2025-04-30. The community fork, OpenVox (Vox Pupuli), shipped its first release on 2025-01-21 and is functionally equivalent from 8.11: same commands, same config paths, but **different package names, repos, images and gem**.

Search-and-replace on "puppet" breaks things, because `/opt/puppetlabs/bin/puppet agent` and `puppetserver ca list` stay the same under OpenVox. Chat assistants still write `dnf install puppet-agent` from yum.puppet.com. This extension only flags the lines that really change.

## Yardstick

The alternative to migrating is a Puppet Core subscription for every fleet above 25 nodes.

## What it flags (12 rules)

| Rule | Puppet line | OpenVox replacement |
|---|---|---|
| OVX001 | yum.puppet.com / yum.puppetlabs.com | yum.voxpupuli.org |
| OVX002 | apt.puppet.com / apt.puppetlabs.com | apt.voxpupuli.org |
| OVX003 | puppet8-release, puppet7-release | openvox8-release |
| OVX004 | package puppet-agent | openvox-agent |
| OVX005 | package puppetserver | openvox-server |
| OVX006 | package puppetdb, puppetdb-termini | openvoxdb, openvoxdb-termini |
| OVX007 | puppet-bolt | openbolt |
| OVX008 | puppet/puppetserver, puppet/puppet-agent, puppet/puppetdb images | ghcr.io/openvoxproject/openvoxserver, openvoxagent, openvoxdb |
| OVX009 | gem install puppet, gem 'puppet' | gem 'openvox' |
| OVX010 | puppet7, puppet-agent 7.x pins | OpenVox 8 (Puppet 7 EOL 2025-04-30) |
| OVX011 | Puppet Core repo hosts | voxpupuli.org repos |
| OVX012 | a file that installs OpenVox and still installs a Puppet package | remove the Puppet package — both cannot be installed on one system |

Package rules (OVX004-006) only fire on install/package/ensure lines, so plain `puppetserver ca list` commands are left alone. Comment lines are skipped. Backslash-continued shell lines are joined before matching. Repo rules append how many days the Perforce open source repo has been frozen as of today (707 days on 2026-09-29).

## Files it reads

Puppetfile, Gemfile, Dockerfile, Containerfile, `*.pp` manifests, `*.sh` bootstrap scripts, `*.yaml` / `*.yml` Hiera and CI files, `*.repo`, `*.list`, `*.rb`.

## Measured on the bundled fixtures

- Dirty bootstrap script (10 lines): 6 findings — OVX001, OVX003, OVX004, OVX006, OVX009, OVX008.
- Clean OpenVox script (10 lines, still calls `/opt/puppetlabs/bin/puppet agent` and `puppetserver ca list`): 0 findings.

## Use

Open a file, press Ctrl+Shift+P, type "OpenVox" and run the check command. Findings appear in the Problems panel with the replacement in the message. The one-file check is free and needs no account.

Scanning every file in the repository at once and exporting one Markdown migration checklist for a change ticket need a licence key (Command Palette → enter licence key).

## Sources

- Vox Pupuli install page: https://voxpupuli.org/openvox/install/
- Perforce Puppet Core licence (2025-02-04): https://www.perforce.com/system/files/2025-02/Puppet-Core-Terms-and-Conditions.pdf
- Puppet 7 lifecycle: https://www.puppet.com/docs/puppet/7/platform_lifecycle.html
