# Proto Wire Break Check

![Proto Wire Break Check](https://getreadystack.com/img/promo/sku81241_result_card.jpg)

Delete a field from a `.proto`, forget the `reserved` line, and six weeks later someone hands that
number to a new field. Nothing throws. The service starts, the RPC returns, and every reader built
before the deletion decodes the new data as the old type — so the bug arrives as bad data, days
later, in someone else's dashboard. `protoc` has nothing to say about it: a hole in the numbering is
legal proto, and the compiler never sees the client you shipped last quarter.

This extension reads the `.proto` file in front of you and names every edit that changes what old
readers see, with the line number and the change that keeps the wire intact.

## What it looks at

**17 rules**, grouped by how they hurt you:

*The tag no longer means what it meant*
- a field number used twice in one message
- a field number that the message already `reserved` (it belonged to a deleted field)
- a field name that the message already `reserved`
- a hole in the field numbers with no `reserved` statement — the next edit will recycle that tag
- a field number inside `19000-19999`, or outside `1 … 536870911`

*JSON and proto stop agreeing*
- two fields that serialise to the same JSON key (`invoice_id` and `invoiceId`)
- two fields with the same name

*Enums drift*
- a proto3 enum whose first value is not `0`, so "unset" decodes as a real state
- two enum values on one number without `option allow_alias = true`
- a hole in the enum numbers with no `reserved` statement

*Presence and syntax*
- no `syntax` declaration, so the file silently compiles as proto2
- no `package` declaration
- a `required` field, which can never be removed later
- a proto2 `default =` on a proto3 field
- a bare proto3 scalar where "absent" and "zero" mean different things (`amount_cents`, `is_active`)
- `packed = false` on a repeated scalar, which changes the bytes for the same values

## The sample file in this repo

`_fixtures/dirty.proto` is 27 lines long and holds **18 findings — 10 of them errors**. The matching
`_fixtures/clean.proto` returns **0**. Same engine, same numbers, in the editor and in the browser.

## Free and full

Free, no key: open a `.proto`, run **Proto Wire Break Check: Check this file**, and read every finding
for that file — the line, what an old reader will do, and the edit that fixes it. That is the whole
job for one file.

The full version sweeps every `.proto` in the workspace in one pass and writes `PROTO-WIRE-AUDIT.md`
plus `audit.json` — a file you can commit, attach to a pull request, or fail a build on. $29 once,
one licence key per person or team seat, 7-day full refund.

**Yardstick:** a contract backend engineer runs $60+/hour on the public marketplaces; reviewing one
service's schema history by hand is an afternoon of that.

## Why not a chatbot

A language model will read your `.proto` and tell you it compiles. Often that is true — and it is
also not the question. The question is which numbers this message has already spent, which names it
reserved, and which tag a client in production is still writing. Roughly half of these 17 rules
describe things `protoc` will never reject either, because they are legal proto that only hurts the
readers you already deployed. The rules here are mechanical, so the answer is the same on every run.

## More

Hub page: https://getreadystack.com/tools/proto-wire-break-check
