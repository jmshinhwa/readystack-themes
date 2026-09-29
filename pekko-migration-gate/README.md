# Pekko Migration Gate — Akka BSL licence check

![Pekko Migration Gate — Akka BSL licence check — finds the line](https://getreadystack.com/img/promo/pekko-migration-gate_demo.gif)

![Pekko Migration Gate — Akka BSL licence check](https://getreadystack.com/img/promo/sku353589_result_card.jpg)

Pekko migration check for `build.sbt`, `pom.xml`, `build.gradle` and `application.conf`. It marks every Akka artifact that is still under the Business Source License 1.1 on the date you choose, and every `akka.*` setting, `akka://` address, default port and `import akka.` line that Apache Pekko ignores. Each finding prints the Pekko line to use.

Hub page and free web version: https://getreadystack.com/tools/pekko-migration-gate

Yardstick: Akka's BSL FAQ says Akka subscriptions start at $0.25 per core hour — eight production cores all year is 8 × 8,760 h × $0.25 = $17,520.

## Why the date matters

Akka 2.7.0 and later ship under BSL 1.1. Each release converts to Apache 2.0 on its **own** Change Date, printed in that release's LICENSE file:

| Akka release | Change Date (from its LICENSE) |
|---|---|
| 2.7.x | "TBD (3 years after 2.7.0 release)" |
| 2.8.0 | 2026-03-16 |
| 2.8.8 | 2027-10-28 |
| 2.9.0 | 2026-10-23 |
| 2.9.5 | 2027-08-19 |
| 2.10.0 | 2027-10-16 |

So "Akka 2.8 is Apache now" is true for 2.8.0 and false for 2.8.8. The checker resolves the version from `val AkkaVersion = "…"`, Maven `<properties>` or Gradle variables and compares it with today's date (or the date you enter).

The Akka 22.10 release also moved these modules to BSL: Akka HTTP 10.4.0, Akka gRPC 2.2.0, Akka Management 1.2.0, Alpakka Kafka 4.0.0, Alpakka 5.0.0, Akka Persistence R2DBC 1.0.0, Akka Persistence JDBC 5.2.0, Akka Persistence Cassandra 1.1.0 and Akka Projections 1.3.0. Later versions on those lines are flagged with the Pekko module name (`pekko-http`, `pekko-connectors-*`, `pekko-grpc`, `pekko-management`, `pekko-persistence-*`, `pekko-projection`).

## The 9 rules

1. `akka-core-bsl-active` — Akka core jar still under BSL on the date (error)
2. `akka-core-bsl-unresolved` — BSL release whose exact Change Date is not proven (warning)
3. `akka-core-converted` — exact release already past its Change Date (info)
4. `akka-module-bsl-line` — Akka HTTP / Alpakka / gRPC / Management / persistence module on a BSL line (warning)
5. `akka-pekko-mixed` — Akka and Pekko jars in the same build (error)
6. `akka-config-ignored` — `akka { }` or `akka.` key; Pekko reads only `pekko.*` (error)
7. `akka-seed-protocol` — `akka://` address; a default Pekko node accepts only `pekko://` (error)
8. `akka-default-port` — 25520 / 2552 are Akka defaults; Pekko uses 17355 (Artery) and 7355 (classic) (warning)
9. `akka-import` — `import akka.` must become `import org.apache.pekko.` (warning)

## Example

```
"com.typesafe.akka" %% "akka-actor-typed" % AkkaVersion   // AkkaVersion = "2.9.3"
→ akka-actor-typed 2.9.3 is BSL 1.1 until at least 2026-10-23
→ "org.apache.pekko" %% "pekko-actor-typed" % <Pekko 1.x version>
```

Pekko 1.x forked from Akka 2.6.x, so APIs added in Akka 2.7 or later may need rework after the swap.

## Free and full version

The open file is checked completely, with no key. Full version ($29 once, one licence key per person or team seat): a workspace sweep of every build file and `.conf` in the repo into one Markdown migration report — https://getreadystack.com/api/buy/cl/polar_cl_31Zz7p4BZ19GYaxA6IFbSWHcVy77keudb2iZg2eBMSt

Sources: LICENSE files at tags v2.8.0, v2.8.8, v2.9.0, v2.9.5, v2.10.0 of github.com/akka/akka · Akka 22.10 release notes · Akka BSL FAQ (akka.io/bsl-license-faq) · Apache Pekko migration guide (pekko.apache.org).
