# NuGet Pack Gate — csproj licence, icon, TFM

![NuGet Pack Gate — csproj licence, icon, TFM](https://getreadystack.com/img/promo/sku433599_result_card.jpg)

Checks the pack metadata in `.csproj`, `.fsproj`, `.vbproj` and `Directory.Build.props` before `dotnet pack` and before a version goes to nuget.org. Every finding names the line, the reason from Microsoft's own documentation, and the exact line that replaces it.

Web version (same engine, no install): https://getreadystack.com/tools/nuget-pack-csproj-gate

## Why this matters

- `PackageLicenseUrl` is deprecated. NU5125: *"The 'licenseUrl' element will be deprecated. Consider using the 'license' element instead."*
- `PackageIconUrl` on its own raises NU5048: *"The 'PackageIconUrl'/'iconUrl' element is deprecated. Consider using the 'PackageIcon'/'icon' element instead."*
- `PackageLicenseExpression` must be an SPDX expression, and nuget.org *"only accepts license expressions that are approved by the Open Source Initiative or the Free Software Foundation."*
- `PackageIcon`, `PackageReadmeFile` and `PackageLicenseFile` only work if the file is packed: *"You need to explicitly pack the referenced … file."*
- Microsoft's .NET support policy lists **.NET 8 (LTS) and .NET 9 (STS) with end of support on November 10, 2026**. .NET 10 (LTS) is supported to November 14, 2028.

Yardstick: nuget.org does not support permanent deletion of packages. A version pushed with the wrong licence or a missing readme can only be unlisted, and it can still be restored by exact version.

## Example: the sample Acme.Invoicing.csproj, six findings (2 errors, 4 warnings)

| Line | csproj line | Fix | Severity |
|---|---|---|---|
| 4 | `<TargetFrameworks>netstandard2.0;net8.0;net9.0` (net8.0) | `net10.0` (LTS, end of support November 14, 2028) | warning |
| 4 | same line (net9.0) | `net10.0` | warning |
| 9 | `<PackageLicenseUrl>…/LICENSE` | delete it, keep one licence property | warning |
| 10 | `<PackageLicenseExpression>Apache 2.0` | `<PackageLicenseExpression>Apache-2.0` | error |
| 11 | `<PackageIconUrl>…/icon.png` | `<PackageIcon>icon.png` + `<None Include="icon.png" Pack="true" PackagePath="\"/>` | warning |
| 12 | `<PackageReadmeFile>README.md`, not packed | `<None Include="README.md" Pack="true" PackagePath="\"/>` | error |

Set the check date to 2026-11-10 or later and the net8.0 and net9.0 lines turn into errors: four errors, two warnings. The fixed project (net10.0, `Apache-2.0`, packed icon and readme) returns 0 findings.

## The 10 rules

| Rule | Severity | What it catches |
|---|---|---|
| NP01 license-url-deprecated | warning | `PackageLicenseUrl` (NU5125) |
| NP02 icon-url-deprecated | warning | `PackageIconUrl` without `PackageIcon` (NU5048) |
| NP03 license-expression-invalid | error | `Apache 2.0`, `MIT License`, `GPLv3`, lowercase `or` — not SPDX |
| NP04 license-not-osi-fsf | error | `BUSL-1.1`, `SSPL-1.0`, `Elastic-2.0`, PolyForm, CC-BY-NC — not accepted by nuget.org |
| NP05 license-conflict | error | `PackageLicenseExpression` and `PackageLicenseFile` both set |
| NP06 license-file-not-packed | error | `PackageLicenseFile` with no `Pack="true"` item |
| NP07 icon-not-packed | error | `PackageIcon` not packed, or not PNG/JPEG |
| NP08 readme-not-packed | error | `PackageReadmeFile` not packed, or not `.md` |
| NP09 tfm-end-of-support-2026 | warning, error from 2026-11-10 | `net8.0`, `net9.0` (and `-android`, `-windows` variants) |
| NP10 tfm-out-of-support | warning | `net5.0`, `net6.0`, `net7.0`, `netcoreapp*` |

`PackageIconUrl` next to `PackageIcon` stays silent: NuGet's own docs recommend keeping both for older clients. Values built from MSBuild properties (`$(…)`) are skipped rather than guessed.

## Use

Open a project file and run **NuGet Pack Gate: Check this file** from the Command Palette, or save the file. Findings appear in the Problems panel with the fix line.

## Free and full version

Free: every rule on the open file, with every fix, no cap. Full version: scan every project in the workspace and export a dated pack-readiness report per package; a team key adds a CI gate that fails a release on any error — [get the full version](https://getreadystack.com/api/buy/cl/polar_cl_HRrltuicrvAeILT9iCgeVosowxectMtosdopx4GRhRw).

Sources: learn.microsoft.com/nuget (NU5125, NU5048, nuspec licence, MSBuild pack targets) · dotnet.microsoft.com .NET support policy.
