$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F105'
$destination = Join-Path $run 'tests\original'
if (Test-Path (Join-Path $destination 'actual-binary-execution-proof.json')) { throw 'Actual test execution proof exists;retain it.' }
$audit = Get-Content (Join-Path $destination 'test-audit.json') -Raw | ConvertFrom-Json
foreach ($owner in $audit.actualOwners)
{
    if ((Get-FileHash -LiteralPath $owner.file).Hash -cne $owner.sha256) { throw 'Actual output owner changed after original controls.' }
}
$toolRoot = Join-Path $PSScriptRoot 'autoperf-runs\F071\tools'
$tool = Join-Path $toolRoot 'bin\Release\net12.0\AutoPerf.Evidence.dll'
$toolSource = Join-Path $run 'evidence-tool-source'
New-Item -ItemType Directory -Path $toolSource -Force | Out-Null
$sourceRows = @(foreach ($file in Get-ChildItem $toolRoot -File | Where-Object Extension -In '.cs','.csproj','.editorconfig')
{
    Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $toolSource $file.Name)
    [pscustomobject]@{source=$file.Name;sha256=(Get-FileHash -LiteralPath $file.FullName).Hash;copySha256=(Get-FileHash (Join-Path $toolSource $file.Name)).Hash}
})
$arguments = @($tool,'pdb',(Join-Path $audit.actualOutput 'Microsoft.AspNetCore.Mvc.Core.Test.pdb'),
    'DefaultObjectValidatorTests.cs',
    (Join-Path $run 'producer-source\src\Mvc\Mvc.Core\test\ModelBinding\Validation\DefaultObjectValidatorTests.cs'))
dotnet @arguments > (Join-Path $destination 'DefaultObjectValidatorTests-source-pdb.json')
$code = $LASTEXITCODE
[ordered]@{arguments=$arguments;exitCode=$code} | ConvertTo-Json -Depth 5 |
    Set-Content (Join-Path $destination 'test-source-pdb-command.json') -Encoding utf8
if ($code) { throw 'Actual selected test-source/PDB association failed.' }
$arguments = @($tool,'pdb',(Join-Path $toolRoot 'bin\Release\net12.0\AutoPerf.Evidence.pdb'),
    'Program.cs',(Join-Path $toolSource 'Program.cs'))
dotnet @arguments > (Join-Path $run 'evidence-tool-source-pdb.json')
$code = $LASTEXITCODE
[ordered]@{arguments=$arguments;exitCode=$code} | ConvertTo-Json -Depth 5 |
    Set-Content (Join-Path $run 'evidence-tool-source-pdb-command.json') -Encoding utf8
if ($code) { throw 'Actual reused portable-PDB evidence-tool source association failed.' }
[ordered]@{
    candidate='F105';actualOriginalRows=$audit.passed;sourcePdbAssociations=1;unchangedControlsNotRerun=$true
    actualTestAssemblySha256=(Get-FileHash (Join-Path $audit.actualOutput 'Microsoft.AspNetCore.Mvc.Core.Test.dll')).Hash
    actualTestPdbSha256=(Get-FileHash (Join-Path $audit.actualOutput 'Microsoft.AspNetCore.Mvc.Core.Test.pdb')).Hash
    actualTestDependencyConfigurationSha256=(Get-FileHash (Join-Path $audit.actualOutput 'Microsoft.AspNetCore.Mvc.Core.Test.deps.json')).Hash
    actualOutputOwnerIdentities=$audit.actualOwners
    evidenceToolSha256=(Get-FileHash $tool).Hash;evidenceToolSourceCopies=$sourceRows
    testOutputIdentityNotAnInTestLoadedHashMarker=$true;sourcePdbAssociationNotMethodCoverage=$true
} | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $destination 'actual-binary-execution-proof.json') -Encoding utf8
Write-Output 'F105 ten exact executed test rows/output owner/deps/PDB and actual evidence-tool source/PDB identities retained without rerunning controls.'
