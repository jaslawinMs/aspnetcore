# F041: preserve the field-registry property-bag boundary

**Rejected/design-blocked local single-probe replacement; no shipping edit,
optimized candidate or performance PR.** This is not a measured no-gain result
and does not reject every possible future independently reviewed optimization.
See the [decision](decision.json), [original finding](finding.json) and
[final publication receipt](publication.json).

The independent [fork source branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F041-field-registry-get-or-create)
remains at unchanged baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
One original-only BenchmarkDotNet diagnostic completed; **zero source
comparisons** were performed. Historical timing is permanently closed.

## Why the mechanical replacement is not a compatible local change

The actual
[RenderedFieldRegistry.GetOrCreate](source-files/src/Components/Web/src/Forms/ClientValidation/RenderedFieldRegistry.cs)
calls `EditContext.Properties.TryGetValue`, then assigns through its indexer
on a miss. However,
[EditContextProperties](source-files/src/Components/Forms/src/EditContextProperties.cs)
is a public sealed abstraction owned by **Components.Forms**, with a private,
lazily created dictionary. The registry and actual input producer belong to
**Components.Web**. The public bag exposes an indexer, TryGetValue and Remove,
not a semantic get-or-add or its concrete Dictionary.

`CollectionsMarshal` cannot operate on this bag as though it were that private
dictionary. Forcing access, adding a friend grant/UnsafeAccessor, another
registry cache, a replacement property bag, or an API just to satisfy this
local matcher is outside the preserved boundary. None is introduced.

**The original scan also needs a qualification:** a failed TryGetValue on a
genuinely empty, uninitialized bag does not hash the key at all. The real public
bag characterizations observe **zero** diagnostic-key hashes for that case and
**two** for an initialized miss followed by indexer assignment. These use a
counting key, not instrumentation of the actual registry Type key.
Registry creation happens once per EditContext; later inputs reuse it. This
is not two creation misses for every input.

## Actual producer, consumer and observable boundary

The public HtmlRenderer renders actual **EditForm -> DataAnnotationsValidator
-> InputText/InputBase.SetParametersAsync -> RenderedFieldRegistry**. Actual
ClientValidationData then supplies the produced field map to the registered
public ClientValidationProvider observer, whose carrier appears in the emitted
HTML. No direct nonpublic registry call or injected field-map callback replaces
that producer.

The [seven-file project](harness/AutoPerf.Benchmarks.csproj) checks real field
names/values, model-reference associations, complete per-form registration,
same-context registry reuse, unrelated application-property identity and
cross-form isolation. Every render uses fresh input component instances.
Warm means reusing an EditContext and its previously populated registry, not
reusing an InputBase instance.

Every measured profile prepopulates an unrelated application property and
renders DataAnnotationsValidator. Thus its first registry miss uses an
**already initialized** property bag; the separate empty-bag characterization
must not be conflated with this workload.

| Requirement | Exact original and relocated characterization |
|---|---|
| Empty/initialized public-bag probe behavior | `EmptyPropertyBag_MissDoesNotHashKey`; `InitializedPropertyBag_MissThenSetHashesTwice` |
| Real cold field registration | `StaticSsrFields_Cold_1`, `StaticSsrFields_Cold_8`, `StaticSsrFields_Cold_64` |
| New input instances reuse the same form registry | `StaticSsrFields_Warm_1`, `StaticSsrFields_Warm_8`, `StaticSsrFields_Warm_64` |
| Different forms preserve independent fields/properties | `SeparateForms_PreserveFieldAndPropertyIsolation` |
| Empty form does not fabricate inputs or invoke the field consumer | `NoInputs_DoesNotInvokeFieldConsumer` |

All **10 characterizations and 6 untimed setup/workload/cleanup profiles pass**
in both the original and a separately built, byte-exact relocated project.
The [complete observations and HTML](native-characterize-001/evidence/0005-characterization.json)
and [relocated observations](reproduction-original-001/Characterize/evidence/0005-characterization.json)
are identical. Existing [InputBase tests](validation/InputBaseTests-original-001/results/results.trx)
pass **21/21, zero skipped**, with every actual XML execution identity checked.
These are unchanged-source observations, not a bug-fix red/green claim.

## Original-only measurements: all six profiles

**Both Cold and Warm run the same original framework code. They are not
before/after source variants.** Timing includes actual HtmlRenderer
construction/disposal, form/input rendering, registration, observer callback
and consumed HTML. Cold also creates the EditContext and application-property
entry. The service provider and prepared bindings are created outside timing.
The public observer emits diagnostic HTML instead of generating a real
client-side validation-rule payload.

| Input fields | Registry state | Mean us/op | Sample SD us | CV% | Managed B/op | Retained N |
|---|---|---:|---:|---:|---:|---:|
| 1 | Cold | 41.205 | 8.264 | 20.06 | 11,514 | 8 |
| 1 | Warm | 7.663 | 0.417 | 5.44 | 10,688 | 8 |
| 8 | Cold | 23.947 | 0.391 | 1.63 | 33,985 | 8 |
| 8 | Warm | 23.974 | 1.091 | 4.55 | 32,361 | 8 |
| 64 | Cold | 160.856 | 7.026 | 4.37 | 227,280 | 8 |
| 64 | Warm | 158.874 | 13.046 | 8.21 | 221,017 | 8 |

**Cold/1 is noisier and slower than Cold/8.** All eight results remain; no
causal explanation or replacement run is invented. The Warm/8 and Warm/64
outliers also remain under DontRemove. Do not rank source variants, subtract
these rows to claim isolated lookup cost, or present a cold/warm difference
as an optimization percentage.

The [full BDN JSON](native-measure-001/reports/results/AutoPerf.FieldRegistryBenchmarks-report-full.json),
[native stdout](native-measure-001/stdout.txt), [independent arithmetic](audit-original-only.json)
and [actual command](native-measure-001/command.json) retain all **48 observations**.
The audit matches console/JSON result totals and operations, verifies overhead
correction, recomputes mean/sample SD/variance/SE/median/min/max, and checks
console GC allocation arithmetic with BDN's actual midpoint-to-even rounding.
It does not independently trace allocations or reproduce historical execution.

## Source scope, binary identities and reproducibility

Captured current default `c5baf473f31fa3bbe9f8201e3411361c632f3a91` has identical
complete content for **12 of 13 selected files**. InputBase differs in later
parameter-update parsing recovery. Its **complete first-initialization branch**
matches the tested baseline; every diagnostic render constructs fresh inputs.
The [whole scoped diff](baseline-to-current-default-scoped.diff),
[newer producer](current-default-InputBase.cs), selected snapshots and history
are retained. **No current-default build, parsing-recovery validation or full
toolchain/dependency equivalence is claimed.** Bounded exact-name issue/PR
searches returned no matches; that is not an exhaustive duplicate proof.

The original and relocated consumers each contain **131 hashed files**.
Only the independently rebuilt harness DLL/PDB differ; the real Forms/Web
owner DLL/PDBs and other dependency bytes are identical. The
[relocation receipt](reproduction-original-001/verified-reproduction.json)
records a successful restore/build, **zero warnings/errors**, all characterizations,
and **zero additional timing samples**.

The [combined live audit](audit-live-004.stdout.json) rehashes **354 unique
physical files and 248 loaded-assembly bindings**, including both consumers and
the preserved source/four unrelated reports. Runtime harness checks bind
**8 selected source documents per image check** to owning portable PDBs.
These are selected associations, not complete compiler provenance. The Node
audit binds the recorded source/owner/PDB hashes; it does not independently
decode PDB metadata.

Preparation records retain a PowerShell object-selector quoting failure and
the initial strict InputBase parity stop, both before execution. Separate
[read-only audit observations](audit-observations.json) retain a missing Python
alias and an incorrect integer-truncation assumption. Existing Node/PowerShell
tools replace the missing interpreter; no software is installed. The pinned
[BDN 0.13.0 source](BenchmarkDotNet-0.13.0-GcStats.cs) and
[MIT license](BenchmarkDotNet-0.13.0-LICENSE.md) establish the corrected
allocation-rounding rule. No measurement or measured harness is modified.

## Commands, execution policy and excluded claims

See [every command and result](validation-commands.md). Portable copied-evidence
checks do not launch .NET, tests or benchmarks:

```powershell
node .\F041-verify.mjs .
.\F041-audit-trx.ps1 -Directory . -Verify
```

The first checks copied identities, recorded executions and all raw arithmetic;
the second independently reparses the actual TRX XML. Compiled DLL/PDB/restore
outputs are intentionally not shipped; [their exact identities](omitted-file-manifest.json)
cannot be physically rehashed by the portable audit.

The runnable C#13/net12 project is `harness\AutoPerf.Benchmarks.csproj`.
Set `AUTOPERF_ASPNETCORE_ROOT` to a matching source checkout, activate its local
SDK and build the actual Components.Web.Tests Release dependency directory
first. Do not substitute installed ASP.NET owners. Fresh executions require
fresh source/consumer identity stamps and empty output directories; historical
guarded drivers must not be reset or used to retime this closed campaign case.

SDK **12.0.100-alpha.1.26557.102**, runtime **12.0.0-alpha.1.26562.105**,
Release/x64, concurrent server GC, BDN **0.13.0**, requested 100 ms iterations,
3 warmups/8 results, unroll 1, MemoryDiagnoser, DontRemove. This is a shared
Windows Hyper-V VM, not a dedicated/isolated host. Read-only hardware reports
16 logical processors and a virtual-machine model; BDN's own unknown hardware
fields are retained rather than retroactively filled.

Heavy work is serialized with at most 2 build workers. The custom emitted
executor records unchanged Normal process/thread priority and affinity 65535
before/after every timed profile; its PowerPlanMode is Guid.Empty. No priority,
affinity, power or unrelated-process changes are made.

No browser/client-side validation execution, endpoint transport, postback,
application latency/throughput, production frequency, other render modes,
Mono/AOT, isolated Type-key probe timing, public API proposal, or shipped fix
is claimed. No protected dependency manifest is changed.
