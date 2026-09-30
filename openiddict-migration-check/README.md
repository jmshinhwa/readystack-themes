# OpenIddict Migration Check: Duende IdentityServer

![OpenIddict Migration Check: Duende IdentityServer — finds the line](https://getreadystack.com/img/promo/openiddict-migration-check_demo.gif)

![OpenIddict Migration Check: Duende IdentityServer](https://getreadystack.com/img/promo/sku397412_result_card.jpg)

**Open a Program.cs, Startup.cs or .csproj and see every Duende IdentityServer (or IdentityServer4) call mapped to its OpenIddict replacement, plus the Duende edition and list price that exact setup needs.**

On the sample Program.cs in this repo (3 in-memory clients, server-side sessions, default key management) the check reports **6 findings** and prices the setup at **16,500 USD a year**: Duende Standard (12,500) plus the automatic key management add-on (4,000).

Yardstick: Duende IdentityServer list prices are Lite 5,750 USD/yr (2 clients), Standard 12,500 USD/yr (10 clients), Advanced 24,900 USD/yr (30 clients), per duendesoftware.com/pricing, checked 2026-09-29. OpenIddict is Apache-2.0 with no licence fee.

Web version and rule list: https://getreadystack.com/tools/openiddict-migration-check

## Why this exists

Duende IdentityServer is free only for the Community edition: for-profit companies under 1M USD projected annual gross revenue and under 3M USD in capital, or non-profits with a budget under 1M USD. Everyone else pays per year, and the edition depends on how many client IDs you run and which features your code turns on. IdentityServer4, the free predecessor, has had no security fixes since 2022-12-13.

A chatbot can rewrite one `AddIdentityServer()` call, but it does not know which Duende features your file actually uses, which edition those features sit in, or what OpenIddict does differently (endpoints off by default, access tokens encrypted by default, no automatic key rotation). This check reads your file and tells you.

## What it checks (18 rules)

| Rule | Finds | OpenIddict side |
|---|---|---|
| duende-licence | `Duende.IdentityServer` package or using | OpenIddict.AspNetCore + EntityFrameworkCore |
| is4-eol | `IdentityServer4` | days since the 2022-12-13 end of support |
| host-wiring | `AddIdentityServer()` / `UseIdentityServer()` | `AddOpenIddict().AddCore().AddServer()`, explicit endpoint URIs |
| license-key | `LicenseKey`, `Duende_License.key` | delete |
| inmemory-config | `AddInMemoryClients/ApiScopes/ApiResources/IdentityResources` | application and scope managers, `Permissions.GrantTypes.*` |
| ef-stores | `AddConfigurationStore` / `AddOperationalStore` | `UseEntityFrameworkCore().UseDbContext<T>()` |
| aspnet-identity | `AddAspNetIdentity<TUser>()` | your own /connect/authorize action |
| dev-signing | `AddDeveloperSigningCredential()` | development signing + encryption certificates |
| signing-cred | `AddSigningCredential` / `AddValidationKey` | `AddSigningCertificate` + `AddEncryptionCertificate` |
| key-management | automatic key management not switched off | load and roll certificates yourself |
| server-side-sessions | `AddServerSideSessions` (Standard) | custom `ITicketStore` |
| profile-service | `IProfileService` | claims + `SetDestinations()` |
| bff | `Duende.Bff` / `AddBff()` (licensed separately) | cookie auth + OpenIddict client + YARP |
| dcr | dynamic client registration (Standard) | your own admin API |
| ciba | CIBA backchannel login (Standard) | device authorization flow |
| mtls | `MutualTls.Enabled = true` (Standard) | confirm mTLS support in your target version |
| dynamic-providers | `AddIdentityProviderStore` (Advanced) | `AddOpenIdConnect()` at startup |
| edition | client count + features found | cheapest Duende edition and its list price |

Each finding sits on the line where the Duende call starts, as a normal VS Code diagnostic. Comments are ignored, so a `// was AddIdentityServer()` note does not count.

## How to use

1. Open a `.cs` or `.csproj` file.
2. Run **OpenIddict Migration Check: Scan current file** from the command palette.
3. Read the Problems panel: left side is the Duende call, right side is the OpenIddict replacement.

The free scan covers the open file with no key and no limit. The full version scans the whole solution and exports a migration plan per project (Markdown/CSV) for the pull request and the licence review.

## Limits

This is a static text check. It does not run your app, read NuGet metadata or decide whether you are Community-eligible. Prices are Duende's public list prices; negotiated quotes differ.
