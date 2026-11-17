**Fork-only qualified CPU-tradeoff experiment, not merge-ready.** An existing
64-value exact Ordinal/default HashSet with a late matching claim takes
**77.5-81.7% less time** in all three comparisons. **Small/default/no-value/early
controls regress by up to 13.69%, and every allocation measurement is unchanged.**
The noneligible ignore-case fallback also speeds up substantially; that is not
direct-set fast-path evidence. No aggregate/default-app/production-frequency
benefit or causal JIT explanation is established.

The private helper accepts only exact BCL `HashSet<string>` and comparer
references exactly `StringComparer.Ordinal` or `EqualityComparer<string>.Default`.
Derived sets, custom/ignore-case comparers and all other enumerables retain the
existing explicit-Ordinal LINQ operation. No input conversion/cache/new field,
constructor/public API/default/dependency/TFM/visibility change.

Source: `@SOURCE_COMMIT@`, independent parent
`37e809ead5824bc753a1c3d56f11615bdb1296c5`; **2 files, +72/-1**, including
3 focused permanent methods / 5 actual rows. Owners were built from baseline
plus that exact source patch before the source commit; no build is relabeled.
The complete owner and 20 other selected source/project/test/benchmark files
match captured upstream default `49147673007a4b1d676694e2c5f85b83ad76c36f`
canonically, not a whole-current-default dependency/SDK integration claim.
This is a different seam from David Fowler's merged dotnet/aspnetcore#70221;
none of its measurements are reused.

### Complete measured results

@RESULT_TABLE@

Change is candidate/original mean minus 1; negative is less time. Six completed
profiles / 66 reports, 528 raw actuals / 491 retained / 37 upper-filtered /
198 warmups / 1120 actual overhead iterations. Three permanently closed slots:
original/candidate, candidate/original, original/candidate; no source tuning.
One exact compiled harness DLL/PDB, every nonowner byte identical in all
three paired consumer images. All favorable/adverse/raw results remain.

Actual AddAuthorizationCore/RequireClaim/IAuthorizationService pipeline and
registered requirement dispatch; no copied matcher or injected resolved
callback. Timed body returns the real Task, not per-call assertions/observers.
Warm repeated service/policy/principal/collection; DI/input construction
excluded. Existing eager failed-requirement/ToString formatting stays included.
Not HTTP/new request/scope or legacy throughput. Shared Windows VM,
settings-preserving BDN0.13, observed Normal process/thread settings /
affinity65535, no deliberate host settings/process changes; not load isolation.
Maximum original/candidate profile CV 4.30%/5.20%. Allocation is whole-service,
process-wide net12 B/op, not isolated set allocation.

### Requirement coverage

- Ordinal ignore-case-set fallback:
  `Authorize_RequireClaim_UsesOrdinalHashSetValueComparison`, both quoted rows.
- Default/Ordinal set add/remove/clear:
  `Authorize_RequireClaim_UsesLiveAllowedSet`, both comparer rows.
- Reimplemented derived enumeration:
  `Authorize_RequireClaim_UsesOverriddenAllowedValuesEnumeration`.

Original 214 passed = 212 area + 2 sentinels; candidate 219 passed =
217 area + 2 sentinels, zero failed/skipped. Every actual TRX identity, duration
and all five new rows checked. These are compatibility tests, not manufactured
functional red/green evidence; performance is the original/proposed owner
comparison. Explicit builds and real producer checks pass for net462,
netstandard2.0 and net12.0. Net462 actually hosted by Framework4.8.1/workstation
GC; netstandard2 library hosted by a net12 consumer. Each role passes39/39/50
checks; all exact timed Setup wrappers are preflighted.

All6 per-TFM API files/net12 reference DLL byte-identical; no other references
generated under existing configuration. Actual pack binlog replay proves
successful `Microsoft.DotNet.ApiCompat.Task.ValidatePackageTask` events.
Existing nonservicing disabled released-package baseline comparison stays
unchanged; no released-baseline validation claim. Scoped whitespace passes.

### Exact commands and observed results

@COMMANDS@

### Evidence and limitations

**[@FILE_COUNT@ immutable files, runnable projects, every raw outcome and audit](@EVIDENCE@/README.md).**
Successful live audit rehashes236 final /118 preserved image files and16 saved
owner/test outputs; checks192 source snapshots,26 captured PE/PDB bindings/
236 selected documents,433 TRX rows,347 producer observations including25
retained partial legacy records,88 actual Setup preflights and132 settings
records. The copied portable audit passes but cannot rehash omitted binaries,
packages or replay omitted binlogs; confidence critical values and full
source-to-BDN-DLL provenance are not independently derived.

Preserved failures: initial Metadata-reference warning/wrong deferred-counter
harness assertion (actual eager failure-formatting explains it), candidate
xUnit2017 test-build failure before a Boolean-local repair, wrong `// GC:`
reader prefix, and two read-only auditor schema/location corrections. No raw
experiment or exhausted timing budget was rewritten or rerun. Actual owning
deferred-producer exceptions are preserved, not turned into manufactured
failed results. Public collection identity/live mutation and original captured
empty-list behavior remain intact.
