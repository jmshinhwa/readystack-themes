# SkiaSharp Migration Check for ImageSharp

![SkiaSharp Migration Check for ImageSharp — finds the line](https://getreadystack.com/img/promo/skiasharp-migration-check_demo.gif)

![SkiaSharp Migration Check for ImageSharp](https://getreadystack.com/img/promo/sku401044_result_card.jpg)

Flags SixLabors ImageSharp 3+, ImageSharp.Drawing 2+, Fonts 2+ and ImageSharp.Web 3+ references that fall under the Six Labors Split License, with the SkiaSharp (MIT) replacement for each line.

**Measured:** skiasharp migration: 6 findings in one 16-line `.csproj` for a .NET 8 thumbnail API (13 rules). Left: Split License line · right: SkiaSharp fix. The clean SkiaSharp version of the same project returns 0 findings.

Hub page and free web version: https://getreadystack.com/tools/skiasharp-migration-check

## Why this exists

SixLabors.ImageSharp 3.0.0 was published on nuget.org on 2023-03-01 under the **Six Labors Split License** instead of Apache-2.0. The same switch happened at SixLabors.Fonts 2.0.0, SixLabors.ImageSharp.Drawing 2.0.0 and SixLabors.ImageSharp.Web 3.0.0 (the nuspec licence changes from `Apache-2.0` to a `LICENSE` file at exactly those versions).

Under the Split License you may still use the packages under Apache-2.0 when the software is open source or source available, when the package arrives only as a transitive dependency, when you are a non-profit or registered charity, or when you are a for-profit company or individual with **less than 1M USD annual gross revenue**. A for-profit company at or above 1M USD that installs the package **directly** needs a Six Labors commercial licence. The published tiers are 799 USD a year for up to 10 developers, 1299 USD for 11 to 20 and 4999 USD for unlimited developers.

`dotnet list package` shows requested and resolved versions, never the licence. An automated dependency update PR from 2.1.x to 3.x changes the licence and nothing else in the diff.

Yardstick: staying on ImageSharp means a Six Labors licence from 799 USD a year; SkiaSharp is MIT.

## What it checks (13 rules)

| Rule | Line it flags | SkiaSharp fix |
|---|---|---|
| ISM001 | SixLabors.ImageSharp 3.0.0+ | SkiaSharp 3.119.4 (MIT) |
| ISM002 | SixLabors.ImageSharp.Drawing 2.0.0+ | SKCanvas + SKPath |
| ISM003 | SixLabors.Fonts 2.0.0+ | SKFont + SkiaSharp.HarfBuzz |
| ISM004 | SixLabors.ImageSharp.Web 3.0.0+ and its providers | your own resize endpoint on SkiaSharp |
| ISM005 | Six Labors version `*` or open-ended range | pin, or move to SkiaSharp |
| ISM006 | Six Labors version still Apache-2.0 (info) | pin below the line |
| ISM007 | System.Drawing.Common 6+ on a non-Windows target | SkiaSharp + NativeAssets.Linux |
| ISM008 | SkiaSharp without SkiaSharp.NativeAssets.Linux | add NativeAssets.Linux.NoDependencies |
| ISM009 | SkiaSharp native assets at a different version | same version as SkiaSharp |
| ISM010 | `using SixLabors.ImageSharp;` | `using SkiaSharp;` |
| ISM011 | `Image.Load(...)` | `SKBitmap.Decode(stream)` |
| ISM012 | `.Mutate(...)` | `SKBitmap.Resize` / `SKCanvas` |
| ISM013 | `.SaveAsJpeg(...)` and friends | `SKImage.Encode(format, quality)` |

It reads `.csproj`, `.fsproj`, `.vbproj`, `Directory.Packages.props`, `Directory.Build.props`, `packages.config` and `.cs` files. XML comments are ignored. Central package management (`PackageVersion`, `VersionOverride`) and `<Version>` child elements are understood. Call-site rules (ISM011 to ISM013) only fire in a `.cs` file that imports a Six Labors namespace, so `System.Drawing.Image.FromFile` in unrelated code stays quiet.

## Use

Open a project file and run **SkiaSharp Migration Check for ImageSharp: Check this file** from the command palette. Findings appear in the Problems panel with the fix in the message.

## Free and full version

Free: check one file, in VS Code or on the web page, and see every finding with its fix. Full version (licence key, one payment): scan every project in the solution at once and export one Markdown migration checklist for the licence review ticket.

Not legal advice. Whether your company is above the revenue line is a question for your own licence review.
