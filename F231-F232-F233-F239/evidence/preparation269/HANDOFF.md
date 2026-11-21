# F239 / 269 — source-only handoff

Owner: `ec444276-1562-48a8-8655-bc9a7c90de94`.

**Disposition: source-only, no material candidate established.** Canonical F239 remains pending for the parent to accept/retire/publish. This is not a measured no-gain result, false-positive ruling, universal-absence claim, or behavioral/runtime pass.

## Immutable identities and bounds

- Original: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Fresh read-only upstream `dotnet/aspnetcore` default branch: `main`.
- Default: `d3483989953ae3cccd773aea5ea04cb0c7198531`, observed by `gh api` at `2026-11-21T04:01:53.6765704Z`–`04:01:54.2266943Z`.
- Reserved `C:\src\aspnetcore` was never edited/checked out or used as Default HEAD.
- **14/15 whole logical inputs per role**, including three conservatively charged common guidance documents. **22/32 direct Git/gh roots**, including failures (there were no Git/gh failures).
- Eight binary `git cat-file --batch` captures: **28 whole blob bindings + eight commit objects = 36 independently checked objects**.
- Every one of the 14 Original/Default pairs is **complete raw-byte equal**. No archive/text/EOL normalization is used for that statement.
- Target blob: `8f226903cd9ea7b7ed8dec147e6b550967155770`, 5,221 bytes; SHA256 `94BA7B986B601C0A6A227B5A8987BE7A3EE32E4DAD43DBE897407AEB6FDF7A84`.

`whole-source-bindings-v2.json` contains exact commit:path selectors, blob SHA1/SHA256, binary-frame offsets, whole-object paths, stdin/stdout paths, and owning root/observer/direct-child PIDs. `all-git-object-bindings-v2.json` includes the commit objects. `role-byte-comparison-v2.json` records direct array comparisons.

## Why no material candidate

`DirectoryNode.GetOrAddDirectory` at 120 calls `FindSubDirectory`; the latter linearly scans ordered child directories at 146–159. This is a genuine repeated linear path-membership search, although there is no literal `Contains` call.

The **actual** `VirtualRazorProjectFileSystem.Add` producer was followed through `FileNode` and `DirectoryNode.AddFile`, not replaced with injected directory lists:

- `ChecksumValidatorTest`: 11 named/read Facts, eight direct validation calls, six populated cases with 1/1/1/2/3/3 files. Only `/Views/Home/Index.cstml`, `/Views/Home/_ViewImports.cstml`, and `/Views/_ViewImports.cstml` are added. Normal isolated Fact instances have at most three files, two directory edges, and **one child directory per populated parent**. Actual `ChecksumValidator` source supports at most three direct lookups per largest case.
- `CompilerFailedExceptionFactoryTest`: seven named/read Facts, four calls to its actual helper, fresh filesystem per call, 1/1/1/2 files. Actual paths are `/Views/Home/Index.cshtml` and `/Views/_MyImports.cshtml`. Again, child-directory width is at most one and depth at most two. The helper passes the filesystem to the real Razor engine; indirect engine-query frequency is **not qualified**.
- The shipping exception factory reads already-produced source/import documents, not this filesystem.

Thus these normal producers do not demonstrate the wide sibling lists that would justify a retained hash index or other nontrivial change. This conclusion is **not based solely on test-helper location** and does not establish that any optimization would have zero measured benefit.

## Contracts and unverified boundaries

The full source-supported contract analysis is in `assessment.json`:

- First matching child segment, including its slash, using **OrdinalIgnoreCase**; first matching file in insertion order, using the requested suffix length without a separate equal-name-length test.
- Original path representation/object references retained; duplicate files retained; first match wins.
- Mutable directory/file lists; Add appends and sets `FileNode.Directory`; no maintained cache/index.
- Deferred depth-first enumeration: current-directory files first, then child subtrees, all in insertion order. Filesystem normalization/directory resolution occur before the iterator is returned.
- Existing explicit prefix/null guards, missing-item behavior, and uncaught underlying exceptions remain unchanged.

`NormalizeAndEnsureValidPath` is inherited. Its exact implementation, invalid-path exception details, and indirect external Razor-engine lookup frequency are **not established by this packet**. No source declaration, project TFM, or empty search result is treated as selected-runtime or behavior proof. Exact-name inventories are textual, not semantic/reflection completeness claims.

History queries in both roles returned the same four entries: initial package reintroduction (2019), license and namespace changes (2021), unused-using removal (2022). Current whole-file raw bytes were checked independently.

## Validation and failures

**No SDK activation, dotnet, build, restore, product runtime, test, scenario, timing, allocation, profiler, counter, browser, candidate edit, remote work, delegation, or publication was performed.** Existing 18 tests were named/read only; names and source-derived counts are in `source-test-inventory-v2.json`.

Artifact validation succeeded in `analysis-result-v2.json`: all raw streams, selector/frame bindings, Git object SHA1 preimages, payload SHA256 values, complete saved payload bytes, direct role-byte comparisons, source budgets, and actual creation-bound source root/observer waits.

Preserved failures:

1. Windows `python.exe` alias reported no interpreter. PID 52916 was actually waited, exit 9009; no source utility started. See `launcher-failure-01.json` and the complete `run-01.outer.*` evidence. Corrected by using existing PowerShell 7 under fresh v2 names.
2. Artifact analyzer v1 incorrectly reparsed already-decoded `DateTime` metadata, changing timezone/precision. Root 45924 was actually waited, exit 1; observer terminal; no source command replayed. See `analysis-failure-01.json`. Fresh v2 preserves the exact original helper and uses a pinned, fully retained derivation with direct casting; root 43872 / observer 53688 actually completed, exit 0.

## Process and stream evidence

Each source utility has a fresh recorded exact-owner/exact-269-scope/no-lease/no-HOLD/nonquiesced policy point check: **38 utility guards** in nine observed source runs.

| Source run | Root PID | Observer PID |
|---|---:|---:|
| 02 | 51716 | 31432 |
| 03 | 53676 | 48148 |
| 04 | 35896 | 9772 |
| 05 | 34652 | 52764 |
| 06 | 51272 | 48052 |
| 07 | 11692 | 30644 |
| 08 | 45528 | 50724 |
| 09 | 50484 | 30616 |
| 10 | 9836 | 32816 |

`source-process-summary-v2.json` supplies creation identities, exact argv/cwd, direct-child actual waits, outer waits, independent observations and limits. Source roots and observers all actually completed with exit 0.

- Binary streams untruncated; largest actual source stdout **46,969 bytes**, stderr **0 bytes**.
- Declared per-stream limit **32 MiB**, checked after complete capture, not a truncating byte cap.
- Direct source wait deadline **120 s**; observer readiness/closure deadlines **15 s**.
- Independent CIM sampling uses **50 ms sleeps**; maximum sampled source descendants, excluding each root and observer, **2**.
- Sampling can miss short-lived/intersample/reparented children. This is not complete descendant-absence or global-idleness proof. Direct process-handle waits establish only the owned direct roots.

## Stop and optional finite continuation

No source acquisition is proposed or executed beyond this bounded scope. If exact inherited normalization closure is still needed, `assessment.json` proposes a **separately approved** ceiling of two more whole inputs per role and four read-only roots, stopping at a missing dependency pin. This would require raising the 15-file ceiling to 16. It does not authorize an engine-frequency claim, candidate, native execution, timing, or publication.

## Final seal

`seal.byte-index.json` indexes the immutable payload. `seal.receipt.json` hashes that index and identifies the bounded closure-file exclusions. `seal.outer-wait.json` is written only after the actual sealer child and its observer complete, and binds the final stdout/stderr, index, receipt, and this handoff. Its own hash is supplied in the final response after the real outer tool returns. No in-process record predicts its own successful exit.
