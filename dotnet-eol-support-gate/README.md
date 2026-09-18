# .NET EOL & CRA Support Window Gate

Hub: https://getreadystack.com/tools/dotnet-eol-support-gate

Open a `.csproj`, `Directory.Build.props` or `global.json` and this gate dates it. Every target
framework, every SDK pin and every runtime-bound package reference is compared against Microsoft's
published .NET release lifecycle, and then against the support period you promise the people who
install your software. Two different questions, one file, one pass.

## The yardstick this uses

The dates are not opinions. They come from the .NET release lifecycle:

| Target | Security servicing ends |
| --- | --- |
| `netcoreapp3.1` | 2022-12-13 |
| `net5.0` | 2022-05-10 |
| `net6.0` | 2024-11-12 |
| `net7.0` | 2024-05-14 |
| `net9.0` | 2026-05-12 |
| `net8.0` | 2026-11-10 |
| `net10.0` | 2028-11-14 |

`net45` / `net451` left support on 2016-01-12, and `net452`, `net46` and `net461` all left on
2022-04-26. Xamarin ended on 2024-05-01. `Microsoft.AspNetCore.*`, `Microsoft.EntityFrameworkCore`
and `Microsoft.Extensions.*` follow the same lifecycle as the major version they carry, so a
`6.0.36` package line is 670 days unpatched as of 2026-09-13 and a `9.0.4` line is 124 days
unpatched.

## The second question

The EU Cyber Resilience Act (Regulation (EU) 2024/2847) entered into force on 2024-12-10. Its
vulnerability-reporting duties apply from 2026-09-11 and the rest applies from 2027-12-11. Article
13(8) makes the manufacturer determine a support period and hold it for at least 5 years unless the
expected use is shorter. A support period is a patching promise, and a patching promise on a runtime
that stops being patched is not a promise anyone can keep.

So the gate does the subtraction nobody does by hand. Give it the day you place the product on the
market and the number of years you are promising, and it reports the months of overhang: with a
5-year period starting 2026-12-01, a `net8.0` project leaves 61 months of promised patching on a
runtime whose last security fix lands on 2026-11-10, in 58 days.

Declare the period in the project file and the gate uses your number instead of the 5-year floor:

```xml
<SupportedUntil>2028-06-30</SupportedUntil>
```

## What it reads

- `<TargetFramework>` and `<TargetFrameworks>`, including RID-style targets such as `net10.0-android`
- `global.json` SDK pins, including the feature band
- `<PackageReference>` lines for runtime-bound packages and for anything `Xamarin.*`
- `<NuGetAudit>` and `<NuGetAuditMode>` — CRA Annex I Part II covers the components you ship, and
  transitive dependencies are components you ship
- `<SupportedUntil>` / `SupportPeriodEnd` / a `CRA-support-until:` comment

## The 10 checks

`tfm_out_of_support` · `tfm_ends_soon` · `support_window_gap` · `support_period_undeclared` ·
`framework_retired` · `xamarin_retired` · `sdk_pin_out_of_support` · `preview_runtime` ·
`runtime_bound_package` · `nuget_audit_off`

Each finding carries the level, the line number, the rule id and the date arithmetic behind it. The
bundled dirty fixture returns 9 findings from those 10 rules; the clean fixture returns none.

## Free and licensed

Dating the file in front of you is free and needs no key: open the file, run the command, read every
date. The workspace sweep — every project file in the solution in one pass, written out as a dated
support-window evidence file you keep — is the licensed part, and the panel asks for a key at the
moment you ask for it: $29 once, one licence key per person or team seat, 7-day full refund —
[the workspace sweep and its evidence file](https://buy.polar.sh/polar_cl_Z3kgDSemeuFusqV4CgHenwXtVCDgUEjo92a1x2d70T6).

## Licence

MIT for the extension source. The .NET lifecycle dates are facts published by Microsoft; the CRA
article references are from the published regulation text.
