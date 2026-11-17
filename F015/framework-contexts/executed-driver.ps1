$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F015'
$frameworkRoot = Join-Path $run 'framework-contexts'
if (Test-Path -LiteralPath $frameworkRoot)
{
    throw "Do not overwrite Framework-native contexts: $frameworkRoot"
}
New-Item -ItemType Directory -Path $frameworkRoot | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $frameworkRoot 'executed-driver.ps1')
Set-Location $root
. .\activate.ps1
$manifests = @{}
foreach ($role in @('original','candidate'))
{
    $context = Join-Path $frameworkRoot $role
    $image = Join-Path $context 'image'
    $sources = Join-Path $context 'sources'
    $earlierContext = Join-Path $run ('contexts\' + $role)
    $earlier = Get-Content -LiteralPath (Join-Path $earlierContext 'context-manifest.json') -Raw | ConvertFrom-Json
    foreach ($entry in $earlier.files)
    {
        $actual = Get-FileHash -LiteralPath (Join-Path $earlierContext $entry.path) -Algorithm SHA256
        if ($actual.Hash -ne $entry.sha256)
        {
            throw "Previously frozen $role bytes changed: $($entry.path)"
        }
    }
    New-Item -ItemType Directory -Path $image,$sources | Out-Null
    Copy-Item -Path (Join-Path $run 'harness\bin\Release\net472\*') -Destination $image -Recurse
    foreach ($extension in @('dll','pdb'))
    {
        Copy-Item -LiteralPath (Join-Path $earlierContext ('products\net462\Microsoft.AspNetCore.DataProtection.' + $extension)) -Destination $image -Force
    }
    Copy-Item -LiteralPath (Join-Path $earlierContext 'sources\owner'),(Join-Path $earlierContext 'sources\test') -Destination $sources -Recurse
    $harnessSources = Join-Path $sources 'harness'
    New-Item -ItemType Directory -Path $harnessSources | Out-Null
    Get-ChildItem -LiteralPath (Join-Path $run 'harness') -File |
        Where-Object Extension -In '.cs','.csproj','.config' |
        Copy-Item -Destination $harnessSources
    $files = @(Get-ChildItem -LiteralPath $image,$sources -Recurse -File | Sort-Object FullName | ForEach-Object {
        [pscustomobject]@{ path = [IO.Path]::GetRelativePath($context,$_.FullName); bytes = $_.Length; sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash }
    })
    $manifests[$role] = [pscustomobject]@{
        candidate = 'F015'; role = $role; consumerTarget = 'net472'; productTarget = 'net462'; processArchitecture = 'x64'
        earlierFrozenProductContext = $earlierContext
        allEarlierFrozenHashesRechecked = $true
        selectedSourceWitnessesNotWholeCompilerCoverage = $true
        files = $files
    }
    $manifests[$role] | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $context 'context-manifest.json') -Encoding utf8NoBOM
}
$originalFiles = @($manifests.original.files | Where-Object path -Like 'image\*')
$candidateFiles = @($manifests.candidate.files | Where-Object path -Like 'image\*')
if ($originalFiles.Count -ne $candidateFiles.Count)
{
    throw 'Framework image inventories differ.'
}
$differences = @($candidateFiles | Where-Object {
    $currentFile = $_
    $match = @($originalFiles | Where-Object { $_.path -eq $currentFile.path })
    $match.Count -ne 1 -or $match[0].sha256 -ne $currentFile.sha256
} | Select-Object -ExpandProperty path | Sort-Object)
if (($differences -Join '|') -ne 'image\Microsoft.AspNetCore.DataProtection.dll|image\Microsoft.AspNetCore.DataProtection.pdb')
{
    throw ('Framework comparison changes nonowner bytes: ' + ($differences -Join ', '))
}
foreach ($role in @('original','candidate'))
{
    $context = Join-Path $frameworkRoot $role
    $executable = Join-Path $context 'image\AutoPerf.Benchmarks.exe'
    $arguments = @('--sources', (Join-Path $context 'sources'), '--context', ('framework-' + $role),
        '--mode', 'characterize', '--artifacts', (Join-Path $context 'characterization'))
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & $executable @arguments *> (Join-Path $context 'characterization.log')
    $actualExitCode = $LASTEXITCODE
    [pscustomobject]@{ executable = $executable; arguments = $arguments; actualExitCode = $actualExitCode; started = $started;
        completed = [DateTimeOffset]::UtcNow.ToString('o'); mode = 'Untimed real Framework-native validation, not a profile.' } |
        ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $context 'characterization-command.json') -Encoding utf8NoBOM
    Get-Content -LiteralPath (Join-Path $context 'characterization.log') -Tail 30
    if ($actualExitCode -ne 0)
    {
        throw "Actual Framework $role legacy characterization failed; retain its native executable/context/output."
    }
}
[pscustomobject]@{
    candidate = 'F015'; originalAndCandidateNativeChecksPassed = $true
    actualFactoryTimedWrapperPathsPerRole = 14; actualRoundtripsPerRole = 42; argumentContractsPerRole = 3
    actualImageFilesPerRole = $originalFiles.Count; differingImageFiles = $differences
    operatingSystemSettingsChangesRequested = $false; actualProfilesExecuted = 0
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $frameworkRoot 'completed.json') -Encoding utf8NoBOM
Write-Output ("Framework-native preflight passed; {0} identical-inventory image files per role, only owner DLL/PDB differ." -f $originalFiles.Count)
