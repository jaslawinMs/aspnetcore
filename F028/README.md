# F028: guarded external login scheme lookup

**Qualified fork-only draft, not merge-ready.** The actual four-scheme public wrapper measured **24.1% less time and104 B/op less allocation**. The explicitly synthetic128-scheme tail primary measured **86.4% less time**. Derived-manager/provider fallback controls measured **5.7%/6.5% more time**;this is not an all-caller recommendation.

Source:[`806a25d5bacb786d1385eaccb565a96b87662b47`](https://github.com/jaslawinMs/aspnetcore/commit/806a25d5bacb786d1385eaccb565a96b87662b47),independent of every other campaign proposal. The shipping diff is11insertions/1deletion in `SignInManager.cs`;the existing owning test class gains222lines/17focused rows. Actual draft/issue/browser receipts are in `publication.json` after creation.

## What changed and what did not

Only exact `SignInManager<TUser>` and exact `AuthenticationSchemeProvider` use the existing ordinal dictionary for display-name resolution. Null/empty default displays still fall back to the provider name;whitespace remains visible. Every custom/derived manager/provider retains the original virtual filtered first-match path,including deliberate duplicates,null/empty manager displays,pending enumeration and exact failures. Remove/TryAdd changes remain observable without a cache.

**Finding correction:**the default provider already reuses its all-schemes snapshot. The removed work is a per-call filter/linear scan and associated async/iterator work,not snapshot reconstruction.

**Compatibility:**kept `GetExternalLoginInfoAsync(string? expectedXsrf = null)` and `GetExternalAuthenticationSchemesAsync()` unchanged. Existing custom managers/providers can supply different sequences and first-match semantics;unconditionally replacing their virtual enumeration would change results. The exact-type guard preserves that path. No new public API or API baseline change.

## Actual validation and boundaries

- Original existing owning class:121/121passed,0skipped. Expanded corrected original:137passed plus the one expected resource red,`Default:55832;derived:55832` over64actual calls. Selected:138/138passed,0skipped. Each parameterized row and original-row multiplicity was checked from actual fresh TRX.
- Each frozen owner:10public wrappers,20value/reference/token contracts and18additional producer/override/update/pending/failure/metadata contracts pass. The physically relocated fresh project also builds with0warnings/errors and characterizes these same paths without additional timing.
- A prepared synchronous `IAuthenticationService` supplies successful/no-result authentication. Real public owner,real DI/UserManager and real default/derived scheme provider are exercised. This is not a full external login,cookie,HTTP/network,asynchronous-authentication throughput or application-frequency benchmark.
- Both managers explicitly receive their public `Context`;the earlier73264/55832mocked-vs-real-accessor resource confound remains preserved and is not accepted as isolated evidence. The first untimed standalone attempt failed for a missing `Http.Features` reference;its129-file image and raw failure are retained. The corrected132-file consumer was frozen before all comparative timing.
- Source was built/measured at baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5` plus the uncommitted scoped patch,not at the later source commit. Eleven selected source/test/project/API file pairs match captured current default;this is not a whole-current-default SDK build claim.

# F028 measured comparison

1 actual comparison;20 native warm rows and4 first observations. Positive percentage means less time.
Stopped under the declared>=50%primary rule;the128scheme tail primary meets it with separated reported intervals. This is a scoped synthetic-scaling result,not an application-frequency claim.
Derived-manager/provider controls are slower in this comparison. The proposal is not an all-caller improvement or merge-ready recommendation.

| Actual public profile | Original ns/op | Selected ns/op | Observed less time % | Original/selected B/op |
|---|---:|---:|---:|---:|
| Default.One.Hit | 210.97 | 180.02 | 14.67 | 576 / 472 |
| Default.Four.Tail (primary) | 237.50 | 180.25 | 24.11 | 576 / 472 |
| Default.Many.Tail (primary) | 1340.29 | 182.30 | 86.40 | 576 / 472 |
| Default.Many.Miss | 1346.64 | 177.19 | 86.84 | 576 / 472 |
| Default.Many.Hidden | 1352.44 | 182.01 | 86.54 | 576 / 472 |
| Default.Many.Head | 210.94 | 187.74 | 10.99 | 576 / 472 |
| Default.Empty.Miss | 189.62 | 174.67 | 7.89 | 528 / 472 |
| DerivedManager.Four.Tail | 246.11 | 260.19 | -5.72 | 576 / 576 |
| DerivedProvider.Four.Tail | 246.94 | 263.05 | -6.53 | 576 / 576 |
| Early.NoAuthentication | 31.83 | 31.72 | 0.35 | 24 / 24 |

## First observed:fixture,provider,DI,UserManager,JIT and metadata included

| Public profile | Original ms | Selected ms | Original bytes | Selected bytes |
|---|---:|---:|---:|---:|
| Default.Four.Tail | 50.69 | 48.98 | 33048 | 26672 |
| DerivedManager.Four.Tail | 50.68 | 49.71 | 33064 | 33064 |

Single observations only,not cold-start or isolated-entry conclusions. All unfavorable observations remain authoritative.

## Limits

- Shared Windows VM,not sandboxed,dedicated or isolated. Settings are point observations:Normal/Normal/65535. No OS settings were changed.
- Only exact default manager/provider types use the dictionary. All custom/derived virtual behavior stays on the original sequence path.
- The real default provider already reuses its safe snapshot. This removes a per-call filter/scan,not a snapshot rebuild.
- Prepared synchronous authentication-result service and actual public owner/provider. Not full login,cookie,HTTP/network,async-authentication throughput or application-frequency evidence.
- The128scheme primary is explicitly synthetic scaling,not evidence that applications commonly register128schemes.
- Derived controls traverse the added type guard and larger method;they are not byte-identical IL controls. Retain their observed regressions rather than claiming all callers benefit.
- The unreached early-return control has unchanged source but shares the rebuilt method. Source identity is not proof of identical generated code.
- Task<int> consumer and prepared-producer bookkeeping are common to both images. Owning unit and BDN callers have different absolute allocation boundaries.
- PE/PDB selected-document identities are not full compiler provenance or method coverage. Copied-text verification does not rehash omitted binaries or runtime files.
- All raw native,control and first observations are retained. Paired means are scoped measurements,not clean causal application-speedup claims.

## Reproduce in a new directory

Prerequisite:the ASP.NET Core checkout with this source proposal and repository SDK/dependencies,following captured `BuildFromSource-captured.md`. Do not change `global.json` or execute historical timing/publication drivers.

```powershell
.\F028-run-fresh.ps1 -SourceRoot C:\src\aspnetcore -OutputRoot C:\src\F028-independent-check -Mode Characterize
```

The script activates the checkout SDK,builds the actual owner and standalone BenchmarkDotNet project with at most2workers,then characterizes the independently copied consumer. `-Mode Measure` is available only for a new independent single-owner run and is not a replay of the permanently closed historical comparison.

```powershell
node .\F028-audit-measurements.mjs . --verify
```

The copied-text audit recomputes all20raw retained means,checks the4first observations,6timing profiles,source/metadata witnesses and derived outputs. It does not open omitted binaries/runtime images or launch timing.

## Evidence

`measurement-plan.json`,`measurement-budget.json`,`measurement-audit.json`,`comparison.md`,`decision.json`,`live-frozen-closure-audit.json`,`validation-commands.md`,`source-publication` and all raw native/test/investigation outputs are retained. `authoritative-copy-manifest.json` binds byte-exact copies;`omitted-file-manifest.json` hashes omitted build/restore/package/binary files. Baseline/current/working snapshots retain their actual `.baseline`,`.current` and `.working` extensions and raw bytes.

Live physical audit rehashed264closure bindings across134native paths and36runtime bindings. Selected-document PDB checks are not complete compiler provenance or method coverage. This shared Windows Hyper-V VM is not sandboxed,dedicated or isolated;no priority,affinity or power changes were made. All control/first-observation regressions remain authoritative.
