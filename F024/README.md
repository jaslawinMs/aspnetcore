# F024: infinite session-commit I/O timeout

**Disposition:** qualified, opt-in, allocation-focused fork proposal; **not merge-ready**.
Skip `CancelAfter` only for the existing documented exact
`Timeout.InfiniteTimeSpan` option. Keep the fresh owned linked source, disposal,
finite/default deadlines and existing modified/unmodified commit behavior.

Source: [9f7deb5a4883e11231552a63db1abee4564e110c](https://github.com/jaslawinMs/aspnetcore/commit/9f7deb5a4883e11231552a63db1abee4564e110c),
branch `autoperf/F024-session-commit-timeout-source`, independently based on
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Only `DistributedSession.cs` (+4/-1) and the new type-focused
`DistributedSessionCommitTests.cs` are in the source proposal.
F023's `LoadAsync` guard is **not** included; all non-`CommitAsync` source is unchanged.
No shipping public/protected declaration, default, dependency, TFM or visibility change.

The measured owner was built from the baseline plus the scoped uncommitted patch,
**not** at the subsequently created source commit. The final publication receipt
is appended separately as `publication.json`; this evidence capsule is otherwise immutable.

## Result and real boundary

All four infinite-timeout public profiles allocate less in all three pairs:
**160 / 96 / 32 B/op** reductions. Both finite/default controls move by
**64 / 0 / -64 B/op**, while both unchanged-source load controls have no allocation change.
For the two timeout-matched caller shapes, the difference in allocation savings is
**96 B/op in every comparison**. This accounting does not identify allocated types
or establish why the additional positive/negative 64-byte movement occurs.
Do not attribute all observed bytes to the skipped disabled timer.

Median paired time reductions are 5.91% for modified `Set.None` and 13.66% for
unmodified `Refresh.None`. Default Set is slower in every pair; default
Refresh/Caller is up to 8.89% slower and allocates 64 B/op more in comparison3.
These are retained adverse observations, not dismissed as noise.
There is **no default-configuration or clean causal application-speedup claim**.

The timed wrapper creates a fresh actual `DistributedSession` through its store,
uses real `MemoryDistributedCache`, calls actual `CommitAsync`, and consumes the
public value. Modified wrappers seed 41 outside timing and commit 42; an
independent fresh reader verifies persistence outside timing. Unmodified
wrappers reach `RefreshAsync` without a preceding load. Unchanged `LoadAsync`
profiles are explicit controls. Common `Task<int>` consumption/accounting and
one byte-identical harness are used for both owner images.

# F024 measured comparison

Three actual comparisons;48 native warm rows and12 first-observed observations. Positive percentage means less time.
Observed infinite-target allocation reductions:32/96/160 B/op;finite/default reductions:-64/0/64 B/op;unchanged-source load-control reductions:0 B/op.
Do not attribute the entire observed reduction to a disabled timer. Finite/default paths also move;timeout-matched control-relative accounting is reported separately.
Shared VM,control drift and the added finite-path guard limit timing attribution;do not convert the observed means into application/default-configuration speedups.

| Actual public profile | Original ns/op,1/2/3 | Selected ns/op,1/2/3 | Observed paired improvement %,1/2/3 | Median original/selected B/op |
|---|---:|---:|---:|---:|
| Commit.Infinite.Set.None (primary) | 751.84 / 771.38 / 752.14 | 673.54 / 736.51 / 707.67 | 10.41 / 4.52 / 5.91 | 1712 / 1616 |
| Commit.Infinite.Set.Caller | 801.04 / 795.43 / 798.49 | 698.53 / 763.18 / 745.17 | 12.80 / 4.05 / 6.68 | 1728 / 1632 |
| Commit.Infinite.Refresh.None (primary) | 422.00 / 428.29 / 425.20 | 345.63 / 369.79 / 369.92 | 18.10 / 13.66 / 13.00 | 856 / 760 |
| Commit.Infinite.Refresh.Caller | 457.44 / 459.30 / 447.19 | 375.03 / 397.70 / 401.62 | 18.02 / 13.41 / 10.19 | 872 / 776 |
| Commit.Default.Set.None | 767.72 / 780.17 / 772.93 | 770.87 / 819.44 / 777.62 | -0.41 / -5.03 / -0.61 | 1712 / 1712 |
| Commit.Default.Refresh.Caller | 466.10 / 464.93 / 469.37 | 458.97 / 478.73 / 511.10 | 1.53 / -2.97 / -8.89 | 872 / 872 |
| Load.Infinite.Hit.None | 407.82 / 384.86 / 392.29 | 389.44 / 384.61 / 392.36 | 4.51 / 0.07 / -0.02 | 856 / 856 |
| Load.Default.Hit.None | 395.34 / 408.06 / 402.99 | 397.06 / 398.39 / 405.50 | -0.44 / 2.37 / -0.62 | 856 / 856 |

## Allocation accounting against timeout-matched finite controls

| Infinite target / finite control | Target savings B/op,1/2/3 | Finite control savings B/op,1/2/3 | Difference in savings B/op,1/2/3 |
|---|---:|---:|---:|
| Commit.Infinite.Set.None / Commit.Default.Set.None | 160 / 96 / 32 | 64 / 0 / -64 | 96 / 96 / 96 |
| Commit.Infinite.Refresh.Caller / Commit.Default.Refresh.Caller | 160 / 96 / 32 | 64 / 0 / -64 | 96 / 96 / 96 |

Accounting is not a type-allocation or JIT-mechanism proof;no general default-configuration gain claim.

## First observed:fixture,seed/commit,JIT and metadata included

| Public profile | Original ms,1/2/3 | Selected ms,1/2/3 | Original bytes,1/2/3 | Selected bytes,1/2/3 |
|---|---:|---:|---:|---:|
| Commit.Infinite.Set.None | 19.54 / 19.87 / 20.57 | 19.15 / 20.46 / 19.98 | 13616 / 19808 / 13616 | 13520 / 13520 / 13520 |
| Commit.Default.Refresh.Caller | 21.55 / 20.32 / 20.21 | 20.13 / 20.91 / 19.81 | 19104 / 12912 / 12912 | 19104 / 19104 / 12912 |

Single observations only,not cold-start or isolated-entry conclusions. All adverse and control observations are retained.

Finite/default controls retain deadline work but traverse the new guard; they
are not byte-identical IL controls. The original fixed 96/0 allocation expectation
in the inherited audit was revised to report the actual observations and matched
control accounting. Neither the frozen harness nor the shipping proposal was
changed between comparisons, and no fourth comparison was run.

## Correctness and ownership

- Original existing owning suite: 26/26 passed, no skips. Expanded original:
  32 passed and only the two exact
  `CommitAsync_InfiniteTimeoutAvoidsTimerAllocation(modified: True/False)` rows
  failed: 142336 = 142336 and 87552 = 87552 bytes, respectively, over 64 real wrappers.
- Selected owning suite: 34/34 passed, no skips. Both allocation rows are
  independently red before/green after. All original passing rows remain green.
- All four
  `CommitAsync_InfiniteTimeoutPreservesCallerCancellation(modified, canceledBeforeCommit)`
  rows pass on both owners. Actual caller cancellation occurs before entry or
  while the real cache wait is pending. Modified pre-cancel avoids `SetAsync`;
  unmodified pre-cancel still reaches the refresh provider once. These rows also
  verify failure/cancellation retry, persistence and success-to-refresh state.
- Both
  `CommitAsync_InfiniteTimeoutPreservesOwnedTokenLifetime(modified: True/False)`
  rows preserve fresh cancelable owner tokens, caller unlink after completion,
  and public persisted values.
- Each frozen owner passes eight public wrappers, 16 value contracts and 24
  additional producer contracts: real finite/zero timeouts, caller cancellation,
  invalid values, cache failures, retry/state/lifetime and information-enabled
  pre-store `GetAsync`. The diagnostic read shares the owner's deadline/token;
  its best-effort exception handling and commit-timeout behavior are retained.

The pending-provider gate awaits the real owner's token via `Task.WaitAsync`;
caller and timer producers actually cancel it. This is not manual callback
injection or a remote-cache/network test. Zero timeout preserves its inherent
before/after-entry scheduling race. Existing hosted Session tests also ran.
Unit and BDN absolute allocations are different caller/JIT/consumer boundaries.

## Reproduce without historical binaries

Use a separate source checkout at the source commit above and satisfy the
repository [build prerequisites](BuildFromSource-captured.md). The owner build
is intentionally `--no-restore`: missing clean-checkout prerequisites are reported,
not silently installed or counted as passed.

From PowerShell 7 on Windows, with this capsule at `C:\results\F024`:

```powershell
& 'C:\results\F024\F024-run-fresh.ps1' `
  -SourceRoot 'C:\src\aspnetcore' `
  -OutputRoot 'C:\temp\F024-new-characterization' `
  -Mode Characterize
```

This builds the included
[`AutoPerf.Benchmarks.csproj`](harness/AutoPerf.Benchmarks.csproj), freezes its
consumer/source closure and exercises the actual public/producer boundaries.
The helper was actually exercised from a physically relocated project here:
both builds passed with zero warnings/errors and all eight wrappers/16 values/24
additional producer contracts passed. **No additional timing was performed.**
Fresh harness PE/PDB identity may differ; historical binary reproduction is not claimed.
`-Mode Measure` denotes independent future work in a new output directory,
not permission to extend this closed campaign budget.

Read-only verification of the preserved text and all 48 retained raw means:

```powershell
node .\F024-audit-measurements.mjs . --verify
```

Actual copied audit: passed. Exact historical commands/results and expected
negative rows are in [validation-commands.md](validation-commands.md).
Do not replay historical comparison/publication drivers.

## Measurement and provenance limits

- Three of three comparisons consumed/completed; **budget permanently closed**.
  One common harness, 18 native profiles, 48 warm reports and 12 separate
  first-observed observations. First-observed includes fixture, seed/commit,
  JIT and metadata; no cold-start conclusion.
- SDK `12.0.100-alpha.1.26557.102`, runtime
  `12.0.0-alpha.1.26562.105`, C#13, net12/x64, server/concurrent GC.
  Three warmups, eight configured 100-ms iterations, unroll1 and MemoryDiagnoser.
  Native retained N after outlier filtering is authoritative.
- Shared Windows VM, **not dedicated or isolated**. Byte-exact reused
  settings-preserving emitter and `Guid.Empty` power plan; recorded initial and
  warm before/setup/after observations are Normal/Normal/affinity65535.
  No OS/process/thread priority, affinity or power settings were changed.
- Both 98-file consumer closures were verified; only Session DLL/PDB differ.
  All 196 closure bindings over 100 physical paths and 60 runtime bindings were
  actually rehashed before publication. Source/PE/PDB selected-document binding
  is not complete compiler-provenance or coverage proof.
- The portable audit rebases preserved absolute F024 paths and checks copied
  text/records/derived results. It **cannot rehash omitted binary/runtime images**;
  omissions retain exact sizes/hashes.
- Shipping-source whitespace verification passes. The initial capsule check
  reports preserved CRLF lines (including captured sources/docs) and raw generated
  trailing spaces. All bytes remain exact. The exit2/99332-diagnostic record is
  under `publication-checks`; it is not a shipping-source format failure.
- At publication, the captured latest default matches all 12 selected
  source/test/project/API file pairs with empty selected intervening history;
  the exact SHA is in `source-publication/verified-default-parity.json`.
  `global.json`/`eng/Versions.props` are context, not modified. Source parity is
  not newer-default SDK integration, full-repository/pack/other-OS or release readiness.
- The initial standalone harness build passed with zero warnings/errors.
  No F023 build failure or runtime-only probe is relabeled as an F024 execution.

See [decision.json](decision.json), [measurement-audit.json](measurement-audit.json),
[live-frozen-closure-audit.json](live-frozen-closure-audit.json),
[authoritative-copy-manifest.json](authoritative-copy-manifest.json) and
[omitted-file-manifest.json](omitted-file-manifest.json).
