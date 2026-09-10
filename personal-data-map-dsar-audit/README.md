# Personal Data Map

![Personal Data Map: find every column a GDPR subject access request has to reach](https://getreadystack.com/img/promo/sku20608_result_card.jpg)

Reads a migration, Prisma schema, Django model or TypeORM entity and marks every column a subject access request has to reach - with the GDPR article each finding hangs on. 13 rules, line numbers, no account.

## What it finds

```
db/migrations/014_patients.sql
   4  info   email - direct identifier; every Art. 15 export must reach it.
   6  warn   date_of_birth - Art. 8 child-consent path has to exist.
   7  error  national_id - Art. 87 restriction; Art. 34 duty on breach.
   8  error  password - plain name; Art. 32, and Art. 15 must never return it.
   9  warn   ip_address - personal data under Breyer (C-582/14).
  10  warn   stripe_customer_id - processor must be named in Art. 30(1).
  11  warn   is_deleted - a flag is not erasure under Art. 17.
  17  warn   user_id REFERENCES users(id) with no ON DELETE - erasure incomplete.
  18  error  diagnosis - Art. 9 special category; DPIA threshold.
  22  error  CREATE TABLE users_audit - copy table; Art. 17 must reach it.
```

## What it does for free

- All 13 rules on the file you have open - every line, no key asked
- Each finding names the GDPR article it hangs on (Art. 9, 15, 17, 30, 32, 35)
- Reads SQL DDL, Prisma, Django models and TypeORM entities
- Filter by severity: error, warn, info

## With a licence

- **Every migration and model in the repository** — one command over the whole workspace, so the copy tables and the forty older migrations are in the map too - that is where an incomplete erasure hides
- **Export the map as CSV, JSON or HTML** — the column-by-column table you attach to an Art. 30 record or hand to counsel
- **JSON your pipeline can fail on** — block a migration that adds special-category or credential columns before it reaches production

## Install

```
ext install personal-data-map-dsar-audit
```
