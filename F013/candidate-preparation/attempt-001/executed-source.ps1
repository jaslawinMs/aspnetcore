$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F013'
$variant = 'native-specialization-001'
$preparation = Join-Path $run 'candidate-preparation\attempt-001'
$originalTest = Join-Path $run 'tests\owning-comparison\original-attempt-002'
$candidateTest = Join-Path $run "tests\owning-comparison\$variant"
foreach ($directory in $preparation, (Join-Path $run 'sources\comparison-original'),
    (Join-Path $run "images\$variant"), (Join-Path $run "sources\$variant"),
    (Join-Path $run "images\$variant-current-json"), (Join-Path $run "sources\$variant-current-json"))
{
    if (Test-Path $directory)
    {
        throw "Preserve actual comparison image/preparation: $directory"
    }
}
$originalTests = Get-Content (Join-Path $originalTest 'actual-test-audit.json') -Raw | ConvertFrom-Json
$candidateTests = Get-Content (Join-Path $candidateTest 'actual-test-audit.json') -Raw | ConvertFrom-Json
if ($originalTests.actualTests -ne 28 -or $candidateTests.actualTests -ne 28 -or
    $originalTests.passed -ne 28 -or $candidateTests.passed -ne 28 -or
    $originalTests.actualTestSourceSha256 -cne $candidateTests.actualTestSourceSha256)
{
    throw 'Both fresh28-row owning runs with the identical preservation test required.'
}
New-Item $preparation -ItemType Directory -Force | Out-Null
Copy-Item $PSCommandPath (Join-Path $preparation 'executed-source.ps1')
function Describe([string]$Directory)
{
    return @(Get-ChildItem $Directory -Recurse -File | Sort-Object FullName | ForEach-Object {
        @{ path = [IO.Path]::GetRelativePath($Directory, $_.FullName); bytes = $_.Length; sha256 = (Get-FileHash $_.FullName).Hash }
    })
}
$original = Get-Content (Join-Path $run 'manifest-original.json') -Raw | ConvertFrom-Json
$originalImage = Join-Path $run 'images\original'
foreach ($file in $original.files)
{
    if ((Get-FileHash (Join-Path $originalImage $file.path)).Hash -cne $file.sha256)
    {
        throw 'Frozen original image changed.'
    }
}
$originalSources = Join-Path $run 'sources\comparison-original'
Copy-Item (Join-Path $run 'sources\original') $originalSources -Recurse
Copy-Item (Join-Path $originalTest 'DefaultHubLifetimeManagerTests.cs') (Join-Path $originalSources 'test\DefaultHubLifetimeManagerTests.cs')
$candidateImage = Join-Path $run "images\$variant"
$candidateSources = Join-Path $run "sources\$variant"
Copy-Item $originalImage $candidateImage -Recurse
Copy-Item $originalSources $candidateSources -Recurse
foreach ($name in 'Microsoft.AspNetCore.SignalR.Core.dll', 'Microsoft.AspNetCore.SignalR.Core.pdb')
{
    $file = Join-Path $candidateTest "test-image\$name"
    if ((Get-FileHash $file).Hash -cne @($candidateTests.binaryHashes | Where-Object name -CEQ $name)[0].sha256)
    {
        throw 'Candidate bytes differ from actual fresh owning-test image.'
    }
    Copy-Item $file (Join-Path $candidateImage $name)
}
Copy-Item (Join-Path $candidateTest 'DefaultHubLifetimeManager.cs') (Join-Path $candidateSources 'owner\DefaultHubLifetimeManager.cs')
$candidateFiles = Describe $candidateImage
$candidateSourceFiles = Describe $candidateSources
$originalSourceFiles = Describe $originalSources
$changed = @($candidateFiles | Where-Object {
    $item = $_
    $item.sha256 -cne @($original.files | Where-Object path -CEQ $item.path)[0].sha256
} | Select-Object -ExpandProperty path)
$changedSources = @($candidateSourceFiles | Where-Object {
    $item = $_
    $item.sha256 -cne @($originalSourceFiles | Where-Object path -CEQ $item.path)[0].sha256
} | Select-Object -ExpandProperty path)
if ($candidateFiles.Count -ne 80 -or $candidateSourceFiles.Count -ne 89 -or $originalSourceFiles.Count -ne 89 -or
    $changed.Count -ne 2 -or @($changed | Where-Object { $_ -notin 'Microsoft.AspNetCore.SignalR.Core.dll', 'Microsoft.AspNetCore.SignalR.Core.pdb' }).Count -or
    $changedSources.Count -ne 1 -or $changedSources[0] -cne 'owner\DefaultHubLifetimeManager.cs')
{
    throw 'Only the declared owner DLL/PDB/source may differ across comparison inputs.'
}
foreach ($role in 'comparison-original', $variant)
{
    $image = if ($role -ceq 'comparison-original') { $originalImage } else { $candidateImage }
    $sources = if ($role -ceq 'comparison-original') { $originalSources } else { $candidateSources }
    $tests = if ($role -ceq 'comparison-original') { $originalTest } else { $candidateTest }
    [ordered]@{
        candidate = 'F013'; variant = $role; imageDirectory = [IO.Path]::GetRelativePath($run, $image)
        sourceDirectory = [IO.Path]::GetRelativePath($run, $sources); owningTestDirectory = [IO.Path]::GetRelativePath($run, $tests)
        files = (Describe $image); sources = (Describe $sources)
        ownerDllSha256 = (Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.SignalR.Core.dll')).Hash
        ownerPdbSha256 = (Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.SignalR.Core.pdb')).Hash
        harnessDllSha256 = (Get-FileHash (Join-Path $image 'AutoPerf.Benchmarks.dll')).Hash
        harnessPdbSha256 = (Get-FileHash (Join-Path $image 'AutoPerf.Benchmarks.pdb')).Hash
        benchmarkDotNetSha256 = (Get-FileHash (Join-Path $image 'BenchmarkDotNet.dll')).Hash
        actualFreshOwningRows = 28; identicalTestSource = $true; actualChangedImageFiles = $changed
        allOther78ConsumerFilesByteIdentical = $true; actualChangedComparisonSources = $changedSources
        algorithmicLinearCostEliminated = $false; gainNotAssumed = $true
    } | ConvertTo-Json -Depth 9 | Set-Content (Join-Path $run "manifest-$role.json")
}
$currentImage = Join-Path $run "images\$variant-current-json"
$currentSources = Join-Path $run "sources\$variant-current-json"
Copy-Item $candidateImage $currentImage -Recurse
Copy-Item $candidateSources $currentSources -Recurse
$captured = Get-Content (Join-Path $run 'manifest-captured-default-json.json') -Raw | ConvertFrom-Json
foreach ($name in 'Microsoft.AspNetCore.SignalR.Protocols.Json.dll', 'Microsoft.AspNetCore.SignalR.Protocols.Json.pdb')
{
    $from = Join-Path $run "images\captured-default-json\$name"
    if ((Get-FileHash $from).Hash -cne @($captured.files | Where-Object path -CEQ $name)[0].sha256)
    {
        throw 'Actual previously characterized captured-default JSON bytes differ.'
    }
    Copy-Item $from (Join-Path $currentImage $name)
}
Copy-Item (Join-Path $run 'current-default-canonical\src\SignalR\common\Protocols.Json\src\Protocol\JsonHubProtocol.cs') `
    (Join-Path $currentSources 'producer\JsonHubProtocol.cs')
[ordered]@{
    candidate = 'F013'; variant = "$variant-current-json"; files = (Describe $currentImage); sources = (Describe $currentSources)
    capturedDefaultSourceRevision = $captured.capturedDefaultSourceRevision
    candidateOwnerUnchanged = $true; actualCurrentJsonProducerExplicitlyReused = $true
    newCurrentProducerBuildClaimed = $false; wholeCurrentDefaultSdkIntegrationClaimed = $false
} | ConvertTo-Json -Depth 9 | Set-Content (Join-Path $run "manifest-$variant-current-json.json")
$commands = [System.Collections.Generic.List[object]]::new()
foreach ($role in $variant, "$variant-current-json")
{
    $image = Join-Path $run "images\$role"
    $sources = Join-Path $run "sources\$role"
    $arguments = @((Join-Path $image 'AutoPerf.Benchmarks.dll'), '--sources', $sources, '--context', $role,
        '--test-assembly', (Join-Path $candidateTest 'test-image\Microsoft.AspNetCore.SignalR.Tests.dll'),
        '--spec-assembly', (Join-Path $candidateTest 'test-image\Microsoft.AspNetCore.SignalR.Specification.Tests.dll'),
        '--characterize', '--artifacts', (Join-Path $run "characterization\$role"))
    $started = [DateTimeOffset]::UtcNow
    & dotnet @arguments *> (Join-Path $preparation "$role.log")
    $code = $LASTEXITCODE
    $commands.Add([pscustomobject]@{
        role = $role; entryPoint = 'dotnet'; arguments = $arguments; actualExitCode = $code
        startedUtc = $started.ToString('o'); completedUtc = [DateTimeOffset]::UtcNow.ToString('o')
    })
    [ordered]@{ candidate = 'F013'; commands = $commands; timingStarted = $false } |
        ConvertTo-Json -Depth 8 | Set-Content (Join-Path $preparation 'execution.json')
    Get-Content (Join-Path $preparation "$role.log") -Tail 10
    if ($code)
    {
        throw 'Actual candidate producer characterization failed; preserve exact image and observations.'
    }
}
$budgetPath = Join-Path $run 'measurement-budget.json'
$budget = Get-Content $budgetPath -Raw | ConvertFrom-Json
if ($budget.closed -or $budget.usedComparisons -ne 0 -or $budget.originalProfiles -ne 0 -or $budget.candidateProfiles -ne 0)
{
    throw 'No F013 timing may precede comparison image/producer validation.'
}
$budget.sourceCandidateShapes = 1
$budget.reason = 'Both actual original/current JSON versions pass18 native checks+14 wrappers with candidate owner. Two fresh28-row owning runs and identical otherwise80-file/89-source comparison inputs established. No timing yet.'
$budget | ConvertTo-Json -Depth 8 | Set-Content $budgetPath
Write-Output 'F013 candidate: fresh28-row owning coverage and both real producer versions pass; only owner DLL/PDB/source differ across otherwise identical comparison inputs. No timing launched.'
