# Livewire 3 Upgrade Blocker Lint

![Livewire 3 Upgrade Blocker Lint](https://getreadystack.com/img/promo/sku115367_result_card.jpg)

Livewire 2 code does not fail loudly when you move to Livewire 3. It compiles, the page renders, and
then a button does nothing. `$this->emit('saved')` throws only when that method runs. `wire:model.defer`
parses as an unknown modifier and is ignored. `wire:model.debounce.400ms` stops sending requests at all
because debounce now only applies to `.live` bindings. `livewire:load` never fires, so the Alpine
component inside it never initialises. A `<livewire:row>` inside `@foreach` without `:key` keeps
rendering — it just hands row 3's state to row 4 after a delete.

This extension reads the file in front of you and names each of those lines with the Livewire 3
replacement next to it.

## What it checks

15 rules over `**/*.php` (which includes `.blade.php`), in three groups:

- **Events (4 rules, all errors):** `$this->emit()`, `$this->emitTo()`, `$this->emitSelf()` /
  `emitUp()`, `$this->dispatchBrowserEvent()`.
- **Blade directives and modifiers (6 rules):** `wire:model.defer`, `wire:model.lazy`,
  `wire:model.debounce` without `.live`, `wire:click.prefetch`, `livewire:load`, `@livewireStyles`.
- **Component surface (5 rules):** `protected $queryString`, `namespace App\Http\Livewire`,
  `$wire.entangle(...).defer`, `assertEmitted` / `assertNotEmitted` in tests, and a
  `<livewire:...>` tag inside a loop with no `:key`.

Comment lines and `{{-- --}}` Blade comments are stripped before matching, so a migration note that
mentions `emit()` is not reported.

## Measured on the shipped fixtures

`_fixtures/dirty.php` is a 43-line Livewire 2 component. Audited 2026-09-18 the engine reports
**14 blockers — 10 errors and 4 warnings**, covering 14 of the 15 rules (the 15th is a test-file
rule). `_fixtures/clean.php` is the same component rewritten for Livewire 3 and reports **0**.
Both files ship inside the extension, so the numbers above are reproducible on your machine.

## Why the ordinary tools stop short

`grep -r "emit("` finds the event calls. It does not find a `<livewire:row>` inside `@foreach` that is
missing `:key`, because that defect is the *absence* of an attribute inside a block — it needs the loop
depth, which a line-oriented search does not have. It also cannot tell `wire:model.debounce` (dead)
from `wire:model.live.debounce` (correct), since one is a prefix of the other.

## Yardstick

A freelance Laravel developer at $85/hour spends the first hours of
an upgrade doing exactly this pass by hand across every component in the app.

## Free and paid

Free, no key: scan the file you have open and get every blocker with its Livewire 3 replacement, line by
line. That finishes the file. Paid: scan every `.php` and `.blade.php` in the workspace in one command
and export a REPORT.md / JSON with `file:line` you keep, plus a non-zero exit code for CI.
$29 once - one licence key per person or team seat, 7-day full refund: <https://buy.polar.sh/polar_cl_JoEBGmMxghz3XsayVbZSJktcNspzSxRkJYcdc3S0eYU>

## Also in the browser

The same engine — the same `rules.json`, the same `check()` — runs on one page with no install:
<https://getreadystack.com/tools/livewire3-upgrade-blocker-lint>

## Scope

This extension reads Livewire 2 → 3 API changes. It does not run your app, does not rewrite files, and
sends nothing anywhere: matching happens locally, line by line.
