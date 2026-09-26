# Deploying the Reporting Service

Internal handbook page, published at docs.example.eu for customers in Germany,
Austria and the Netherlands.

<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap">

## Who maintains this page

<img src="https://secure.gravatar.com/avatar/9c1f3b2a7d4e5f60?s=96" width="48" alt="Maintainer avatar">

Questions go to the platform team.

## Step 1 - open the deploy dashboard

![Deploy dashboard](https://i.imgur.com/Qk3vT9m.png)

The dashboard shows the last ten releases and the rollback button.

## Step 2 - check the queue depth

![Queue depth panel](https://i.loli.net/2026/03/11/qdepth-panel.png)

If the depth stays above 500 for more than five minutes, stop the rollout.

## Build status

![build](https://img.shields.io/github/actions/workflow/status/example/reporting/ci.yml)

## Walkthrough

<iframe width="560" height="315" src="https://www.youtube.com/embed/4rTcPq2s1kA" title="Deploy walkthrough"></iframe>

## Copy-to-clipboard helper used by this page

<script src="https://cdn.jsdelivr.net/npm/clipboard@2.0.11/dist/clipboard.min.js"></script>

## Rollback

Run `make rollback` and confirm in the dashboard. See [the runbook](./runbook.md)
and [the escalation ladder](./escalation.md) for the on-call path.
