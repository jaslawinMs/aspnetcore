$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$repo = (Get-Location).Path
$run = Join-Path $PSScriptRoot 'autoperf-runs\F012'
$prior = Join-Path $PSScriptRoot 'autoperf-runs\F011'
$build = Join-Path $run 'preparation-attempts\attempt-001'
$harness = Join-Path $run 'harness'
foreach ($relative in 'preparation-attempts\attempt-001', 'images', 'sources', 'tests', 'characterization', 'manifest-original.json')
{
    if (Test-Path (Join-Path $run $relative))
    {
        throw "Preserve actual F012 preparation: $relative"
    }
}
$investigation = Get-Content (Join-Path $run 'current-source-investigation.json') -Raw | ConvertFrom-Json
$priorInvestigation = Get-Content (Join-Path $prior 'current-source-investigation.json') -Raw | ConvertFrom-Json
if ((git rev-parse HEAD).Trim() -cne $investigation.baseline -or
    (git branch --show-current).Trim() -cne $investigation.branch -or
    $priorInvestigation.currentDefault -cne $investigation.currentDefault -or
    @(git diff --name-only).Count -or @(git diff --cached --name-only).Count)
{
    throw 'Independent unchanged baseline and identical captured-default producer revision required.'
}
foreach ($source in $investigation.sources)
{
    if ((Get-FileHash $source.file).Hash -cne $source.workingSha256)
    {
        throw "Selected source differs: $($source.file)"
    }
}
$priorAudit = Get-Content (Join-Path $prior 'measurement-audit.json') -Raw | ConvertFrom-Json
$testAudit = Get-Content (Join-Path $prior 'tests\original\actual-test-audit.json') -Raw | ConvertFrom-Json
if (-not $priorAudit.auditPassed -or -not $priorAudit.actualLiveAuditPassed -or
    $testAudit.actualTests -ne 27 -or $testAudit.passed -ne 27 -or $testAudit.failed -ne 0 -or $testAudit.skipped -ne 0)
{
    throw 'Actual prior original owner/test evidence required; not a new F012 test run.'
}
New-Item $build -ItemType Directory -Force | Out-Null
Copy-Item $PSCommandPath (Join-Path $build 'executed-source.ps1')
$attemptSource = Join-Path $build 'harness-source'
New-Item $attemptSource -ItemType Directory | Out-Null
Get-ChildItem $harness -File | Where-Object { $_.Extension -in '.cs', '.csproj' } |
    Copy-Item -Destination $attemptSource
New-Item (Join-Path $run 'tests') -ItemType Directory | Out-Null
Copy-Item (Join-Path $prior 'tests\original') (Join-Path $run 'tests\original') -Recurse
$tested = Get-Content (Join-Path $prior 'preparation-attempts\attempt-001\additional-tested-image-capture.json') -Raw | ConvertFrom-Json
foreach ($file in $tested.files)
{
    if ((Get-FileHash (Join-Path $run "tests\original\test-image\$($file.name)")).Hash -cne $file.sha256)
    {
        throw 'Copied actual tested bytes differ.'
    }
}
Copy-Item (Join-Path $prior 'preparation-attempts\attempt-001\additional-tested-image-capture.json') `
    (Join-Path $build 'additional-tested-image-capture.json')
[ordered]@{
    candidate = 'F012'; actualNewOwningTestRuns = 0; actualPriorOriginalRowsReused = 27
    origin = 'F011/tests/original; original commands, raw logs, TRX, audit and native tested bytes retained unchanged.'
    originalTestAuditSha256 = (Get-FileHash (Join-Path $prior 'tests\original\actual-test-audit.json')).Hash
    originalTrxSha256 = (Get-FileHash (Join-Path $prior 'tests\original\owning-original.trx')).Hash
    exactTestedBinaryHashesReverified = 6; priorLiveAudit = $priorAudit
    newBroadcastProducerObservationsRequired = $true; priorGroupObservationsOrTimingReused = $false
} | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $run 'tests\original\borrowed-evidence-provenance.json')
$toolchain = Join-Path $harness 'SettingsPreservingEmitToolchain.cs'
$priorManifest = Get-Content (Join-Path $prior 'manifest-original.json') -Raw | ConvertFrom-Json
$priorCurrentManifest = Get-Content (Join-Path $prior 'manifest-captured-default-json.json') -Raw | ConvertFrom-Json
if ($priorCurrentManifest.capturedDefaultSourceRevision -cne $investigation.currentDefault)
{
    throw 'Borrowed producer manifest must name the actual captured default.'
}
Copy-Item (Join-Path $prior 'manifest-captured-default-json.json') (Join-Path $build 'borrowed-manifest-captured-default-json.json')
Copy-Item (Join-Path $prior 'current-producer-preparation-attempt-002\executed-overlay.targets') (Join-Path $build 'borrowed-executed-overlay.targets')
Copy-Item (Join-Path $prior 'current-producer-preparation-attempt-002\execution.json') (Join-Path $build 'borrowed-producer-build-execution.json')
if ((Get-FileHash $toolchain).Hash -cne
    @($priorManifest.sources | Where-Object path -CEQ 'harness\SettingsPreservingEmitToolchain.cs')[0].sha256)
{
    throw 'Settings-preserving toolchain must be byte-exact to prior executed source.'
}
[ordered]@{
    candidate = 'F012'; origin = 'Byte-exact F011/F008 settings-preserving emitted executor; prior F007 attribution retained.'
    sha256 = (Get-FileHash $toolchain).Hash; noPowerPriorityAffinityChanges = $true
} | ConvertTo-Json | Set-Content (Join-Path $build 'toolchain-attribution.json')
$commands = [System.Collections.Generic.List[object]]::new()
function InvokeRecordedDotnet([string]$Label, [string[]]$Arguments)
{
    $start = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @Arguments *> (Join-Path $build "$Label.log")
    $code = $LASTEXITCODE
    $commands.Add([pscustomobject]@{
        label = $Label; entryPoint = 'dotnet'; arguments = $Arguments; actualExitCode = $code
        startedUtc = $start; completedUtc = [DateTimeOffset]::UtcNow.ToString('o')
    })
    [ordered]@{
        candidate = 'F012'; activation = '. .\activate.ps1'; newOwningTestRuns = 0; commands = $commands
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $build 'execution.json')
    Get-Content (Join-Path $build "$Label.log") -Tail 12
    if ($code)
    {
        throw "F012 $Label failed; retain exact source and output."
    }
}
$project = Join-Path $harness 'AutoPerf.Benchmarks.csproj'
InvokeRecordedDotnet 'restore-new-harness-manifest' @(
    'restore', $project, '--configfile', (Join-Path $repo 'NuGet.config'), '-m:2', '-v:q', '-p:UseIisNativeAssets=false')
InvokeRecordedDotnet 'build-harness' @(
    'build', $project, '--no-restore', '--no-dependencies', '-c', 'Release', '-t:Rebuild', '-m:2', '-v:q',
    '-p:UseIisNativeAssets=false', "-bl:$build\build-harness.binlog")
$output = Join-Path $harness 'bin\Release\net12.0'
foreach ($file in $testAudit.binaryHashes)
{
    if ((Get-FileHash $file.path).Hash -cne $file.sha256 -or
        (Get-FileHash (Join-Path $output (Split-Path $file.path -Leaf))).Hash -cne $file.sha256)
    {
        throw 'New broadcast harness must use the exact previously tested owner.'
    }
}
function Describe([string]$Directory)
{
    return @(Get-ChildItem $Directory -Recurse -File | Sort-Object FullName | ForEach-Object {
        @{ path = [IO.Path]::GetRelativePath($Directory, $_.FullName); bytes = $_.Length; sha256 = (Get-FileHash $_.FullName).Hash }
    })
}
$originalImage = Join-Path $run 'images\original'
$originalSources = Join-Path $run 'sources\original'
New-Item $originalImage -ItemType Directory -Force | Out-Null
Copy-Item (Join-Path $output '*') $originalImage -Recurse
New-Item $originalSources -ItemType Directory -Force | Out-Null
foreach ($kind in 'owner', 'producer', 'test')
{
    Copy-Item (Join-Path $prior "sources\original\$kind") (Join-Path $originalSources $kind) -Recurse
}
New-Item (Join-Path $originalSources 'harness') -ItemType Directory | Out-Null
Get-ChildItem $harness -File | Where-Object { $_.Extension -in '.cs', '.csproj' } |
    Copy-Item -Destination (Join-Path $originalSources 'harness')
foreach ($source in $priorManifest.sources | Where-Object { -not $_.path.StartsWith('harness\') })
{
    if ((Get-FileHash (Join-Path $originalSources $source.path)).Hash -cne $source.sha256)
    {
        throw 'Borrowed original non-harness source snapshot differs.'
    }
}
$files = Describe $originalImage
$sourceFiles = Describe $originalSources
if ($files.Count -ne 80 -or $sourceFiles.Count -ne 89)
{
    throw 'Exact standalone execution/source image count differs.'
}
[ordered]@{
    candidate = 'F012'; variant = 'original'; baseline = $investigation.baseline
    sourceCandidateShapes = 0; pairedComparisons = 0; files = $files; sources = $sourceFiles
    ownerDllSha256 = (Get-FileHash (Join-Path $originalImage 'Microsoft.AspNetCore.SignalR.Core.dll')).Hash
    ownerPdbSha256 = (Get-FileHash (Join-Path $originalImage 'Microsoft.AspNetCore.SignalR.Core.pdb')).Hash
    harnessDllSha256 = (Get-FileHash (Join-Path $originalImage 'AutoPerf.Benchmarks.dll')).Hash
    harnessPdbSha256 = (Get-FileHash (Join-Path $originalImage 'AutoPerf.Benchmarks.pdb')).Hash
    jsonProtocolSha256 = (Get-FileHash (Join-Path $originalImage 'Microsoft.AspNetCore.SignalR.Protocols.Json.dll')).Hash
    benchmarkDotNetSha256 = (Get-FileHash (Join-Path $originalImage 'BenchmarkDotNet.dll')).Hash
    boundedSelectedSourcePdbEvidenceNotWholeSdkProvenance = $true; originalOwnerAndTestsExplicitlyReusedFrom = 'F011'
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'manifest-original.json')
$testImage = Join-Path $run 'tests\original\test-image'
InvokeRecordedDotnet 'characterization-original' @(
    (Join-Path $originalImage 'AutoPerf.Benchmarks.dll'), '--sources', $originalSources, '--context', 'original',
    '--test-assembly', (Join-Path $testImage 'Microsoft.AspNetCore.SignalR.Tests.dll'),
    '--spec-assembly', (Join-Path $testImage 'Microsoft.AspNetCore.SignalR.Specification.Tests.dll'),
    '--characterize', '--artifacts', (Join-Path $run 'characterization\original'))
$currentImage = Join-Path $run 'images\captured-default-json'
$currentSources = Join-Path $run 'sources\captured-default-json'
Copy-Item $originalImage $currentImage -Recurse
Copy-Item $originalSources $currentSources -Recurse
$borrowedProducer = [System.Collections.Generic.List[object]]::new()
foreach ($name in 'Microsoft.AspNetCore.SignalR.Protocols.Json.dll', 'Microsoft.AspNetCore.SignalR.Protocols.Json.pdb')
{
    $from = Join-Path $prior "images\captured-default-json\$name"
    if ((Get-FileHash $from).Hash -cne @($priorCurrentManifest.files | Where-Object path -CEQ $name)[0].sha256)
    {
        throw 'Borrowed producer bytes differ from the actual prior manifest.'
    }
    Copy-Item $from (Join-Path $currentImage $name)
    $borrowedProducer.Add([pscustomobject]@{ name = $name; source = "F011\images\captured-default-json\$name"; sha256 = (Get-FileHash $from).Hash })
}
Copy-Item (Join-Path $run 'current-default-canonical\src\SignalR\common\Protocols.Json\src\Protocol\JsonHubProtocol.cs') `
    (Join-Path $currentSources 'producer\JsonHubProtocol.cs')
$currentFiles = Describe $currentImage
$currentSourceFiles = Describe $currentSources
$changed = @($currentFiles | Where-Object {
    $currentFile = $_
    $currentFile.sha256 -cne @($files | Where-Object path -CEQ $currentFile.path)[0].sha256
} | Select-Object -ExpandProperty path)
if ($changed.Count -ne 2 -or @($changed | Where-Object { $_ -notin 'Microsoft.AspNetCore.SignalR.Protocols.Json.dll', 'Microsoft.AspNetCore.SignalR.Protocols.Json.pdb' }).Count)
{
    throw 'Only actual captured-default JSON producer DLL/PDB may differ.'
}
[ordered]@{
    candidate = 'F012'; variant = 'captured-default-json'; baseline = $investigation.baseline
    capturedDefaultSourceRevision = $investigation.currentDefault; files = $currentFiles; sources = $currentSourceFiles
    actualChangedImageFiles = $changed; unchangedOwner = $true; unchangedHarness = $true; allOtherImageFilesIdentical = $true
    sourceCandidateShapes = 0; measuredProfiles = 0; wholeCurrentDefaultSdkOrDependencyIntegration = $false
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'manifest-captured-default-json.json')
[ordered]@{
    candidate = 'F012'; borrowedFrom = 'F011 captured-default producer image, actual compiled source/PE/PDB witnesses retained there.'
    actualDefaultRevisionUnchanged = $true; currentDefault = $investigation.currentDefault
    priorManifestSha256 = (Get-FileHash (Join-Path $prior 'manifest-captured-default-json.json')).Hash
    files = $borrowedProducer; newProducerBuildClaimed = $false; repositoryOutputsModified = $false
    f012ActualBroadcastCharacterizationRequired = $true; priorF011GroupResultsReusedAsBroadcastProof = $false
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $build 'borrowed-current-producer.json')
InvokeRecordedDotnet 'characterization-captured-default-json' @(
    (Join-Path $currentImage 'AutoPerf.Benchmarks.dll'), '--sources', $currentSources, '--context', 'captured-default-json',
    '--test-assembly', (Join-Path $testImage 'Microsoft.AspNetCore.SignalR.Tests.dll'),
    '--spec-assembly', (Join-Path $testImage 'Microsoft.AspNetCore.SignalR.Specification.Tests.dll'),
    '--characterize', '--artifacts', (Join-Path $run 'characterization\captured-default-json'))
$unchangedOutputs = @(
    foreach ($name in 'Microsoft.AspNetCore.SignalR.Protocols.Json.dll', 'Microsoft.AspNetCore.SignalR.Protocols.Json.pdb')
    {
        $actual = (Get-FileHash (Join-Path $repo "artifacts\bin\Microsoft.AspNetCore.SignalR.Protocols.Json\Release\net12.0\$name")).Hash
        $expected = @($priorManifest.files | Where-Object path -CEQ $name)[0].sha256
        if ($actual -cne $expected)
        {
            throw 'Original repository JSON producer output changed.'
        }
        @{ name = $name; actualSha256 = $actual; originalSha256 = $expected; equal = $true }
    }
)
$unchangedOutputs | ConvertTo-Json | Set-Content (Join-Path $build 'original-repository-json-outputs-unchanged.json')
Write-Output 'F012 independent original/current broadcast probes and all actual timed wrappers passed; identical owning-suite evidence explicitly reused, not rerun.'
