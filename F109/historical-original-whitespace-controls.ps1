$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F109'
$directory=Join-Path $run 'tests\original-whitespace-controls'
if (Test-Path $directory) { throw 'Retain the supplemental original owning-control run.' }
New-Item -ItemType Directory -Path $directory -Force|Out-Null
$buildArguments=@('build','src\Identity\test\Identity.Test\Microsoft.AspNetCore.Identity.Test.csproj','--no-restore',
    '-c','Release','-m:2','-p:UseIisNativeAssets=false','-v:minimal')
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @buildArguments *> (Join-Path $directory 'build.log')
$code=$LASTEXITCODE
[ordered]@{
    arguments=$buildArguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    note='Compile added retention controls against the unchanged public ref shape;execute them only after substituting exact frozen original owner into a complete isolated test closure.'
}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $directory 'build-command.json') -Encoding utf8
if ($code) { throw 'Supplemental owning test-module build failed.' }
$output='C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Identity.Test\Release\net12.0'
$image=Join-Path $directory 'image'
Copy-Item -LiteralPath $output -Destination $image -Recurse
foreach ($extension in 'dll','pdb')
{
    Copy-Item -LiteralPath (Join-Path $run "binaries\original\Microsoft.AspNetCore.Identity.$extension") `
        -Destination (Join-Path $image "Microsoft.AspNetCore.Identity.$extension") -Force
}
$original=Get-Content (Join-Path $run 'original-manifest.json') -Raw|ConvertFrom-Json
foreach ($owner in $original.actualOwners|Where-Object {$_.assembly -in 'Microsoft.AspNetCore.Identity','Microsoft.Extensions.Identity.Core','Microsoft.AspNetCore.DataProtection.Abstractions'})
{
    if ((Get-FileHash (Join-Path $image "$($owner.assembly).dll")).Hash -cne $owner.sha256)
    {
        throw 'The isolated actual test image does not contain the exact frozen original owners.'
    }
}
$testClass='Microsoft.AspNetCore.Identity.Test.DataProtectorTokenProviderTest'
$arguments=@('test',(Join-Path $image 'Microsoft.AspNetCore.Identity.Test.dll'),'--filter',
    "FullyQualifiedName~$testClass.ValidateAsyncRejectsMalformedTokensWithWhitespace",
    '--logger','trx;LogFileName=original-whitespace-controls.trx','--results-directory',$directory)
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log')
$code=$LASTEXITCODE
[ordered]@{
    arguments=$arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    actualOwnerSha256=(Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.Identity.dll')).Hash
    originalFrozenOwnerSha256=$original.actualOwners[0].sha256
}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 22
if ($code) { throw 'Supplemental actual original whitespace controls failed.' }
[xml]$trx=Get-Content (Join-Path $directory 'original-whitespace-controls.trx') -Raw
$results=@($trx.TestRun.Results.UnitTestResult)
$definitions=@($trx.TestRun.TestDefinitions.UnitTest)
$entries=@($trx.TestRun.TestEntries.TestEntry)
if ($results.Count -ne 3 -or $definitions.Count -ne 3 -or $entries.Count -ne 3) { throw 'All3 actual original whitespace rows are required.' }
$labels=[System.Collections.Generic.List[string]]::new()
$rows=@(foreach ($result in $results)
{
    if ($result.outcome -cne 'Passed' -or [TimeSpan]::Parse($result.duration).Ticks -le 0 -or
        $result.testName -cnotmatch '\.ValidateAsyncRejectsMalformedTokensWithWhitespace\(caseName:\s*"(?<label>Leading|Embedded|Trailing)"\)$' -or
        @($definitions|Where-Object {$_.id -ceq $result.testId -and $_.Execution.id -ceq $result.executionId -and $_.name -ceq $result.testName}).Count -ne 1 -or
        @($entries|Where-Object {$_.testId -ceq $result.testId -and $_.executionId -ceq $result.executionId}).Count -ne 1)
    {
        throw 'Exact positive-duration original whitespace row/definition/execution identity differs.'
    }
    $labels.Add($Matches.label)
    [pscustomobject]@{testName=$result.testName;testId=$result.testId;executionId=$result.executionId;outcome=$result.outcome;duration=$result.duration}
})
if (Compare-Object @($labels|Sort-Object) @('Embedded','Leading','Trailing')) { throw 'Each original whitespace partition must execute once.' }
New-Item -ItemType Directory -Path (Join-Path $directory 'source') -Force|Out-Null
Copy-Item 'src\Identity\test\Identity.Test\DataProtectorTokenProviderTest.cs' (Join-Path $directory 'source\DataProtectorTokenProviderTest.cs')
$tool=Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'
$pdbArguments=@($tool,'pdb',(Join-Path $image 'Microsoft.AspNetCore.Identity.Test.pdb'),'DataProtectorTokenProviderTest.cs',
    (Join-Path $directory 'source\DataProtectorTokenProviderTest.cs'))
dotnet @pdbArguments > (Join-Path $directory 'DataProtectorTokenProviderTest-source-pdb.json')
$pdbCode=$LASTEXITCODE
[ordered]@{arguments=$pdbArguments;exitCode=$pdbCode}|ConvertTo-Json -Depth 5|Set-Content (Join-Path $directory 'source-pdb-command.json') -Encoding utf8
if ($pdbCode) { throw 'Actual supplemental original test source/PDB differs.' }
[ordered]@{
    candidate='F109';passed=3;failed=0;skipped=0;rows=$rows;originalOwners=$original.actualOwners
    actualTestAssemblySha256=(Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.Identity.Test.dll')).Hash
    actualTestPdbSha256=(Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.Identity.Test.pdb')).Hash
    actualTestDepsSha256=(Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.Identity.Test.deps.json')).Hash
    originalOwnerSubstitutionIntoIsolatedCompleteTestClosure=$true;sourcePdbAssociationNotMethodCoverage=$true
    note='These three original preservation controls pass before tuning;they are not the four already established red exception-count rows or a measured source comparison.'
}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $directory 'test-audit.json') -Encoding utf8
Write-Output 'F109 all3 supplemental whitespace-retention rows passed against exact frozen original owner;source/PDB and each TRX identity verified.'
