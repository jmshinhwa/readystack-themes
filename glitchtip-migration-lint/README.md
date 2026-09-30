# GlitchTip Migration Lint for Sentry

![GlitchTip Migration Lint for Sentry — finds the line](https://getreadystack.com/img/promo/glitchtip-migration-lint_demo.gif)

![GlitchTip Migration Lint for Sentry](https://getreadystack.com/img/promo/sku395439_result_card.jpg)

Find every Sentry SDK setting that GlitchTip will silently drop, before you switch the DSN.

GlitchTip speaks the Sentry SDK protocol, so a migration looks like a one-line DSN change. It is not. GlitchTip's ingest code (`apps/event_ingest/schema.py` in glitchtip-backend) accepts six envelope item types: `event`, `transaction`, `user_report`, `feedback`, `log`, `otel_log`. It ignores `session`, `sessions`, `client_report`, `attachment`, `check_in`, `profile`, `profile_chunk`, `replay_event`, `replay_recording`, `replay_video`, `span` and `trace_metric`. The SDK keeps sending them and nothing tells you they are gone.

This extension reads the file you have open and marks, in the Problems panel:

- the six features that stop arriving: Session Replay, profiling, cron check-ins, sessions, attachments and metrics
- DSNs and upload URLs that still point at sentry.io
- `tracesSampleRate: 1.0`, which on hosted GlitchTip counts every transaction as an event (Free is 1,000 events/mo; past the quota GlitchTip throttles, at 2x it blocks fully)
- `sentry-cli` steps with no url (they default to https://sentry.io/) and self-hosted `getsentry/*` images, whose web app is licensed FSL-1.1-Apache-2.0

Each finding gives the line, the envelope item it produces and the GlitchTip-side fix: a Heartbeat uptime monitor or `glitchtip-cli monitors run` for cron check-ins, `setContext` for attachments, `enableLogs` for metrics, `autoSessionTracking: false` for sessions.

## Example

On the sample `sentry.client.config.ts` (a Next.js app) the lint returns 11 findings, 7 errors. The fixed version returns 0.

## Rules (16)

| id | severity | what | envelope item |
|---|---|---|---|
| `GT_DSN_SENTRY_IO` | error | DSN still points at sentry.io | - |
| `GT_CLI_URL_SENTRY` | error | Upload URL still points at sentry.io | - |
| `GT_REPLAY_INTEGRATION` | error | Session Replay integration | replay_event / replay_recording |
| `GT_REPLAY_RATES` | error | Replay sample rate | replay_event / replay_recording |
| `GT_PROFILING_RATE` | error | Profiling sample rate | profile / profile_chunk |
| `GT_PROFILING_INTEGRATION` | error | Profiling integration or package | profile / profile_chunk |
| `GT_CRON_CHECKIN` | error | Cron monitor check-in | check_in |
| `GT_SESSIONS` | warn | Release-health sessions on | session / sessions |
| `GT_SESSION_API` | warn | Manual session call | session |
| `GT_ATTACHMENT` | warn | Event attachment | attachment |
| `GT_METRICS` | warn | Sentry metrics API | trace_metric |
| `GT_STANDALONE_SPANS` | warn | Standalone span streaming | span |
| `GT_TRACES_FULL` | warn | Every transaction sampled | transaction |
| `GT_SENTRY_CLI_DEFAULT` | info | sentry-cli upload step | - |
| `GT_SELFHOSTED_SENTRY` | info | Self-hosted Sentry image (FSL) | - |
| `GT_CLIENT_REPORTS` | info | Client reports on | client_report |

Files: JS/TS, Python, Dart, Swift, Kotlin, Java, C#, YAML, `.env`, `.properties`, `.sentryclirc`.

## Free and paid

Linting the open file is free and has no limit. The workspace migration report (every app, CI file and compose file in the repo, as a Markdown or CSV checklist for the cutover pull request) needs a licence key: $29 once, one licence key per person or team seat. Get it here: https://getreadystack.com/api/buy/cl/polar_cl_298CgJtnZYoccavOy9Fai6GwNUqJK4Mdl6DuM1ZTicE

Yardstick: Sentry Team is $26/mo billed annually; GlitchTip hosted Small is $15/mo for 100k events.

Free web version: https://getreadystack.com/tools/glitchtip-migration-lint

## Sources

- GlitchTip ingest item types: glitchtip-backend `apps/event_ingest/schema.py` (`SupportedItemType`, `IgnoredItemType`), read 2026-09-29
- GlitchTip SDK docs: "autoSessionTracking: false, // GlitchTip does not support sessions" (glitchtip.com/sdkdocs/javascript)
- GlitchTip pricing and quota behaviour: glitchtip.com/pricing
- Sentry licensing: open.sentry.io/licensing (FSL-1.1-Apache-2.0 for the web app, MIT for SDKs)
- Sentry pricing: sentry.io/pricing
