# TDM Reservation Lint

![TDM Reservation Lint](https://getreadystack.com/img/promo/sku57144_result_card.jpg)

A text-and-data-mining reservation only binds a crawler that can read it. Article 4(3) of Directive (EU) 2019/790 — transposed in Germany as § 44b UrhG — lets a rightsholder reserve TDM rights on publicly available content, and for online content it requires that reservation to be **machine-readable**. Since 2 August 2025, Article 53(1)(c) of the EU AI Act requires providers of general-purpose AI models to put a copyright policy in place that identifies and respects those reservations. Both sentences have the same hinge: the machine has to be able to parse what you wrote.

Most robots.txt files fail that hinge quietly. They are valid syntax, so every syntax validator passes them, and nothing reports that a group matches no crawler at all.

This extension parses the robots.txt you have open and reports each line that does not do what it looks like it does.

## What it checks

15 rules over 9 tracked training crawlers, grouped into four kinds of silent failure:

**Tokens that match nothing.** `anthropic-ai` and `Claude-Web` are retired; the token Anthropic sends is `ClaudeBot`. `FacebookBot` was replaced by `meta-externalagent`. Invented tokens — `ChatGPT-Bot`, `AnthropicBot`, `OpenAI-Crawler` — appear constantly in generated configuration files. robots.txt matches the product token literally, so a near-miss reserves nothing at all. Unknown tokens are reported with the nearest published token.

**Coverage gaps.** The 9 training crawlers tracked by name are: GPTBot, ClaudeBot, Google-Extended, CCBot, Bytespider, meta-externalagent, Applebot-Extended, PerplexityBot, Amazonbot. Each is matched on its own token, so a group for GPTBot says nothing to the other eight. The report names which of the nine are still unreserved.

**Rules that are never in force.** A `Disallow:` above the first `User-agent:` line is dropped by every RFC 9309 parser. A path written `private/` instead of `/private/` never fires. An empty `Disallow:` under a training crawler is full permission, not a reservation. `Noindex:` in robots.txt has been ignored by Google since 1 September 2019. A relative `Sitemap:` value is discarded. `Crawl-delay` is outside RFC 9309 and is ignored by Googlebot and GPTBot.

**Groups that cancel each other.** A crawler obeys only its most specific group. The moment you give a bot its own `User-agent:` block, the `User-agent: *` rules stop applying to it — the extension lists the paths that bot can now reach.

It also reports when nothing in the file points at a TDMRep signal. robots.txt is an instruction to crawlers; the W3C TDM Reservation Protocol expects `/.well-known/tdmrep.json`, and the two are read by different parties.

## Using it

Open a `robots.txt` and run **TDM Reservation Lint: Check this file** from the Command Palette. Findings are reported by line, each with the replacement line.

The free layer lints the file in front of you and finishes that job: every line, every rule, the exact fix. The paid layer works on a different axis — the whole workspace, and files you keep: the corrected `robots.txt`, a matching `/.well-known/tdmrep.json`, and a dated Markdown evidence file.

A media and IP lawyer reviewing a robots.txt reservation bills from €200 an hour.

## Scope

The rules cover robots.txt structure per RFC 9309, the published crawler-token registries of the vendors named above, and the machine-readability requirement of Article 4(3) / § 44b. It does not read your site, fetch URLs, or give legal advice; it reports what a parser will do with the file you wrote.

Hub: https://getreadystack.com/tools/tdm-reservation-lint
