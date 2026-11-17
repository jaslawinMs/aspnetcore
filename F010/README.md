# F010: existing allowed-value set membership

**Qualified CPU-tradeoff draft, not merge-ready or a default-application win.**
Late matches over caller-owned 64-value known-comparer sets take **77.5-81.7%
less time** in all three comparisons. **Small/default/no-value/early controls
regress, by up to 13.69%; no allocation reduction occurs in any case.**
The noneligible ignore-case fallback also speeds up substantially. That is not
evidence that it reached direct set lookup, nor proof of a universal speedup.

The source branch is `autoperf/F010-claims-allowed-values-membership` in
`jaslawinMs/aspnetcore`. The exact source commit, actual remote source hashes and
build-before-commit distinction are in [source-branch-publication.json](source-branch-publication.json).
The final draft/issue/browser request and campaign receipt are in the additive
[publication.json](publication.json), once published.

## What changed, and what did not

The existing claim-type predicate still uses `OrdinalIgnoreCase`. Only its private
value-membership seam changes: use `HashSet<string>.Contains` for an **exact BCL
HashSet**, with comparer reference exactly `StringComparer.Ordinal` or
`EqualityComparer<string>.Default`. Derived sets can reimplement enumeration;
custom/ignore-case comparers can have different equality or observable calls.
Those cases, arrays, lists, readonly wrappers and deferred inputs retain the
original explicit-Ordinal LINQ operation.

No set conversion, copied values, startup index, cache, new field, constructor,
public API, default, dependency, TFM or visibility change. The caller already
owns the set. Public `AllowedValues` identity, live mutations and the constructor's
captured empty-values flag remain intact. New permanent coverage is 3 methods /
5 rows in the established service test class; the shipping diff is 2 files,
72 added lines and 1 removed line.

Independent baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Captured upstream default: `49147673007a4b1d676694e2c5f85b83ad76c36f`.
Nineteen initial source/project/test/benchmark files, including the complete
owner, are canonically equal; two further owning-logging/Metadata-project
sources were compared before implementation. Their immutable Git blobs were
materialized after measurement without changing history or code.
This is **21 selected files, not whole current-default SDK/dependency integration**.

David Fowler's merged **dotnet/aspnetcore#70221** specializes principal/identity/
claim enumeration but leaves the explicit-Ordinal allowed-values predicate
unchanged. This is a separate seam. Its benchmark informs the actual public
service boundary, **not our measurements or attribution**.

## Real producer and measured boundary

The fixture calls actual `ServiceCollection.AddLogging/AddAuthorizationCore`,
builds the real default service and `AuthorizationPolicyBuilder.RequireClaim`
policy, and invokes actual `IAuthorizationService.AuthorizeAsync`. Requirement
dispatch uses the registered `PassThroughAuthorizationHandler`, not a copied
matcher or injected success callback. Timed code returns the real
`Task<AuthorizationResult>` without per-call assertions or telemetry observers.
DI, policy, claim and allowed-collection construction are excluded.

This is repeated warm service/policy/principal/collection use, **not HTTP,
network, new request/scope, application frequency or legacy throughput**.
Failure measurements include the existing eager failure-formatting producer:
`DefaultAuthorizationService` -> `LoggingExtensions.UserAuthorizationFailed` ->
`string.Join(FailedRequirements)` -> requirement `ToString()` ->
`string.Join(AllowedValues)`, even without a logging provider.

All shapes have 14 unrelated prefix claims: name/id, 10 custom, 2 role.
`Params2`/`NoValues` have 2 permission claims; `Set1` has 1; others have 16.
Late shapes match on the last permission claim / last allowed value after
15 misses. `Ord64Early` succeeds on the first permission claim. Values are fresh
strings, not interned identity shortcuts. `Ignore64`'s native ignore-case set
lookup succeeds for uppercase input but the required Ordinal service result
fails. It is explicitly **not eligible** for the fast path.

## All measured outcomes

Percentages below are `(candidate mean / original mean - 1) * 100`.
Negative is lower elapsed time; these are independent role samples, not paired
operations or a traffic-weighted application result. The full exports, raw and
retained samples, settings and all favorable/adverse results are preserved.

| Shape | C1 time change | C2 time change | C3 time change | Original/candidate B/op |
|---|---:|---:|---:|---:|
| Params2 | +3.35% | +1.28% | +9.54% | 456 / 456 |
| NoValues | +2.82% | +4.62% | +13.69% | 456 / 456 |
| Array64 | +4.90% | -3.38% | +1.71% | 456 / 456 |
| List64 | +3.91% | +0.20% | +2.39% | 456 / 456 |
| Set1 | +4.97% | +6.19% | +4.09% | 456 / 456 |
| Ord16Last | -47.78% | -48.38% | -40.16% | 456 / 456 |
| Ord64Last | -81.75% | -81.71% | -80.50% | 456 / 456 |
| Def64Last | -78.93% | -77.60% | -77.54% | 456 / 456 |
| Ord64Miss | -55.20% | -57.07% | -58.93% | 5896 / 5896 |
| Ord64Early | +2.98% | +9.08% | +4.96% | 456 / 456 |
| Ignore64 | -27.09% | -28.56% | -30.21% | 5896 / 5896 |

For scale, `Ord64Last` means are 2621.30/2639.55/2612.91 ns original and
478.45/482.90/509.61 ns candidate. `NoValues` means are
190.27/180.89/182.15 ns original and 195.64/189.25/207.08 ns candidate.
Small/default/no-value/early means are higher in every comparison; they are
not discarded as noise. `NoValues` bypasses value membership, so its movement
cannot all be assigned to set lookup. No JIT/disassembly investigation explains
the noneligible fallback changes.

Three slots used and permanently closed: C1 original/candidate, C2
candidate/original, C3 original/candidate. No tuning between them. Six completed
profiles, 66 successful reports, 528 raw actual samples, 491 retained results,
37 upper-filtered samples, 198 warmups and **1120 actual overhead iterations**.
One exact compiled harness DLL/PDB across roles; only owner DLL/PDB bytes differ
in all three paired consumer images. Every nonowner byte is equal.

BDN 0.13.0, Throughput, requested 100 ms, 3 warmups/8 actuals, unroll 1,
settings-preserving emitted executor, `Guid.Empty` power policy. Default upper
outlier filtering remains enabled; all eight raw samples are retained too.
Maximum observed original/candidate within-profile CV is 4.30%/5.20%.
Shared Windows VM, observed Normal process/thread priority and affinity 65535;
132 before/after settings records agree. No deliberate priority, affinity,
power or unrelated-process changes. The CIM snapshot is **before C2, after C1**,
not continuous load/isolation evidence or a C1 premeasurement snapshot.

SDK `12.0.100-alpha.1.26557.102`, pinned runtime
`12.0.0-alpha.1.26562.105`. The actual BDN DLL matches the previously attributed
GcStats source observation; on this net12 runtime allocation is **process-wide**
bytes/op for the whole measured service, not isolated owner/set allocation.
This is an allocation-accounting attribution, not newly instrumented lookup
allocation. Allocation is unchanged in every case.

## Contract and compatibility evidence

Original: 214 passed, 0 failed, 0 skipped = 212 area rows + 2 repository sentinels.
Candidate: 219 passed, 0 failed, 0 skipped = 217 area rows + 2 sentinels.
Every TRX result/definition/entry, execution identity, positive duration and
outcome, including all 5 new rows, was checked.

**Requirement coverage**

- Ordinal fallback over a divergent ignore-case set:
  `Authorize_RequireClaim_UsesOrdinalHashSetValueComparison`, both quoted
  `CanViewPage`/`canviewpage` rows.
- Live known-comparer set add/remove/clear behavior:
  `Authorize_RequireClaim_UsesLiveAllowedSet`, both default/Ordinal rows.
- Derived set's reimplemented enumeration:
  `Authorize_RequireClaim_UsesOverriddenAllowedValuesEnumeration`.

The exact successful `dotnet test` command and result for these requirements
are recorded in [validation-commands.md](validation-commands.md). They preserve
existing contracts, not a functional bug's manufactured red/green assertion.
The performance comparison is original owner versus exact proposed owner.

Fresh actual owner builds pass for **net462, netstandard2.0, net12.0**.
Original and candidate each pass 39 public-service producer observations on
the real net462 output hosted by Windows .NET Framework 4.8.1
(Release 534296 / CLR 4.0.30319.42000, workstation GC), 39 on the real
netstandard2.0 library hosted by a net12 consumer, and 50 native net12 checks,
including 11 actual timed Setup/task-wrapper preflights. No legacy performance
claim; the standard library is not presented as an executable runtime.

Checks include deferred and readonly-backed mutation, constructor empty/nonempty
flag behavior, custom comparer with deceptive `Object.Equals`, overridden
enumeration/principal/identity producers, actual deferred-producer exception,
short-circuiting, all identities, `ToString` and failed-requirement identity.
The exception record's false fields mean **no success result**; no failed
`AuthorizationResult` or failure identity is manufactured for that throw.

All 6 per-TFM public API baselines and the actual net12 reference assembly remain
byte-identical. No reference assemblies are generated for the other two targets
under existing configuration. Existing enabled package validation runs:
the actual pack binary log replay proves successful
`Microsoft.DotNet.ApiCompat.Task.ValidatePackageTask` start/finish events,
not merely string presence or an unevaluated property. Existing nonservicing
`DisablePackageBaselineValidation=true` remains unchanged; **no comparison
against a released package baseline is claimed**. Pack and scoped whitespace
verification exit 0. The existing friend test assembly was actually built/run;
no friend/accessor/public bridge was added.

## Preserved failures and read-only corrections

Preparation 1 compiled all consumers but named the Metadata reference
incorrectly, producing one MSB3245 warning per compatibility build. The real
net462 consumer completed 25 producer records, then exited -532462766 on an
incorrect harness deferred-enumeration-count assertion. Actual eager failure
formatting explains counts 2/3/4, not isolated matcher counts 1/2/2; derived
set failure/success cumulative counts are 2/3. Corrected the harness and
Metadata reference, not shipping behavior. Exact failed-era sources, images,
logs, commands and partial records remain retained; only classified text/source
and omission hashes are distributed.

Candidate preparation 1 built all three owners successfully, then its test
build failed xUnit2017 on two deliberate native-Contains precondition asserts.
Explanatory Boolean locals distinguish those checks from enumerable/comparer
semantics; no suppression or weakened assertion. Those exact unchanged owner
outputs were reused after source/DLL/PDB checks; no timing was spent.

The first read-only extractor wrongly expected `// GC:` instead of actual
`GC:` console records. Its source/exit 1 are retained; only parsing changed.
Independent-audit attempt 1 used the wrong folder for the two additional source
observations; attempt 2 expected a native-Contains field on setup-only records
that intentionally do not record it. Both failed reader sources/logs/exits are
retained; attempt 3 passes. No raw samples, experiment or budget was changed
or rerun by any of these analysis corrections.

## Audit and reproduction

[measurement-audit.json](measurement-audit.json) records the successful live
audit: 236 final image files, 118 failed-preparation image files and 16 saved
owner/test output files rehashed; 192 final/retired source snapshots;
26 captured PE/PDB bindings / 236 selected document checks; all 433 TRX rows;
347 producer observations including 25 partial legacy records; 88 real Setup
preflights; actual successful package-validation task events; all raw sample,
GC, sample-statistic, R7-quantile and confidence-bound arithmetic.
Confidence critical values and source-to-BDN DLL binding are not independently
derived. Captured PDB/source witnesses are bounded, not whole-build provenance
or method coverage.

The published portable audit checks copied bytes, captured source/PDB witnesses,
native producer/TRX records and independent numeric consistency, but **cannot
rehash omitted DLL/PDB/native/build/package images or replay omitted binlogs**.
Their exact hashes remain in manifests. It does not rerun tests or benchmarks.

```powershell
node .\F010\reproduce-analysis.mjs .\F010 --verify
```

The runnable projects are [harness](harness/AutoPerf.Benchmarks.csproj),
[shared producers](shared/ClaimSamples.cs) and
[compatibility consumers](compatibility/AutoPerf.Compatibility.csproj).
The harness is net12/C#13/BDN0.13 and accepts `AspNetCoreRoot`; the compatibility
project uses actual net462/netstandard2.0 owner outputs. Do not copy-match the
owner or replace the real service with a synthetic implementation.

For a **separate, explicitly requested replay**, use a clean checkout at the
baseline or source branch, activate that checkout's environment, build its
actual owner and the published harness. Preserve the recorded pins; dependency
restore requires the repository's configured feeds. For example:

```powershell
$repo = 'C:\src\aspnetcore'
$capsule = 'C:\results\F010'
Set-Location $repo
. .\activate.ps1
$project = Join-Path $capsule 'harness\AutoPerf.Benchmarks.csproj'
dotnet restore $project --configfile (Join-Path $repo 'NuGet.config') "-p:AspNetCoreRoot=$repo"
dotnet build $project --no-restore -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false "-p:AspNetCoreRoot=$repo"
$artifacts = Join-Path $env:TEMP ('F010-fresh-' + [guid]::NewGuid().ToString('N'))
$freshSources = Join-Path $artifacts 'sources'
New-Item (Join-Path $freshSources 'owner') -ItemType Directory -Force | Out-Null
New-Item (Join-Path $freshSources 'harness') -ItemType Directory -Force | Out-Null
Copy-Item (Join-Path $repo 'src\Security\Authorization\Core\src\*.cs') (Join-Path $freshSources 'owner')
Copy-Item (Join-Path $capsule 'harness\*.cs') (Join-Path $freshSources 'harness')
Copy-Item (Join-Path $capsule 'shared\*.cs') (Join-Path $freshSources 'harness')
$image = Join-Path $capsule 'harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll'
dotnet $image --sources $freshSources --context fresh-characterization --characterize --artifacts $artifacts
```

The last command is untimed. A fresh explicitly requested BDN replay instead
uses `--context fresh-measurement --measure --filter '*ClaimBenchmarks*'` with
another new artifact directory. **The historical campaign's 3/3 slots are
closed: these are reproduction instructions, not authority to run another
campaign comparison, overwrite evidence or relabel fresh results as historical.**
Historical guarded drivers are provenance, not commands to blindly rerun.

All exact historical commands and observed exits, including failures, are in
[validation-commands.md](validation-commands.md) and their execution records.
