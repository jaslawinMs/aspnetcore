# F033: HTTP.sys synchronous Write start-task guard

**Qualified fork-only proposal, not merge-ready or a general speedup.** The
supporting no-callback 128-byte full-request profile measured **8.23%, 11.47%,
and 19.10% less time** in three alternating pairs. The **declared completed-callback
primary is mixed: 3.75% less, 4.99% more, and 0.54% less time**. Do not promote the
supporting profile into a successful primary or hide the regression.

The prepared already-started **zero-byte** synchronous Write profile measured
only **1.07-2.84% less time, approximately 0.22-0.58 ns/op**. Its initial 128-byte
write and header send happen before timing. No native send occurs for each
measured zero-byte write. That microboundary is not nonzero network throughput,
and does not prove that the local saving causes the entire full-request change.

Only `ResponseStream.Write(byte[], int, int)` gains a completed-success guard.
Pending, faulted and canceled start tasks still use `GetAwaiter().GetResult()`.
Flush, asynchronous methods, the actual start/native-body producers, public
API/baselines and default `AllowSynchronousIO=false` are unchanged. A nonblocking
replacement would not preserve the synchronous contract.

## All comparisons

Positive less-time favors the guard; negative is regression. Async rows are
unchanged controls. B/op is reported MemoryDiagnoser evidence, not independent
cross-thread allocation tracing. Prepared rows use us/op in this table and are
approximately 20-28 ns/op. All eight result samples and outliers per row remain.

| Profile | Attempt | Original us/op | Guard us/op | Less time % | Original B/op | Guard B/op | Original CV% | Guard CV% |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Request.Sync.None.128 | 1 | 326.562741 | 299.697986 | 8.23 | 10654 | 10715 | 7.62 | 9.82 |
| Request.Sync.Ready.128 | 1 | 269.860852 | 259.733371 | 3.75 | 11582 | 11572 | 6.65 | 5.84 |
| Request.Sync.Ready.4096 | 1 | 328.359201 | 333.522872 | -1.57 | 19518 | 19504 | 5.80 | 6.44 |
| Request.Async.Ready.128 | 1 | 360.149583 | 360.254558 | -0.03 | 11430 | 11492 | 12.93 | 10.23 |
| Live.Sync.Started.Zero | 1 | 0.020105 | 0.019884 | 1.10 | 0 | 0 | 0.55 | 0.63 |
| Live.Async.Started.Zero | 1 | 0.026452 | 0.027733 | -4.84 | 0 | 0 | 0.92 | 7.42 |
| Request.Sync.None.128 | 2 | 327.877198 | 290.270248 | 11.47 | 10720 | 10730 | 6.90 | 6.59 |
| Request.Sync.Ready.128 | 2 | 269.501341 | 282.944470 | -4.99 | 11519 | 11561 | 6.62 | 5.40 |
| Request.Sync.Ready.4096 | 2 | 342.643713 | 330.230971 | 3.62 | 19505 | 19494 | 4.60 | 9.03 |
| Request.Async.Ready.128 | 2 | 356.516899 | 339.280317 | 4.83 | 11365 | 11429 | 6.65 | 7.88 |
| Live.Sync.Started.Zero | 2 | 0.020446 | 0.019866 | 2.84 | 0 | 0 | 3.86 | 0.83 |
| Live.Async.Started.Zero | 2 | 0.026863 | 0.026435 | 1.59 | 0 | 0 | 3.29 | 0.71 |
| Request.Sync.None.128 | 3 | 306.634748 | 248.053389 | 19.10 | 10687 | 10725 | 4.79 | 6.34 |
| Request.Sync.Ready.128 | 3 | 255.816726 | 254.446762 | 0.54 | 11512 | 11538 | 5.17 | 3.95 |
| Request.Sync.Ready.4096 | 3 | 332.885522 | 329.073838 | 1.15 | 19520 | 19507 | 5.50 | 5.55 |
| Request.Async.Ready.128 | 3 | 334.944654 | 338.325122 | -1.01 | 11401 | 11541 | 6.22 | 4.69 |
| Live.Sync.Started.Zero | 3 | 0.020187 | 0.019970 | 1.07 | 0 | 0 | 0.46 | 0.35 |
| Live.Async.Started.Zero | 3 | 0.026455 | 0.026363 | 0.35 | 0 | 0 | 0.67 | 0.72 |

All **3/3 comparison pairs** completed, in original/candidate, candidate/original,
original/candidate order: **6 timed native launches, 36 rows, 288 result samples**.
The timing budget is permanently closed. Maximum within-profile CV is **12.93%**;
reported cumulative timed global duration is **90.44 seconds**. The unchanged
async controls move too. Full-request allocations include higher no-callback
candidate residuals in every pair; there is **no structural allocation-saving
claim**. A shared, non-isolated Windows Hyper-V VM is not a dedicated perf lab.

The no-callback result is scenario-specific supporting evidence. The declared
callback primary reverses, scaled requests are mixed, and host/client/native
IO/scheduling/code-generation/fixture costs prevent attributing the entire
full-request difference to removal of one `GetResult` fast path. No default
application, production frequency, HTTP throughput, or later-runtime claim.

## Faithful owning-component evidence

Both measured variants passed all **15 selected native functional rows**, with
zero skipped, including both `setContentLength` Boolean theory rows. Thirteen
rows cross the actual public host boundary; two lower Listener rows bypass
`ResponseStream` and are not passed off as outer-wrapper proof.

The independent original, identical-harness candidate, and byte-exact relocated
original each pass **6 completed profiles + 22 additional real producer/data/
argument/default/error cases + 6 actual benchmark lifecycles**. Their **52
concrete semantic observations match exactly**, apart from independently
verified variant-specific frozen owner paths. These are real `UseHttpSys`
generic hosts and accepted HTTP/1.1 loopback requests, not injected start
delegates, fabricated native contexts, or replaced response streams.

| Requirement | Evidence |
|---|---|
| Real synchronous Write starts the actual public producer | `ResponseBodyTests.ResponseBody_Write_TriggersOnStarting`; `WriteContracts.RunAsync` six completed profiles |
| Pending callbacks prevent synchronous return and wire headers | `WriteContracts.VerifyPendingAsync`: sync/async success, failure and cancellation; actual server caller observed waiting for sync cases |
| Early public `HasStarted` is not completed header transmission | Ten `pending-before-release` observations: `HasStarted=true`, mutable headers, incomplete callback/public call, no received client headers |
| Callback LIFO, exact exception identity and producer token | `RequireSuccessfulCallbacks`, `RequireExpectedFailure`; pending and already-faulted/canceled cases, callback-produced wire headers |
| Actual ranged bytes and excluded sentinels | `RequestHandle.ConsumeCoreAsync`: offset 3, 128/4096-byte `w` ranges, complete response byte length and SHA256; caller-continuation suffix |
| Default synchronous IO remains disabled | `RequireDisabled`: completed and actual pending success before default rejection; separate native Listener test |
| Precise invalid argument behavior | `VerifyArgumentsAsync` / `RequireArgumentFailure`: null buffer, negative offset/count, past-end range and disabled-IO-plus-past-end; exact observed types/parameter names audited across variants |
| Start completion/error precedes buffer validation | `Sync.PendingSuccess.Enabled.NegativeCount`, `Sync.PendingFailure.Enabled.NegativeCount`, `Sync.PendingCancellation.Enabled.NegativeCount` |
| Initial and already-started zero-byte writes | `Zero.First.Sync`, `Zero.First.Async`, held actual requests with 64 extra sync/async zero writes; initial nonzero payload still consumed exactly |
| Benchmark setup actually completes | `RunBenchmarkLifecycleAsync`: all six actual synchronous-void setup/workload/cleanup paths execute before timing |
| Compatible source seam only | `evaluated-Write-guard.patch`; frozen original/candidate source and `F033-audit.mjs` exact whole-file replacement check |
| Owning image actually loaded | Per-native runtime receipts, nine selected PE/PDB/source associations, exact 186-file frozen closure checks |
| Owned resources closed | All **58/58** started listeners have explicit stopped/disposed receipts, including the failed untimed process; all **10** native PIDs observed absent |

`OnResponseStart` publicly marks the response started before awaiting callbacks.
Successful callbacks lock headers only after completion; failures/cancellation
stop older callbacks and retain an unlocked immediate post-invocation boundary.
Handled continuation-body writes can later lock headers. Callback-gate
cancellation is **not** `RequestAborted` production or starvation/deadlock proof.
The handler-finished signal is not exact native `RequestContext` disposal proof.

Correctness cases intentionally pass both original and compatible guard; this
is not a semantic bug-fix red/green claim. The actual original/candidate
benchmark is the performance comparison.

## Identity, history and retained failures

The measured harness DLL/PDB are byte-identical. Each consumer has **186 files:
2 changed HTTP.sys owner DLL/PDB files + 184 unchanged files total**. The
unchanged 184 includes the harness pair, leaving 182 other unchanged files.
The independently rebuilt relocated source is byte-exact; its path-dependent
rebuilt harness binaries are not claimed identical to measured binaries.

The separate live audit rehashes **866 unique physical files / 6,386 bindings**,
including **744 consumer bindings and 5,576 loaded-assembly bindings**. All 288
result samples match native stdout and JSON; mean, sample variance, SD and SE
are independently recomputed. Confidence intervals and allocations are retained
as reported. Seventy-two timed before/after settings observations match initial
normal-priority settings. The byte-exact settings-preserving emitter never sets
priority, affinity or power. No OS, URL ACL or firewall changes.

Pre-edit acceptance/current-default/history/docs and 54 raw snapshots were
captured before a shipping edit. Sixteen selected owner/API/test/producer files
match initially observed `main` `90d90ff3`. Publication stopped when upstream
advanced; a fresh 16-source/history assessment also finds no selected change on
`783dc047`. This is not whole-newer-default/toolchain integration evidence.
Native runs use the activated pinned SDK `12.0.100-alpha.1.26557.102` and runtime
`12.0.0-alpha.1.26562.105`, C# 13 and Server GC on Windows x64.

Source branch: `autoperf/F033-httpsys-write-start`; publication source commit:
`053d19c2a36d3402243016641f3907b834084137`. The actual measured images were built
on baseline `37e809e` plus the uncommitted guard, **not** on that later commit.
Publication independently verifies the tested source's LF-canonical text and
one-file fork comparison; raw worktree/Git line endings are explicitly recorded.
No new public API or API baseline change is proposed.

Preserved negative observations:

- The first **untimed** original characterization assumed exact base
  `ArgumentException`/no parameter for a past-end range. The pinned real native
  owner uses `ArgumentOutOfRangeException(count)`. The initial image, negative
  native exit, partial contracts and disposal receipt remain. Before any
  shipping edit/timing, the corrected harness records actual error observations;
  the audit separately enforces exact concrete type/parameter equality.
- The runtime-reported CoreLib commit was unavailable at its public source
  endpoint (404); no compiler-provenance claim is inferred from that lookup.
- An initial process-probe aggregation over ordered Hashtables produced null
  totals. The original JSON is preserved; 58/58 is recomputed from its original
  per-profile integer counts, not a fabricated fresh native/CIM observation.
- The first publication guard correctly stopped on changed upstream `main`.
  The new selected-source snapshots/history and original stopped invocation
  are preserved. No benchmark slot was reset or added.

## Build and independent untimed reproduction

The runnable project is [`harness/AutoPerf.Benchmarks.csproj`](harness/AutoPerf.Benchmarks.csproj).
It references the real HTTP.sys/hosting projects and pinned packages, not
reimplemented framework methods. Windows and the pinned repository SDK/runtime
are required. Use a separate source checkout and a fresh output directory;
never overwrite the historical images or reopen this campaign's timing budget.
First follow captured [BuildFromSource](BuildFromSource-captured.md) prerequisites
and build the owning functional-test project to supply real Release dependencies.

From that source checkout's root:

```powershell
. .\activate.ps1
$case = 'C:\path\to\published\F033'
$env:AUTOPERF_ASPNETCORE_ROOT = (Get-Location).Path
dotnet build (Join-Path $case 'harness\AutoPerf.Benchmarks.csproj') -c Release -m:2 -nr:false -p:UseSharedCompilation=false -p:UseIisNativeAssets=false "-p:RestoreConfigFile=$env:AUTOPERF_ASPNETCORE_ROOT\NuGet.config" -v minimal
```

The independent relocated source build and actual 6/22+6 characterization on
this box already passed with zero warnings/errors. The historical commands
and results are in [validation-commands.md](validation-commands.md). The
recorded `F033-prepare.ps1` illustrates creating a fresh consumer file closure
and selected source tree; it is a guarded historical driver with original
session/branch paths, **not** a portable blind replay command.

For a fresh invocation, copy the new build output into a fresh consumer folder,
copy its five harness C# sources plus the actual source checkout's
`ResponseStream.cs`, `RequestContext.FeatureCollection.cs`, `ResponseBody.cs`,
and `MessagePump.cs` into `sources\harness` / `sources\httpsys`, and generate
`closure.json` as `{candidate:"F033",variant:"original"|"candidate",files:[{path,sha256,bytes},...]}`.
Hashes are uppercase SHA256 over exact files; list every consumer file.
Invoke the newly built DLL with `--mode characterize --sources <absolute-sources>
--closure <absolute-closure.json> --artifacts <fresh-absolute-directory>`.
Actual program startup verifies all files, runtime, real loaded owner and the
nine selected source/PDB checksums before executing contracts.

For an independently authorized future benchmark, the same built program accepts
`--mode measure --filter '*'` and a different fresh artifact directory. That is
not permission to add a fourth comparison to this completed campaign. A full
replay on another machine/toolchain remains unverified.

The copied read-only audit is directly runnable without omitted native binaries:

```powershell
node .\F033-audit.mjs . --verify
```

That audit verifies copied textual evidence/receipts, **not** omitted binary
bytes. The live physical rehash is a separate observation. Selected source/PE/
PDB identities are not complete compiler provenance or method-coverage proof.
