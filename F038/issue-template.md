## Measured F038 proposal

Only the new-tree keyed-lookup loop changes; the old-tree loop, duplicate failures, pooling and public API remain unchanged.

Declared actual-renderer primary `KeyedStable:Integer:256`: **7.49/8.07/6.36% less time**, median 7.49%, **74 B/op unchanged**, over three permanently closed comparisons. All 40 profiles/240 rows/1,920 stdout-and-JSON-cross-checked samples are retained.

This is not uniformly faster: empty stable-string median 5.10% slower; integer replacement 16 pair 2 takes 24.25% more time and mixed integer 256 pair 1 takes 8.44% more. The full adverse/control/allocation matrix is published.

All 83 original+83 candidate managed rows and eight existing owning keyed Selenium facts pass, 0 skips. Real canonical InteractiveServer clicks pass five transitions on each source version with 0 errors. Exact seven-file project independently rebuilds and characterizes. Same measured harness; only owner DLL/PDB differs.

Historical credit: dotnet/aspnetcore#70133 previously explored and removed this strategy at 95837ac848beda6c84dc17f44be2298dd7414df2. No novelty or reuse of its performance numbers is claimed.

[Immutable evidence, project, raw results and limitations](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F038/README.md).
Source branch: `autoperf/F038-render-tree-keyed-lookup` at `9c422372a360c0ef06ffcaf8d06995a8873ceaec`.
Shared Windows VM, .NET 12 RyuJIT only; 20/21 selected current-default files match, Renderer/SDK drift excluded. Not application/DOM/Mono-AOT performance or merge-ready.
