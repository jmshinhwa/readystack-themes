# SSDF Attestation Audit for GitHub Actions

![SSDF Attestation Audit for GitHub Actions](https://getreadystack.com/img/promo/sku158108_result_card.jpg)

An AI assistant will happily write you a GitHub Actions workflow that looks professional and still cannot survive the attestation your executive signs. This extension reads the workflow file you have open and marks every line that contradicts the CISA Secure Software Development Attestation Common Form, naming the NIST SSDF (SP 800-218) practice and the form section behind each mark.

Hub: https://getreadystack.com/tools/ssdf-attestation-workflow-audit

## What it checks

14 rules, grouped by the four attestation sections of the Common Form:

1. **Secure development environment** (PO.5.1, PO.5.2) — `pull_request_target` building fork code beside repository secrets, `permissions: write-all`, a self-hosted runner that is never declared ephemeral, untrusted `github.event` text interpolated into a shell command, a secret printed into the build log, and a missing `permissions:` block.
2. **Trusted source code supply chain** (PW.4.1, PW.4.4) — an action pinned to a moving tag instead of a 40-character commit SHA, a container image without an `@sha256:` digest, a dependency install with no lockfile or hash pinning, and a script piped straight from the network into a shell.
3. **Provenance data** (PS.3.1, PS.3.2) — no signed build provenance step and no SBOM produced anywhere in the pipeline.
4. **Automated vulnerability checking** (RV.1.1, RV.1.2) — no automated scan at all, or a scan muted with `continue-on-error: true` or a trailing `|| true` so that it can never fail the build.

Measured on the two bundled fixtures on 2026-09-21: the hardened release workflow returns 0 findings; the AI-written deploy workflow returns 8 findings across three of the four sections.

## Example

```yaml
- uses: actions/setup-node@v4          # moving tag - PW.4.4, section 2
  run: npm install                     # not reproducible - PW.4.1, section 2
```

Each finding carries its practice ID, so the line you fix is the line you can point at later when someone asks which control the claim rests on.

## Two inputs

The same engine runs in the editor and on the one-page web version: a workflow file and a date. The date is not decoration — findings that come from an absent control also report how many days remain to the 30 September federal fiscal-year end, the boundary where new awards and renewals are signed.

## Free and full

Free: audit the workflow file you have open and list every attestation gap with its SSDF practice ID and the CISA form section it sits under. That job finishes on its own.

Full version: audit every workflow in the repository at once and export one dated evidence table mapped to all four attestation sections — https://buy.polar.sh/polar_cl_p4a0TbqABh9QIIJlOPNxkwxm8shyqSsnSn23v05tEw7

Yardstick: a US application-security contractor bills roughly 150-250 an hour to review and re-pin a release pipeline by hand.

## Notes

This extension reports what the workflow file shows. It does not submit anything to an agency, and it is not legal advice. The attestation itself is signed by a chief executive or a designated employee; these findings are the evidence that sits under that signature.
