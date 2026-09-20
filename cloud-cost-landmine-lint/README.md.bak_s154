# Cloud Cost Landmine Lint

![Cloud Cost Landmine Lint for Terraform, CloudFormation and Kubernetes](https://getreadystack.com/img/promo/sku32637_result_card.jpg)

Names every line in the file you have open that starts a recurring cloud charge, with the published us-east-1 price and the date it changes by itself.

## What it finds

```
line 12  single_nat_gateway = false        3 NAT gateways = $98.55/mo in hourly charges alone
line 31  version            = "1.34"        $0.60/cluster-hour instead of $0.10 from 2026-12-02
line 44  map_public_ip_on_launch = true     $0.005/hr per instance = $3.65/mo each, since 2024-02-01
line 57  retention_in_days  = 0             Never Expire; ingestion is $0.50/GB in the Standard class
```

## What it does for free

- The file you have open, checked against every rule that ships inside
- Every finding carries the published us-east-1 unit price, not a severity colour
- Lifecycle findings carry the date the price changes on its own, with nothing edited
- Check a selection alone when you are reviewing somebody else's pull request

## With a licence

- **Every file in the repository instead of the one you have open** — walks the whole workspace, modules and environments included, and reports the standing charges the repository starts as a whole
- **The findings as a CSV, JSON or HTML file** — writes a report file into the workspace so it can be attached to a change request or a budget review
- **Machine output that fails a build** — prints one JSON object per finding and exits non-zero so a pipeline can stop a merge that adds a standing charge

Amazon's own published price for the same untouched cluster after the date passes: $0.60 per cluster-hour instead of $0.10, which is $365 more every month.

[**Get the full version - $29**](https://getreadystack.com) - $29 once, one licence key per person or team seat, 7-day full refund.

Full workspace sweep and report: free for 7 days from your first sweep, then a licence key.


## Install

```
ext install cloud-cost-landmine-lint
```
