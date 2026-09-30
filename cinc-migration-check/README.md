# Cinc Migration Check

![Cinc Migration Check: Chef Infra licence gate lint — finds the line](https://getreadystack.com/img/promo/cinc-migration-check_demo.gif)

![Cinc Migration Check: Chef Infra licence gate lint](https://getreadystack.com/img/promo/sku398535_result_card.jpg)

Flags every line in a Chef repository that still pulls licensed Chef, and gives the Cinc replacement next to it. Open a bootstrap script, `kitchen.yml`, `client.rb`, Dockerfile or CI workflow; findings appear in the Problems panel with the line number and the fix. 11 rules, runs locally, no network calls for the check.

Hub page and free web version: https://getreadystack.com/tools/cinc-migration-check

## Why these lines

- Since Chef Infra Client 15, Chef's own binaries stop until the Chef licence is accepted (`--chef-license accept`, `CHEF_LICENSE=accept`, `chef_license 'accept'`).
- Cinc is the Apache-2.0 build of the same source. Cinc Client asks for no licence acceptance, and its binaries include wrappers for `chef-client`, `chef` and `inspec`.
- Progress ends the open-source Chef Infra Server on 2026-11-30. The finding counts the days from the check date.
- Yardstick: Progress lists Chef Business at $59 per node per year (chef.io/how-to-buy).

## Worked example: the sample provision.sh, 6 findings

| Line that pulls licensed Chef (left) | Cinc fix (right) |
|---|---|
| omnitruck.chef.io install.sh | omnitruck.cinc.sh install.sh |
| export CHEF_LICENSE=accept | delete it, Cinc needs none |
| chef-client --chef-license accept | drop the flag |
| PATH=/opt/chef/bin | /opt/cinc/bin |
| knife bootstrap (default installer) | --bootstrap-url omnitruck.cinc.sh |
| chef-server-ctl reconfigure | Cinc Server via knife-ec-backup |

4 errors, 2 warnings. The Cinc rewrite of the same script gives 0.

## The 11 rules

| Rule | What it flags |
|---|---|
| chef-install-url | install.sh / install.ps1 from omnitruck.chef.io or packages.chef.io |
| chef-license-flag | `--chef-license accept` |
| chef-license-env | `CHEF_LICENSE=accept` in shells, CI env blocks, Dockerfiles |
| chef-license-config | `chef_license 'accept'` in client.rb / config.rb, `chef_license: accept` in kitchen.yml |
| kitchen-product-chef | Test Kitchen `product_name: chef` (use `product_name: cinc`) |
| chef-docker-image | `FROM chef/chef`, `chef/inspec`, `chef/chef-workstation` images |
| chef-package-install | apt / yum / dnf / zypper / choco / brew / gem installs of chef, chef-workstation, chefdk, inspec |
| chef-install-action | GitHub Actions step `actionshub/chef-install` |
| knife-bootstrap-default | `knife bootstrap` without `--bootstrap-url` |
| opt-chef-path | hard-coded `/opt/chef` paths (Cinc installs under `/opt/cinc`) |
| chef-infra-server | `chef-server-ctl`, `chef-server.rb`, `/opt/opscode` (open-source end of life 2026-11-30) |

## Commands

- **Check this file** runs the 11 rules on the active editor (free).
- **Sweep workspace and write report** scans every matching file in the repository and writes one Markdown checklist (licence key).
- **Enter licence key** stores the key for the full version.

The free web version has a check-date field, so the Chef Infra Server countdown can be read for any date.

## Free and full version

The single-file check is free, with no key and no limit. The full version scans the whole repository in one pass and exports one Markdown migration checklist per file for the change ticket: [full version, $29 once](https://getreadystack.com/api/buy/cl/polar_cl_ULZCqlDDVlAkHEIimwceeRBLwIN5jkGYnqeFk2iWJhm). One licence key per person or team seat.

## Sources

- Cinc migration guide: cinc.sh/docs/migration
- Test Kitchen Cinc provisioner: kitchen.ci/docs/provisioners/cinc
- Chef licence acceptance: docs.chef.io/chef_license_accept
- Chef Infra Server to Chef 360: chef.io/blog/chef-infra-server-transitions-to-chef-360-platform
- Chef pricing: chef.io/how-to-buy
