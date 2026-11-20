# F145: reuse the IIS test asset's fixed UTF-8 write buffer

**Classification: focused test-infrastructure efficiency.** The actual Kestrel-hosted
`LargeResponseFile` operation took **14.88% less time on Original** and **15.71% less
time on observed Default**, independently qualifying on both frozen source graphs.
Each study has seven measured baseline/candidate pairs, all seven favoring the
candidate. This is a fixed 200 MB ASCII **IIS test asset**, not a shipping request
hot path, native IIS measurement, whole-CI speedup, or merge-ready recommendation.

| Study | Source baseline | Exact Core runtime | Primary candidate/baseline geometric mean | Pairs favoring candidate | Unchanged 65k control ratio |
|---|---|---|---:|---:|---:|
| Original | `37e809ead5824bc753a1c3d56f11615bdb1296c5` | `12.0.0-alpha.1.26562.105` | 0.8512361065561442 | 7/7 | 0.983557608612879 |
| Observed Default | `ae89581dfd24c6277b4267a9779d05f7b9f047f1` | `12.0.0-alpha.1.26568.110` | 0.8428920053460468 | 7/7 | 0.9757617309969859 |

The predeclared gate required a ratio at most 0.90 and at least six favorable pairs
**in each study**, with its control ratio in `[0.95, 1.05]`. Results were not pooled.
Both comparisons are complete and the budget is permanently closed at **2 of 3**;
there is no result-driven retry, retiming, or new measurement authorization.
**No allocation metric was adopted or measured.**

## What changed, and why the bytes are the same

The endpoint creates one stable string of 200,000 `'a'` characters and writes its
UTF-8 representation 1,000 times to a temporary file before calling `SendFileAsync`.
Previously each iteration called `Encoding.UTF8.GetBytes` on that same string.
The two-addition/one-deletion change encodes it once into a request-local array,
after the existing `File.OpenWrite`, then uses that array for all awaited writes.

The input cannot change, its ASCII byte count equals the existing character-count
argument, and each write is awaited before the next use. The explanatory string
local, 1,000 writes, offset/count, file open/close, send-file call, and existing
best-effort deletion remain unchanged. There is no pool, shared cache, changed I/O
API, or cleanup redesign. Source inspection establishes fewer encoding calls and
array creations; it does **not** establish a measured B/op saving or peak-memory
reduction.

## Connected artifacts

| Artifact | Direct evidence |
|---|---|
| Independent one-file source | [Exact fork commit](https://github.com/jaslawinMs/aspnetcore/commit/24875ef5dabb55567870b39f6eb0002170435e2f), [verified source receipt](source-publication.json) |
| Tracking issue, draft PR and new-window receipt | [Later additive publication receipt](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F145/publication.json); this does not rewrite the sealed evidence |
| Original and candidate source bytes | [Original](source/original/Startup.baseline.cs), [observed Default](source/default/Startup.baseline.cs), [candidate](inputs/Startup.candidate.cs), [minimal patch](source-change.patch) |
| Preimplementation acceptance and budget | [Frozen plan](plan.json), [plan seal](plan-seal.json), [permanently closed budget](diagnostic-budget.json) |
| Every pair, warmup and control | [Readable complete comparison](comparison-results.md), [Original raw paired export](comparisons/authorization-1-original/paired-samples.json), [Default raw paired export](comparisons/authorization-2-default/paired-samples.json), [decision](measurement-decision.json) |
| Real four-image behavioral validation | [Functional acceptance](functional-acceptance.json), [all raw native outputs and file/runtime records](execution-index.json) |
| Actual runnable compiled consumer and host | [Consumer source](harness/consumer/Program.cs), [consumer project](harness/consumer/F145ResponseWorkload.csproj), [real Startup host](harness/host/Program.cs), [host project](harness/host/F145FunctionalHost.csproj) |
| Frozen launchers and exclusive gate | [Measured driver](inputs/F145-compare-008.mjs), [native launcher](inputs/F145-run-variant-008.ps1), [archived global gateway](tools/Invoke-AutoPerfBenchmark.ps1), [pre-timing review](pre-timing-driver-review.json) |
| Actual all-file image identity | [Every 137-file image](accepted-images.json), [post-measurement rehash](postmeasurement-image-rehash.json), [selected binary inventory](selected-image-files.json) |
| Actual source/PE/PDB association | [Historical association](inputs/owner-source-associations.json), [portable binary/source auditor](audit-owner-and-numbers.ps1), [independent historical audit](historical-audit.json) |
| Worker holds, process review and lease lifecycle | [Admission](timing-admission-001.json), [privacy-bounded process summary](local-quiescence-summary.json), [worker acknowledgements](quiescence/F135-hold-001.json), [second acknowledgement](quiescence/F137-hold-001.json), [both released nonoverlapping leases](post-comparison-quiescence-001.json) |
| Exact commands, successful checks and failed preparation | [Command/result record](validation-commands.md), [all four build receipts and logs](logs/candidate-original-build-001.command.json), [corrected Original](logs/candidate-original-build-002.command.json), [failed Default](logs/candidate-default-build-001.command.json), [corrected Default](logs/candidate-default-build-002.command.json) |
| Copied/omitted evidence and external prerequisites | [Byte-exact copied inputs](authoritative-copied-files.json), [individually hashed omissions](omitted-case-files.json), [external scope](external-inputs.json), [immutable core manifest](capsule-file-hashes.json) |

## Faithful validation and measurement boundary

All four role/variant images used the actual registered source-built
`TestSite.Startup` and real Kestrel HTTP server. Each returned HTTP 200, exactly
200,000,000 raw bytes with SHA256
`aedf73997fc5d20382db198895a702c144ef528b6c4e3252c80cc100fac6b9d4`,
and 200,000,000 decoded characters, each individually checked as `'a'` by the
unchanged compiled client. The 65,000-character response-only control also passed.
Actual temporary-file creation/deletion, empty directories, a subsequent real
request barrier, loaded owner/runtime identity, and graceful process completion
were checked. All 12 functional host/client children were awaited.

Within **each** source study all 137 baseline/candidate image files were compared:
only `InProcessWebSite.dll` and `.pdb` differ. No fixture-prefix exclusion exists.
The compiled client is byte-identical across all four images, SHA256
`5B010AF2F4360CAE31549F1EF64B944079B8FF4B58FD925F5E3F26DE888FF8F7`.
The functional host is fixed within each pair, but its binaries differ between
the independently built source studies. Cross-study dependency differences are
not treated as a causal performance pair.

Each comparison has one excluded warmup pair and seven measured pairs, alternating
baseline/candidate order exactly as frozen. Each variant starts a fresh server,
then separate fresh primary/control client processes on that same server.
The custom `Stopwatch` interval begins **after HttpClient construction**, wraps
`GetStringAsync` and its successful length assertion, and excludes process/server
startup, readiness, image hashing, functional full-content checks, JSON output and
shutdown. Connection setup and request/API work occurring inside that interval
are included. This is **not BenchmarkDotNet**. There are 56 retained scalar client
timings plus eight excluded warmup timings; all are retained.

Both preparation workers explicitly paused native work and heavy IO. One global
gateway/mutex/lease serialized the studies and their 32 variant steps; all 96
measurement host/client children completed, both leases released, and the workers
were explicitly resumed. The machine was shared, not dedicated; arbitrary
third-party inactivity was not proven. The launcher requests no priority, affinity
or power changes; sample-time process/thread settings were not instrumented.

## Limitations and preserved failures

`RequestResponseTests.LargeResponseBodyFromFile_CheckAllResponseBodyBytesWritten`
was **not run**. It requires a matched built/published native ANCM plus
IIS/IISExpress fixture and quarantine-aware execution; its class is quarantined
under [dotnet/aspnetcore#68271](https://github.com/dotnet/aspnetcore/issues/68271).
Installed IIS Express x64/x86 and a V2 module path exist, but that is not a matched
test fixture. Native HTTP_DATA_CHUNK/send-file assertions remain unverified.
The faithful validation boundary used instead is the actual managed Startup,
file producer, Kestrel response and full real HTTP client consumption.

Native IIS, browser, cancellation/disconnect, concurrency, non-ASCII inputs,
exceptional cleanup, alternate self-contained/forward-compatible profiles,
full CI, whole-application gains and allocation savings are not established.
The later observed `00560e2dd1954a2acf2bc54b35422b0f32484bf1` target Git blob was
unchanged; its complete framework graph was **not** rebuilt for this study.
Selected source/PE/PDB association is not full compiler-input attestation.

Both initial linked-source candidate builds failed CA2022 in existing read-test
lines because source relocation lost the normal native analyzer-config context.
The correction applied identical candidate bytes at each private project's native
source path and performed normal Release rebuilds. Both succeeded without custom
imports, analyzer suppression, or unrelated code changes. Those temporary sources
and owner outputs were restored; the two pre-existing unrelated Validation
snapshots were preserved. All failures and preparation-hook history remain
archived, and the earlier 301-file/134-file capsules rehashed unchanged.

## Portable historical audit

From this directory, with existing Node.js and PowerShell 7:

```powershell
node .\verify.mjs . --require-seal
```

This rechecks copied hashes, all historical image inventories, actual four selected
PE/PDB/raw-source associations, raw functional/file outputs, every scalar timing,
independent PowerShell arithmetic, closed budget and lease receipts. It starts no
dotnet process, producer or benchmark and changes no files. The omitted complete
framework/runtime images are explicitly external; this is not their reconstruction.
**Do not replay the closed measurement commands or bypass the gateway.**
