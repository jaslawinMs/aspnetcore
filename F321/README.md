# F321: stop constructing unused wildcard request metadata

**Draft [jaslawinMs/aspnetcore#43](https://github.com/jaslawinMs/aspnetcore/pull/43)**;
originating issue [jaslawinMs/aspnetcore#42](https://github.com/jaslawinMs/aspnetcore/issues/42).

**Measured cold-setup proposal, with a verified discovery bug fix.** The two
complete wildcard body helpers are consistently 68.56-69.43% faster and save
40 B/op. Full wildcard `ParseRoute` saves 40 B/op; ordinary wildcard timing is
lower in every pair, but renamed-argument timing is mixed. Full startup results
do **not** support a startup speedup claim.

Source: [3d80f88c604e23728673c5b51547e1af56edac88](https://github.com/jaslawinMs/aspnetcore/commit/3d80f88c604e23728673c5b51547e1af56edac88),
on independent branch `autoperf/F321-grpc-request-parameter`, based on freshly
fetched main
[37e809ead5824bc753a1c3d56f11615bdb1296c5](https://github.com/dotnet/aspnetcore/commit/37e809ead5824bc753a1c3d56f11615bdb1296c5).
F320's named-body property lookup remains unchanged. No earlier cache, formatter,
or converter proposal is included.

## Actual owner and why deletion beats a cache

The informational retained finding describes endpoint-setup reflection:
`ResolveBodyDescriptor("*", ...)` rediscovered the service method by name,
allocated its parameter array, selected a parameter named `request`, and stored
the resulting `ParameterInfo`.

The live binder copies only protobuf message/field/repetition metadata into
`CallHandlerDescriptorInfo`. It does not retain or read this `ParameterInfo`.
The former Swagger consumer was removed in
[dotnet/aspnetcore#67919](https://github.com/dotnet/aspnetcore/pull/67919),
commit `39e1ac975cf138c56fff984dd824ab651a448367`; the
[actual removal](actual-swagger-consumer-removal.patch) and
[former member consumers](former-swagger-member-consumers.log) preserve that
history.

The complete [original owner audit](owner-audit-before.log) scans all 496 method
definitions, 490 IL bodies and six bodyless declarations. The
[proposal audit](owner-audit-after.log) scans 495 definitions/489 bodies, with
the unused parameter-selection lambda also gone. Both verify loaded PE/MVID
identity, the actual single binder helper call, and zero relevant metadata getter
or selector-name consumers. Original target IL has one `GetMethod`,
`GetParameters` and `SingleOrDefault`; proposed target IL has none and retains
the independent named-body `GetProperty`.

These are complete **owning-assembly** audits, not a repository code graph or a
claim that arbitrary external reflection cannot exist. The gRPC project include
inventory identifies one project using this shared source.

The four-file shipping/test diff removes only obsolete wildcard discovery and
its now-unused effective-internal helper argument, updates the one binder caller,
and adds focused tests. Constructor/type shapes, external public API, named-body
property metadata and invalid-body guards remain. No cache, retained metadata,
new options, analyzer suppression or new cross-assembly access is introduced.

## Reachable original failure and corrected material effect

The actual invoker in `ReflectionServiceInvokerResolver<TService>` already
selects the virtual override using exact parameter types and its generated base
definition. A service with an unrelated one-argument `Body` overload is a valid
target for that selection. The separate name-only wildcard metadata lookup
instead throws `AmbiguousMatchException` during real `MapGrpcService`.

Before shipping edits, the original 315-row owner suite passed 314 rows and
failed **only**
`AddMethod_WildcardBody_OverloadedServiceMethod_InvokesGeneratedHandler` at that
obsolete lookup. [Original reproduction](original-overload-reproduction.json)
and [full original TRX](tests-original-full/results.trx) retain the exact error
and stack. This is actual generated-service discovery, not a manually injected
descriptor or a standalone fabricated Type.GetMethod failure.

After the fix, that same test maps the real endpoint, invokes its produced
RequestDelegate, observes the generated service request populated from wildcard
JSON rather than conflicting query values, and reads the expected 200 JSON
response. The unrelated overload throws if called and is never selected.

**This accidental exception removal is a bug fix, not an exception-preservation
claim.** The ordinary service and a service whose request argument is renamed
also traverse the actual produced handler. Named/empty/missing/nested/scalar
body contracts remain unchanged.

The first removal attempt correctly failed IDE0060 because the old service-type
argument became unused. [The build error](test-unused-parameter-attempt.log) is
retained; it reached no test assertions and is not counted as test outcomes.
The unused internal argument and one caller were then corrected without a
suppression or dummy read. Unmeasured v1 binaries remain privately archived;
their original build/audit/setup logs are public. No measured snapshot or
comparison was overwritten.

## Three complete comparisons: every direction retained

Negative means faster. These are medians of three paired **mean ratios**, not
pooled observations or significance claims. Order A/B, B/A, A/B; each of 96
outcomes has eight measured observations, three warmups and `DontRemove`
outliers. No measured tuning and no fourth comparison.

| Case | Pair1% | Pair2% | Pair3% | Median% | B/op before -> after | Max CV% |
|---|---:|---:|---:|---:|---|---:|
| Helper_Wild | -70.18 | -69.43 | -68.43 | -69.43 |96 ->56|7.83|
| Helper_Renamed | -69.06 | -67.51 | -68.56 | -68.56 |96 ->56|5.48|
| Helper_Sub_Control | +1.53 | -5.89 | -7.11 | -5.89 |224 ->224|7.00|
| Helper_Repeated_Control | +8.30 | -17.40 | -0.75 | -0.75 |776 ->776|13.61|
| Parse_Wild | -5.44 | -7.69 | -4.82 | -5.44 |4448 ->4408|3.16|
| Parse_Renamed | -5.98 | -8.73 | +3.78 | -5.98 |4448 ->4408|9.45|
| Parse_Sub_Control | -2.60 | -2.43 | -2.60 | -2.60 |4576 ->4576|3.91|
| Parse_Repeated_Control | -2.20 | -1.61 | -4.78 | -2.20 |5128 ->5128|5.06|
| Parse_Empty_Control | -1.13 | -2.75 | -1.57 | -1.57 |4352 ->4352|3.70|
| Parse_Miss_Control | +2.64 | -1.94 | -0.76 | -0.76 |4032 ->4032|3.76|
| Parse_Nest_Control | +3.17 | +0.90 | -2.69 | +0.90 |4056 ->4056|3.07|
| Map_Greeter_1 | -4.81 | +8.23 | +3.50 | +3.50 |200628/208980/208932 ->196636/212068/200313|6.82|
| Map_Greeter_4 | +9.43 | -0.16 | -2.16 | -0.16 |802340/835827/835646 ->786379/848037/800761|5.23|
| Map_Renamed_1 | +1.79 | +1.10 | +1.66 | +1.66 |201492/196378/200895 ->208364/202942/202726|3.87|
| Map_Colon_Control | +27.84 | +46.91 | +7.68 | +27.84 |130571/130748/130903 ->133244/143544/131882|9.20|
| Map_NoBind_Control | -0.92 | +4.81 | +0.60 | +0.60 |91865/81382/81150 ->83724/93767/83384|2.47|

Both helpers save 41.67% heap (40 B/op); both full wildcard parses save 0.90%
heap (40 B/op), in every pair. Parse_Wild is lower in every pair; Parse_Renamed
regresses +3.78% in pair3. The unrelated-overload service is a correctness case,
not a timing row that pretends a failed baseline had measurable throughput.

**Startup non-wins are explicit:** Greeter_1 median is +3.50%; renamed startup is
slower in every pair with +1.66% median and more reported heap. Greeter_4's -0.16%
median is not a supported material startup win. Both unchanged startup control
medians are higher, especially colon +27.84% (pair2 +46.91%). Overall three of nine
unchanged-control medians are higher; several unchanged parse controls are faster
in every pair. Repeated-helper control reaches 13.61% within-launch CV.

All startup heap magnitudes move, including unchanged controls. No causal,
native/JIT or DI-compilation explanation was established for these shifts.
The stable component saving does not establish a full-startup heap saving.
No general startup, production-throughput, or per-request improvement is claimed.

All [48 paired rows](all-paired-outcomes.json), [16 paired medians](all-paired-summary.json),
[96 raw outcomes](raw-case-outcomes.json), [variance](variance.json),
[producer receipts](setup-correctness.json), [comparison](comparison.md),
and six complete raw JSON/CSV/Markdown/console folders are public.
Full case names are retained despite BDN shortening long display parameters.

## Faithful producer and compatibility boundary

The fixed [16-case harness](harness/RequestParameterBenchmark.cs) invokes the
actual complete helper, actual private binder ParseRoute/CreateDescriptorInfo,
and fresh AddGrpc/AddJsonTranscoding/DI/MapGrpcService endpoint materialization
using canonical generated protobuf. Four means four independently built/disposed
providers/apps, not repeated registrations in a retained provider. Only the
latest endpoint collection is held, without accumulating invocation history.

The **same frozen harness** adapts the original three-argument and proposed
two-argument effective-internal helper signatures outside timing. Its compiled
expression calls the actual helper directly; both variants use the same
two-argument outer delegate. The original passes the actual service type; the
proposal no longer needs it. Full ParseRoute uses the same expression wrapper
and ValueTuple boxing. Setup reflection/assertions are outside measured calls.

Every measured setup also maps the actual generated SubBody/SubRepeatedBody/Body
handlers, feeds JSON and conflicting query values, and observes service fields
and 200 JSON responses: **96 producer receipts / 288 measured-setup real-handler
checks**. No downstream descriptor injection is used.

Produced RequestDelegates are deliberately selected directly. Middleware/network
route matching is not exercised (the canonical fixture has overlapping POST
routes). This lower faithful boundary proves discovery, body/query/service and
response behavior, not network/browser E2E. Cold first-process, per-request
timing/throughput, arbitrary external reflection/malformed CLR metadata,
trimming/Native AOT, live-edit runtime and startup-shift attribution are unverified.

| Requirement | Evidence |
|---|---|
| Wildcard protobuf message identity | `ResolveBodyDescriptor_Wildcard_PreservesMessageDescriptor`, original/proposed |
| Unchanged named-field/property/repetition metadata | Both `ResolveBodyDescriptor_NamedField_PreservesBindingMetadata` rows, original/proposed; F320 GetProperty unchanged |
| Empty body | `ResolveBodyDescriptor_EmptyBody_PreservesNoBody`, original/proposed |
| Missing/nested/scalar invalid partitions | `ResolveBodyDescriptor_MissingField_PreservesException`, `ResolveBodyDescriptor_NestedField_PreservesException`, `ResolveBodyDescriptor_ScalarField_PreservesException`, original/proposed |
| Actual wildcard JSON handler and response | `AddMethod_WildcardBody_InvokesGeneratedHandler`, original/proposed |
| Renamed request argument | `AddMethod_WildcardBody_RenamedRequestParameter_InvokesGeneratedHandler`, original/proposed |
| Reachable overload failure fixed | `AddMethod_WildcardBody_OverloadedServiceMethod_InvokesGeneratedHandler`: original exact metadata ambiguity, proposed actual service/200 JSON |
| Original/final compatibility and all individual outcomes | Original full314 passed/one expected failure; original preservation314 passed; proposed full315 passed, zero skips; all10 new rows inspected |
| Full raw record, not an outcome-count proxy | [956 test outcomes](all-test-outcomes.json):955 passed/one exact original expected failure, including initial12 existing discovery rows;96 benchmark outcomes/96 actual receipts |
| Exact measured source/dependencies | Same original harness DLL/PDB/runtime/deps; all86 recursive DLL/JSON files differ only in owner DLL; [strict provenance](provenance.json), [closure](recursive-closure.json), [hashes](assembly-hashes.json), [loads](assembly-loads.json) |
| Minimal functional scope and formatting | Four committed files; scoped whitespace/diff checks pass; build-owned App.Ref UTF8 BOM restored byte-for-byte |

## Commands and reproducibility

Repository SDK 12.0.100-alpha.1.26557.102, pinned Core
12.0.0-alpha.1.26562.105, BenchmarkDotNet 0.13.0/in-process/server GC,
shared Windows Xeon Platinum 8473C guest (eight cores/16 logical processors).
Build/test/measurement commands were serialized, builds `-m:2`; no affinity,
power settings or unrelated processes were changed.

Activate before direct .NET commands from repository root:

```powershell
. .\activate.ps1
$run = "<SESSION_FILES>\autoperf-runs\F321"
dotnet test .\src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --logger "trx;LogFileName=results.trx" --results-directory "$run\tests-original-full"
```

Original result:314 passed/one expected overload metadata-ambiguity failure,
315 outcomes/zero skips. The exact same full command with final source and
`"$run\tests-after"` passed315/315, including all10 new rows.

```powershell
dotnet test .\src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --filter "FullyQualifiedName!~AddMethod_WildcardBody_OverloadedServiceMethod_InvokesGeneratedHandler" --logger "trx;LogFileName=results.trx" --results-directory "$run\tests-before"
```

Original preservation result:314/314 passed, zero skips. This filter explicitly
excludes only the independently retained failing regression, not a suppression
of an unrelated failure. Initial original `--filter
"FullyQualifiedName~JsonTranscodingServiceMethodProviderTests"` passed12/12.
Original and final helper test sources are published because the internal
signature changes.

```powershell
dotnet build "$run\harness\AutoPerf.Benchmarks.csproj" -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
dotnet format whitespace .\src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.csproj --no-restore --verify-no-changes --include .\src\Grpc\JsonTranscoding\src\Shared\ServiceDescriptorHelpers.cs .\src\Grpc\JsonTranscoding\src\Microsoft.AspNetCore.Grpc.JsonTranscoding\Internal\Binding\JsonTranscodingProviderServiceBinder.cs .\src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\ServiceDescriptorHelpersTests.cs .\src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\JsonTranscodingServiceMethodProviderTests.cs --verbosity quiet
git --no-pager diff --check
dotnet "$run\binaries\<VARIANT>\AutoPerf.Benchmarks.dll" --audit-owner
dotnet "$run\binaries\<VARIANT>\AutoPerf.Benchmarks.dll" --verify-setups
```

Final original/proposed builds:zero warnings/errors. Scoped format/diff:passed.
Both owner audits and both16-case setup runs:passed.

```powershell
dotnet "$run\binaries\<VARIANT>\AutoPerf.Benchmarks.dll" --filter "*RequestParameterBenchmark*" --inProcess --exporters json csv --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

Results:all six launches exited0;16 cases per launch/eight measured observations
per case. Budget closed after three pairs.

The [project](harness/AutoPerf.Benchmarks.csproj) pins dependencies and references
the actual owner/HTTP/Routing/MVC projects, not substitute implementations.
Canonical [transcoding.proto](harness/transcoding.proto) is byte-identical.
The real-handler fixture requires HTTP.Features and MVC.Core in the dependency
closure. Repository shared-framework build/test prerequisites use the existing
App12.0.0-dev local layout, not a global .NET installation change; the preserved
[F295 layout recipe](../F295/dev-framework-installation.json) records that setup.

No bin/obj/PDB/compiled binaries are published. Raw public logs/TRX redact the
session path, runUser and computerName; no local host configuration was changed.
