$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$repo = (Get-Location).Path
$run = Join-Path $PSScriptRoot 'autoperf-runs\F011'
$build = Join-Path $run 'preparation-attempts\attempt-001'
$image = Join-Path $run 'images\original'
$sources = Join-Path $run 'sources\original'
$characterization = Join-Path $run 'characterization\original'
foreach ($path in $build, $image, $sources, $characterization, (Join-Path $run 'manifest-original.json'))
{
    if (Test-Path $path)
    {
        throw "Preserve the actual original preparation: $path"
    }
}
$testAudit = Get-Content (Join-Path $run 'tests\original\actual-test-audit.json') -Raw | ConvertFrom-Json
if ($testAudit.actualTests -ne 27 -or $testAudit.passed -ne 27 -or $testAudit.skipped -ne 0)
{
    throw 'The 27 actual original lifetime-manager test rows are required.'
}
$investigation = Get-Content (Join-Path $run 'current-source-investigation.json') -Raw | ConvertFrom-Json
if ((git rev-parse HEAD).Trim() -cne $investigation.baseline -or
    (git branch --show-current).Trim() -cne $investigation.branch -or
    @(git diff --name-only).Count -or @(git diff --cached --name-only).Count)
{
    throw 'An independent unmodified baseline is required.'
}
foreach ($source in $investigation.sources)
{
    if ((Get-FileHash $source.file).Hash -cne $source.workingSha256)
    {
        throw "Selected original source changed: $($source.file)"
    }
}
New-Item $build -ItemType Directory -Force | Out-Null
Copy-Item $PSCommandPath (Join-Path $build 'executed-source.ps1')
$harness = Join-Path $run 'harness'
$toolchain = Join-Path $harness 'SettingsPreservingEmitToolchain.cs'
if (Test-Path $toolchain)
{
    throw 'Do not silently replace a prepared toolchain.'
}
Copy-Item (Join-Path $PSScriptRoot 'autoperf-runs\F008\harness\SettingsPreservingEmitToolchain.cs') $toolchain
[ordered]@{
    candidate = 'F011'; origin = 'Byte-exact F008 settings-preserving emitted executor; prior F007 attribution retained.'
    sha256 = (Get-FileHash $toolchain).Hash; noPowerPriorityAffinityChanges = $true
} | ConvertTo-Json | Set-Content (Join-Path $build 'toolchain-attribution.json')
$attemptSource = Join-Path $build 'harness-source'
New-Item $attemptSource -ItemType Directory | Out-Null
Get-ChildItem $harness -File | Where-Object { $_.Extension -in '.cs', '.csproj' } |
    Copy-Item -Destination $attemptSource
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
        candidate = 'F011'; variant = 'original'; activation = '. .\activate.ps1'; commands = $commands
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $build 'execution.json')
    Get-Content (Join-Path $build "$Label.log") -Tail 12
    if ($code)
    {
        throw "Original $Label failed; retain its exact source, log and output before repairing."
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
        throw 'The diagnostic owner must be byte-exact to the actual tested original.'
    }
}
New-Item $image -ItemType Directory -Force | Out-Null
Copy-Item (Join-Path $output '*') $image -Recurse
foreach ($kind in 'owner', 'harness', 'test', 'producer')
{
    New-Item (Join-Path $sources $kind) -ItemType Directory -Force | Out-Null
}
$core = Join-Path $repo 'src\SignalR\server\Core\src'
foreach ($file in Get-ChildItem $core -Recurse -File | Where-Object { $_.Extension -in '.cs', '.csproj', '.txt' })
{
    $target = Join-Path $sources ('owner\' + [IO.Path]::GetRelativePath($core, $file.FullName))
    New-Item (Split-Path $target -Parent) -ItemType Directory -Force | Out-Null
    Copy-Item $file.FullName $target
}
Get-ChildItem $harness -File | Where-Object { $_.Extension -in '.cs', '.csproj' } |
    Copy-Item -Destination (Join-Path $sources 'harness')
foreach ($source in @(
    'src\SignalR\server\SignalR\test\Microsoft.AspNetCore.SignalR.Tests\DefaultHubLifetimeManagerTests.cs',
    'src\SignalR\server\Specification.Tests\src\HubLifetimeManagerTestBase.cs'))
{
    Copy-Item $source (Join-Path $sources 'test')
}
foreach ($source in @(
    'src\SignalR\common\Protocols.Json\src\Protocol\JsonHubProtocol.cs',
    'src\SignalR\common\SignalR.Common\src\Protocol\IHubProtocol.cs',
    'src\SignalR\common\SignalR.Common\src\Protocol\HubProtocolExtensions.cs',
    'src\Servers\Connections.Abstractions\src\DefaultConnectionContext.cs'))
{
    Copy-Item $source (Join-Path $sources 'producer')
}
$testImage = Join-Path $run 'tests\original\test-image'
foreach ($name in 'Microsoft.AspNetCore.SignalR.Specification.Tests.dll', 'Microsoft.AspNetCore.SignalR.Specification.Tests.pdb')
{
    Copy-Item (Join-Path $repo "artifacts\bin\Microsoft.AspNetCore.SignalR.Tests\Release\net12.0\$name") (Join-Path $testImage $name)
}
[ordered]@{
    candidate = 'F011'; capturedAfterOriginalTestExecution = $true; testsRebuiltOrRerun = $false
    explanation = 'Preserved the existing tested specification DLL/PDB after the owning test run; harness build used --no-dependencies.'
    files = @(Get-ChildItem $testImage -File | ForEach-Object {
        @{ name = $_.Name; bytes = $_.Length; sha256 = (Get-FileHash $_.FullName).Hash }
    })
} | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $build 'additional-tested-image-capture.json')
$files = @(Get-ChildItem $image -Recurse -File | Sort-Object FullName | ForEach-Object {
    @{ path = [IO.Path]::GetRelativePath($image, $_.FullName); bytes = $_.Length; sha256 = (Get-FileHash $_.FullName).Hash }
})
$sourceFiles = @(Get-ChildItem $sources -Recurse -File | Sort-Object FullName | ForEach-Object {
    @{ path = [IO.Path]::GetRelativePath($sources, $_.FullName); bytes = $_.Length; sha256 = (Get-FileHash $_.FullName).Hash }
})
[ordered]@{
    candidate = 'F011'; variant = 'original'; baseline = $investigation.baseline; sourceCandidateShapes = 0; pairedComparisons = 0
    files = $files; sources = $sourceFiles
    ownerDllSha256 = (Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.SignalR.Core.dll')).Hash
    ownerPdbSha256 = (Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.SignalR.Core.pdb')).Hash
    harnessDllSha256 = (Get-FileHash (Join-Path $image 'AutoPerf.Benchmarks.dll')).Hash
    harnessPdbSha256 = (Get-FileHash (Join-Path $image 'AutoPerf.Benchmarks.pdb')).Hash
    jsonProtocolSha256 = (Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.SignalR.Protocols.Json.dll')).Hash
    benchmarkDotNetSha256 = (Get-FileHash (Join-Path $image 'BenchmarkDotNet.dll')).Hash
    boundedSelectedSourcePdbEvidenceNotWholeSdkProvenance = $true
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'manifest-original.json')
InvokeRecordedDotnet 'characterization' @(
    (Join-Path $image 'AutoPerf.Benchmarks.dll'), '--sources', $sources, '--context', 'original',
    '--test-assembly', (Join-Path $testImage 'Microsoft.AspNetCore.SignalR.Tests.dll'),
    '--spec-assembly', (Join-Path $testImage 'Microsoft.AspNetCore.SignalR.Specification.Tests.dll'),
    '--characterize', '--artifacts', $characterization)
Write-Output "F011 original image frozen: $($files.Count) files / $($sourceFiles.Count) source snapshots; actual public owner/producer probes passed."
