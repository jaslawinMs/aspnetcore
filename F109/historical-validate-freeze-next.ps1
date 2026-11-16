param([ValidateSet('candidate2','candidate3')][string]$Variant='candidate2')
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F109'
$destination=Join-Path $run "binaries\$Variant"
if (Test-Path $destination) { throw 'Retain the frozen candidate image.' }
$formats=[System.Collections.Generic.List[object]]::new()
foreach ($row in @(
    @('core','src\Identity\Core\src\Microsoft.AspNetCore.Identity.csproj','src\Identity\Core\src\DataProtectorTokenProvider.cs'),
    @('test','src\Identity\test\Identity.Test\Microsoft.AspNetCore.Identity.Test.csproj','src\Identity\test\Identity.Test\DataProtectorTokenProviderTest.cs')
))
{
    $arguments=@('format','whitespace',$row[1],'--no-restore','--verify-no-changes','--include',$row[2])
    $start=[DateTimeOffset]::UtcNow.ToString('o')
    dotnet @arguments *> (Join-Path $run "format-$Variant-$($row[0]).log")
    $code=$LASTEXITCODE
    $formats.Add([pscustomobject]@{
        arguments=$arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    })
    $formats|ConvertTo-Json -Depth 6|Set-Content (Join-Path $run "format-$Variant-commands.json") -Encoding utf8
    if ($code) { throw 'Scoped exact changed-source/test whitespace verification failed.' }
}
& (Join-Path $PSScriptRoot 'F109-test.ps1') -Label "$Variant-green" -Expectation green -WhitespaceControls
$audit=Get-Content (Join-Path $run "tests\$Variant-green\test-audit.json") -Raw|ConvertFrom-Json
if ($audit.passed -ne 10 -or $audit.failed -ne 0 -or $audit.skipped -ne 0) { throw 'All10 exact final source-defined rows must pass.' }
$original=Get-Content (Join-Path $run 'original-manifest.json') -Raw|ConvertFrom-Json
Copy-Item -LiteralPath (Join-Path $run 'binaries\original') -Destination $destination -Recurse
foreach ($extension in 'dll','pdb')
{
    Copy-Item -LiteralPath (Join-Path $audit.actualOutput "Microsoft.AspNetCore.Identity.$extension") `
        -Destination (Join-Path $destination "Microsoft.AspNetCore.Identity.$extension") -Force
}
$owners=@(foreach ($owner in $original.actualOwners)
{
    $file=Join-Path $destination "$($owner.assembly).dll"
    [pscustomobject]@{assembly=$owner.assembly;file=$file;sha256=(Get-FileHash $file).Hash}
})
foreach ($owner in $audit.actualOwners)
{
    if ($owner.sha256 -cne @($owners|Where-Object assembly -CEQ $owner.assembly)[0].sha256)
    {
        throw 'The frozen candidate differs from the actual green test output.'
    }
}
$source='src\Identity\Core\src\DataProtectorTokenProvider.cs'
$sourceRelative="producer-source-$Variant\$source"
$sourceCopy=Join-Path $run $sourceRelative
New-Item -ItemType Directory -Path (Split-Path $sourceCopy -Parent) -Force|Out-Null
Copy-Item -LiteralPath $source -Destination $sourceCopy
$manifest=[ordered]@{
    candidate='F109';variant=$Variant;baselineSourceRevision=$original.baselineSourceRevision;branch=$original.branch
    sourceTrackedUnchanged=$false;publicApiChanged=$false;actualOwners=$owners
    harnessSources=$original.harnessSources;harnessSha256=$original.harnessSha256;harnessPdbSha256=$original.harnessPdbSha256
    runtimeConfigurationSha256=$original.runtimeConfigurationSha256;dependencyConfigurationSha256=$original.dependencyConfigurationSha256
    configuration='Release';harnessFramework='net12.0';ownerFramework='net12.0';profileCount=33
    source=$source;sourceCopy=$sourceRelative;sourceSha256=(Get-FileHash $sourceCopy).Hash
    intendedImageDifferences=@('Microsoft.AspNetCore.Identity.dll','Microsoft.AspNetCore.Identity.pdb')
    optimizationScope='Malformed Base64 without accepted ASCII whitespace;whitespace-containing inputs retain the original decoder/catch path.'
    privateFixtureKeysOutsideExecutionImage=$true;capturedAt=[DateTimeOffset]::UtcNow.ToString('o')
}
$manifest|ConvertTo-Json -Depth 8|Set-Content (Join-Path $run "$Variant-manifest.json") -Encoding utf8
$testRoot=Join-Path $run "tests\$Variant-green"
New-Item -ItemType Directory -Path (Join-Path $testRoot 'source') -Force|Out-Null
New-Item -ItemType Directory -Path (Join-Path $testRoot 'image') -Force|Out-Null
Copy-Item 'src\Identity\test\Identity.Test\DataProtectorTokenProviderTest.cs' (Join-Path $testRoot 'source\DataProtectorTokenProviderTest.cs')
$testFiles=@(foreach ($name in 'Microsoft.AspNetCore.Identity.Test.dll','Microsoft.AspNetCore.Identity.Test.pdb','Microsoft.AspNetCore.Identity.Test.deps.json')
{
    Copy-Item (Join-Path $audit.actualOutput $name) (Join-Path $testRoot "image\$name")
    [pscustomobject]@{file=$name;sha256=(Get-FileHash (Join-Path $testRoot "image\$name")).Hash}
})
$tool=Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'
$commands=[System.Collections.Generic.List[object]]::new()
foreach ($row in @(
    @('owner',(Join-Path $destination 'Microsoft.AspNetCore.Identity.pdb'),$sourceCopy),
    @('new-test',(Join-Path $testRoot 'image\Microsoft.AspNetCore.Identity.Test.pdb'),(Join-Path $testRoot 'source\DataProtectorTokenProviderTest.cs')),
    @('existing-test',(Join-Path $testRoot 'image\Microsoft.AspNetCore.Identity.Test.pdb'),(Join-Path $run 'producer-source\src\Identity\test\Identity.Test\UserManagerTest.cs'))
))
{
    $arguments=@($tool,'pdb',$row[1],(Split-Path $row[2] -Leaf),$row[2])
    dotnet @arguments > (Join-Path $run "$Variant-$($row[0])-source-pdb.json")
    $code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{arguments=$arguments;exitCode=$code;kind=$row[0]})
    $commands|ConvertTo-Json -Depth 7|Set-Content (Join-Path $run "pdb-$Variant-commands.json") -Encoding utf8
    if ($code) { throw 'Exact candidate/owning test source/PDB association failed.' }
}
[ordered]@{
    candidate='F109';label="$Variant-green";actualTestRows=10;passed=10;failed=0;skipped=0
    actualOutputOwnerIdentities=$audit.actualOwners;copiedTestFiles=$testFiles
    outputIdentityNotInTestLoadedHashMarker=$true;sourcePdbAssociationNotMethodCoverage=$true
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $testRoot 'actual-binary-execution-proof.json') -Encoding utf8
node (Join-Path $PSScriptRoot 'F109-closure.mjs') $run $Variant
if ($LASTEXITCODE) { throw 'The complete frozen candidate closure differs beyond intended owner DLL/PDB.' }
& (Join-Path $PSScriptRoot 'F109-probe.ps1') -Label "frozen-$Variant" -Variant $Variant -ImageDirectory $destination
Write-Output "F109 $Variant all10 exact rows/33 real pipeline contracts passed;identical178-file harness closure except intended owner DLL/PDB."
