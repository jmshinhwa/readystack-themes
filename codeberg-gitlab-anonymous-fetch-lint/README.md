# Codeberg / GitLab.com Anonymous Fetch Lint

![Codeberg / GitLab.com Anonymous Fetch Lint — finds the line](https://getreadystack.com/img/promo/codeberg-gitlab-anonymous-fetch-lint_demo.gif)

![Codeberg / GitLab.com Anonymous Fetch Lint](https://getreadystack.com/img/promo/sku605371_result_card.jpg)

**Finds every gitlab.com fetch that carries no token — 8 findings on the bundled sample workflow, each with the exact token line or Codeberg line that replaces it.**

From 2026-10-19, GitLab caps requests to gitlab.com that arrive with no credentials at 60 requests per hour per IP address; over that you get HTTP 429 with a Retry-After header (GitLab blog, 2026-09-17).

Unauthenticated requests are capped no matter where they come from, including automation running against a paid account without credentials. GitHub-hosted runners come from shared cloud IP ranges, so that per-IP allowance is not yours alone.

## What it flags (10 rules)

| Rule | Where | Broken line | Replacement |
|---|---|---|---|
| GLA01 | workflows, Dockerfile | `git clone https://gitlab.com/acme-tools/ci-scripts.git` | `https://oauth2:${GITLAB_TOKEN}@gitlab.com/...` or `https://codeberg.org/...` |
| GLA02 | requirements.txt, pip | `git+https://gitlab.com/acme-tools/pyhelpers.git@v2.3.0` | `git+https://codeberg.org/acme-tools/pyhelpers.git@v2.3.0` |
| GLA03 | package.json, npm | `gitlab:acme-tools/ui-kit#v3.1.0` | `git+ssh://git@gitlab.com/acme-tools/ui-kit.git#v3.1.0` |
| GLA04 | go env | `GOPROXY: direct` | `GOPROXY=https://proxy.golang.org,direct` or a `.netrc` token |
| GLA05 | go.mod | `gitlab.com/owner/repo v1.2.0` | map entry: fetched via proxy.golang.org by default |
| GLA06 | curl, scripts | `curl https://gitlab.com/api/v4/...` | `curl --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" ...` |
| GLA07 | curl, wget, ADD | `.../cli/-/archive/v1.4.2/cli-v1.4.2.tar.gz` | `https://codeberg.org/acme-tools/cli/archive/v1.4.2.tar.gz` |
| GLA08 | .gitmodules | `url = https://gitlab.com/...` | `url = git@gitlab.com:...` or `https://codeberg.org/...` |
| GLA09 | .npmrc, pip --index-url | `.../api/v4/projects/41/packages/pypi/simple` | a token in the index URL or `_authToken` line |
| GLA10 | hosted runners | `runs-on: ubuntu-latest` | `GITLAB_TOKEN` from secrets on the job |

Lines that already carry credentials (a token in the URL, `PRIVATE-TOKEN`, `JOB-TOKEN`, an `insteadOf` rule with a token, a `.netrc` entry, SSH `git@gitlab.com:`) are left alone.

## Free, no key

Free, no key: lists every anonymous gitlab.com fetch in the open file (file and line) with the exact token line or Codeberg line that replaces it. 10 rules: git clone, pip git+https, npm gitlab: deps, GOPROXY=direct, go.mod paths, /api/v4 calls, archive/raw downloads, .gitmodules, package registries, hosted-runner IPs. On the bundled sample workflow (_fixtures/dirty.yml) it reports 8 findings: 7 token-less gitlab.com fetches plus the hosted-runner warning, each with its token line and Codeberg line.

Open any workflow, Dockerfile or manifest and the findings appear in the Problems panel. The same engine runs in the free web page: https://getreadystack.com/tools/codeberg-gitlab-anonymous-fetch-lint — paste a file, get the same findings.

## Licence key

$29 once, one licence key per person or team seat: whole-workspace migration plan (each gitlab.com fetch mapped to its token or Codeberg replacement), a dated exposure report and a CI gate that fails a build adding a new anonymous fetch. [Get the full version — $29](https://getreadystack.com/api/buy/cl/polar_cl_yqBgzWBrXNKCqHBOSG0cZl9F9psXlpdxPFBSQ2744ag)

## Yardstick

GitLab Premium is $348 per user per year ($29 per user/month, billed annually) and does not lift the anonymous cap.

## Moving to Codeberg

If the repository you pull from has moved to Codeberg or Forgejo, every finding also prints the codeberg.org form of the line: `git+https://codeberg.org/owner/repo.git#ref` for npm and pip, `/archive/REF.tar.gz` and `/raw/branch/REF/PATH` for downloads, `https://codeberg.org/api/v1/repos/OWNER/REPO/releases` for the release API, and `https://codeberg.org/api/packages/OWNER/` for the package registry.

## Source

GitLab blog, "Rate limits on GitLab.com are changing", 2026-09-17: https://about.gitlab.com/blog/rate-limit-change-2026/ — Free accounts and unauthenticated requests on 2026-10-19; Premium and Ultimate in January 2027; GitLab Self-Managed and GitLab Dedicated limits stay with your operator.
