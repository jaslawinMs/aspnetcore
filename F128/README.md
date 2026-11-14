# F128 no-gain disposition: OWIN alternate accept capture

Independent baseline: dotnet/aspnetcore
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
[Experimental source](https://github.com/jaslawinMs/aspnetcore/commit/87064c0d5d4600fcc6d60c1aaff5e7b926e52500):
`87064c0d5d4600fcc6d60c1aaff5e7b926e52500`.

**No supported material optimization; no optimization PR.** All three allowed
comparisons are consumed, with no source tuning or discarded launch.
This is not a claim that every case has zero benefit: the typed
status-101/no-callback case improves **2.59-4.11%** in all three pairs.
Other affected paths are mixed, and every allocation result is unchanged.

## Complete measured trade-offs

Eleven cases per launch, six successful serial launches, eight retained
measurements per case. Seven cases reach the captured alternate delegate;
four preserve the no-alternate guard path as controls. Negative percentages
mean lower measured time. Medians are medians of paired changes, not ratios
of median means.

Console/build/test logs preserve their generated whitespace, with session-path
redaction only. The artifact whitespace exemption is scoped to F128 logs;
production and test source checks are not exempted.

| Case | Round 1 / 2 / 3 time change | Median paired change | B/op, unchanged in every pair |
|---|---:|---:|---:|
| Typed_Dictionary | -4.66 / -1.80 / +1.84% | -1.80% | 128 |
| Typed_Dynamic | +3.04 / +6.47 / -4.60% | +3.04% | 208 |
| Typed_Status101_NoCallback | -4.11 / -3.64 / -2.59% | -3.64% | 128 |
| Typed_Callback_Status200 | -3.02 / +2.43 / -10.25% | -3.02% | 288 |
| Upgrade_OwinOptions | -2.71 / +10.63 / -2.14% | -2.14% | 2,064 |
| Pipeline_NoUpgrade | +1.52 / -5.14 / -0.54% | -0.54% | 1,344 |
| Pipeline_Upgrade | +2.00 / +1.99 / -0.52% | +1.99% | 3,232 |
| Feature_NotRequest, control | +4.96 / -3.25 / +3.26% | +3.26% | 24 |
| Missing, control | +5.89 / +5.47 / +5.38% | +5.47% | 24 |
| StandardAccept, control | -10.46 / -4.29 / +5.13% | -4.29% | 24 |
| WrongObject, control | -4.86 / -7.69 / +5.55% | -4.86% | 24 |

Only one affected case improves in every pair. Both default-`UseOwin` cases
and the real upgrade path are mixed; the dynamic environment's median is
higher. The missing-entry control is higher in every pair even though it
does not reach the changed cast. These observations are retained without a
causal, compiler/JIT or harmless-noise explanation. No allocation reduction,
universal speedup or production-throughput benefit is claimed.

[All paired means and allocations](comparison.md),
[machine-readable pairs](comparison.json) and
[complete case outcomes](raw-case-outcomes.json) accompany the unmodified
JSON/CSV/Markdown exporters for all six launches. BDN-truncated labels are
expanded from actual full identities, not guessed.

## What was evaluated

Two existing production lines change: capture `WebSocketAcceptAlt` in the
existing type pattern, then pass the captured value rather than cast the
already-tested object. The explanatory `object accept` local, aliases, async
flow, branches and all other production statements remain unchanged.
The branch also adds 15 compatibility rows, including one real default
`UseOwin` pipeline case. No other optimization, public signature, default,
convention, cache, dependency or framework assembly boundary changes.

The card's textual type-test/cast pattern is not proof of redundant native
work. An untimed probe reads the **actual adapter async `MoveNext`**:
original 881 IL bytes / 290 instructions / one `castclass`, versus changed
890 bytes / 291 instructions / no `castclass`; both contain two `isinst`.
[Raw IL and correctly decoded instructions](managed-lowering.json) are
retained. This establishes managed lowering only, not JIT/native equivalence
or an explanation of the timing differences.

## Actual producer and observable boundary

`OwinEnvironment`'s real `IHttpWebSocketFeature` map produces the exact alternate
delegate for a WebSocket request. The harness uses that producer, including
absent/nonrequest features, real dynamic environments and materialized copies.
It invokes complete `AdaptWebSockets` requests or the actual
`ApplicationBuilder.UseOwin` default pipeline, not an extracted cast loop.

Full-upgrade cases use a private feature implementation to create a real
`ManagedWebSocket` over an in-memory stream. The actual adapter accepts it,
invokes the real OWIN socket callback, sends a binary frame and performs normal
cleanup. A real peer decodes the frame outside timing. Exact context identity,
subprotocol, socket/token/version, status and abort state are checked.
Owned socket and transport disposal are included in full-upgrade timing.

All 11 complete setup receipts agree between variants. Verification counters,
peer decoding and output assertions run only during setup/preflight.
The timed feature is not Moq and retains only the current socket/transport;
there is no growing mock invocation history.
This faithful managed boundary **does not test hosted HTTP upgrade or network
negotiation**.

## Requirement coverage

The same added compatibility tests run with original and experimental
production source. Both complete owning suites pass **34/34, zero skipped**;
all 15 new rows are individually accounted for in the real TRX reports.
These are compatibility checks, not a functional bug-fix red/green claim.

| Requirement | Evidence |
|---|---|
| Missing/null/wrong/standard delegate guards, original environment/status | `AdaptWebSockets_PreservesNonAlternateEntries`, all four rows |
| Actual feature-map producer, request/nonrequest paths and no accidental accept | `AdaptWebSockets_PreservesNonUpgradeWithActualProducer`, both rows |
| Real incomplete downstream task is awaited | `AdaptWebSockets_AwaitsNextWithActualProducer` |
| Synchronous/faulted downstream exception identity | `AdaptWebSockets_PreservesNextExceptionIdentity`, both rows |
| Null/OWIN/native options, context/subprotocol/token, callback, real peer frame and normal cleanup | `AdaptWebSockets_PreservesUpgradeContextFramesAndCleanup`, all three rows |
| Actual accept exception identity and no callback | `AdaptWebSockets_PreservesAcceptExceptionIdentity` |
| Actual callback exception identity | `AdaptWebSockets_PreservesCallbackExceptionIdentity` |
| Default `UseOwin` registration and actual protocol frame/cleanup | `UseOwin_PreservesDefaultWebSocketAdaptationAndFrames` |
| Status-101/no-callback and callback/status-200 gates, complete timed setups | All 11 original/changed receipts in `setup-correctness.json` |

## Exact successful commands

Every direct .NET command ran from the checkout after `. .\activate.ps1`.
Original and experimental harness builds both passed with zero warnings/errors:

```powershell
dotnet build "$RunRoot\harness\AutoPerf.Benchmarks.csproj" -c Release `
  -o "$RunRoot\build\before" -m:2 -p:AspNetCoreRoot=C:\src\aspnetcore `
  -p:UseIisNativeAssets=false -p:BuildNodeJS=false --verbosity quiet

dotnet build "$RunRoot\harness\AutoPerf.Benchmarks.csproj" -c Release `
  -o "$RunRoot\build\after" -m:2 -p:AspNetCoreRoot=C:\src\aspnetcore `
  -p:UseIisNativeAssets=false -p:BuildNodeJS=false --verbosity quiet
```

Both variants passed all 11 complete producer/frame/lifetime preflights;
both raw managed-lowering probes exited successfully:

```powershell
dotnet "$RunRoot\build\before\AutoPerf.Benchmarks.dll" --verify-setups
dotnet "$RunRoot\build\after\AutoPerf.Benchmarks.dll" --verify-setups
dotnet "$RunRoot\build\before\AutoPerf.Benchmarks.dll" --verify-lowering
dotnet "$RunRoot\build\after\AutoPerf.Benchmarks.dll" --verify-lowering
```

Both complete suites passed 34/34, including all 15 added rows:

```powershell
dotnet test src\Http\Owin\test\Microsoft.AspNetCore.Owin.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --no-restore --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-before" --verbosity quiet

dotnet test src\Http\Owin\test\Microsoft.AspNetCore.Owin.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --no-restore --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-after" --verbosity quiet
```

Exact changed-file whitespace and staged `git diff --check` passed,
without baseline exceptions or formatting edits:

```powershell
dotnet format whitespace . --folder --verify-no-changes `
  --include .\src\Http\Owin\src\WebSockets\WebSocketAcceptAdapter.cs `
    .\src\Http\Owin\test\OwinExtensionTests.cs `
    .\src\Http\Owin\test\WebSocketAcceptAdapterTests.cs `
  --report "$RunRoot\formatting-final" -v quiet
git diff --cached --check
```

All six measured launches passed all 11 cases with at least eight measurements,
in original/changed, changed/original, original/changed order:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" `
  --filter '*WebSocketAcceptAdapterBenchmark*' --inProcess --exporters json csv `
  --artifacts "$Artifacts" --job Short --warmupCount 3 --iterationCount 8 `
  --iterationTime 100 --outliers DontRemove
```

## Reproducibility and limits

[Standalone benchmark project](harness/AutoPerf.Benchmarks.csproj) references
the real source projects through `AspNetCoreRoot`. Build the baseline and
experiment separately, freeze each complete output, reuse the exact harness
DLL/PDB/configuration, and run serially.
Only `Microsoft.AspNetCore.Owin.dll` differs in the recursively checked
DLL/configuration closure. Every measured launch records the actual owner
location/MVID. Dirty-source capture manifests remain distinct from the final
experimental source commit; they were not rewritten.
See [hashes](assembly-hashes.json), [actual loads](assembly-loads.json),
[test outcomes](correctness.json) and [provenance](provenance.json).

SDK `12.0.100-alpha.1.26557.102`, .NET 12 alpha, BenchmarkDotNet `0.13.0`,
in-process/server GC on a shared Windows host. No machine settings changed;
IIS native assets and Node rebuilding were disabled.
Hosted HTTP/network negotiation, production throughput, other
runtimes/architectures, concurrent pressure and composition with other branches
are unverified. The three-comparison budget is closed.
