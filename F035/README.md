# F035 - ValueProviderResult enumeration: no convincing gain

**No-gain. Original shipping source/product restored; no optimization commit or performance PR.**
The compatible one-expression cast does not establish a worthwhile real collection-binding
gain. The declared one-value binding primary is **2.89% slower / 1.85% faster / 18.07% slower**
across three complete alternating pairs, with **1456 B/op unchanged**. Prepared 8/64-value
enumeration regresses in every pair. Small favorable query-producer/scaling cases are
retained, not promoted over adverse target/control evidence.

Three comparison slots are permanently closed: original->candidate, candidate->original,
original->candidate. Six timed native members, 20 profiles each, eight retained results
per profile: **120 rows / 960 samples**. No fourth comparison.

## What was actually proposed

The public readonly struct ships `IEnumerator<string> GetEnumerator()`. Replacing the return
type with `StringValues.Enumerator` would break already-compiled callers; a same-name C#
overload cannot differ solely by return type. Existing `result.Values.GetEnumerator()` is
already the concrete opt-in path. No new API, baseline change, IVT or UnsafeAccessor.

The only tested shipping delta was:

```diff
 public IEnumerator<string> GetEnumerator()
 {
-    return ((IEnumerable<string>)Values).GetEnumerator();
+    return (IEnumerator<string>)Values.GetEnumerator();
 }
```

**Compatibility:** Kept `IEnumerator<string> ValueProviderResult.GetEnumerator()` unchanged
because already-compiled consumers bind to that exact return signature and would throw
`MissingMethodException` if it changed. Tested only an internal conversion, then withdrew
it when the measurements did not justify it. Both shipped and unshipped API baselines
remain unchanged.

Actual owner IL removes the input `StringValues` interface box but still returns a boxed
`StringValues.Enumerator`. Actual pinned StringValues interface/direct IL is retained.
The real compiled `CollectionModelBinder<string>.BindSimpleCollection` uses runtime
`Async` IL and calls the shipped enumerator. Reflection reads metadata only; no private
member invocation, synthetic binder or generated-state-machine surrogate.

Nominal IL boxing is not proof of native allocation. Prepared concrete and query-producer
cases already report 0 B/op; preboxed generic cases report 40 B/op in both variants.
There is no structural allocation-saving or native JIT-causation claim.

## Complete paired results

Positive percentages favor the candidate. Ns are operation means, not request throughput.
Count64 is synthetic scaling, not assumed production prevalence.

| Profile | Round1 original->candidate ns | Less time % | Round2 original->candidate ns | Less time % | Round3 original->candidate ns | Less time % | B/op original->candidate rounds1/2/3 |
|---|---:|---:|---:|---:|---:|---:|---|
| CollectionBinding:0 | 215.297->206.142 | 4.25 | 186.187->191.386 | -2.79 | 184.897->196.867 | -6.47 | 656->656 / 656->656 / 656->656 |
| CollectionBinding:1 | 564.955->581.274 | -2.89 | 574.982->564.324 | 1.85 | 552.679->652.570 | -18.07 | 1456->1456 / 1456->1456 / 1456->1456 |
| CollectionBinding:64 | 10174.831->10178.114 | -0.03 | 10321.089->10226.411 | 0.92 | 10537.496->9995.002 | 5.15 | 13393->13393 / 13392->13393 / 13392->13392 |
| CollectionBinding:8 | 1681.817->1860.698 | -10.64 | 1689.594->1716.416 | -1.59 | 1677.375->1726.295 | -2.92 | 2792->2792 / 2792->2792 / 2792->2792 |
| PreparedConcrete:0 | 0.722->0.731 | -1.18 | 0.750->0.746 | 0.61 | 0.718->0.719 | -0.11 | 0->0 / 0->0 / 0->0 |
| PreparedConcrete:1 | 2.667->2.687 | -0.75 | 2.746->2.673 | 2.66 | 2.695->2.645 | 1.85 | 0->0 / 0->0 / 0->0 |
| PreparedConcrete:64 | 95.069->120.636 | -26.89 | 94.939->119.923 | -26.32 | 95.511->120.141 | -25.79 | 0->0 / 0->0 / 0->0 |
| PreparedConcrete:8 | 13.704->17.542 | -28.01 | 13.605->17.516 | -28.74 | 12.776->17.375 | -36.00 | 0->0 / 0->0 / 0->0 |
| PreparedPreboxedGeneric:0 | 11.337->10.488 | 7.49 | 10.727->10.892 | -1.54 | 10.416->11.367 | -9.12 | 40->40 / 40->40 / 40->40 |
| PreparedPreboxedGeneric:1 | 17.663->15.684 | 11.21 | 16.360->15.845 | 3.15 | 16.395->18.066 | -10.19 | 40->40 / 40->40 / 40->40 |
| PreparedPreboxedGeneric:64 | 411.363->444.353 | -8.02 | 392.467->424.698 | -8.21 | 397.152->390.544 | 1.66 | 40->40 / 40->40 / 40->40 |
| PreparedPreboxedGeneric:8 | 61.310->66.282 | -8.11 | 58.300->61.163 | -4.91 | 58.104->59.426 | -2.28 | 40->40 / 40->40 / 40->40 |
| QueryProducer:0 | 6.122->6.146 | -0.39 | 6.363->6.185 | 2.79 | 6.159->6.131 | 0.45 | 0->0 / 0->0 / 0->0 |
| QueryProducer:1 | 17.019->16.836 | 1.07 | 16.483->16.862 | -2.30 | 16.976->16.433 | 3.20 | 0->0 / 0->0 / 0->0 |
| QueryProducer:64 | 143.968->140.237 | 2.59 | 150.592->145.997 | 3.05 | 135.066->132.121 | 2.18 | 0->0 / 0->0 / 0->0 |
| QueryProducer:8 | 33.861->33.386 | 1.40 | 34.043->32.968 | 3.16 | 32.693->32.146 | 1.67 | 0->0 / 0->0 / 0->0 |
| UnchangedValuesControl:0 | 0.641->0.712 | -11.10 | 0.768->0.771 | -0.35 | 0.724->0.640 | 11.63 | 0->0 / 0->0 / 0->0 |
| UnchangedValuesControl:1 | 1.904->3.029 | -59.05 | 3.107->3.036 | 2.28 | 3.036->1.889 | 37.78 | 0->0 / 0->0 / 0->0 |
| UnchangedValuesControl:64 | 145.474->133.725 | 8.08 | 132.612->131.428 | 0.89 | 134.071->141.506 | -5.55 | 0->0 / 0->0 / 0->0 |
| UnchangedValuesControl:8 | 19.984->18.064 | 9.61 | 18.045->17.668 | 2.09 | 17.910->19.920 | -11.22 | 0->0 / 0->0 / 0->0 |

All allocations match except round2 Count64 collection binding reports
13392->13393 B/op. This residual is retained, not an allocation improvement.
Unchanged direct-Values controls move materially, especially the subnanosecond Count1
case (-59.05/+2.28/+37.78% less time). Maximum within-row CV is 15.09%.

## Real owners and boundaries

Five methods x Counts0/1/8/64:

- `PreparedConcrete`: foreach the real prepared ValueProviderResult.
- `PreparedPreboxedGeneric`: generic interface receiver is boxed in setup, not per operation.
- `UnchangedValuesControl`: direct StringValues enumeration; never calls the changed method.
- `QueryProducer`: real provider `GetValue("items")` plus complete enumeration.
- `CollectionBinding`: actual CollectionModelBinder/SimpleTypeModelBinder with fresh
  action/model-state/binding contexts and complete model/score/error checks.

The real DefaultHttpContext request query is parsed by the actual query machinery;
QueryStringValueProviderFactory creates the actual invariant-culture provider in setup.
Metadata, binder construction and request query parsing/factory are outside timing.
Binding includes fresh contexts and full output consumption, not just MoveNext.
Count0 has an unrelated query key, produces ValueProviderResult.None and bypasses the
changed method in collection binding: it is explicitly a control.

This is an in-memory owner/producer/consumer boundary. No hosted server/listener, network,
application frequency, application throughput, end-to-end HTTP gain or method coverage claim.

## Correctness, identity and reproduction

Original and candidate each pass **34/34 exact existing owning rows, zero skipped**:
29 ValueProviderResult rows plus five real collection-binding rows. Both Boolean theory
values execute for each selected two-row Core method. Equality theory display names can
coincide; row multisets and unique execution IDs are checked, not unique display names.

Original, candidate and an independently copied/rebuilt relocated original each pass
**61 matching concrete records = 41 cursor/query/binder observations + 20 actual benchmark
setup/workload/cleanup lifecycle observations**. Not 61 additional E2E cases.

Ten data shapes cover default/None/null/empty/single/array/mixed-null/custom culture;
public/generic/nongeneric cursor type, complete values/order, Current before/after,
repeated exhaustion, Reset success/error and post-reset move, Dispose and post-dispose
behavior are retained. Independent cursors observe live backing-array mutation.
Real query/binding cases cover uppercase/missing/empty keys, escaped/UTF8/empty strings,
counts0/1/8/64, complete culture/model-state and invalid integer binding [7,"bad",9]
producing [7,9] with exactly one error.

Measured **304-file** consumers differ only in actual tested MVC.Abstractions DLL/PDB.
**302 unchanged files includes the two identical harness DLL/PDB, leaving 300 other files.**
Core, StringValues and other dependencies are unchanged. Both owner-only forced
`--no-incremental` rebuilds byte-match the earlier tested source/DLL/PDB.
Original product/test-bin bytes are restored; that copying is not a new test execution.

All six harness source/project files are byte-exact in an independently rebuilt relocated
original. It passes all 61 observations without timing. Path-dependent rebuilt PE/PDB bytes
need not match the measured harness.

Live physical audit rehashes **1216 frozen consumer files**, 834 loaded-assembly binding
observations and **1318 unique files**. Nine recorded successful native processes are
observed absent (or separately identified as reused IDs). The first failed untimed metadata
process has no captured runtime PID; its negative native exit is retained, not fabricated.
All application resources in the harness are in-memory.

Each native process records ten selected PE/PDB/source document associations: 100 across
nine successful plus one failed metadata profile. These are selected associations, not
complete compiler provenance. Portable audit rehashes copied text/receipts, not omitted
binary bytes; live rehash evidence is separate.

## Failures and limitations retained

Initial standalone preparation fails one ModelBindingContext return-type assumption,
with 2 warnings/1 error. The correct base return type and explicit nullable model-state
entry guards fix preparation; all subsequent standalone builds have 0 warnings/0 errors.

First untimed native characterization fails an assumed generated async-state-machine
name. Actual Core metadata proves runtime Async methods with no such nested state machine.
Corrected actual-method inspection and original characterization pass before shipping
edit or timing. Failed image, partial witnesses and native exit -532462766 remain.
Two later PowerShell/presentation/patch-generation probes initially fail and are corrected;
they are not extra comparison slots or successful initial probes. The publication authoring
checker also initially fails PowerShell hash-table-expression parsing; the expression is
parenthesized before the successful authoring check and packaging. Its separate correction
receipt is retained.

Baseline and historical owner build HEAD: `37e809ead5824bc753a1c3d56f11615bdb1296c5`;
candidate measured as one uncommitted expression on that baseline. Captured default
`f2484a6bf688bd1acb1af13802255c2c23a071dd` matches 12 selected files, with the string
binder checked separately. Fresh publication default `f2484a6bf688bd1acb1af13802255c2c23a071dd` matches all
13 selected owner/API/test/producer/consumer sources. Not full current-default integration.
Bounded history/existing-work/LSP checks are not complete graph coverage.

Shared Hyper-V Windows VM, **not dedicated, sandboxed or isolated**. No priority/affinity,
power-plan or OS/network-policy modifications. All 240 before/after timing settings
observations match Normal priority/thread policy. BDN0.13.0 uses the exact settings-preserving
emitter, 3 warmups/8 results, 100ms, unroll1, DontRemove and Guid.Empty power plan.
Pinned SDK12.0.100-alpha.1.26557.102/runtime12.0.0-alpha.1.26562.105, net12/C#13,
ServerGC/RollForward Disable. These results do not establish another runtime/architecture.

## Runnable sources and audit

[`harness`](harness) contains the actual BenchmarkDotNet project and five C# files.
It references real prebuilt MVC.Abstractions/Core and Core.Test-bin dependencies, not
installed MVC replacements. Set `AUTOPERF_ASPNETCORE_ROOT` to a matching fresh source
checkout, follow [BuildFromSource-captured.md](BuildFromSource-captured.md), and build
the owning/test dependencies before the standalone project. The exact preview runtime
must be available; activate the repository environment before every dotnet command.

[`validation-commands.md`](validation-commands.md) lists exact historical commands with
actual exit codes, including failed preparation. `F035-prepare.ps1` demonstrates closure/
source freezing; `F035-run-profile.ps1` demonstrates explicit characterize/measure launch
arguments. Historical drivers are guarded one-shot campaign tools: adapt fresh paths and
directories; **do not overwrite historical evidence or reopen the closed timing budget**.

Read-only copied textual audit, requiring Node and no build/runtime binaries:

```powershell
node .\F035-audit.mjs . --verify
```

`decision.json`, `statistics-audit.json`, `comparison-results.md`, raw TRXs/stdout/JSON,
`source-publication`, original/candidate/relocated frozen sources, failed preparations,
closure/source-PDB/runtime/settings evidence and hashed binary omissions are retained.
No performance PR or browser launch for an unjustified no-gain change.
