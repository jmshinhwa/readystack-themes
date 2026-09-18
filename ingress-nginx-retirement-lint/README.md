# Ingress-NGINX Retirement Lint

![Ingress-NGINX Retirement Lint](https://getreadystack.com/img/promo/sku97985_result_card.jpg)

Your cluster's routing rules live in annotations. The controller that read them is gone.

The ingress-nginx project stopped shipping releases and security fixes on **2026-03-01**. Every
`nginx.ingress.kubernetes.io/*` annotation in your manifests is now a line of configuration that no
maintained controller reads. Some of those lines have a one-to-one replacement in Gateway API. Some
of them have **no core equivalent at all** — and those are the ones that quietly disappear on cutover
day, because `kubectl apply` accepts the new manifest without complaint and the missing rule only
shows up as traffic that should have been blocked and was not.

This extension reads the Ingress YAML you have open and, line by line, names the Gateway API field
that replaces each annotation — or tells you plainly that there isn't one.

## What it reports

Open any `.yaml` or `.yml` manifest and run **Ingress-NGINX Retirement Lint: Check this file**.
Each finding carries the line number, the annotation, and the replacement:

```
L8   warn   nginx.ingress.kubernetes.io/rewrite-target
            → HTTPRoute filters[].type URLRewrite, urlRewrite.path.replacePrefixMatch
L11  error  nginx.ingress.kubernetes.io/auth-url
            → no Gateway API core equivalent; port it to an ExternalAuth filter or a sidecar
L13  error  nginx.ingress.kubernetes.io/whitelist-source-range
            → no Gateway API core equivalent; reproduce as a NetworkPolicy before cutover
```

The bundled fixture (`_fixtures/dirty.yaml`) is two Ingress objects from an AKS storefront. It
returns **24 findings, 12 of them errors**, and 5 of those findings say *no Gateway API core
equivalent*. The Gateway API version of the same routing (`_fixtures/clean.yaml`) returns 0.

## The 30 rules

The rule set covers five groups, all of them things that change meaning — not style:

- **Routing shape** — `rewrite-target`, `app-root`, `use-regex`, `server-alias`, `upstream-vhost`,
  permanent and temporal redirects, `ssl-redirect` and `force-ssl-redirect`.
- **Traffic** — `canary` and `canary-weight`, proxy timeouts, `limit-rps`, `load-balance`,
  `upstream-hash-by`, affinity and session cookies, `mirror-target`.
- **Security** — `auth-url` and `auth-signin`, `auth-tls-*` client certificates,
  `whitelist-source-range` and `denylist-source-range`, `ssl-passthrough`.
- **Snippets** — `configuration-snippet`, `server-snippet`, `stream-snippet`, `auth-snippet`.
  These have been refused by default since ingress-nginx v1.9 (`allow-snippet-annotations=false`).
- **Class and backend** — the deprecated `kubernetes.io/ingress.class` annotation, a missing
  `spec.ingressClassName`, the retired AKS `addon-http-application-routing` class,
  `backend-protocol`, `proxy-body-size`, `default-backend`, `service-upstream`.

Two rules are not pattern matches. One counts the days each `kind: Ingress` object has been running
on an unmaintained controller, against today's date. One flags an Ingress with no
`spec.ingressClassName` — an object that every controller ignores unless it has made itself the
cluster default.

## Where the line falls

The free extension lints **the file you have open**, and that is a finished job: paste or open a
manifest, get every finding with its replacement field, migrate it. Nothing is hidden, watermarked
or counted down.

The full version sweeps **every manifest in the workspace in one pass** and writes a migration
report file you keep — one document per cluster, which is what a change ticket or a platform review
actually needs.

## Yardstick

A freelance Kubernetes consultant bills around $150/hour, and an ingress-to-Gateway-API audit across
one cluster's manifests is a day of that.

## Free web version

The same engine runs in the browser, no install: <https://getreadystack.com/tools/ingress-nginx-retirement-lint>

## Scope

This reads YAML text. It does not talk to your cluster, does not need credentials, and sends nothing
anywhere. Findings are advisory: Gateway API conformance differs by controller, and fields marked
*experimental-channel* here (regex path matching, `sessionPersistence`, the CORS filter, `TLSRoute`)
ship only in some implementations. Confirm against your controller's conformance report before you
cut over.
