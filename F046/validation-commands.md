# F046: exact executed commands and observed results

Each managed invocation activates the reviewed checkout-local .NET environment.
Builds use at most two workers, no shared compilation or node reuse. The timing executor preserves observed process/thread priority and affinity and requests no power-plan change.
Historical absolute paths are measurements of this box, not published executable/package-cache locations.

| Boundary | Result | Exact arguments | Raw stdout | Raw stderr |
|---|---|---|---|---|
| comparison-001/Candidate | Passed; exit 0 | [arguments](comparison-001/Candidate/command.json) | [stdout](comparison-001/Candidate/stdout.txt) | [stderr](comparison-001/Candidate/stderr.txt) |
| comparison-001/Original | Passed; exit 0 | [arguments](comparison-001/Original/command.json) | [stdout](comparison-001/Original/stdout.txt) | [stderr](comparison-001/Original/stderr.txt) |
| comparison-002/Candidate | Passed; exit 0 | [arguments](comparison-002/Candidate/command.json) | [stdout](comparison-002/Candidate/stdout.txt) | [stderr](comparison-002/Candidate/stderr.txt) |
| comparison-002/Original | Passed; exit 0 | [arguments](comparison-002/Original/command.json) | [stdout](comparison-002/Original/stdout.txt) | [stderr](comparison-002/Original/stderr.txt) |
| comparison-003/Candidate | Passed; exit 0 | [arguments](comparison-003/Candidate/command.json) | [stdout](comparison-003/Candidate/stdout.txt) | [stderr](comparison-003/Candidate/stderr.txt) |
| comparison-003/Original | Passed; exit 0 | [arguments](comparison-003/Original/command.json) | [stdout](comparison-003/Original/stdout.txt) | [stderr](comparison-003/Original/stderr.txt) |
| reconstruction-paired-001/Build | Passed; exit 0 | [arguments](reconstruction-paired-001/Build/command.json) | [stdout](reconstruction-paired-001/Build/stdout.txt) | [stderr](reconstruction-paired-001/Build/stderr.txt) |
| reconstruction-paired-001/Candidate-Characterize | Passed; exit 0 | [arguments](reconstruction-paired-001/Candidate-Characterize/command.json) | [stdout](reconstruction-paired-001/Candidate-Characterize/stdout.txt) | [stderr](reconstruction-paired-001/Candidate-Characterize/stderr.txt) |
| reconstruction-paired-001/Original-Characterize | Passed; exit 0 | [arguments](reconstruction-paired-001/Original-Characterize/command.json) | [stdout](reconstruction-paired-001/Original-Characterize/stdout.txt) | [stderr](reconstruction-paired-001/Original-Characterize/stderr.txt) |
| reconstruction-paired-001/Restore | Passed; exit 0 | [arguments](reconstruction-paired-001/Restore/command.json) | [stdout](reconstruction-paired-001/Restore/stdout.txt) | [stderr](reconstruction-paired-001/Restore/stderr.txt) |
| validation/candidate-header-functional-tests-001 | Passed; exit 0 | [arguments](validation/candidate-header-functional-tests-001/command.json) | [stdout](validation/candidate-header-functional-tests-001/stdout.txt) | [stderr](validation/candidate-header-functional-tests-001/stderr.txt) |
| validation/candidate-header-unit-tests-001 | Passed; exit 0 | [arguments](validation/candidate-header-unit-tests-001/command.json) | [stdout](validation/candidate-header-unit-tests-001/stdout.txt) | [stderr](validation/candidate-header-unit-tests-001/stderr.txt) |
| validation/candidate-httpsys-functional-build-001 | Passed; exit 0 | [arguments](validation/candidate-httpsys-functional-build-001/command.json) | [stdout](validation/candidate-httpsys-functional-build-001/stdout.txt) | [stderr](validation/candidate-httpsys-functional-build-001/stderr.txt) |
| validation/candidate-httpsys-unit-build-001 | Passed; exit 0 | [arguments](validation/candidate-httpsys-unit-build-001/command.json) | [stdout](validation/candidate-httpsys-unit-build-001/stdout.txt) | [stderr](validation/candidate-httpsys-unit-build-001/stderr.txt) |
| validation/candidate-iis-managed-build-001 | Passed; exit 0 | [arguments](validation/candidate-iis-managed-build-001/command.json) | [stdout](validation/candidate-iis-managed-build-001/stdout.txt) | [stderr](validation/candidate-iis-managed-build-001/stderr.txt) |
| validation/candidate-native-characterization-001 | Passed; exit 0 | [arguments](validation/candidate-native-characterization-001/command.json) | [stdout](validation/candidate-native-characterization-001/stdout.txt) | [stderr](validation/candidate-native-characterization-001/stderr.txt) |
| validation/candidate-source-whitespace-001 | Passed; exit 0 | [arguments](validation/candidate-source-whitespace-001/command.json) | [stdout](validation/candidate-source-whitespace-001/stdout.txt) | [stderr](validation/candidate-source-whitespace-001/stderr.txt) |
| validation/common-harness-build-001 | Passed; exit 0 | [arguments](validation/common-harness-build-001/command.json) | [stdout](validation/common-harness-build-001/stdout.txt) | [stderr](validation/common-harness-build-001/stderr.txt) |
| validation/common-harness-restore-001 | Passed; exit 0 | [arguments](validation/common-harness-restore-001/command.json) | [stdout](validation/common-harness-restore-001/stdout.txt) | [stderr](validation/common-harness-restore-001/stderr.txt) |
| validation/default-httpsys-functional-build-001 | Failed; exit 1 | [arguments](validation/default-httpsys-functional-build-001/command.json) | [stdout](validation/default-httpsys-functional-build-001/stdout.txt) | [stderr](validation/default-httpsys-functional-build-001/stderr.txt) |
| validation/default-httpsys-functional-build-002 | Passed; exit 0 | [arguments](validation/default-httpsys-functional-build-002/command.json) | [stdout](validation/default-httpsys-functional-build-002/stdout.txt) | [stderr](validation/default-httpsys-functional-build-002/stderr.txt) |
| validation/default-httpsys-functional-restore-001 | Passed; exit 0 | [arguments](validation/default-httpsys-functional-restore-001/command.json) | [stdout](validation/default-httpsys-functional-restore-001/stdout.txt) | [stderr](validation/default-httpsys-functional-restore-001/stderr.txt) |
| validation/default-iis-managed-build-001 | Failed; exit 1 | [arguments](validation/default-iis-managed-build-001/command.json) | [stdout](validation/default-iis-managed-build-001/stdout.txt) | [stderr](validation/default-iis-managed-build-001/stderr.txt) |
| validation/default-iis-managed-build-002 | Passed; exit 0 | [arguments](validation/default-iis-managed-build-002/command.json) | [stdout](validation/default-iis-managed-build-002/stdout.txt) | [stderr](validation/default-iis-managed-build-002/stderr.txt) |
| validation/default-iis-managed-restore-001 | Passed; exit 0 | [arguments](validation/default-iis-managed-restore-001/command.json) | [stdout](validation/default-iis-managed-restore-001/stdout.txt) | [stderr](validation/default-iis-managed-restore-001/stderr.txt) |
| validation/default-native-characterization-001 | Passed; exit 0 | [arguments](validation/default-native-characterization-001/command.json) | [stdout](validation/default-native-characterization-001/stdout.txt) | [stderr](validation/default-native-characterization-001/stderr.txt) |
| validation/original-header-functional-tests-001 | Passed; exit 0 | [arguments](validation/original-header-functional-tests-001/command.json) | [stdout](validation/original-header-functional-tests-001/stdout.txt) | [stderr](validation/original-header-functional-tests-001/stderr.txt) |
| validation/original-header-unit-tests-001 | Failed; exit 1 | [arguments](validation/original-header-unit-tests-001/command.json) | [stdout](validation/original-header-unit-tests-001/stdout.txt) | [stderr](validation/original-header-unit-tests-001/stderr.txt) |
| validation/original-header-unit-tests-002 | Passed; exit 0 | [arguments](validation/original-header-unit-tests-002/command.json) | [stdout](validation/original-header-unit-tests-002/stdout.txt) | [stderr](validation/original-header-unit-tests-002/stderr.txt) |
| validation/original-httpsys-functional-build-001 | Passed; exit 0 | [arguments](validation/original-httpsys-functional-build-001/command.json) | [stdout](validation/original-httpsys-functional-build-001/stdout.txt) | [stderr](validation/original-httpsys-functional-build-001/stderr.txt) |
| validation/original-httpsys-unit-build-001 | Passed; exit 0 | [arguments](validation/original-httpsys-unit-build-001/command.json) | [stdout](validation/original-httpsys-unit-build-001/stdout.txt) | [stderr](validation/original-httpsys-unit-build-001/stderr.txt) |
| validation/original-httpsys-unit-build-002 | Passed; exit 0 | [arguments](validation/original-httpsys-unit-build-002/command.json) | [stdout](validation/original-httpsys-unit-build-002/stdout.txt) | [stderr](validation/original-httpsys-unit-build-002/stderr.txt) |
| validation/original-iis-managed-build-001 | Passed; exit 0 | [arguments](validation/original-iis-managed-build-001/command.json) | [stdout](validation/original-iis-managed-build-001/stdout.txt) | [stderr](validation/original-iis-managed-build-001/stderr.txt) |
| validation/original-native-characterization-001 | Passed; exit 0 | [arguments](validation/original-native-characterization-001/command.json) | [stdout](validation/original-native-characterization-001/stdout.txt) | [stderr](validation/original-native-characterization-001/stderr.txt) |

## Owning test selections

Original and candidate each pass 10 new preservation unit rows and 5 existing native functional rows, with 0 failed/skipped.
Every individual boolean theory row is independently parsed from the actual exported XML.
Raw CR data stays in test bodies, not test names. This is green/green preservation, not semantic-bug red/green.

### original-header-unit-tests-002

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'C:\src\aspnetcore\src\Servers\HttpSys\test\Tests\Microsoft.AspNetCore.Server.HttpSys.Tests.csproj' '--no-build' '--no-restore' '-c' 'Release' '--filter' 'FullyQualifiedName~Microsoft.AspNetCore.Server.HttpSys.Tests.HeaderCollectionTests' '--logger' 'trx;LogFileName=F046-original-header-unit.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F046\validation\original-header-unit-tests-002\test-results'
```

Observed result: 10 passed; 0 failed/skipped.

### candidate-header-unit-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'C:\src\aspnetcore\src\Servers\HttpSys\test\Tests\Microsoft.AspNetCore.Server.HttpSys.Tests.csproj' '--no-build' '--no-restore' '-c' 'Release' '--filter' 'FullyQualifiedName~Microsoft.AspNetCore.Server.HttpSys.Tests.HeaderCollectionTests' '--logger' 'trx;LogFileName=F046-candidate-header-unit.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F046\validation\candidate-header-unit-tests-001\test-results'
```

Observed result: 10 passed; 0 failed/skipped.

### original-header-functional-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'C:\src\aspnetcore\src\Servers\HttpSys\test\FunctionalTests\Microsoft.AspNetCore.Server.HttpSys.FunctionalTests.csproj' '--no-build' '--no-restore' '-c' 'Release' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.Listener.ResponseHeaderTests.ResponseHeaders_10Request_ServerSendsDefaultHeaders|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.Listener.ResponseHeaderTests.ResponseHeaders_10HeadRequest_ServerSendsDefaultHeaders|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.Listener.ResponseHeaderTests.ResponseHeaders_HTTP10KeepAliveRequest_KeepAliveHeader_Gets11NoClose|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseHeaderTests.ResponseHeaders_HTTP10Request_Gets11Close|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseHeaderTests.ResponseHeaders_ServerSendsConnectionClose_Closed' '--logger' 'trx;LogFileName=F046-original-header-functional.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F046\validation\original-header-functional-tests-001\test-results'
```

Observed result: 5 passed; 0 failed/skipped.

### candidate-header-functional-tests-001

```powershell
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'C:\src\aspnetcore\src\Servers\HttpSys\test\FunctionalTests\Microsoft.AspNetCore.Server.HttpSys.FunctionalTests.csproj' '--no-build' '--no-restore' '-c' 'Release' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.Listener.ResponseHeaderTests.ResponseHeaders_10Request_ServerSendsDefaultHeaders|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.Listener.ResponseHeaderTests.ResponseHeaders_10HeadRequest_ServerSendsDefaultHeaders|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.Listener.ResponseHeaderTests.ResponseHeaders_HTTP10KeepAliveRequest_KeepAliveHeader_Gets11NoClose|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseHeaderTests.ResponseHeaders_HTTP10Request_Gets11Close|FullyQualifiedName=Microsoft.AspNetCore.Server.HttpSys.ResponseHeaderTests.ResponseHeaders_ServerSendsConnectionClose_Closed' '--logger' 'trx;LogFileName=F046-candidate-header-functional.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F046\validation\candidate-header-functional-tests-001\test-results'
```

Observed result: 5 passed; 0 failed/skipped.

### Exact existing native functional identities

- `Microsoft.AspNetCore.Server.HttpSys.Listener.ResponseHeaderTests.ResponseHeaders_HTTP10KeepAliveRequest_KeepAliveHeader_Gets11NoClose`
- `Microsoft.AspNetCore.Server.HttpSys.Listener.ResponseHeaderTests.ResponseHeaders_10HeadRequest_ServerSendsDefaultHeaders`
- `Microsoft.AspNetCore.Server.HttpSys.ResponseHeaderTests.ResponseHeaders_HTTP10Request_Gets11Close`
- `Microsoft.AspNetCore.Server.HttpSys.Listener.ResponseHeaderTests.ResponseHeaders_10Request_ServerSendsDefaultHeaders`
- `Microsoft.AspNetCore.Server.HttpSys.ResponseHeaderTests.ResponseHeaders_ServerSendsConnectionClose_Closed`

## Actual build and producer boundaries

default-httpsys-functional-build-002 and default-iis-managed-build-002 pass on actual current default 31c15331c03714b7a602e1817e65881474c29e2e, with 0 warnings/errors.
Original and candidate HTTP.sys functional/unit graphs and managed IIS owners pass, with 0 warnings/errors.
The common nine-file project restore/build and exact-file whitespace verification pass.
Default, Original, and Candidate each execute 20 shared-owner contracts, 12 fresh boundaries, and 6 real native HTTP.sys profiles.
The actual compiled HTTP.sys owner has one ComputeHeaders call site to Append; the inspected IIS managed owner has zero references.
Native IIS integration and throughput are not inferred from its managed shared-class checks.

## Preserved preparation failures

- default-httpsys-functional-build-001 and default-iis-managed-build-001 fail NETSDK1004 because restore assets were missing. Each actual restore and successful retry is retained.
- original-header-unit-tests-001 has 7 passes/3 failures from incorrect fixture expectations, before shipping edits or timing. The old message embeds CR after 0x; Connection is not a restricted trailer. The corrected ten-row tests preserve the actual message, use restricted Content-Length, and pass on both sources.
- Initial test inputs and all nine initial project inputs are preserved under preparation/contract-expectations-001; no shipping behavior was changed to satisfy those assumptions.

## Independent checks

The source/results audit reconstructs all 576 retained actual-minus-overhead observations, statistics, and allocations and parses all 30 passing XML rows.
The byte-exact nine-file project is relocated, restored, and rebuilt; both independently rebuilt variants pass 20 contracts, 12 fresh boundaries, and 6 real native profiles without timing.
Only the fresh common project DLL/PDB differs from its measured image. The closed budget, measured images, shipping source/tests, SDK/NuGet files, and unrelated reports remain unchanged.
The full audit checks 22 runtime records and 144 per-benchmark settings records.

[Source publication commands/results](source-publication-invocations.json), [full audit](audit-summary.json), [reconstruction receipt](reconstruction-paired-001/verified-reproduction.json).

```powershell
node .\F046-verify.mjs . --require-seal
```

No native IIS, JS/static-web-assets, packaging, full-repository, browser, or application-throughput pass is claimed.
