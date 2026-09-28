# NuGet License Gate: AutoMapper, MediatR, FluentAssertions, MassTransit

![NuGet License Gate: AutoMapper, MediatR — finds the line](https://getreadystack.com/img/promo/nuget-commercial-license-gate_demo.gif)

![NuGet License Gate: AutoMapper, MediatR](https://getreadystack.com/img/promo/sku324202_result_card.jpg)

Your .csproj says `AutoMapper 15.1.0`? Since July 2025 that version is RPL-1.5 (release your own source) or a Lucky Penny Software commercial licence, not MIT. NuGet License Gate flags every NuGet line past its licence line, in the file you have open, and names the last open-source version to pin.

Free web version with the same engine: https://getreadystack.com/tools/nuget-commercial-license-gate

## What it flags (10 rules)

| Package | Licence line | Licence from that version | Last open-source pin |
|---|---|---|---|
| AutoMapper | 15.0.0 (July 2025) | RPL-1.5 or Lucky Penny commercial licence | 14.0.0 (MIT) |
| MediatR | 13.0.0 (2 July 2025) | RPL-1.5 or Lucky Penny commercial licence | 12.5.0 (Apache-2.0) |
| FluentAssertions | 8.0.0 (14 January 2025) | Xceed Community License, non-commercial use only | 7.2.2 (Apache-2.0) |
| MassTransit, MassTransit.* | 9.0.0 (6 January 2026) | Massient licence (massient.com/license) | 8.5.10 (Apache-2.0) |
| EPPlus | 5.0.0 | Polyform Noncommercial License 1.0.0 | 4.5.3.3 (LGPL) |
| SixLabors.ImageSharp | 3.0.0 (1 March 2023) | Six Labors Split License: commercial for a for-profit direct user at 1M USD annual gross revenue or more | 2.1.13 (Apache-2.0) |
| QuestPDF | 2023.4.0 (4 May 2023) | commercial for closed-source use by a for-profit company over 1M USD annual gross revenue | 2022.12.15 (MIT) |
| Duende.IdentityServer* | every version | Duende licence terms (duendesoftware.com/license) | none |
| itext7, itext | every version | AGPL | none |
| any of the above with `*` | floating | a floating version restores the newest release | the pin above |

Errors are licence changes that apply to every commercial user. Warnings (ImageSharp, QuestPDF, Duende, iText) depend on your revenue, your edition or whether you publish your source.

Every licence line was read from the NuGet registration API (licenseExpression per version) and from the licence file inside the .nupkg, on 27 September 2026.

## Files it reads

`.csproj`, `.fsproj`, `.vbproj`, `Directory.Packages.props` (central package management, `PackageVersion` and `VersionOverride`), `packages.config`, and the multi-line form `<PackageReference Include="QuestPDF"><Version>2024.12.3</Version></PackageReference>`.

Version ranges follow NuGet's rule: `[12.0.0,)` restores the lowest allowed version, so it is judged by its lower bound. A `*` restores the newest one, so `FluentAssertions *` is flagged even though 7.2.2 is still Apache-2.0.

## Example

The sample `.csproj` for a .NET 8 web API gives 6 flags, 5 errors and 1 warning:

```
L7   automapper-15             AutoMapper 15.1.0            pin 14.0.0 (MIT)
L8   mediatr-13                MediatR 13.0.0               pin 12.5.0 (Apache-2.0)
L9   floating-into-commercial  FluentAssertions *           pin 7.2.2 (Apache-2.0)
L10  masstransit-9             MassTransit.RabbitMQ 9.1.0   pin 8.5.10 (Apache-2.0)
L11  epplus-5                  EPPlus 7.5.2                 pin 4.5.3.3 (LGPL)
L15  questpdf-2023             QuestPDF 2024.12.3           check the 1M USD revenue line
```

## Why a check and not a search

NuGet.org shows a licence link on each version page, not a warning. `dotnet add package` without `--version` installs the newest release, and AI coding assistants write the newest version they know. For AutoMapper, MediatR, FluentAssertions and MassTransit the newest release is past the licence line.

## Yardstick

A 15-year litigator bills $851/hour on the DOJ Fitzpatrick Matrix for billing year 2026 (U.S. Attorney's Office for D.C.); one hour of licence review costs that.

## Free and full version

Free, no key: the open file, every flag, the licence and the pin. The full version sweeps every project file in the workspace at once and writes a Markdown licence report (package, version, licence, last open-source pin): https://buy.polar.sh/polar_cl_0EoTgOC5ad7T6P8ypXA6zD3NRFoYxlQfCOf1J3JpwzG — $29 once, one licence key per person or team seat.

This is a lint, not legal advice. Read the licence text of each flagged package, or ask your lawyer, before you decide to pin, pay or replace.
