# Shouldly Migration Check for FluentAssertions

![Shouldly Migration Check for FluentAssertions](https://getreadystack.com/img/promo/sku637262_result_card.jpg)

Finds every FluentAssertions line in a .csproj or C# test file and writes the Shouldly line that replaces it. FluentAssertions 8+ references are flagged: commercial use needs a paid Xceed licence.

**Measured:** shouldly migration: 6 findings in one xUnit test file for a .NET order service (19 rules). Left: FluentAssertions line · right: Shouldly line. using FluentAssertions; → using Shouldly; · total.Should().Be(119.00m); → total.ShouldBe(119.00m); · Lines.Should().HaveCount(3); → Lines.Count().ShouldBe(3); · Customer.Should().NotBeNull(); → Customer.ShouldNotBeNull(); · act.Should().Throw<T>() → Should.Throw<T>(act) · Should().BeEquivalentTo(expected) → ShouldBeEquivalentTo(expected). The same file rewritten with Shouldly returns 0 findings. FluentAssertions 8.0.0 (NuGet 2025-01-14) changed the licence 636 days before 2026-10-12.

Hub page and free web version: https://getreadystack.com/tools/shouldly-migration-check

Yardstick: Xceed lists a Fluent Assertions licence from 14.95 USD a year without support; a move to Shouldly costs one rewritten line per assertion.

## Why this exists

FluentAssertions 8.0.0 was published on NuGet on 2025-01-14. Its package description says the version is free for open-source projects and non-commercial use, and commercial use requires a paid licence from Xceed. Every 7.x release is Apache-2.0; 7.2.2 (2026-03-16) is the latest one. The newest 8.x is 8.11.0 (2026-09-14).

`dotnet list package` prints versions, never licences. A test project with Version="[7.0.0,)" or Version="*" resolves to the newest 8.x on the next restore, and a Dependabot bump from 7.2.2 to 8.11.0 looks like any other green update.

## Two exits

- **Shouldly 4.3.0** (BSD-3-Clause): different syntax, so each finding carries the rewritten line, for example `total.Should().Be(119.00m);` → `total.ShouldBe(119.00m);` and `act.Should().Throw<T>()` → `Should.Throw<T>(act)`.
- **AwesomeAssertions 9.6.0** (Apache-2.0): a fork that keeps the FluentAssertions syntax; the using-line finding names `using AwesomeAssertions;`.

## The 19 rules

Six project-file rules: FluentAssertions 8+ packages (error), floating versions that can resolve to 8.x, 7.x versions with the pin `[7.2.2,8.0.0)`, versions set in Directory.Packages.props, FluentAssertions.* add-on packages, and `<Using Include="FluentAssertions" />`.

Thirteen C# rules: `using FluentAssertions;`, Be/NotBe/BeSameAs/BeOneOf, BeTrue/BeFalse, BeNull/BeEmpty family, Contain/HaveCount/ContainSingle, BeEquivalentTo, BeGreaterThan/BeLessThan/BeInRange, StartWith/EndWith, BeOfType/BeAssignableTo, Throw/ThrowAsync/NotThrow, WithMessage, AssertionScope (points at ShouldSatisfyAllConditions), and any Should() call with no 1:1 Shouldly method, which is reported for a hand rewrite instead of guessed.

BeEquivalentTo and ShouldBeEquivalentTo can compare objects by different rules, so that finding tells you to run the test after the swap.

## Files it reads

`*.csproj`, `*.fsproj`, `*.vbproj`, `Directory.Packages.props`, `Directory.Build.props`, `packages.config` and `*.cs`. Comments are skipped. Nothing leaves your machine.

## Free and full version

Free, no key: check the open file and see every FluentAssertions line with its Shouldly line, in VS Code or on the web page.

Full version (licence key): scan every project and test file in the workspace at once and export one dated Markdown migration plan, each FluentAssertions line mapped to its Shouldly line, for the licence review ticket.

Sources: NuGet package metadata for FluentAssertions 7.2.2 and 8.11.0, Shouldly 4.3.0 and AwesomeAssertions 9.6.0; https://xceed.com/fluent-assertions-faq/
