# Cert Lifetime Lint

Finds the 365-day and 90-day certificate assumptions left in your cert-manager, Terraform, ACME and monitoring config. The public TLS maximum is 200 days now, 100 on 2027-03-15, 47 on 2029-03-15.

## What it finds

```
k8s/api-prod-tls.yaml
   7: duration of 4800h (200 days) or more. The public TLS maximum has been 200 days
      since 2026-03-15 (CA/B SC-081v3) - the CA will refuse this or silently truncate it.
   8: renewBefore of 2400h (100 days) or more will exceed the entire certificate
      lifetime from 2027-03-15, and cert-manager will renew in a loop.
  15: a monthly renewal schedule. Let's Encrypt's default classic profile drops to
      64 days on 2027-02-10 and 45 days on 2028-02-16.
  16: 398 days stopped being the maximum on 2026-03-15. It is 200 days now, 100 from
      2027-03-15 and 47 from 2029-03-15.
-- 4 --
```

## What it does for free

- Check the open file against all 24 rules - every finding, with line number, severity and the date the limit changes
- Reopen the last report without re-running the check
- List every rule that ships inside, so you can see what is and is not covered

## With a licence

- **Every file in the repository in one pass** — One command walks the whole workspace instead of the file you happen to have open.
- **A CI gate that fails the build** — Machine-readable output so a pull request that reintroduces a 365-day duration cannot merge.
- **An exported audit file** — Writes the findings to CSV, JSON or HTML for the change ticket or the auditor.
- **Rewrite the offending durations in place** — Applies the replacement value on the rules that define one, and lists the rest for a manual edit.

[**Get the full version - $29**](https://getreadystack.com) - $29 once, one licence key per person or team seat, 7-day full refund.


## Install

```
ext install cert-lifetime-lint-47day
```
