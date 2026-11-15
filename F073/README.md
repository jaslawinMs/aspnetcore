# F073: eligible exact OutputFormatter result negotiation

**Qualified fork-only trade-off, not merge-ready.** The selected first-entry
shortcut improves prepared exact matches about 68-71% and actual default-selector
exact Accept/declared selection about 38-39%. Parameterized selection costs about
6% more. Other fallback/control movements and a large, unresolved transient in
the third comparison remain published.

This is not a serialization, network, full-request, startup or universal gain.
No production Accept/configuration distribution was established. The two selected
pairs both run before then after, so they do not independently exclude order bias.

## Owner and scope

Baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Source: [ceba84162cba45cadd8d9df82125e94cb8fe0cc3](https://github.com/jaslawinMs/aspnetcore/commit/ceba84162cba45cadd8d9df82125e94cb8fe0cc3).
Branch: `autoperf/F073-output-formatter-result-negotiation`.

The actual owner is `OutputFormatter.CanWriteResult`, reached by
`DefaultOutputFormatterSelector` after real `AcceptHeaderParser` or declared
content-type production. Timed formatters inherit the owner; they override only
type policy/counting. Configuration, contexts and selectors are prepared outside
timing. Untimed capture records actual producer inputs before delegating to base.
The body writer deliberately throws if reached: writing is outside this benchmark.

The proposal skips both parsers only for a nonempty, parameterless, nonwildcard,
ordinal-identical **first** supported string whose requested segment ends at its
backing buffer end. It rechecks supported Count after virtual `CanWriteType`.
Original null handling, requested parsing, loop, ordering, raw configured-string
selection, server/client wildcard distinction and fallback remain unchanged.
Public configuration stays mutable; there is no parsed collection cache.

Two current-main behaviors constrain the shortcut:

- Actual virtual `CanWriteType` can clear configuration. A valid requested value
  then returns false; an empty but present segment still throws
  `ArgumentOutOfRangeException(offset)`. Indexing the first item without a
  post-virtual Count check would change this.
- The existing token lexer can inspect beyond `StringSegment.Length`.
  A raw-equal `application/json` segment followed by nondelimited `suffix` returns
  false, while a comma-delimited tail returns true. Both were reproduced on main.
  Requiring the buffer boundary preserves this pre-existing behavior, not fixes it.

Diff: **11 owner additions, 144 test additions, zero existing-line changes**.
`GetSupportedContentTypes`, public API/default/convention, packages and configuration
are untouched. Finalized F072 is not carried into this independent branch.

## Measurements and selection

Forty fixed profiles: 25 prepared public-owner cases, 14 actual default-selector
cases and one untouched metadata control. Three measured pairs cover two strategies:

| Round | Proposed snapshot | Strategy | Selection |
|---|---|---|---|
| 1 | `after` | Equality before parameter/wildcard eligibility | Selected |
| 2 | `after-2` | Earlier parameter/wildcard eligibility | Superseded |
| 3 | `after` | Unchanged round-one frozen assembly | Selected repeat |

The final `after-3` snapshot is a fresh correctness/build verification, not a new
measured strategy. Its source, owner, harness and settings equal the selected
`after` snapshot. Only **rounds 1 and 3** form final paired medians; source
strategies are never averaged together.

The tuning removed the round-one parameterized-selector cost in its one pair,
but reduced exact/default-selector wins and raised single misses, mixed casing
and wildcard-request costs. It is retained, not silently discarded.

Negative change is faster. These are paired medians, not whole-request savings:

| Profile | Selected median time change |
|---|---:|
| DirectExact1 / 8 / 32 | -70.65% / -70.51% / -68.09% |
| DirectLong1 / 8 / 32 | -84.79% / -85.21% / -84.99% |
| SelectorAcceptExact3 / 32 | -37.68% / -37.65% |
| SelectorDeclared3 / 32 | -38.61% / -39.37% |
| SelectorAcceptLong1 / 32 | -44.88% / -44.44% |
| SelectorParams3 | +6.07% |
| DirectParams1 / 8 / 32 | +7.37% / +7.91% / +5.36% |
| DirectMixed1 / 8 / 32 | +2.80% / +5.35% / +5.21% |
| DirectWildcardRequest | +4.48% |
| SelectorDeclaredSuffix3 | +2.85% |

Every selected result, including controls and non-wins, is in
[comparison.md](comparison.md) and [comparison.json](comparison.json).
All strategies appear independently in [all-comparisons.json](all-comparisons.json).
Prepared direct cases allocate zero on both sides; selector and metadata/control
allocation counts are also unchanged. **No structural allocation saving.**

### Important uncertainty retained

`DirectClientSuffix1` is -2.84% in round one but +208.53% in round three.
The latter proposed mean is 231.61 ns, standard deviation 97.41 ns (42.06% CV):
five initial result samples are about 288-297 ns, the next 234 ns, and the last
two 79.03/75.63 ns. The mechanical +102.85% selected median is published, **not a
stable 103% regression claim**. No causal JIT, host or scheduling explanation was
independently established. See all eighteen complete, untrimmed diagnostic series
in [spread-inspection.json](spread-inspection.json).

`DirectUnsupportedControl` changes direction (-5.29% / +21.73%); its new branch
is not reached, but the actual movement is retained, not explained away or
presented as a stable +8.22% cost. Null/no-Accept/browser/metadata controls and
miss/later-entry changes are not credited as structural savings. No fourth pair
was run to improve the story.

## Preservation and actual producers

Original combined formatter/selector suite: 57/57. Original, first, tuned and
final preservation suites: each 74/74. All rows, including every parameter row,
were inspected; there were no skipped/failed rows in successful runs.

| Requirement | Evidence |
|---|---|
| Raw equal values, configured buffer identity/offset/length and both server flags | All eight `CanWriteResult_IdenticalContentType_PreservesRawValue` rows, each exercising both flags |
| Empty/malformed parameter errors and invalid earlier entries | Both `CanWriteResult_IdenticalContentType_PreservesParsingErrors` and both `CanWriteResult_DoesNotSkipEarlierInvalidContentTypes` rows |
| Legal segment boundary behavior | Both `CanWriteResult_PreservesContentTypeSegmentBoundaries` rows and actual public token-lexer diagnostics |
| Live mutation and virtual type-check clearing/order | `CanWriteResult_ObservesSupportedMediaTypeChanges` and both `CanWriteResult_ObservesMediaTypesChangedByCanWriteType` rows |
| Null, unsupported and wildcard distinction | Existing `CanWriteResult_ForNullContentType_UsesFirstEntryInSupportedContentTypes`, `CanWrite_ReturnsFalse_ForUnsupportedType` and both `CanWriteResult_MatchesWildcardsOnlyWhenContentTypeProvidedByServer` rows |
| Actual Accept and declared inputs, offsets and selected formatter/content type | Forty byte-identical profile contracts, 26 raw public outcomes/errors, three actual selector captures, one mutation, two virtual-clearing and two segment-boundary producers |
| Actual HTTP JSON/custom/multiple/suffix status, headers and body | `ProducesAttributeWithTypeOnly_RunsRegularContentNegotiation`, `ProducesAttribute_SingleContentType_PicksTheFirstSupportedFormatter`, `ProducesAttribute_MultipleContentTypes_RunsConnegToSelectFormatter`, `ProducesAttribute_CustomMediaTypeWithJsonSuffix_RunsConnegAndSelectsJsonFormatter` |
| Actual parameter/case, repeated XML configuration and string control | Both `ProducesAttribute_WithMediaTypeHavingParameters_IsCaseInsensitiveMatch` rows, `XmlFormatter_SupportedMediaType_DoesNotChangeAcrossRequests`, `NoProducesAttribute_ActionReturningString_RunsUsingTextFormatter` |

Those eight existing hosted rows pass original, first, tuned and final with each
actual tested MVC.Core assembly checked against its frozen owner.
The preservation tests pass before/after; they are **not functional-red bug-fix
evidence**. Differential timing, not a functional assertion, establishes the
measured performance change.

The initial annotation-disabled test override caused CS8632 before assertions;
it was corrected to the area's existing `Type` convention. An incorrect guessed
functional-project path produced MSB1009; the exact established
`Microsoft.AspNetCore.Mvc.FunctionalTests.csproj` then passed. Both unmeasured
failures/commands remain archived. No dependencies/configuration were changed
to hide them.

Bounded history/docs/issue research is included. Related
dotnet/aspnetcore#39959, dotnet/aspnetcore#56357 and dotnet/aspnetcore#41804
are not claimed fixed. The last one's formatter overrides this owner and has
body/network work outside this proposal. Search limits are recorded, not
treated as proof that no overlapping work exists.

## Reproduction and immutable identities

SDK `12.0.100-alpha.1.26557.102`, runtime `.NET 12.0.0 (12.0.26.56305)`,
BenchmarkDotNet 0.13.0, C# 13, concurrent server GC. Windows host details are in
[hardware.json](hardware.json); BDN reports the CPU as unknown. The host is shared.
Builds/tests/measurements were serialized, builds limited to `-m:2`; no power,
affinity or unrelated-process changes.

All six exact successful benchmark commands, their order, timestamps, eight
result iterations, three warmups, 100 ms target and retained outliers are in
[all-execution.json](all-execution.json). Each round directory retains byte-identical
JSON/CSV/Markdown/HTML and both logs. Every test/build/restore directory contains
its exact command, exit result and complete relevant report/log.

From the repository root, activate `. .\activate.ps1` before .NET commands.
Build each actual owner's Release Core.Test project with the recorded filter/
properties before building [the external project](harness/AutoPerf.Benchmarks.csproj)
with `-p:AspNetCoreRoot=<that-owner-checkout>`. It uses that actual tested
dependency set, not installed ASP.NET assemblies. Freeze each owner and run the
recorded identical BDN arguments; setup/cleanup exercise the actual owner.
Historical validation/identity/hosted runners are included as command records,
not portable replacements for those documented build inputs.

Independently verify all published non-timing evidence without rebuilding:

```powershell
node .\reproduce-analysis.mjs . --verify
```

The executable audit reproduces **240 outcomes, 120 pairs, 1,920 actual result
samples and 246 actual owner markers**, seven exact source/PDB documents and
three 235-path recursive execution closures differing only in MVC.Core.
Final verified source equals the committed source after Git line-ending
canonicalization. Binary/PDB snapshots remain private; their recorded hashes
are not claims that rebuilding on another path yields identical PDBs.

Audit green means arithmetic, identity and preservation checks passed, **not**
all scenarios improve or this trade-off is merge-ready. Production distribution,
the unresolved transient and fallback/control costs remain review boundaries.
