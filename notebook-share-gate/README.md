# Notebook Share Gate

![Notebook Share Gate](https://getreadystack.com/img/promo/sku133989_result_card.jpg)

A `.ipynb` file is not source code. It is source code **plus a saved copy of everything the code printed**. When you attach a notebook to a ticket, push it to a shared repo, or drop it in a channel so a colleague can "just look at the numbers", the outputs travel with it: the `os.environ` dump from cell 1, the `df.head()` that showed three real customers, the traceback that names the home directory of whoever ran it.

This extension reads the saved outputs, not just the code.

## What it checks

18 rules, applied to the parts of the notebook that a code linter does not read:

- **Saved cell outputs** — `stream` text, `text/plain` and `text/html` results, `evalue`, and every line of a stored `traceback`.
- **Cell source** — for credentials hard-coded in the code, which clearing outputs will not remove.
- **Notebook structure** — execution counts that run out of order (the saved outputs were not produced by a top-to-bottom run), and saved `ipywidgets` state in `metadata.widgets`, which keeps values the visible outputs no longer show.

Credentials covered: AWS access key ids and secret keys, `sk-` family API keys, GitHub tokens, Slack tokens, JWTs, database URLs carrying a password, private key blocks, and `os.environ` dumps that print a variable together with its value.

Personal data covered: email addresses, IBANs, and full card numbers (PCI DSS 3.3 permits at most the first six and last four digits to be displayed), plus internal hostnames, private network addresses, and traceback paths that carry a named person's home directory.

## Free and paid

Free, no key: audit the notebook you have open. Every leaking output is named with its rule, its severity and its line in the file, so you can jump to it and clear it. That job finishes without a key.

The licensed layer works on a different axis — scope and the record. It sweeps every `.ipynb` in the workspace in one pass and exports a dated audit record you keep on file, rather than a result that disappears when you close the panel.

## Reading the result

Severity `error` means the notebook is carrying a secret or personal data. Severity `warn` means it is carrying something that describes your estate or makes the outputs unreproducible.

On the two notebooks shipped in `_fixtures/`, the same engine reports **23 findings across 6 cells** in `dirty.ipynb` (16 error, 7 warn, 15 distinct rules) and **0 findings** in `clean.ipynb`, which is the same analysis with outputs cleared and the PII columns masked.

## The yardstick

GDPR Art. 33 gives you 72 hours from becoming aware of a personal-data breach to notify the supervisory authority; Art. 83(5) caps the administrative fine for this class of infringement at EUR 20 million or 4 % of total worldwide annual turnover, whichever is higher. Secret scanners that run on a git push read the code in a diff; the saved output blob is where the notebook keeps what the code printed.

## Same engine on the web

The free web page runs the identical `engine.js` in the browser — paste a notebook, get the same findings list, nothing uploaded: <https://getreadystack.com/tools/notebook-share-gate>

## Licence

See `LICENSE.txt`.
