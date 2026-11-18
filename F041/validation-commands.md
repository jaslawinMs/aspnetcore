# F041 exact command and outcome map

Historical commands below ran from `C:\src\aspnetcore`, after
`. .\activate.ps1`, with `AUTOPERF_ASPNETCORE_ROOT=C:\src\aspnetcore` for
standalone projects. Every fresh .NET shell activates that repository's local
environment. Original source was unchanged baseline
`37e809ead5824bc753a1c3d56f11615bdb1296c5`, not the later captured current default.

In the following expansions:

```powershell
$root = 'C:\src\aspnetcore'
$run = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F041'
$project = Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'
```

These are **records of completed runs**, not permission to reset their
directories or historical timing budget.

## Actual owning project build

```powershell
dotnet build src\Components\Web\test\Microsoft.AspNetCore.Components.Web.Tests.csproj --configuration Release --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false -p:UseSharedCompilation=false
```

**Passed, exit 0, zero warnings/errors.** This is dependency-aware owning-project
validation, not a repository-wide build.
[Exact command](validation/WebBuild-original-001/command.json) /
[stdout](validation/WebBuild-original-001/stdout.txt).

## Existing actual InputBase test executions

```powershell
dotnet test src\Components\Web\test\Microsoft.AspNetCore.Components.Web.Tests.csproj --configuration Release --no-build --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false --filter FullyQualifiedName~Microsoft.AspNetCore.Components.Forms.InputBaseTest --logger "trx;LogFileName=results.trx" --results-directory "$run\validation\InputBaseTests-original-001\results"
```

**Passed, exit 0: 21 passed, 0 failed, 0 skipped.**
The [actual TRX](validation/InputBaseTests-original-001/results/results.trx)
and [independently XML-parsed complete identities](validation/all-trx-rows.json)
agree with the original owner-validation receipt. No new shipping tests or
changed-source red/green claim.
[Exact command](validation/InputBaseTests-original-001/command.json) /
[stdout](validation/InputBaseTests-original-001/stdout.txt).

## Exact original seven-file standalone project

```powershell
dotnet restore $project -m:2 -nr:false --verbosity quiet --configfile "$root\NuGet.config" -p:UseIisNativeAssets=false -p:UseSharedCompilation=false
dotnet build $project --configuration Release --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false -p:UseSharedCompilation=false
```

**Restore and build passed, exit 0; build zero warnings/errors.**
The existing NuGet.config was read, never changed.
[Restore command](harness-preparation-001/Restore/command.json) /
[build command](harness-preparation-001/Build/command.json) /
[build stdout](harness-preparation-001/Build/stdout.txt).
The [seven exact source hashes](harness-source-hashes.json) and
[131-file frozen consumer manifest](consumer-closure.json) remain.

## Original untimed actual-producer characterization

```powershell
dotnet "$run\consumer-original\AutoPerf.Benchmarks.dll" characterize "$run\native-characterize-001\evidence" "$run\consumer-closure.json" "$run\source-inputs.json" $root "$run\native-characterize-001\reports"
```

**Passed, exit 0:** all 10 characterization cases and all 6 actual public BDN
discovery/setup/workload/cleanup profiles. No timing is run by this mode.
Each selected source hash is checked against its actual owner PDB document.
[Exact command](native-characterize-001/command.json) /
[full assertions and HTML](native-characterize-001/evidence/0005-characterization.json) /
[lifecycle completion](native-characterize-001/evidence/0018-all-lifecycles.json).

## Sole original-only measured invocation

```powershell
dotnet "$run\consumer-original\AutoPerf.Benchmarks.dll" measure "$run\native-measure-001\evidence" "$run\consumer-closure.json" "$run\source-inputs.json" $root "$run\native-measure-001\reports"
```

**Passed, exit 0: 6 original-only profiles, 48 retained result observations.**
No optimized source exists; Cold/Warm are fixture states, not A/B variants.
The [one original-only authorization is permanently closed](diagnostic-budget.json);
zero source comparisons were authorized or consumed.
[Exact command](native-measure-001/command.json) /
[stdout](native-measure-001/stdout.txt) /
[all full JSON results](native-measure-001/reports/results/AutoPerf.FieldRegistryBenchmarks-report-full.json).

## Independently relocated byte-exact project, untimed only

Replace `$project` above with
`"$run\reproduction-original-001\project\AutoPerf.Benchmarks.csproj"` and execute
the same restore/build argument lists.
**Both passed, exit 0; build zero warnings/errors.**
[Restore](reproduction-original-001/Restore/command.json) /
[build](reproduction-original-001/Build/command.json) /
[build stdout](reproduction-original-001/Build/stdout.txt).

```powershell
dotnet "$run\reproduction-original-001\consumer\AutoPerf.Benchmarks.dll" characterize "$run\reproduction-original-001\Characterize\evidence" "$run\reproduction-original-001\consumer-closure.json" "$run\source-inputs.json" $root "$run\reproduction-original-001\not-a-timing-directory"
```

**Passed, exit 0:** all 10 original observations/HTML are identical; all 6
untimed lifecycles pass. The last reports argument is unused in characterize
mode. [Exact command](reproduction-original-001/CharacterizeRun/command.json) /
[receipt](reproduction-original-001/verified-reproduction.json).
Only rebuilt harness DLL/PDB hashes differ; 129 owner/dependency files match.
The original measured image and closed budget remain byte-identical.
**Zero additional timing samples.**

## Read-only independent audits

```powershell
node .\F041-verify.mjs .
.\F041-audit-trx.ps1 -Directory . -Verify
```

**Both pass** against the completed copied evidence. Neither command executes
.NET, tests or benchmarks. Portable verification checks the copied byte/hash
identities and all 48 samples, not omitted compiled bytes.
The PowerShell step independently parses all actual TRX execution rows;
Node verifies their recorded identities and the exact TRX hash.

The [recorded combined live audit](audit-live-004.command.json) additionally
supplies explicit original source/consumer paths:
**passed, exit 0**, 354 unique physical files, both 131-file consumer images,
248 loaded-assembly bindings, preserved source/four reports. Selected runtime
PDB document checks are bound to their recorded owner/source hashes, not
independently decoded by Node.

## Retained failures and boundaries

The first local object-selector probe has a PowerShell quoting failure, not
an absent upstream commit. A strict initial selected-source guard then
correctly stops on the newer InputBase source; its actual delta and unchanged
first-initialization block are explicitly assessed before any execution.
[Preparation observations](preparation-observations.json) and
[initial snapshot artifacts](source-snapshot-attempt1) retain the failures.

The first read-only arithmetic audit cannot start because Python is not
installed. Existing Node/PowerShell tools are used without installation. Its
first Node check incorrectly truncates allocated bytes/operation; the exact
BDN 0.13.0 implementation instead uses midpoint-to-even rounding. Both failed
audit versions, commands and output remain under `audit-preparation-001/002`;
corrected checks pass without changing any measured input/output or consuming
a source-comparison slot. See [audit observations](audit-observations.json).

No full repository build, current-default parsing-recovery test, browser,
application benchmark, optimized candidate, gain/no-gain percentage or
complete compiler-provenance claim is made.
