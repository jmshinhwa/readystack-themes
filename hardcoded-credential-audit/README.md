# Hardcoded Credential Audit — 8 Stacks

Open a config file, run **Audit this file for hardcoded credentials**, and the Output panel lists
every finding with its line number and what it means for you — the pasted key, and the settings
around it that quietly undo every key you already protected.

```
"Default": "Server=...;Password=Wint3r-Rel3ase!2026;Encrypt=False;TrustServerCertificate=True"
```

The password is the part every scanner looks for. `Encrypt=False` and `TrustServerCertificate=True`
have no entropy and no prefix, so nothing matches on them — and between them they mean the password
travels in the clear to a server nobody checked the identity of. Move the password into a vault and
the new password travels in the clear too.

**30 checks and 30 safe-config snippets, across 8 file families.** A key pasted into
`appsettings.json` is not a typo you fix — it is a key you rotate on every device, pipeline and
cluster that used it.

## The 8 file families

| | |
|---|---|
| Azure IoT Hub and Storage | `SharedAccessKey`, `HostName=...azure-devices.net`, `AccountKey` |
| SQL Server / JDBC / SQLTools | `Password=`, `Encrypt=False`, `TrustServerCertificate=True`, credentials in a JDBC URL |
| Java and MicroProfile properties | literal `*.password=`, and `${VAR:the-real-secret}` defaults |
| Kubernetes, kubeconfig, Helm | `client-key-data`, `insecure-skip-tls-verify: true`, base64 Secrets, chart values |
| .NET `appsettings.json` and C# | live secrets in config, credentials compiled in as string literals |
| R scripts | `Sys.setenv` with a literal, `dbConnect(password=...)`, `ssl_verifypeer = 0` |
| `.env`, shell scripts, CI YAML | real values instead of placeholders, `export SECRET=...`, inline pipeline env |
| Universal token shapes | private key blocks, JWTs, bearer tokens, `AKIA...`, `ghp_...`, credentials in URLs |

## Free — unlimited, and complete on the file in front of you

- **All 30 checks on the file you have open**, every line number, every reason
- **Audit only the lines you highlighted**, when you want one function and not the file
- **All 30 safe-config snippets**, insertable at the cursor — the SQL connection builder with
  `Encrypt = true`, the SQLTools entry with `askForPassword`, the Kubernetes `secretKeyRef` block,
  the `.Renviron` line, the `.gitignore` set, the rotation checklist
- **Read every check and every snippet** before you trust any of it

No key, no trial count, no watermark, no account. The checks are regular expressions running against
the text in your editor — nothing is uploaded. The same 30 checks also run on a free web page in the
browser if you would rather paste a file than install anything.

## The licence — $29 once — changes the scale, not the depth

The free audit answers for one file. A polyglot repository keeps the `.properties`, the manifests,
the R scripts and the scratch notes in folders nobody opens together.

- **Every file in the workspace in one pass** — the same 30 checks across the lot
- **A CSV of the findings** written into the workspace, carrying the file, the line and the reason
  but never the matched value, so the file itself is safe to attach to a pull request
- **A re-check on every save** — the ten seconds between pasting a key and committing it
- **A JSON file for CI** a pipeline step can read and fail the branch on, so the checks that ran in
  your editor also gate the merge

One payment, no subscription, 7-day refund → **[Get the licence](https://buy.polar.sh/polar_cl_OOWhGWUQdzMKw1sbdABAAtVYaYUfgPFM4RdAh09oicR)**

For scale: dedicated secret-scanning platforms bill roughly $18–$35 per developer per month, and
native scanning on GitHub or GitLab rides on paid plans at $49–$99 per user per year.

## Install

```
ext install hardcoded-credential-audit
```
