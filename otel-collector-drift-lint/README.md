# OTel Collector Drift Lint

![OTel Collector Drift Lint](https://getreadystack.com/img/promo/sku81005_result_card.jpg)

AI-generated Collector configs and configs written before 2024 share a problem: they are still valid YAML, and the Collector they were written for no longer exists. This extension reads an OpenTelemetry Collector config and reports the parts that the current Collector rejects at startup, and the attribute names that the semantic conventions renamed out from under your processors.

Run **OTel Drift: Lint this Collector config** on any `*.yaml` or `*.yml` file. Findings land in the Problems panel with a line number and the replacement.

## What it looks for

**Components and settings the Collector moved on (9 rules).** The `jaeger` and `jaeger_thrift` exporters were removed from opentelemetry-collector-contrib in v0.107.0 — the replacement is an `otlp` exporter pointed at Jaeger's OTLP port 4317. The `memory_ballast` extension was removed in v0.113.0 in favour of the `GOMEMLIMIT` environment variable. The `logging` exporter was deprecated in favour of `debug`, and its `loglevel` key became `verbosity`. `remote_sampling` was removed from the `jaeger` receiver and now lives in the `jaegerremotesampling` extension. `opencensus` receivers and exporters are deprecated, and `OTEL_SEMCONV_STABILITY_OPT_IN` only ever controlled the migration window. `service.telemetry.metrics.address` is deprecated in favour of a `readers` block. Four of these nine are errors - a config the Collector refuses to load, so the pod restarts and stays down. The other five still start today and are on their way out.

**Attribute names the conventions renamed (29 rules).** When the HTTP conventions went stable in semconv v1.23.0, `http.method` became `http.request.method`, `http.status_code` became `http.response.status_code`, `http.url` became `url.full` and `http.target` became `url.path`. The network, database, messaging, FaaS and resource groups moved the same way: `net.peer.name` to `server.address`, `db.statement` to `db.query.text`, `db.system` to `db.system.name`, `deployment.environment` to `deployment.environment.name`, `telemetry.auto.version` to `telemetry.distro.version`. A `filter` or `transform` processor keyed on the old spelling is valid YAML, starts fine, and silently stops matching the moment an instrumentation library is upgraded. That is the failure nobody gets paged for.

**One absence check.** A Collector config with no `service.name` anywhere: the telemetry arrives under `unknown_service` and is unfindable in the backend.

39 rules in total. On the 82-line sample config in `_fixtures/dirty.yaml` they produce 25 findings — 20 errors and 5 warnings.

## Free and paid

Linting the file you have open is free and complete. All 39 rules run, every finding shows its line and its replacement. No watermark, no trial counter, nothing withheld.

The licence key changes the scope, not the depth: **OTel Drift: Scan workspace** walks every YAML in the folder in one pass, writes a JSON or Markdown report you keep, and returns a non-zero exit code so a CI job can block on the errors. One key, $29 once, 7-day full refund — https://buy.polar.sh/polar_cl_vmmhH1xBuIiTeyI1tTLXEkFDotprl8ilIxhtd2l5ESK

## Yardstick

A freelance SRE or observability contractor bills $100–150 an hour, and checking one config against the Collector changelog and the semantic convention history takes most of an hour — for one config.

## Notes

The same rule set runs in the browser, on a page that keeps the config in the tab and sends nothing anywhere: https://getreadystack.com/tools/otel-collector-drift-lint

Rules live in `rules.json`. Collector versions move; when a component you rely on is removed, the fix is a line in that file.
