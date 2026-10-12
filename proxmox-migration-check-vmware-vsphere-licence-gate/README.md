# Proxmox Migration Check: VMware vSphere Lint

**Finds every VMware vSphere line in your Terraform, Packer and Ansible files and prints the exact Proxmox VE line that replaces it — 15 findings in the bundled sample `_fixtures/dirty.tf` (11 Terraform, 4 Packer), 27 rules.**

Free web version (same engine, runs in your browser): https://getreadystack.com/tools/proxmox-migration-check-vmware-vsphere-licence-gate

## Why this exists

Broadcom licenses VMware Cloud Foundation and vSphere Foundation per physical core, with a minimum of 16 cores for each CPU in every ESXi host (Broadcom KB 313548). A host with 2 CPUs x 8 cores is counted as 32 cores. Small edge and branch sites pay for cores they do not have. In April 2025 a distributor memo also reported a 72-core minimum per order; Broadcom did not confirm it publicly, so this extension only uses the 16-core rule from KB 313548.

Moving to Proxmox VE (or XCP-ng / Harvester) is a code change before it is a hardware change: the vsphere Terraform provider, the vsphere-iso Packer builder and the community.vmware Ansible modules have to go. Every one you miss keeps the site on vCenter.

## What it finds (and what it writes instead)

| VMware vSphere line | Proxmox VE line |
|---|---|
| `source = "hashicorp/vsphere"` | `source = "bpg/proxmox"` (0.116.0, 2026-10-06) |
| `provider "vsphere"` | `provider "proxmox" { endpoint = "https://pve.example.com:8006/" }` |
| `resource "vsphere_virtual_machine"` | `resource "proxmox_virtual_environment_vm"` |
| `data "vsphere_datastore"` | `disk { datastore_id = "local-lvm" }` |
| `data "vsphere_network"` | `network_device { bridge = "vmbr0" }` |
| `source "vsphere-iso"` | `source "proxmox-iso"` |
| `github.com/hashicorp/vsphere` | `github.com/hashicorp/proxmox` (Packer plugin v1.2.4) |
| `community.vmware.vmware_guest:` | `community.proxmox.proxmox_kvm:` |
| `vmware_guest_snapshot:` | `community.proxmox.proxmox_snap:` |
| `plugin: community.vmware.vmware_vm_inventory` | `plugin: community.proxmox.proxmox` |
| `vcenter_hostname` / `VSPHERE_SERVER` | `api_host` / `PROXMOX_VE_ENDPOINT` |

27 rules in total: 12 Terraform, 5 Packer, 10 Ansible. Every replacement name was read from the bpg/terraform-provider-proxmox docs, the hashicorp/packer-plugin-proxmox README and the community.proxmox 2.1.0 module list.

## How to use

1. Open a `.tf`, `.tfvars`, `.pkr.hcl`, playbook or `requirements.yml` file.
2. Findings appear in the Problems panel, each with the line and the Proxmox VE replacement.
3. A clean file (the bundled `_fixtures/clean.tf`) shows 0 findings.

Everything runs locally. Nothing is uploaded.

## Free and paid

- **Free, no key:** the open file — every vSphere line, with line number and the Proxmox replacement line. That job is complete on its own.
- **Licence key ($29 once, one key per person or team seat):** the whole workspace in one dated migration plan (each vSphere item mapped to its replacement) you keep, and a CI gate that fails a build adding new vSphere use. [Get the full version](https://getreadystack.com/api/buy/cl/polar_cl_8iiS5jW53bWsV0q7gM6GfU82kTHDq1t2oqtdl29GJKI)

## Yardstick

A US network and computer systems administrator earns a median $47.66 an hour (BLS OEWS 2025). One 8-hour day of reading a repo for vSphere lines is $381.28.

## Limits

It reads text line by line. It does not log in to vCenter, count your cores or estimate a Broadcom quote. Module calls built from variables are not followed.
