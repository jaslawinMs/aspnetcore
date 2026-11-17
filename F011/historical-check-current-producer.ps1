$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$repo = (Get-Location).Path
$run = Join-Path $PSScriptRoot 'autoperf-runs\F011'
$build = Join-Path $run 'current-producer-preparation-attempt-002'
$image = Join-Path $run 'images\captured-default-json'
$sources = Join-Path $run 'sources\captured-default-json'
$characterization = Join-Path $run 'characterization\captured-default-json'
foreach ($path in $build, $image, $sources, $characterization, (Join-Path $run 'manifest-captured-default-json.json'))
{
    if (Test-Path $path)
    {
        throw "Preserve actual current-producer evidence: $path"
    }
}
$original = Get-Content (Join-Path $run 'manifest-original.json') -Raw | ConvertFrom-Json
$investigation = Get-Content (Join-Path $run 'current-source-investigation.json') -Raw | ConvertFrom-Json
$ready = @(Get-ChildItem (Join-Path $run 'characterization\original\states') -Filter '*-characterization-completed.json')
if ($ready.Count -ne 1 -or -not (Get-Content $ready[0].FullName -Raw | ConvertFrom-Json).passed -or
    (git rev-parse HEAD).Trim() -cne $investigation.baseline -or
    @(git diff --name-only).Count -or @(git diff --cached --name-only).Count)
{
    throw 'Successful original characterization and unchanged baseline required.'
}
foreach ($source in $investigation.sources)
{
    if ((Get-FileHash $source.file).Hash -cne $source.workingSha256)
    {
        throw 'Selected working source changed.'
    }
}
New-Item $build -ItemType Directory -Force | Out-Null
Copy-Item $PSCommandPath (Join-Path $build 'executed-source.ps1')
Copy-Item (Join-Path $run 'investigation\CapturedDefaultJson.targets') (Join-Path $build 'executed-overlay.targets')
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
        candidate = 'F011'; mode = 'Captured-default producer characterization, not an optimization candidate or timing'
        activation = '. .\activate.ps1'; commands = $commands
    } | ConvertTo-Json -Depth 9 | Set-Content (Join-Path $build 'execution.json')
    if ($Label -ne 'inspect-existing-inner-build-hooks')
    {
        Get-Content (Join-Path $build "$Label.log") -Tail 10
    }
    if ($code)
    {
        throw "Current-producer $Label failed; retain the exact attempt."
    }
}
$project = 'src\SignalR\common\Protocols.Json\src\Microsoft.AspNetCore.SignalR.Protocols.Json.csproj'
InvokeRecordedDotnet 'inspect-existing-inner-build-hooks' @(
    'msbuild', $project, '-nologo', '-p:TargetFramework=net12.0',
    '-getProperty:CustomAfterMicrosoftCommonTargets,CustomBeforeMicrosoftCommonTargets,TargetFramework,IsPackable,EnablePackageValidation')
$hooks = (Get-Content (Join-Path $build 'inspect-existing-inner-build-hooks.log') -Raw | ConvertFrom-Json).Properties
$existingAfterHook = -not [string]::IsNullOrWhiteSpace($hooks.CustomAfterMicrosoftCommonTargets) -and
    (Test-Path -LiteralPath $hooks.CustomAfterMicrosoftCommonTargets)
if ($existingAfterHook -or $hooks.TargetFramework -cne 'net12.0' -or
    -not $hooks.CustomBeforeMicrosoftCommonTargets.Contains('Directory.Build.BeforeCommonTargets.targets', [StringComparison]::Ordinal))
{
    throw 'Do not replace an existing after-hook; repository/Arcade before-hooks must remain in force.'
}
[ordered]@{
    candidate = 'F011'; actualDefaultAfterHook = $hooks.CustomAfterMicrosoftCommonTargets
    defaultAfterHookFileExists = $existingAfterHook
    existingBeforeHooksPreserved = $hooks.CustomBeforeMicrosoftCommonTargets
    actualExistingAfterHookReplaced = $false
} | ConvertTo-Json | Set-Content (Join-Path $build 'hook-preconditions.json')
$rootOutput = Join-Path $repo 'artifacts\bin\Microsoft.AspNetCore.SignalR.Protocols.Json\Release\net12.0'
$names = 'Microsoft.AspNetCore.SignalR.Protocols.Json.dll', 'Microsoft.AspNetCore.SignalR.Protocols.Json.pdb'
foreach ($name in $names)
{
    if ((Get-FileHash (Join-Path $rootOutput $name)).Hash -cne
        (Get-FileHash (Join-Path $run "images\original\$name")).Hash)
    {
        throw 'Original protocol build outputs drifted before the isolated producer check.'
    }
}
$currentSource = Join-Path $run 'current-default-canonical\src\SignalR\common\Protocols.Json\src\Protocol\JsonHubProtocol.cs'
$expectedSource = @($investigation.sources | Where-Object file -Like '*\Protocol\JsonHubProtocol.cs')
if ($expectedSource.Count -ne 1 -or (Get-FileHash $currentSource).Hash -cne $expectedSource[0].currentDefaultSha256)
{
    throw 'Exact immutable captured-default protocol source required.'
}
$overlayStarted = $false
try
{
    $overlayStarted = $true
    InvokeRecordedDotnet 'build-captured-default-json-net12' @(
        'build', $project, '-f', 'net12.0', '--no-restore', '--no-dependencies', '-c', 'Release', '-t:Rebuild', '-m:2', '-v:q',
        '-p:UseIisNativeAssets=false', "-p:CustomAfterMicrosoftCommonTargets=$run\investigation\CapturedDefaultJson.targets",
        "-p:F011CapturedDefaultJsonSource=$currentSource", "-p:F011OverlayEvidence=$build\actual-compile-substitution.txt",
        "-bl:$build\build-captured-default-json.binlog")
    $substitution = @(Get-Content (Join-Path $build 'actual-compile-substitution.txt'))
    if ($substitution.Count -ne 2 -or $substitution[1] -cne $currentSource)
    {
        throw 'Actual compile-item substitution evidence required.'
    }
    New-Item $image -ItemType Directory -Force | Out-Null
    Copy-Item (Join-Path $run 'images\original\*') $image -Recurse
    New-Item $sources -ItemType Directory -Force | Out-Null
    Copy-Item (Join-Path $run 'sources\original\*') $sources -Recurse
    foreach ($name in $names)
    {
        Copy-Item (Join-Path $rootOutput $name) (Join-Path $image $name)
    }
    Copy-Item $currentSource (Join-Path $sources 'producer\JsonHubProtocol.cs')
    $files = @(Get-ChildItem $image -Recurse -File | Sort-Object FullName | ForEach-Object {
        @{ path = [IO.Path]::GetRelativePath($image, $_.FullName); bytes = $_.Length; sha256 = (Get-FileHash $_.FullName).Hash }
    })
    $changed = @($files | Where-Object {
        $row = $_
        @($original.files | Where-Object { $_.path -ceq $row.path -and $_.sha256 -ceq $row.sha256 }).Count -ne 1
    } | ForEach-Object path)
    if ($files.Count -ne $original.files.Count -or $changed.Count -ne 2 -or
        @($changed | Where-Object { $_ -cnotin $names }).Count)
    {
        throw 'Only the actual JSON producer DLL/PDB may differ in the captured-default consumer image.'
    }
    $sourceFiles = @(Get-ChildItem $sources -Recurse -File | Sort-Object FullName | ForEach-Object {
        @{ path = [IO.Path]::GetRelativePath($sources, $_.FullName); bytes = $_.Length; sha256 = (Get-FileHash $_.FullName).Hash }
    })
    [ordered]@{
        candidate = 'F011'; variant = 'captured-default-json'; baseline = $investigation.baseline
        capturedDefaultSourceRevision = $investigation.currentDefault; files = $files; sources = $sourceFiles
        actualChangedImageFiles = $changed; unchangedOwner = $true; unchangedHarness = $true
        allOtherImageFilesIdentical = $true; sourceCandidateShapes = 0; measuredProfiles = 0
        wholeCurrentDefaultSdkOrDependencyIntegration = $false
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'manifest-captured-default-json.json')
    $testImage = Join-Path $run 'tests\original\test-image'
    InvokeRecordedDotnet 'characterization-captured-default-producer' @(
        (Join-Path $image 'AutoPerf.Benchmarks.dll'), '--sources', $sources, '--context', 'captured-default-json',
        '--test-assembly', (Join-Path $testImage 'Microsoft.AspNetCore.SignalR.Tests.dll'),
        '--spec-assembly', (Join-Path $testImage 'Microsoft.AspNetCore.SignalR.Specification.Tests.dll'),
        '--characterize', '--artifacts', $characterization)
}
finally
{
    if ($overlayStarted)
    {
        InvokeRecordedDotnet 'restore-original-json-build-outputs' @(
            'build', $project, '-f', 'net12.0', '--no-restore', '--no-dependencies', '-c', 'Release', '-t:Rebuild', '-m:2', '-v:q',
            '-p:UseIisNativeAssets=false', "-bl:$build\restore-original-json.binlog")
        $restored = @()
        foreach ($name in $names)
        {
            $actual = (Get-FileHash (Join-Path $rootOutput $name)).Hash
            $expected = (Get-FileHash (Join-Path $run "images\original\$name")).Hash
            $restored += @{ name = $name; actualSha256 = $actual; originalSha256 = $expected; equal = $actual -ceq $expected }
            if ($actual -cne $expected)
            {
                throw 'Restored original JSON output differs; do not let an overlay contaminate subsequent findings.'
            }
        }
        $restored | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $build 'original-output-restored.json')
    }
}
Write-Output 'F011 captured-default JSON producer: all real-owner/producer and timed-wrapper preflights passed, only JSON DLL/PDB changed; original root outputs restored byte-exact.'
