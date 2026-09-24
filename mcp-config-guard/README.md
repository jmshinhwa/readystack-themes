# MCP Config Guard

![MCP Config Guard - agent config lint](https://getreadystack.com/img/promo/sku51239_result_card.jpg)

An MCP config is four lines of JSON that decide what an AI agent may run, what credentials it holds, and how far into your disk it can reach. It is written once, pasted from a README, and then never read again.

MCP Config Guard reads that file while you edit it - `.mcp.json`, `.vscode/mcp.json`, `mcp.json`, `claude_desktop_config.json` - and marks the lines that hand the agent more than you meant. Everything runs locally: the file is never uploaded, and no server in it is ever started.

![Findings in the editor](https://getreadystack.com/tools/mcp-config-guard/demo.gif)

## What it checks - 23 rules

**How the code gets there (6)** - `unpinned_npx`, `unpinned_uvx`, `unpinned_git_ref`, `docker_untagged`, `shell_wrapper`, `curl_pipe_shell`. An `npx -y some-server` line resolves again every time the agent starts, so the code that ran yesterday is not the code that runs today. A scan of published MCP configs in 2026 (*State of MCP Security 2026*) reported that about 85% install through an unpinned remote reference.

**What it is handed (6)** - `secret_literal`, `secret_key_literal`, `secret_placeholder`, `secret_in_args`, `credential_breadth`, `env_registry_override`. Live tokens sit in these files because the `env` block is the path of least resistance. A key passed in `args` is also visible to every process list on the machine.

**How far it reaches (4)** - `broad_fs_root`, `home_absolute_path`, `auto_approve`, `wildcard_tools`. `"/Users/you"` as a filesystem root includes `.ssh`, `.aws` and every other repository on the disk.

**How it is reached (5)** - `plaintext_http`, `raw_ip_url`, `remote_no_auth`, `sse_transport`, `duplicate_server_name`. Plus `json_invalid` and `not_mcp_config`, which is how a config that silently loads zero servers gets noticed.

Every finding gives the line number, one sentence on what goes wrong, and the line that replaces it.

## Measured on the sample file

The dirty sample shipped with this extension (`_fixtures/dirty.json`) holds 10 servers - the sort of file a team accumulates in a quarter. The extension reports **24 findings: 17 errors and 7 warnings**. Four of the ten servers install code that is not pinned; three hold a credential in plain text and one holds a placeholder that will fail on the first call. The clean sample, same shape, reports 0.

## Free and paid

Free, no key, no limit, no watermark: **check the config file you have open against all 23 rules** - as often as you like, on any number of files, one at a time. That is a finished job: you can fix the file in front of you and close it.

The paid part is a different axis - scale and hand-off: **one sweep over every MCP config in the workspace and in the client config folders, a dated CSV / JSON / HTML report, and machine-readable output a CI step can fail on**, so a pull request that adds an unpinned server stops before it merges. $29 once, one licence key per person or CI seat, 7-day full refund. Upwork lists cybersecurity developers at a $60 median hourly rate (Sept 2026); the sweep is the part you would otherwise pay someone to repeat every month.

[Full version - $29 once](https://buy.polar.sh/polar_cl_qkyHZkQQW6eB0rXgrKfDGviLlVixnkbP42q8B3h7YrG)

## Free web version

The same engine, same 23 rules, runs in the browser with nothing to install: <https://getreadystack.com/tools/mcp-config-guard>

## Commands

- **MCP Config Guard: Check this file** - the open config, all 23 rules
- **MCP Config Guard: Sweep the workspace** - every config at once, with the report (licence key)

## What it does not do

It does not connect to any MCP server and it does not read tool descriptions from a running server - doing that means executing the code you are trying to judge. It reads text.
