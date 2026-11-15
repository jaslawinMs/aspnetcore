# F080 acceptance and source-boundary record

Baseline: current upstream main
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Independent branch: `autoperf/F080-globbing-path-comparison-segments`.
Retained card: `sort-comparer-recomputes-expensive-keys`.

## Pre-implementation criteria

Remove the extensionless substring allocations in private PathComparer.Compare
without changing ordinal/depth/extension ordering, existing branches, null/empty
handling, pattern normalization, duplicate/static URL behavior or cache keys.
No API/default/convention or metadata-cache change is proposed. LastIndexOf and
tokenization still occur; this is an allocation-focused alternative to retaining
precomputed keys, not a claim that all repeated comparison work is eliminated.

The actual producer is default Matcher executing FileProviderGlobbingDirectory
over IFileProvider. FindFiles prefixes paths with RequestPathBase, binary-searches
with the actual static comparer, inserts unique URLs and publishes through the
actual MemoryCache. Warm cache hits bypass comparisons. The final lower-boundary
contract is BuildUrlList ordering/content/cache reuse, not a substituted sort.

Preserve the original string.Compare behavior that can read past a token into
another segment, but is clamped by the extensionless substring buffer end.
Simply retaining the original full strings behind StringSegment can read the
extension instead. Comparing only individual tokens would also alter existing
nonterminal-prefix ordering. Existing ordering data includes a.css/a-b.css;
OrdersGlobbedMatchResults_WithDirectorySegmentPrefixes covers directory a/a-.

Before shipping edits, run the owning original GlobbingUrlBuilderTest suite with
the extra preservation fact. Before/after preservation is intentionally green,
not functional-red bug-fix evidence. Use actual-owner direct comparison contracts
and real matcher/file-provider/cache-fill/hit profiles for measurement.
No more than three measured comparisons, identical frozen harness and runtime,
source/PDB matching, actual owner hashes, all raw outcomes and control costs.

## Bounded history and documentation

Read MVC AGENTS, cross-cutting guidance and BuildFromSource. Preserve singular
Microsoft.AspNetCore.Mvc.TagHelpers.Test and the existing test infrastructure.
Use activated project-specific dotnet validation and two MSBuild workers.
The Azure code index is msazure/One, not this GitHub repo; local C# LSP and known
source were used, with bounded source searches after workspace coverage proved
insufficient.

The last owner change, commit23dc2a5de0359434befd4c49f10c6202dfeaec95 /
dotnet/aspnetcore#67018, changes whitespace search helpers, not these substrings.
Five file-history entries and eight-result-bounded PR/issue searches were
inspected; this is not an exhaustive absence-of-existing-work claim.
dotnet/aspnetcore#69975 concerns cross-PathBase cache identity and remains
unfixed. dotnet/aspnetcore#62134 requests ordered include/exclude evaluation and
remains unfixed. Neither should be listed as fixed by this allocation proposal.

No HTTP, physical filesystem I/O, startup, universal production-throughput or
other-platform performance claim. Virtual provider inputs are explicit; the
actual matcher, owner and MemoryCache remain in the exercised path.

## Selected validation and measured disposition

Original and selected real-owner suites each passed29/29. The unmeasured
full-buffer StringSegment prototype failed exactly the existing filename-prefix
ordering row (expected /A/a.css,observed /A/a-b.css), with28 rows passing.
The bounded-span proposal restores that row while keeping the new directory
prefix fact green. All20 actual-owner/cache contracts and529 signed pair
contracts are byte-identical. Both source/PDB checks pass; all285 copied
execution files and117 runtime assets match except actual TagHelpers.dll/PDB.
The actual selected tested owner equals the selected frozen benchmark owner.

Three unchanged-proposal comparisons completed AB/BA/AB,120 outcomes/60 pairs/
960 result samples. Direct long time improves78.52% with16448B/op removed;
ordinary64/256-file cache fills improve21.74%/21.54%,and virtual long64 fills
improve38.80%. All reached direct cases remove their positive heap counts.
All controls remain published:Fill1 has no comparer invocation and unstable
-56.34%/+27.57%/-45.89% timings;cached-hit first-pair54.72% is not attributable;
identity-control median7.93% slower remains visible. Cache-fill measurements
include actual cancellation/potentially asynchronous eviction and do not
establish whole-process allocation accounting or pure sorting latency.

The allocation proposal is justified for a fork-only draft, not a universal
performance claim. The timing budget is closed at3/3;no fourth run. Long direct
and virtual-provider inputs are scaling probes,not physical filename evidence.
Source diff is exactly two files,23 additions/9 deletions,including the16-line
preservation fact. Focused whitespace verification passed without changes.
