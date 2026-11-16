$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F109'
$destination=Join-Path $run 'binaries\candidate1'
if (Test-Path $destination) { throw 'Retain the frozen first candidate.' }
& (Join-Path $PSScriptRoot 'F109-test.ps1') -Label candidate1-green -Expectation green
$formatArguments=@('format','whitespace','src\Identity\Core\src\Microsoft.AspNetCore.Identity.csproj',
    '--no-restore','--verify-no-changes','--include','src\Identity\Core\src\DataProtectorTokenProvider.cs')
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @formatArguments *> (Join-Path $run 'format-candidate1.log')
$code=$LASTEXITCODE
[ordered]@{
    arguments=$formatArguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $run 'format-candidate1-command.json') -Encoding utf8
if ($code) { throw 'Scoped changed-source formatting failed;retain it.' }
$original=Get-Content (Join-Path $run 'original-manifest.json') -Raw|ConvertFrom-Json
$audit=Get-Content (Join-Path $run 'tests\candidate1-green\test-audit.json') -Raw|ConvertFrom-Json
if ($audit.passed -ne 7 -or $audit.failed -ne 0 -or $audit.skipped -ne 0) { throw 'Every exact focused row must pass.' }
foreach ($owner in $audit.actualOwners)
{
    if ($owner.assembly -ceq 'Microsoft.AspNetCore.Identity')
    {
        if ($owner.sha256 -ceq $original.actualOwners[0].sha256) { throw 'The target owner did not change.' }
    }
    elseif ($owner.sha256 -cne @($original.actualOwners|Where-Object assembly -CEQ $owner.assembly)[0].sha256)
    {
        throw 'An unintended tested owner changed.'
    }
}
Copy-Item -LiteralPath (Join-Path $run 'binaries\original') -Destination $destination -Recurse
foreach ($extension in 'dll','pdb')
{
    Copy-Item -LiteralPath (Join-Path $audit.actualOutput "Microsoft.AspNetCore.Identity.$extension") `
        -Destination (Join-Path $destination "Microsoft.AspNetCore.Identity.$extension") -Force
}
$owners=@(foreach ($owner in $original.actualOwners)
{
    [pscustomobject]@{
        assembly=$owner.assembly;file=(Join-Path $destination "$($owner.assembly).dll")
        sha256=(Get-FileHash (Join-Path $destination "$($owner.assembly).dll")).Hash
    }
})
$source='src\Identity\Core\src\DataProtectorTokenProvider.cs'
$sourceCopy=Join-Path $run "producer-source-candidate1\$source"
New-Item -ItemType Directory -Path (Split-Path $sourceCopy -Parent) -Force|Out-Null
Copy-Item -LiteralPath $source -Destination $sourceCopy
[ordered]@{
    candidate='F109';variant='candidate1';baselineSourceRevision=$original.baselineSourceRevision;branch=$original.branch
    sourceTrackedUnchanged=$false;publicApiChanged=$false;actualOwners=$owners
    harnessSources=$original.harnessSources;harnessSha256=$original.harnessSha256;harnessPdbSha256=$original.harnessPdbSha256
    runtimeConfigurationSha256=$original.runtimeConfigurationSha256;dependencyConfigurationSha256=$original.dependencyConfigurationSha256
    configuration='Release';harnessFramework='net12.0';ownerFramework='net12.0';profileCount=33
    source=$source;sourceCopy="producer-source-candidate1\$source";sourceSha256=(Get-FileHash $sourceCopy).Hash
    intendedImageDifferences=@('Microsoft.AspNetCore.Identity.dll','Microsoft.AspNetCore.Identity.pdb')
    privateFixtureKeysOutsideExecutionImage=$true;capturedAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $run 'candidate1-manifest.json') -Encoding utf8
$tool=Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'
$commands=[System.Collections.Generic.List[object]]::new()
function ProveSource([string]$Pdb,[string]$Source,[string]$Output)
{
    $arguments=@($tool,'pdb',$Pdb,(Split-Path $Source -Leaf),$Source)
    dotnet @arguments > $Output
    $code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{arguments=$arguments;exitCode=$code})
    if ($code) { throw "Actual candidate source/PDB mismatch:$Source" }
}
ProveSource (Join-Path $destination 'Microsoft.AspNetCore.Identity.pdb') $sourceCopy `
    (Join-Path $run 'owner-DataProtectorTokenProvider-pdb-candidate1.json')
$testRoot=Join-Path $run 'tests\candidate1-green'
New-Item -ItemType Directory -Path (Join-Path $testRoot 'source') -Force|Out-Null
New-Item -ItemType Directory -Path (Join-Path $testRoot 'image') -Force|Out-Null
Copy-Item -LiteralPath 'src\Identity\test\Identity.Test\DataProtectorTokenProviderTest.cs' `
    -Destination (Join-Path $testRoot 'source\DataProtectorTokenProviderTest.cs')
$testFiles=@(foreach ($name in 'Microsoft.AspNetCore.Identity.Test.dll','Microsoft.AspNetCore.Identity.Test.pdb','Microsoft.AspNetCore.Identity.Test.deps.json')
{
    $file=Join-Path $testRoot "image\$name"
    Copy-Item -LiteralPath (Join-Path $audit.actualOutput $name) -Destination $file
    [pscustomobject]@{file=$name;sha256=(Get-FileHash $file).Hash}
})
ProveSource (Join-Path $testRoot 'image\Microsoft.AspNetCore.Identity.Test.pdb') `
    (Join-Path $testRoot 'source\DataProtectorTokenProviderTest.cs') `
    (Join-Path $testRoot 'DataProtectorTokenProviderTest-source-pdb.json')
ProveSource (Join-Path $testRoot 'image\Microsoft.AspNetCore.Identity.Test.pdb') `
    (Join-Path $run 'producer-source\src\Identity\test\Identity.Test\UserManagerTest.cs') `
    (Join-Path $testRoot 'UserManagerTest-source-pdb.json')
$commands|ConvertTo-Json -Depth 7|Set-Content (Join-Path $run 'pdb-candidate1-commands.json') -Encoding utf8
[ordered]@{
    candidate='F109';label='candidate1-green';actualTestRows=7;passed=7;failed=0;skipped=0
    actualOutputOwnerIdentities=$audit.actualOwners;copiedTestFiles=$testFiles
    outputIdentityNotInTestLoadedHashMarker=$true;sourcePdbAssociationNotMethodCoverage=$true
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $testRoot 'actual-binary-execution-proof.json') -Encoding utf8
node (Join-Path $PSScriptRoot 'F109-closure.mjs') $run candidate1
if ($LASTEXITCODE) { throw 'Candidate execution closure differs beyond the intended owner DLL/PDB.' }
& (Join-Path $PSScriptRoot 'F109-probe.ps1') -Label frozen-candidate1 -Variant candidate1 -ImageDirectory $destination
Write-Output 'F109 candidate1 all7 exact tests green;identical frozen harness/176 unchanged assets;real33-case complete contracts retained.'
