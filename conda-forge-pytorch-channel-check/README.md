# conda-forge PyTorch Channel Migration Check

![conda-forge PyTorch Channel Migration Check](https://getreadystack.com/img/promo/sku637824_result_card.jpg)

**Finds every line that still installs PyTorch from the frozen `pytorch` Anaconda channel (last torch build there: 2.5.1) and prints the conda-forge line that replaces it.** On the sample 19-line `environment.yml` it finds 6 ties: 4 errors, 2 warnings.

Hub page: https://getreadystack.com/tools/conda-forge-pytorch-channel-check

## Why this matters now

On 2024-10-21 PyTorch announced in [pytorch/pytorch#138506](https://github.com/pytorch/pytorch/issues/138506) that 2.5 would be the last release published to the `pytorch` channel on Anaconda. The project points conda users to conda-forge (`pytorch-cpu` / `pytorch-gpu`) and pip users to download.pytorch.org or PyPI.

Checked on 2026-10-12 with the anaconda.org API:

| package | `pytorch` channel (frozen) | conda-forge |
|---|---|---|
| pytorch | 2.5.1 | 2.14.1 |
| torchvision | 0.20.1 | 0.28.0 |
| torchaudio | 2.5.1 | 2.11.0 |
| pytorch-cuda | 12.4 | not on conda-forge, use `pytorch-gpu` |
| cpuonly | 2.0 | not on conda-forge, use `pytorch-cpu` |

An environment that keeps `-c pytorch` solves to torch 2.5.1 forever. [CVE-2025-32434](https://github.com/advisories/GHSA-53q9-r3pm-6pq6) (critical: `torch.load` with `weights_only=True` can run code) affects torch below 2.6.0 and is fixed only in 2.6.0, so the frozen channel can never give you the fix.

## What it checks (12 rules)

| rule | severity | what it flags | replacement |
|---|---|---|---|
| pytorch-channel-entry | error | `- pytorch` under `channels:` | `- conda-forge` |
| pytorch-channel-prefix | error | `pytorch::torchvision` | drop the prefix |
| pytorch-channel-cli | error | `conda install … -c pytorch` (also mamba, micromamba) | `-c conda-forge --override-channels` |
| setup-miniconda-channels | error | `channels: conda-forge,pytorch` in a workflow | `channels: conda-forge` |
| pytorch-channel-url | error | `conda.anaconda.org/pytorch/` in lock files | re-lock against conda-forge |
| pytorch-cuda-package | error | `pytorch-cuda=12.4` | `pytorch-gpu` (+ `cuda-version`) |
| cpuonly-package | error | `cpuonly` | `pytorch-cpu` |
| pytorch-mutex-package | warn | `pytorch-mutex` | delete |
| torch-pin-before-2-6 | error | `pytorch=2.5.1`, `torch==2.4.0` | `>=2.6` |
| companion-pin-frozen | warn | `torchvision=0.20.1`, `torchaudio==2.5.1` | unpin or conda-forge builds |
| nvidia-channel-with-pytorch | warn | `nvidia` channel next to pytorch | delete |
| defaults-with-pytorch | warn | `defaults` channel next to pytorch | delete, `channel_priority: strict` |

The last two only fire when the same file also uses the pytorch channel, so a clean conda-forge file stays silent. Comments are skipped.

## Worked example (the bundled sample)

| pytorch-channel line | conda-forge fix |
|---|---|
| `- pytorch` (channels) | `- conda-forge` |
| `- nvidia` | delete: conda-forge carries CUDA |
| `- defaults` | delete; `channel_priority: strict` |
| `- pytorch=2.5.1` | `- pytorch-gpu>=2.6` |
| `- pytorch::torchvision` | `- torchvision` |
| `- pytorch-cuda=12.4` | `- cuda-version=12.6` |

## Use

Open an `environment.yml`, `Dockerfile`, `.condarc` or GitHub Actions / GitLab CI YAML file. Findings appear in the Problems panel with the line and the replacement. Run **conda-forge PyTorch Check: Check this file** from the Command Palette at any time. The same engine runs in the free web page on the hub link above.

Free, no key: the open file, every finding, every replacement line.
Workspace key: [scan every environment, Docker and CI file in one pass and export a dated Markdown migration plan](https://getreadystack.com/api/buy/cl/polar_cl_GssYRroE1rwbnEoDnzi55dZMPV1nBXzPml9xL10qn8t).

Yardstick: Anaconda's pricing page lists Business at $50 per user per month (read 2026-10-12); the `pytorch` channel builds sat on Anaconda's `defaults`, which needs a paid plan above 200 employees. conda-forge is free.

Sources: pytorch/pytorch#138506 · GHSA-53q9-r3pm-6pq6 · api.anaconda.org (2026-10-12) · anaconda.com/pricing.
