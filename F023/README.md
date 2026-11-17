# F023: infinite session-load I/O timeout

**Disposition:** qualified, opt-in, allocation-focused fork proposal; **not merge-ready**.
The finite/default per-operation deadline is required. This proposal only skips
`CancelAfter` when the existing, explicitly documented `IOTimeout` option is exactly
`Timeout.InfiniteTimeSpan`. It retains a fresh owned linked source and its disposal.

Source: [9068cc0d115e7e6a931ac836cc41c62767a2c57f](https://github.com/jaslawinMs/aspnetcore/commit/9068cc0d115e7e6a931ac836cc41c62767a2c57f),
branch `autoperf/F023-session-load-timeout-source`, independently based on
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Only `DistributedSession.cs` (+4/-1) and the new type-focused
`DistributedSessionTests.cs` (+145/-0) are in the source proposal.
F024 `CommitAsync`, public/protected declarations, defaults, dependencies and TFM are unchanged.

The measured owner was built from the baseline plus the scoped uncommitted patch,
**not** at the subsequently created source commit. The final publication receipt
is appended separately as `publication.json`; this evidence capsule is otherwise immutable.

## Result and real boundary

All four fresh infinite-timeout public profiles save **96 B/op in every pair**.
The primary miss saves 440 -> 344 B/op; the stored-value hit saves 856 -> 760 B/op.
Default/finite and already-loaded allocation controls are unchanged.
Observed primary median paired time reductions are 38.16% and 22.02%, respectively,
but default/control timings also move materially. These are **not** clean causal
application-speedup, default-configuration, remote-cache or production-frequency claims.

The timed wrapper uses the actual `DistributedSessionStore.Create`,
`DistributedSession.LoadAsync`, real `MemoryDistributedCache`, and public
`GetInt32`/`IsAvailable` consumption. Hit data is seeded by the real session
serializer and commit path outside the warm timing. Already-loaded cases are
explicit retained controls. `Task<int>` consumption and per-wrapper accounting
are common to both images; no copied substitute for the shipping owner is timed.

# F023 measured comparison

Three actual comparisons;48 native warm rows and12 first-observed observations. Positive percentage means less time.
The supported explicit infinite-timeout option saves96 B/op in every fresh public target pair. Default/finite and already-loaded allocation controls are unchanged.
Shared VM,control drift and the added finite-path guard limit timing attribution;do not convert the observed means into application/default-configuration speedups.

| Actual public profile | Original ns/op,1/2/3 | Selected ns/op,1/2/3 | Observed paired improvement %,1/2/3 | Median original/selected B/op |
|---|---:|---:|---:|---:|
| Load.Infinite.Miss.None (primary) | 239.49 / 205.78 / 233.91 | 142.87 / 147.55 / 144.65 | 40.34 / 28.30 / 38.16 | 440 / 344 |
| Load.Infinite.Miss.Caller | 265.42 / 240.87 / 259.54 | 174.96 / 176.94 / 176.89 | 34.08 / 26.54 / 31.85 | 456 / 360 |
| Load.Infinite.Hit.None (primary) | 378.85 / 379.52 / 375.64 | 293.25 / 295.94 / 296.31 | 22.60 / 22.02 / 21.12 | 856 / 760 |
| Load.Infinite.Hit.Caller | 411.84 / 414.85 / 402.54 | 334.15 / 332.68 / 339.87 | 18.86 / 19.81 / 15.57 | 872 / 776 |
| Load.Default.Miss.None | 246.09 / 212.64 / 239.96 | 211.81 / 220.62 / 213.11 | 13.93 / -3.75 / 11.19 | 440 / 440 |
| Load.Default.Hit.Caller | 672.50 / 415.72 / 948.36 | 414.04 / 420.51 / 815.25 | 38.43 / -1.15 / 14.04 | 872 / 872 |
| Loaded.Infinite.Hit.None | 78.43 / 81.97 / 80.61 | 80.74 / 80.59 / 79.36 | -2.94 / 1.69 / 1.55 | 144 / 144 |
| Loaded.Default.Hit.None | 78.39 / 80.52 / 80.92 | 81.79 / 80.92 / 79.27 | -4.34 / -0.49 / 2.04 | 144 / 144 |

## First observed:fixture,seed/commit,JIT and metadata included

| Public profile | Original ms,1/2/3 | Selected ms,1/2/3 | Original bytes,1/2/3 | Selected bytes,1/2/3 |
|---|---:|---:|---:|---:|
| Load.Infinite.Hit.None | 21.03 / 20.13 / 21.00 | 20.31 / 21.05 / 21.02 | 12744 / 12744 / 12744 | 12648 / 12648 / 12648 |
| Load.Default.Hit.Caller | 20.74 / 20.86 / 23.93 | 21.51 / 21.43 / 21.40 | 12984 / 12984 / 12984 | 12984 / 12984 / 12984 |

Single observations only,not cold-start or isolated-entry conclusions. All adverse and control observations are retained.

Default-path controls preserve finite work but traverse the new comparison guard;
they are not byte-identical IL controls. Already-loaded controls bypass the changed branch.
In particular, default miss/hit comparison2 is 3.75%/1.15% slower, and both
already-loaded controls have adverse pairs. Default hit/caller means also improve
up to 38.43% without allocation change. Every control and first-observed result is retained.

## Correctness and ownership

- Original owning suite: 26/26 passed, no skips. With four focused rows:
  29 passed and **only** `LoadAsync_InfiniteTimeoutAvoidsTimerAllocation` failed:
  infinite 87552 vs finite 87552 bytes over 64 real loaded-value wrappers.
- Selected owning suite: 30/30 passed, no skips. Both individual
  `LoadAsync_InfiniteTimeoutPreservesCallerCancellation(canceledBeforeLoad: True/False)`
  rows passed on original and selected owners, with real caller cancellation
  before entry or while the underlying gated cache wait was pending.
- `LoadAsync_InfiniteTimeoutPreservesOwnedTokenLifetime` checks distinct fresh
  linked tokens, retained loaded data, already-loaded cancellation no-op, and
  removal of caller registrations after completion.
- Each frozen owner independently passed eight public wrappers, 16 value
  contracts, and ten additional actual caller/deadline/lifetime/error producers.
  Real `CancelAfter` cancels a pending cache wait and preserves timeout exception
  enrichment/warning. Caller cancellation remains distinct. Cache failure/retry,
  zero and invalid values, payload persistence, and owned-token lifetime are covered.
  Zero timeout accepts its inherent before-entry/after-entry scheduling race;
  no exact zero-timeout cache-entry ordering is claimed.

The pending-cache diagnostic gates a real distributed-memory provider through
`Task.WaitAsync` using the owner's actual token. It observes real caller and timer
producers, not a manually invoked cancellation callback. It is not a remote-provider
or network test. Existing hosted Session tests also ran.

The allocation assertion and BDN totals are different callers/JIT/consumer
boundaries; do not equate their absolute byte counts. The separate original-runtime
CTS observation is explanatory, not the public gain evidence.

## Reproduce without historical binaries

Use a separate source checkout at the source commit above, satisfy the repository's
[build prerequisites](BuildFromSource-captured.md), and use its activation script.
The owner build is intentionally `--no-restore`; missing clean-checkout prerequisites
are reported, not silently installed or treated as passed.

From PowerShell 7 on Windows, with this results directory at `C:\results\F023`:

```powershell
& 'C:\results\F023\F023-run-fresh.ps1' `
  -SourceRoot 'C:\src\aspnetcore' `
  -OutputRoot 'C:\temp\F023-new-characterization' `
  -Mode Characterize
```

This actually builds a new project from the included
[`AutoPerf.Benchmarks.csproj`](harness/AutoPerf.Benchmarks.csproj), freezes its
consumer/source closure and runs the real public/producer characterizations.
The helper was itself exercised from a physically relocated project here:
both builds passed with zero warnings, and all eight wrappers/16 values/ten
additional producer contracts passed. **No additional timing was performed.**
A fresh harness can have a different PDB/PE identity; this is not historical
binary reproduction. `-Mode Measure` is explicitly new independent work with
a new output directory, never permission to extend this closed campaign budget.

Read-only verification of the copied authoritative text and all 48 retained raw means:

```powershell
node .\F023-audit-measurements.mjs . --verify
```

Actual copied audit: passed. Exact historical commands, native exit codes,
expected negative result and failures are in [validation-commands.md](validation-commands.md).
Do not replay historical comparison/publication drivers.

## Measurement and provenance limits

- Three of three comparisons consumed and completed; **budget permanently closed**.
  One common harness, 18 native profiles, 48 warm reports and 12 separate
  first-observed observations. No fourth comparison.
- SDK `12.0.100-alpha.1.26557.102`, runtime
  `12.0.0-alpha.1.26562.105`, C#13, actual net12/x64 owner, server/concurrent GC.
  Three warmups, eight configured 100-ms iterations, unroll1 and MemoryDiagnoser.
  Native retained N after outlier filtering is authoritative.
- Shared Windows VM, **not dedicated or isolated**. Byte-exact reused
  settings-preserving emitter, `Guid.Empty` power plan. Initial and warm
  before/setup/after point observations are Normal/Normal/affinity65535.
  No OS/process/thread priority, affinity or power settings were changed.
- Both 98-file consumer closures were verified; only Session DLL/PDB differ.
  All 196 closure bindings over 100 physical paths and 60 runtime bindings were
  actually rehashed before publication. Source/PE/PDB content binding and selected
  document checks passed; these are not complete compiler-provenance or coverage proofs.
- The portable audit rebases preserved absolute F023 paths to this capsule and
  checks copied text/records/derived results. It **cannot rehash omitted binaries
  or runtime images**. Those omissions have explicit sizes and hashes.
- Shipping-source whitespace verification passes. The later staged capsule
  `git diff --check` reports trailing spaces in byte-exact generated XML and
  native benchmark logs. These are retained, not normalized into different
  evidence. The exact diagnostic and exit are captured under `publication-checks`.
- Current default `fa10021db581bdb7dc44e84953842ac9ccb34009` matches all 12
  selected source/test/project/API file pairs with empty intervening selected
  history. `global.json`/`eng/Versions.props` differ. This is not newer-default SDK
  integration, full-repository, pack, other-OS or release-readiness evidence.
- The first standalone harness build failed for missing Http.Extensions reference
  and cache namespace usings. The corrected build passed with zero warnings.
  The runtime-only resource probe had one CA1416 warning. All raw failures and
  diagnostics are retained; no shipping workaround or suppression was added.
- The exact runtime informational source commit could not be resolved on GitHub.
  No unrelated runtime main source was substituted as proof of the loaded binary.

See [decision.json](decision.json), [measurement-audit.json](measurement-audit.json),
[live-frozen-closure-audit.json](live-frozen-closure-audit.json),
[authoritative-copy-manifest.json](authoritative-copy-manifest.json) and
[omitted-file-manifest.json](omitted-file-manifest.json).
