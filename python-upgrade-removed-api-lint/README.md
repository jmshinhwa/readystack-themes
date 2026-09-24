# Python Upgrade Lint: Removed Stdlib 3.12-3.14

Python 3.10 reaches end of life in October 2026: no more security fixes. The next step is Python 3.12, 3.13 or 3.14, and each of those removed parts of the standard library. A line like `import cgi`, `import imp` or `from distutils.core import setup` runs fine on 3.10 and stops the program with `ModuleNotFoundError` on the new version. Removed methods such as `self.assertEquals(...)` or `ssl.wrap_socket(...)` fail with `AttributeError` at run time instead.

This extension reads the open `.py` file and marks every line that uses something removed in 3.12, 3.13 or 3.14. For each one it shows the line, the version that removed it, the source (PEP 594, PEP 632 or the official What's New page), and the replacement.

Tool page: https://getreadystack.com/tools/python-upgrade-removed-api-lint

## What it checks: 43 rules

- **Removed in 3.12 (13 rules):** `distutils` (PEP 632), `imp`, `asyncore`, `asynchat`, `smtpd`, the old `unittest.TestCase` aliases (`assertEquals`, `failUnless`, `assertRegexpMatches`, ...), `SafeConfigParser`, `readfp()`, `ssl.wrap_socket()`, `ssl.match_hostname()`, `locale.format()`, `pkgutil.ImpImporter`, plus a warning for `datetime.utcnow()` (deprecated, not removed yet).
- **Removed in 3.13 (24 rules):** the 19 "dead battery" modules from PEP 594 (`aifc`, `audioop`, `cgi`, `cgitb`, `chunk`, `crypt`, `imghdr`, `mailcap`, `msilib`, `nis`, `nntplib`, `ossaudiodev`, `pipes`, `sndhdr`, `spwd`, `sunau`, `telnetlib`, `uu`, `xdrlib`), plus `lib2to3`, `tkinter.tix`, `locale.resetlocale()`, `typing.io` / `typing.re` and `unittest.makeSuite()`.
- **Removed in 3.14 (6 rules):** `ast.Num` / `ast.Str` / `ast.Bytes` / `ast.NameConstant` / `ast.Ellipsis`, `pkgutil.find_loader()`, the asyncio child watchers, `URLopener` / `FancyURLopener`, the `importlib.abc` resource classes and `sqlite3.version`.

Pick the version you are moving to (3.12, 3.13 or 3.14) and only the rules removed up to that version are reported. Strings, docstrings and comments are skipped, so a note that says "we used cgi here" is not flagged.

## Example

Our sample file is a 46-line nightly job written for Python 3.10. With the target set to 3.14 the check reports 14 findings (13 removed, 1 deprecated). With the target set to 3.13 it reports 12, and with 3.12 it reports 8.

| Line that breaks | Replacement |
|---|---|
| `import cgi` | `urllib.parse.parse_qsl`, removed in 3.13 |
| `import imp` | `importlib`, removed in 3.12 |
| `from distutils.core import setup` | `setuptools`, removed in 3.12 |
| `ssl.wrap_socket(sock)` | `SSLContext().wrap_socket`, removed in 3.12 |
| `isinstance(node, ast.Str)` | `ast.Constant`, removed in 3.14 |

## Why not just ask a chatbot?

A chat answer lists removed modules from memory. It does not go through your file line by line, and it often mixes up which version removed what (`imp` went in 3.12, `cgi` in 3.13, `ast.Str` in 3.14). AI coding assistants learned from years of older Python, so their code can still contain these imports. This check is one fixed rule table that gives the same answer every time.

## Free and paid

Free: check the open `.py` file against all 43 rules, in VS Code or on the web page, with no key. Paid: sweep the whole workspace in one pass and write a Markdown upgrade report for each target version to attach to the migration ticket. That part asks for a licence key ($29 once, one key per person or team seat): [licence key](https://buy.polar.sh/polar_cl_2Izy69ZyqcJdKkYcQRlrKODleXMjHPRFCgWjE3eTaR6).

What the manual alternative costs: By hand, this is developer hours at the US median software developer wage of $63.98 an hour (BLS, May 2024).

## Commands

- `Check this file`: checks the active editor, free.
- `Sweep workspace and write report (licence)`: checks every `**/*.py` file and writes the Markdown report.
- `Enter licence key`.

Everything runs locally. No code leaves your machine.
