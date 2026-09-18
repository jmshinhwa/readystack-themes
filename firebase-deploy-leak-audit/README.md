# Firebase Deploy Leak Audit

![Firebase Deploy Leak Audit](https://getreadystack.com/img/promo/sku77708_result_card.jpg)

`firebase deploy` uploads what your `firebase.json` tells it to upload. When that file was scaffolded by an AI assistant or copied from a tutorial, the two lines that decide what reaches the public CDN — `hosting.public` and `hosting.ignore` — are usually the two lines nobody read.

This extension reads `firebase.json` and reports, before the deploy, which files the next deploy would publish that should never be public, and which response headers the CDN will not send.

## The trap it was built around

Firebase Hosting ships three default ignore patterns: `firebase.json`, `**/.*`, `**/node_modules/**`. The moment you write your own `ignore` array, **those defaults are replaced, not extended.** A config that reads `"ignore": ["node_modules"]` looks stricter than the default and is in fact weaker: every dotfile under the public root — `.env`, `.env.production`, `.npmrc`, `.git/` — becomes a file served over HTTPS at a guessable path. Generated configs hit this constantly, because the generator optimises for a config that deploys, not for a config that withholds.

## What it checks

17 rules over one file, grouped three ways:

- **Where the bundle comes from** — `public` pointing at the repository root; a hosting block with neither `public` nor `source`.
- **What the ignore list lets through** — the dropped dotfile default; `.env*`; `**/*.map` source maps; service-account credentials (`serviceAccount*.json`, `*adminsdk*.json`, `*.pem`); nested `node_modules`; `firebase.json` itself.
- **What the CDN answers with** — no `headers` block at all; missing `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`; a page that any origin can frame; `Access-Control-Allow-Origin: *` on a broad source; HTML served with a long `max-age`, which is why a deploy sometimes appears not to have landed.

Multi-target configs are handled: `hosting` may be an object or an array, and each block is reported under its own `target`.

Every finding carries a severity, the line in `firebase.json` it came from, what an outsider gets because of it, and the exact array entry or header to add.

## Free and paid

Free, no key: audit the `firebase.json` you have open, in the editor or on the web page, and see the full list of findings — nothing is hidden, truncated or watermarked.

Paid ($29 once): audit every `firebase.json` across a monorepo in a single run, and export the findings as Markdown or JSON to commit, attach to a release, or hand to a client. One licence key per person or team seat, 7-day full refund.

A freelance web-security reviewer bills around $150 an hour.

## Run it without installing

Same engine, one page, no upload of anything you do not paste: https://getreadystack.com/tools/firebase-deploy-leak-audit

## Notes

The rules live in `ext/rules.json` as data; `ext/engine.js` is the only code that reads them, and the same file runs in Node and in the browser. Findings are advisory: this reads the config, it does not contact your Firebase project or list what is currently deployed.
