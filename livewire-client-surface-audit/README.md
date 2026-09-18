# Livewire Client Surface Audit

![Livewire Client Surface Audit](https://getreadystack.com/img/promo/sku62908_result_card.jpg)

AI assistants write Livewire components the way they write plain PHP classes: `public` for everything, no `#[Locked]`, no `authorize()`. Livewire does not treat those two keywords the way PHP does. **Every public property on a Livewire component is round-tripped through the browser, and every public method on it can be called from the browser as `$wire.methodName()`.** So `public function deleteInvoice()` is an endpoint, and `public $amountDue` is a form field, whether or not you put them in the template.

This extension reads the file you have open and marks each line the browser can reach, with the fix on that line.

## What it checks — 10 rules

| Rule | What it catches |
| --- | --- |
| `client_callable_method` | A public action method (`delete…`, `approve…`, `save…`, `export…`, 30 verbs) in a class with no `authorize()`, `Gate::`, `can()` or `abort_unless()` anywhere |
| `unlocked_state_property` | A public property named for identity, money or state (`…Id`, `price`, `amount`, `status`, `role`, `quota`…) with no `#[Locked]` above it |
| `secret_in_public_property` | A public property holding a token, key, password, signature or OTP — those are serialized into the page HTML |
| `mount_without_authorization` | `mount()` looks a record up, but the class never authorizes it |
| `mass_assign_from_state` | `->update($this->…)`, `->fill($this->…)`, `::create($this->…)` — browser-held state written straight to a row |
| `unvalidated_upload` | `WithFileUploads` plus `->store()` with no `validate()` or `#[Validate]` in the class |
| `url_bound_property` | `#[Url]` on an identity or state property, so the address bar sets it |
| `unescaped_blade_echo` | `{!! … !!}` with no sanitizer on the line |
| `dynamic_template_include` | `@include($var)` / `@component($var)` — the template name comes from a variable |
| `debug_output_in_component` | `dd()`, `dump()`, `var_dump()`, `ray()`, `print_r()` left in a rendered component |

Run on the sample component shipped with this repo (`_fixtures/dirty.php`, 58 lines): **14 findings, 11 of them high.** The fixed twin (`_fixtures/clean.php`, 65 lines) returns **0**.

## The clock

The moment an unguarded public method hands one tenant another tenant's record, that is a personal-data breach, and **GDPR Article 33 gives the controller 72 hours from awareness to notify the supervisory authority.** The scan you did not run is the one that starts that 72-hour clock without telling you.

## Free and full

Free, with no key: open any `.php` or `.blade.php` file, run **Livewire Client Surface Audit: Check this file**, and you get every finding in that file — all 10 rules, the line, and the fix. Nothing is hidden, watermarked, timed out or counted down. One file is a finished job.

The full version scans every PHP and Blade file in the workspace in one run and writes a dated Markdown or JSON audit — the artefact you hand to a client, attach to a pull request, or fail a CI build on. $29 once, one licence key per person or team seat, 7-day full refund.

## Why not a general PHP linter

PHPStan, Psalm and Larastan check types and call graphs. They model `public` as PHP defines it: reachable from other PHP. Livewire redefines `public` as *reachable from the visitor's browser*, and that redefinition is what this extension checks. A general linter reports zero on `_fixtures/dirty.php`.

**Yardstick:** a single-application web penetration test typically starts around $2,000.

Free web version and the rest of the toolkit: <https://getreadystack.com/tools/livewire-client-surface-audit>

## Commands

- **Livewire Client Surface Audit: Check this file** — free, every rule, every line.
- **Livewire Client Surface Audit: Sweep workspace and write report** — full version.
- **Livewire Client Surface Audit: Enter licence key**

MIT for the free tier. See LICENSE.
