# Cybersecurity Container Audit — NIST SP 800-190

**In 2026 the Dockerfile in your repository was probably not typed by a person.** The question an assessor asks is not whether it builds — it is whether the generated lines keep the controls you told the government you keep. This extension answers that question in the editor, line by line.

Open a `Dockerfile` or a `docker-compose.yml`. The extension runs **19 checks** drawn from **NIST SP 800-190**, *Application Container Security Guide*, and marks every line that fails one.

## What a finding tells you

Each finding carries four things:

1. **The line.** The exact instruction that fails.
2. **The section.** Which part of SP 800-190 the control comes from — `4.1.4` for a clear-text secret in an image layer, `4.4.3` for an insecure runtime configuration, `4.4.2` for unbounded network access.
3. **The fix.** Written as the line you should have, not as advice. `FROM python:3.12.11-slim@sha256:…` rather than "consider pinning".
4. **The requirement at risk.** The NIST SP 800-171 Rev. 2 requirement the gap sits under, and its weight under the DoD Assessment Methodology.

That fourth column is the reason this exists. Under **DFARS 252.204-7019** and **252.204-7020**, a contractor holding CUI posts a Basic Self-Assessment score to **SPRS**. The score starts at **110** and loses the weight of each requirement that is not implemented — 5, 3 or 1 points. It must be no more than **three years old** at the time of award. `USER root` is not a style note; it sits under requirement **3.1.5**. A mounted `/var/run/docker.sock` sits under **3.1.7**. Those points come off a number you already reported.

Because the deduction is per requirement, not per line, the extension counts each requirement once however many files reveal it — the same arithmetic the methodology uses.

## Measured on the shipped fixtures

| Fixture | Findings | Requirements at risk | Points | Score from 110 |
|---|---|---|---|---|
| `_fixtures/dirty.md` (generated) | 18 of the 19 checks | 11 | 51 | 59 |
| `_fixtures/clean.md` (hardened) | 0 | 0 | 0 | 110 |

Run it yourself: both files ship with the extension, and the numbers above come from them, not from an estimate.

## The 19 checks

**Dockerfile (12)** — no `USER` instruction; final `USER root`; base image not pinned to a digest; base image on `:latest` or untagged; clear-text secret in `ENV`/`ARG`; `ADD` from a remote URL; TLS verification switched off; plain-text HTTP source; a remote script piped into a shell; `sudo` inside the image; packages installed without a version pin; an SSH daemon in the image.

**Compose (7)** — `privileged: true`; `/var/run/docker.sock` mounted; `network_mode: host`; a host `pid`, `ipc` or `uts` namespace; a capability such as `SYS_ADMIN` or `ALL` added back; a port published on every interface; a clear-text secret in `environment`.

## Free and licensed

The **free** tier audits the file you have open against all 19 checks and shows every finding, its section, its fix and its points at risk. That is a whole job: you can harden a file and re-run until it reads 110.

A **licence key** adds a different axis — **scope and ownership**: every container file in the workspace audited in one pass, and the dated evidence report exported as Markdown and CSV, covering commercial and team use. Nothing in the free tier is watermarked, timed, or locked after N runs.

## What it is not

It is not a CVE scanner. It reads the instructions that build the image, not the built image, so it belongs next to Trivy or Grype, not instead of them. It does not compute or submit an official SPRS score — it shows the points your container files put at risk so you can close them first. It is not legal advice.

**Yardstick:** a consultancy NIST SP 800-171 gap assessment runs $3,500 to $20,000 and takes 2 to 6 weeks.

More tools: <https://getreadystack.com/tools/container-hardening-800-190>
