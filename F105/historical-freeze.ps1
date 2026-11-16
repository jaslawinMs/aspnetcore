$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F105'
$built = Join-Path $run 'harness\bin\Release\net12.0'
$destination = Join-Path $run 'binaries\original'
if (Test-Path $destination) { throw 'Frozen original exists;do not overwrite.' }
if ((git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
    (git branch --show-current).Trim() -cne 'autoperf/F105-validation-state-enumeration')
{
    throw 'The independent unchanged F105 baseline branch is required.'
}
git diff --quiet HEAD --
if ($LASTEXITCODE) { throw 'No tracked shipping source may differ for this original-only image.' }
$audit = Get-Content (Join-Path $run 'tests\original\test-audit.json') -Raw | ConvertFrom-Json
foreach ($owner in $audit.actualOwners)
{
    if ((Get-FileHash (Join-Path $built "$($owner.assembly).dll")).Hash -cne $owner.sha256)
    {
        throw 'Actual original built owner differs from the executed control output.'
    }
}
$sources = @(Get-Content (Join-Path $run 'producer-source-copies.json') -Raw | ConvertFrom-Json)
if ($sources.Count -ne 20) { throw 'All20 actual current/baseline scoped source identities are required.' }
foreach ($source in $sources)
{
    if ((Get-FileHash -LiteralPath $source.path).Hash -cne $source.rawSha256 -or
        (Get-FileHash (Join-Path $run $source.rawSnapshot)).Hash -cne $source.rawSha256 -or -not $source.equalityVerified)
    {
        throw "Captured original raw source differs:$($source.path)"
    }
}
New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
Copy-Item -LiteralPath $built -Destination $destination -Recurse
$configuration = Join-Path $run 'execution-image-metadata\original'
New-Item -ItemType Directory -Path $configuration -Force | Out-Null
foreach ($name in 'AutoPerf.Benchmarks.runtimeconfig.json','AutoPerf.Benchmarks.deps.json')
{
    Copy-Item -LiteralPath (Join-Path $destination $name) -Destination (Join-Path $configuration $name)
}
$sourceRows = @($sources | ForEach-Object {[pscustomobject]@{source=$_.path;copy=$_.rawSnapshot;sha256=$_.rawSha256}})
$sourceRows | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run 'source-copies-original.json') -Encoding utf8
[ordered]@{
    candidate='F105';variant='original';baselineSourceRevision=(git rev-parse HEAD).Trim()
    branch=(git branch --show-current).Trim();sourceTrackedUnchanged=$true;publicApiChanged=$false
    actualOwners=$audit.actualOwners;harnessSha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.dll')).Hash
    harnessPdbSha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.pdb')).Hash
    runtimeConfigurationSha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.runtimeconfig.json')).Hash
    dependencyConfigurationSha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.deps.json')).Hash
    configuration='Release';harnessFramework='net12.0';ownerFramework='net12.0'
    scopedSourceIdentities=20;profileCount=24;sourceComparisons=0
    sourceOnlyStructSignatureWasNotBuiltOrExecuted=$true;capturedAt=[DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $run 'original-manifest.json') -Encoding utf8
$tool = Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'
$commands = [System.Collections.Generic.List[object]]::new()
foreach ($file in Get-ChildItem (Join-Path $run 'harness') -Filter '*.cs' -File)
{
    $arguments = @($tool,'pdb',(Join-Path $destination 'AutoPerf.Benchmarks.pdb'),$file.Name,$file.FullName)
    dotnet @arguments > (Join-Path $run "harness-$($file.BaseName)-pdb-original.json")
    $code = $LASTEXITCODE
    $commands.Add([pscustomobject]@{arguments=$arguments;exitCode=$code;kind='harness';source=$file.Name})
    if ($code) { throw "Actual harness/source PDB mismatch:$($file.Name)" }
}
foreach ($source in $sourceRows | Where-Object {$_.source.EndsWith('.cs') -and $_.source.Contains('\src\') -and -not $_.source.Contains('\test\')})
{
    $assembly = if ($source.source.StartsWith('src\Mvc\Mvc.Abstractions\src\')) {'Microsoft.AspNetCore.Mvc.Abstractions'}
        elseif ($source.source.StartsWith('src\Mvc\Mvc.Core\src\')) {'Microsoft.AspNetCore.Mvc.Core'}
        elseif ($source.source.StartsWith('src\Mvc\Mvc.DataAnnotations\src\')) {'Microsoft.AspNetCore.Mvc.DataAnnotations'}
        else {throw 'Unexpected owning source scope.'}
    $name = Split-Path $source.source -Leaf
    $arguments = @($tool,'pdb',(Join-Path $destination "$assembly.pdb"),$name,(Join-Path $run $source.copy))
    dotnet @arguments > (Join-Path $run "owner-$([IO.Path]::GetFileNameWithoutExtension($name))-pdb-original.json")
    $code = $LASTEXITCODE
    $commands.Add([pscustomobject]@{arguments=$arguments;exitCode=$code;kind='actual-owning-assembly-source';source=$source.source})
    if ($code) { throw "Actual owning-source PDB mismatch:$name" }
}
$commands | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $run 'pdb-original-commands.json') -Encoding utf8
if ($commands.Count -ne 17) { throw 'All4 harness/13 selected owning-source associations are required.' }
[ordered]@{
    capturedAt=[DateTimeOffset]::UtcNow.ToString('o')
    system=Get-CimInstance Win32_ComputerSystem | Select-Object Manufacturer,Model,TotalPhysicalMemory,NumberOfLogicalProcessors
    processors=@(Get-CimInstance Win32_Processor | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed)
    operatingSystem=Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,LastBootUpTime
    sharedWindowsHost=$true;unrelatedProcessesPowerAffinityPriorityNotChanged=$true;maximumBuildNodes=2
} | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $run 'host-metadata.json') -Encoding utf8
node (Join-Path $PSScriptRoot 'F105-closure.mjs') $run
if ($LASTEXITCODE) { throw 'Actual frozen original closure/config/runtime assets differ.' }
Write-Output 'F105 exact original image frozen;17 selected source/PDB associations passed,not method coverage.'
