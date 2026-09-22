# Image Host Transfer Lint

![Image Host Transfer Lint](https://getreadystack.com/img/promo/sku151192_result_card.jpg)

A docs page is not just text. Every `![screenshot](https://...)`, every avatar,
every build badge and every webfont `<link>` is a request that the reader's
browser makes to somebody else's server. That request carries the reader's IP
address, the referring URL and the time. If the server sits outside the EEA,
that is a transfer to a third country under GDPR Art. 44 — and it happens before
the reader has agreed to anything, because it happens while the page is loading.

This extension reads your `.md`, `.mdx` and `.html` docs and names every asset
URL that leaves the EEA, the host it goes to, the country it lands in, and the
concrete way to keep it at home.

## What it checks

17 rules, all of them about assets that a reader's browser fetches from a third
party while a docs page renders:

- Webfonts: `fonts.googleapis.com`, `fonts.gstatic.com`, `use.typekit.net`
- Avatars: `gravatar.com`
- Image hosts: `imgur.com`, `sm.ms` / `i.loli.net`, `ibb.co`, `postimg.cc`
- Repo hotlinks: `raw.githubusercontent.com`, `user-images.githubusercontent.com`
- Script CDNs: `cdn.jsdelivr.net`, `unpkg.com`, `cdnjs.cloudflare.com`
- Chinese object storage: Aliyun OSS, Tencent COS, Qiniu buckets
- Embeds: plain YouTube iframes, Disqus / utteranc.es / giscus
- Live images: `img.shields.io`, `badgen.net`, `mermaid.ink`, `kroki.io`, `quickchart.io`
- Analytics loaded on page render: `googletagmanager.com`, `google-analytics.com`
- Assets still fetched over plain `http://`

Fenced code blocks are skipped on purpose: a host named inside an example block
is documentation, not a request. A host named in prose without a URL is skipped
too. Each flagged line reports one rule — the first one that matches — so the
count you see is a count of lines to fix, not a count of regex hits.

## The measured example

The bundled fixture `_fixtures/dirty.md` is a 41-line internal deploy handbook.
Running the engine over it returns **7 findings on 7 lines** (6 errors, 1
warning): Google Fonts, Gravatar, Imgur, SM.MS, a Shields badge, a plain YouTube
embed and a jsDelivr script. `_fixtures/clean.md` is the same page after the
fixes, and returns **0 findings** — including the old markup kept inside a
fenced example block, which is correctly ignored.

## Why this is not obvious

The receiving country is the part people get wrong. `raw.githubusercontent.com`
feels like "my own repo" and is a US host. `cdn.jsdelivr.net` is not one country
at all: it resolves to US and Chinese edge nodes depending on who is reading, so
there is no single country to write into an Art. 30 record. An image that
arrived through an editor upload plugin often sits on whatever backend that
plugin shipped with — frequently a Chinese bucket — long after the author forgot
about it.

## Yardstick

LG München I, 20 O 14144/19 (20 January 2022) awarded **EUR 100 in damages to a
single visitor** for one Google Fonts call on one page.

## Free and paid

The free scan is complete for one job: open a docs file or folder, get every
leaking asset named with host, country and fix. The paid layer works on a
different axis — ownership of the evidence: a workspace-wide Art. 30 transfer
register as CSV and Markdown, plus a self-host rewrite map listing every file,
every URL and the local path to replace it with, per team seat.

Free web version and the full tool index:
https://getreadystack.com/tools/image-host-transfer-lint

## Commands

- `Image Host Transfer Lint: Scan current file`
- `Image Host Transfer Lint: Scan workspace`
- `Image Host Transfer Lint: Export transfer register`

## Licence

See LICENSE.txt. The rule set in `ext/rules.json` cites GDPR Art. 44–49 and
Art. 30(1)(e); it is a lint, not legal advice.
