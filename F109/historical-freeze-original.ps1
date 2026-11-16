$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F109'
$built=Join-Path $run 'harness\bin\Release\net12.0'
$destination=Join-Path $run 'binaries\original'
if (Test-Path $destination) { throw 'Retain the frozen original image.' }
if ((git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
    (git branch --show-current).Trim() -cne 'autoperf/F109-token-base64-preflight')
{
    throw 'The independent unchanged F109 baseline branch is required.'
}
git diff --quiet HEAD --
if ($LASTEXITCODE) { throw 'Original freezing requires unchanged tracked shipping source.' }
$audit=Get-Content (Join-Path $run 'tests\original-red\test-audit.json') -Raw|ConvertFrom-Json
$probe=Get-Content (Join-Path $run 'verification\development-original\states\contract-resources.json') -Raw|ConvertFrom-Json
if ($probe.contracts.Count -ne 33 -or $probe.independentContractRuns -ne 66 -or
    $probe.harnessSha256 -cne (Get-FileHash (Join-Path $built 'AutoPerf.Benchmarks.dll')).Hash)
{
    throw 'The actual complete original probe must bind this final harness.'
}
foreach ($owner in $audit.actualOwners)
{
    if ((Get-FileHash (Join-Path $built "$($owner.assembly).dll")).Hash -cne $owner.sha256 -or
        (Get-FileHash $owner.file).Hash -cne $owner.sha256) { throw 'Executed original test owner changed.' }
}
$sources=@(Get-Content (Join-Path $run 'producer-source-copies.json') -Raw|ConvertFrom-Json)
if ($sources.Count -ne 21) { throw 'All21 exact original/current-default scoped sources are required.' }
foreach ($source in $sources)
{
    if ((Get-FileHash $source.path).Hash -cne $source.rawSha256 -or
        (Get-FileHash (Join-Path $run $source.rawSnapshot)).Hash -cne $source.rawSha256 -or -not $source.equalityVerified)
    {
        throw "Captured unchanged raw source differs:$($source.path)"
    }
}
New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force|Out-Null
Copy-Item -LiteralPath $built -Destination $destination -Recurse
$configuration=Join-Path $run 'execution-image-metadata\original'
New-Item -ItemType Directory -Path $configuration -Force|Out-Null
foreach ($name in 'AutoPerf.Benchmarks.runtimeconfig.json','AutoPerf.Benchmarks.deps.json')
{
    Copy-Item (Join-Path $destination $name) (Join-Path $configuration $name)
}
$sourceRoot=Join-Path $run 'source-original\harness'
New-Item -ItemType Directory -Path $sourceRoot -Force|Out-Null
$harnessSources=@(foreach ($file in Get-ChildItem (Join-Path $run 'harness') -File -Force |
    Where-Object {$_.Extension -in '.cs','.csproj' -or $_.Name -ceq '.editorconfig'})
{
    Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $sourceRoot $file.Name)
    [pscustomobject]@{file=$file.Name;sha256=(Get-FileHash $file.FullName).Hash}
})
$additionalOwners=@(foreach ($name in 'Microsoft.AspNetCore.DataProtection','Microsoft.AspNetCore.DataProtection.Extensions')
{
    [pscustomobject]@{assembly=$name;file=(Join-Path $destination "$name.dll");sha256=(Get-FileHash (Join-Path $destination "$name.dll")).Hash}
})
[ordered]@{
    candidate='F109';variant='original';baselineSourceRevision=(git rev-parse HEAD).Trim()
    branch=(git branch --show-current).Trim();sourceTrackedUnchanged=$true;publicApiChanged=$false
    actualOwners=@($audit.actualOwners)+$additionalOwners;harnessSources=$harnessSources
    harnessSha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.dll')).Hash
    harnessPdbSha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.pdb')).Hash
    runtimeConfigurationSha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.runtimeconfig.json')).Hash
    dependencyConfigurationSha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.deps.json')).Hash
    configuration='Release';harnessFramework='net12.0';ownerFramework='net12.0'
    scopedSourceIdentities=21;profileCount=33;sourceComparisons=0
    privateFixtureKeysOutsideExecutionImage=$true;capturedAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $run 'original-manifest.json') -Encoding utf8
$toolRoot=Join-Path $PSScriptRoot 'autoperf-runs\F071\tools'
$tool=Join-Path $toolRoot 'bin\Release\net12.0\AutoPerf.Evidence.dll'
$toolSource=Join-Path $run 'evidence-tool-source'
New-Item -ItemType Directory -Path $toolSource -Force|Out-Null
$toolSources=@(foreach ($file in Get-ChildItem $toolRoot -File -Force |
    Where-Object {$_.Extension -in '.cs','.csproj' -or $_.Name -ceq '.editorconfig'})
{
    Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $toolSource $file.Name)
    [pscustomobject]@{file=$file.Name;sha256=(Get-FileHash $file.FullName).Hash}
})
$commands=[System.Collections.Generic.List[object]]::new()
function ProveSource([string]$Pdb,[string]$Source,[string]$Output,[string]$Kind)
{
    $arguments=@($tool,'pdb',$Pdb,(Split-Path $Source -Leaf),$Source)
    dotnet @arguments > $Output
    $code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{arguments=$arguments;exitCode=$code;kind=$Kind})
    if ($code) { throw "Actual source/PDB mismatch:$Source" }
}
ProveSource (Join-Path $toolRoot 'bin\Release\net12.0\AutoPerf.Evidence.pdb') (Join-Path $toolSource 'Program.cs') `
    (Join-Path $run 'evidence-tool-source-pdb.json') 'reused-evidence-tool'
foreach ($source in Get-ChildItem $sourceRoot -Filter '*.cs' -File)
{
    ProveSource (Join-Path $destination 'AutoPerf.Benchmarks.pdb') $source.FullName `
        (Join-Path $run "harness-$($source.BaseName)-pdb-original.json") 'harness'
}
foreach ($row in @(
    @('Microsoft.AspNetCore.Identity','src\Identity\Core\src\DataProtectorTokenProvider.cs'),
    @('Microsoft.AspNetCore.Identity','src\Identity\Core\src\DataProtectionTokenProviderOptions.cs'),
    @('Microsoft.Extensions.Identity.Core','src\Identity\Extensions.Core\src\UserManager.cs'),
    @('Microsoft.Extensions.Identity.Core','src\Identity\Extensions.Core\src\LoggerEventIds.cs'),
    @('Microsoft.AspNetCore.DataProtection','src\DataProtection\DataProtection\src\KeyManagement\KeyRingBasedDataProtector.cs')
))
{
    $source=Join-Path $run ("producer-source\"+$row[1])
    ProveSource (Join-Path $destination "$($row[0]).pdb") $source `
        (Join-Path $run "owner-$([IO.Path]::GetFileNameWithoutExtension($source))-pdb-original.json") 'selected-owning-source'
}
$testImage=Join-Path $run 'tests\original-red\image'
New-Item -ItemType Directory -Path $testImage -Force|Out-Null
$testFiles=@(foreach ($name in 'Microsoft.AspNetCore.Identity.Test.dll','Microsoft.AspNetCore.Identity.Test.pdb','Microsoft.AspNetCore.Identity.Test.deps.json')
{
    Copy-Item -LiteralPath (Join-Path $audit.actualOutput $name) -Destination (Join-Path $testImage $name)
    [pscustomobject]@{file=$name;sha256=(Get-FileHash (Join-Path $testImage $name)).Hash}
})
$testSource=Join-Path $run 'tests\original-red\source\DataProtectorTokenProviderTest.cs'
if ((Get-FileHash $testSource).Hash -cne (Get-FileHash 'src\Identity\test\Identity.Test\DataProtectorTokenProviderTest.cs').Hash)
{
    throw 'Actual original-red test source changed before its image proof.'
}
ProveSource (Join-Path $testImage 'Microsoft.AspNetCore.Identity.Test.pdb') $testSource `
    (Join-Path $run 'tests\original-red\DataProtectorTokenProviderTest-source-pdb.json') 'original-red-new-test-source'
ProveSource (Join-Path $testImage 'Microsoft.AspNetCore.Identity.Test.pdb') `
    (Join-Path $run 'producer-source\src\Identity\test\Identity.Test\UserManagerTest.cs') `
    (Join-Path $run 'tests\original-red\UserManagerTest-source-pdb.json') 'original-red-existing-test-source'
$commands|ConvertTo-Json -Depth 7|Set-Content (Join-Path $run 'pdb-original-commands.json') -Encoding utf8
if ($commands.Count -ne 13) { throw 'All5 harness/5 owner/2 test/1 evidence-tool source associations are required.' }
[ordered]@{
    candidate='F109';label='original-red';actualTestRows=$audit.actualControlRows;passed=$audit.passed;expectedFailures=$audit.failed
    actualOutputOwnerIdentities=$audit.actualOwners;copiedTestFiles=$testFiles
    evidenceToolSha256=(Get-FileHash $tool).Hash;evidenceToolSourceCopies=$toolSources
    unchangedRowsNotRerun=$true;initialTwoFactTestModuleNotPreserved=$true
    outputIdentityNotInTestLoadedHashMarker=$true;sourcePdbAssociationNotMethodCoverage=$true
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $run 'tests\original-red\actual-binary-execution-proof.json') -Encoding utf8
[ordered]@{
    capturedAt=[DateTimeOffset]::UtcNow.ToString('o')
    system=Get-CimInstance Win32_ComputerSystem|Select-Object Manufacturer,Model,TotalPhysicalMemory,NumberOfLogicalProcessors
    processors=@(Get-CimInstance Win32_Processor|Select-Object Name,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed)
    operatingSystem=Get-CimInstance Win32_OperatingSystem|Select-Object Caption,Version,LastBootUpTime
    sharedWindowsHost=$true;unrelatedProcessesPowerAffinityPriorityNotChanged=$true;maximumBuildNodes=2
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $run 'host-metadata.json') -Encoding utf8
node (Join-Path $PSScriptRoot 'F109-closure.mjs') $run original
if ($LASTEXITCODE) { throw 'Actual frozen original closure/runtime assets differ.' }
Write-Output 'F109 original frozen;13 exact source/PDB associations/red test image retained;no method-coverage claim.'
