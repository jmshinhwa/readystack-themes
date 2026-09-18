# WP Plugin Review Gate

![WP Plugin Review Gate](https://getreadystack.com/img/promo/sku97552_result_card.jpg)

You wrote a WordPress plugin. The code works. The thing that sends it back from the
wordpress.org Plugin Review Team — or, worse, quietly stops your update from reaching
the installs you already have — is almost never the code. It is eight header lines in
`readme.txt` and the header comment at the top of the main plugin file.

This extension reads those two files the way a reviewer reads them, and says the exact
line to write instead.

## What it flags

Open a `readme.txt` or your main plugin `.php` file and run **WP Plugin Review Gate: Check
this file**. Every finding carries a line number, the value it found, and the replacement
line.

In `readme.txt`:

- `Stable tag: trunk` — trunk ships to every install, whatever sits in it today
- a missing `Stable tag`, `Requires at least`, `Requires PHP` or `Tested up to`
- `Tested up to: 6.8.2` — the directory reads the major only, `6.8`
- `Tested up to` older than `Requires at least` — two lines that contradict each other
- a short description over 150 characters, which the directory cuts mid-word
- more than five tags, where only the first five are used
- missing `License` / `License URI`, missing `== Changelog ==`
- a first line that is not `=== Your Plugin Name ===`

In the main plugin file:

- a header comment with no `Version`, `Requires PHP`, `License` or `Text Domain`
- no `defined( 'ABSPATH' ) || exit;` guard
- `wp_enqueue_script()` / `wp_enqueue_style()` pointing at a remote URL instead of a file
  you ship
- `eval()`, `base64_decode()`, `gzinflate()`, `str_rot13()` — what a reviewer reads as
  obfuscated code
- a hard-coded `wp-content/plugins` path instead of `plugin_dir_path()`

21 rules in all. On the sample `readme.txt` shipped in `_fixtures/dirty.txt` it returns
6 findings; on `_fixtures/clean.txt`, none.

## Why a chatbot answer is not the same thing

Ask an assistant to write a `readme.txt` and you get a plausible one: the header block is
there, the fields are spelled right. What it cannot know is the state of *your* file —
that your `Stable tag` says `trunk` because you pushed in a hurry, that `Tested up to`
picked up a patch number, that your short description grew to 179 characters after the
last rewrite. This runs on the file in front of you and counts.

## Free and paid

Free, no key: the file you have open is checked in full, every rule, every line number.

Paid: the whole plugin folder in one pass — `readme.txt` read against the plugin header,
`Stable tag` against `Version` across files — plus a dated report you keep for the
submission. $29 once, one licence key per person or team seat, 7-day full refund:
https://buy.polar.sh/polar_cl_qArF3mNB1PwK3Pdmu8u0XW9Y9cxzGW2ytS3iq05dr5h

A freelance WordPress developer bills $30 to $90 an hour; a pre-submission read is an hour
or two.

## The same engine in the browser

https://getreadystack.com/tools/wp-plugin-review-gate runs the identical `engine.js` on
text you paste, with nothing uploaded.

Nothing here contacts wordpress.org, and no file leaves your machine. The licence check is
the only network call the extension makes, and only for the paid sweep.
