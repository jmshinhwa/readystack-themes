# npm Trusted Publish Lint

![npm Trusted Publish Lint](https://getreadystack.com/img/promo/sku62221_result_card.jpg)

Reads a release workflow, an `.npmrc` line or a `package.json` and reports every place your npm
publish still depends on a credential that has an expiry date — with line numbers, in the editor.

**Why now.** npm revoked all classic tokens on **2025-12-09**. The replacement, a granular access
token with write scope, cannot be given a lifetime longer than **90 days**: a token created on
2026-09-14 stops working on **2026-12-13**. The workflow that publishes your package keeps passing
CI until the day the token quietly expires, and the failure arrives as `E401 Unauthorized` in the
middle of a release you are trying to ship. The supported way out is OIDC **trusted publishing**:
GitHub Actions or GitLab CI mints a short-lived token for the run, and there is nothing left in your
repository to expire or to leak.

**What it checks.** 15 rules, run over the text you have open:

| Group | Rules |
| --- | --- |
| Credential | `stored_npm_token`, `npmrc_authtoken`, `literal_npm_token`, `inline_otp` |
| OIDC readiness | `no_id_token_permission`, `no_environment_binding`, `old_npm_cli_pin` |
| Blast radius | `write_all_permissions`, `pull_request_target_trigger`, `mutable_action_ref` |
| Job hygiene | `install_runs_scripts`, `curl_pipe_shell`, `insecure_registry`, `node_18_or_older` |
| Attestation | `publish_without_provenance` |

On the sample workflow in `_fixtures/dirty.yml` — 25 lines, the shape a coding assistant writes when
you ask it for "a workflow that publishes to npm" — the check returns **16 findings: 6 blocking and
10 warnings**. On `_fixtures/clean.yml`, the same file rewritten for trusted publishing, it returns
zero.

**Dates the rules lean on.** Classic tokens revoked 2025-12-09. Granular write tokens capped at 90
days. Node 18 left security support on 2025-04-30. OIDC trusted publishing needs npm 11.5.1 or newer,
so a job that pins `npm@10` falls back to token auth.

## Use

- Open a workflow file and run **npm Trusted Publish Lint: Check this file** from the Command Palette.
- Findings appear as diagnostics on the exact line, with the fix named in the message.
- The same engine runs with no install at <https://getreadystack.com/tools/npm-trusted-publish-lint>.
  Paste a workflow, set the date, read the same 15 rules.

## Free and paid

Free finishes the job: every rule, every line, every file you open, no key and no account. The paid
layer changes what you take away rather than what you are allowed to see — it exports the finished
audit as a dated Markdown or CSV file for every workflow in the repository in one pass, which is the
artefact a reviewer or a client asks for. $29 once. <https://buy.polar.sh/polar_cl_r0AsPdmaipunFUfn7RJOfQAdEdFXC397cXwZu01Rmw7>

## Yardstick

A freelance DevOps engineer is a median **$60/hour** on Upwork (typical range $40–$100). Reading one
release workflow line by line and rewriting it for OIDC is most of an hour.

## Licence

MIT for the extension source. See `LICENSE.txt`.
