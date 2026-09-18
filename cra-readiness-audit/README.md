# CRA Readiness Audit

Flags the lines in your repo that break the EU Cyber Resilience Act - default passwords, disabled TLS checks, floating base images, an expired security.txt - naming the Annex each one fails.

## What it does for free

- Check the open file against all 28 rules
- Check only the lines you select
- Reopen the last findings, with line numbers and severity
- Read every rule that ships inside, with its Annex reference

## With a licence

- **Check every file in the repository** — One pass over the whole project - Dockerfiles, manifests, CI workflows, source and the .well-known directory - instead of the one file that happens to be open.
- **Findings report as CSV, JSON or HTML** — Writes the findings to a file you can attach to a release, keep with the technical documentation, or send to the customer who asked how you handle Annex I.
- **JSON output a build step can fail on** — Machine-readable findings so a pipeline blocks the merge that would have shipped a hard-coded credential or a floating base image.

[Get the full version - $29](https://readystack.example/buy) - $29 once, one licence key per person or team seat, 7-day full refund.


## Install

```
ext install cra-readiness-audit
```
