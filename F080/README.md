# F080: extensionless globbing comparisons without substring copies

**Allocation-focused fork proposal.** The real private comparer removes
64-16448B/op in all six reached comparison profiles. Ordinary 64/256-file
cache fills improve 21.74%/21.54% by median paired time change; long virtual
64-file fills improve 38.80%. Long direct comparisons improve 78.52%.
All three unchanged-proposal comparisons, controls and uncertainty are retained.

The original scan card is `sort-comparer-recomputes-expensive-keys`.
This proposal removes two temporary strings, not all repeated LastIndexOf,
tokenization or comparison work, and does not introduce a retained-key cache.
Baseline is dotnet/aspnetcore at
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
See [acceptance](acceptance.md), [two-file patch](source.patch),
[committed source identity](committed-source-identity.json) and
[provenance](provenance.json).

## Measured outcomes

| Profile | Paired time changes, rounds1/2/3 | Median change | Before/after B/op |
|---|---|---:|---|
| CompareShort | -30.85%/-24.13%/-27.82% | -27.82% | 80/0 |
| CompareLong | -78.82%/-78.45%/-78.52% | -78.52% | 16448/0 |
| CompareDeep | -14.31%/-12.49%/-13.38% | -13.38% | 128/0 |
| CompareDepth | -29.10%/-27.88%/-28.31% | -28.31% | 104/0 |
| CompareDirPrefix | -27.44%/-24.48%/-27.03% | -27.03% | 80/0 |
| CompareStemPrefix | -28.17%/-24.82%/-34.01% | -28.17% | 64/0 |
| Fill8 | -4.57%/-4.38%/-7.59% | -4.57% | 7457-7464/6209-6214 |
| Fill64 | -21.95%/-20.19%/-21.74% | -21.74% | 51931-51932/26585-26587 |
| Fill256 | -20.01%/-21.54%/-22.46% | -21.54% | 244275-244279/95857-95858 |
| FillDeep64 | -9.46%/-9.97%/-9.94% | -9.94% | 89700-89701/55905-55908 |
| FillFiltered64 | -16.73%/-15.23%/-15.20% | -15.23% | 64259-64260/34691 |
| FillLong64 | -41.52%/-37.57%/-38.80% | -38.80% | 447072/155612-155613 |
| Fill1 control | -56.34%/+27.57%/-45.89% | -45.89% | 3819-3848/3818-3831 |
| CacheHit64 control | -54.72%/-0.56%/+0.48% | -0.56% | 72/72 |
| IdenticalControl | +7.93%/+9.26%/-0.02% | +7.93% | 0/0 |

[All20 profiles, all rounds and all non-wins](comparison.md),
[raw-derived sample/variance audit](measurement-audit.json).
Negative percentages mean faster, not a confidence interval or significance test.
No comparison is removed as an outlier.

**Do not attribute Fill1's large time movements to this optimization.**
An empty BinarySearch list has no comparer invocation. That case includes real
cache invalidation and has unstable timing and small allocation variation.
CacheHit64 bypasses comparisons: its first-pair54.72% change is also not an
attributable win. The unchanged identity branch has a higher7.93% median
at roughly4ns/op; all of its samples remain available. CacheStatic64 retains
648B/op and SameStemControl/NoExtensionControl/EmptyPatternControl retain zero.
Full no-extension fills retain approximately24507B/op. No causal JIT, scheduling
or GC explanation for these control movements has been established.

The actual cache-fill boundary includes cancellation and potentially
asynchronous MemoryCache eviction, not pure sorting latency or whole-process
allocation accounting. This is a shared Windows microbenchmark, not a disk,
HTTP, startup or production-throughput result. Direct4096-character stems and
virtual256-character filename prefixes are scaling inputs; they do not prove
behavior or gains for physical filenames.

## Actual owner and correctness boundary

The producer is the default Matcher running the actual
FileProviderGlobbingDirectory/File wrappers over an explicit virtual IFileProvider.
The real GlobbingUrlBuilder prefixes paths, calls List.BinarySearch with its
actual static PathComparer, inserts unique URLs and caches through MemoryCache.
The provider supplies fresh enumerators and real CancellationChangeToken objects.
Untimed contracts add a real new virtual file, rotate/cancel the source and
observe the owner's new list/count and new enumeration, not injected callbacks.
Setup reads the private comparer once and uses its public IComparer interface;
there is no timed reflection, shipping IVT or UnsafeAccessor.

Two substring locals become StringSegment slices. The ordinal spans are clamped
at the old extensionless **buffer ends**, not at each token's length.
Original string.Compare can read into a later slash/segment; preserving that
matters for directory `a` versus `a-`. Simply retaining the full string buffer
allows reads into the removed extension and breaks filename `a.css` versus
`a-b.css`. Existing explanatory locals, loop/branch structure, null/empty and
extension checks are unchanged.

| Requirement | Evidence |
|---|---|
| Preserve extension/stem/depth/ordinal ordering and existing owner behavior | All7 OrdersGlobbedMatchResultsCorrectly rows and all29 owning rows pass before/after |
| Preserve reads across nonterminal segment prefixes | OrdersGlobbedMatchResults_WithDirectorySegmentPrefixes passes through the real Matcher before/after |
| Reject reads into removed extensions | Unmeasured full-buffer prototype fails exactly the existing /A/a.css versus /A/a-b.css ordering row;28 other rows pass |
| Preserve representative signed comparer inputs | All529 pair contracts,23 inputs including null/empty, prefixes, dotted paths, repeated slashes and Unicode, are byte-identical |
| Preserve producer-driven cache reuse/invalidation | All20 profile contracts are byte-identical;real change-token invalidation observes new virtual files |
| Establish the measured allocation effect at the real owner | All18 reached direct-comparison pairs change positive heap counts to zero;bulk real matcher/cache fills retain all reports |

No test is skipped. Original and selected owner suites each pass29/29.
Preservation tests are intentionally green before/after, not functional-red
bug-fix evidence. The rejected unbounded prototype is an unmeasured negative
control and consumes none of the three measured comparisons. The real owner
allocation change is measured before/after, not inferred only from source.

Source/PDB correspondence passes for both frozen owners. All285 recursively
copied execution files exist in both snapshots; only TagHelpers.dll/PDB differ.
All117 declared runtime assets are checked. The benchmark DLL/runtime/deps
configuration is identical and all measured launches print the correct owner
hash at startup and each setup. The actual selected tested owner also matches
the frozen benchmark owner. Raw binaries are not published.

## Reproduction

The external [harness](harness/AutoPerf.Benchmarks.csproj) targets net12.0/C#13,
BenchmarkDotNet0.13.0, concurrent server GC and the pinned repository runtime.
SDK12.0.100-alpha.1.26557.102; measured .NET12.0.0(12.0.26.56305).
Build the real TagHelpers.Test Release dependencies first. Override
`-p:AspNetCoreRoot=<checkout>` when not using the original `C:\src\aspnetcore`.
Never replace the actual owner with an installed ASP.NET shared framework.

[Exact test/build/contract/format commands and their results](validation-commands.md).
[All six successful measured commands/settings](all-execution.json):
three warmups,eight actual result iterations,100ms target,DontRemove outliers,
AB/BA/AB order.120 outcomes,60 pairs,960 actual result samples. The3/3 budget
is closed; rerunning historical timing is not requested.

From this evidence folder on Windows with Node.js and PowerShell7:

```powershell
node .\reproduce-analysis.mjs . --verify
```

This non-timing command parses the real TRX XML, verifies every row and the
prototype failure, raw sample arithmetic, owner markers, source/PDB identities,
runtime closure and contract equality. It reproduces measurement-audit.json
without rebuilding or consuming a fourth comparison. `--write` generates that
audit from the same inputs. The historical runner and closure verifier retain
their original private campaign directory layout; they are provenance, not
standalone commands against this published flat package.

Focused whitespace verification passed without changing measured source.
No API/default/convention, package, cache key or include/exclude-order change.
dotnet/aspnetcore#69975 and dotnet/aspnetcore#62134 remain unfixed. History/search
was bounded as recorded in acceptance.md; absence of all existing work is not
claimed. Other platforms, physical I/O and universal performance are unverified.
