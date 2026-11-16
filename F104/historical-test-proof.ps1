param(
    [ValidateSet('original','candidate-1','candidate-2','candidate-3')]
    [string]$Variant='original'
)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F104'
$destination = Join-Path $run "tests\$Variant"
if (Test-Path (Join-Path $destination 'actual-binary-execution-proof.json')) { throw 'Completed test proof exists;retain it.' }
$audit = Get-Content (Join-Path $destination 'test-audit.json') -Raw | ConvertFrom-Json
$binary = $audit.testOutput
$ownerHash = (Get-FileHash (Join-Path $binary 'Microsoft.AspNetCore.App.Analyzers.dll')).Hash
if ($ownerHash -cne $audit.actualOwnerSha256 -or
    (Get-FileHash (Join-Path $binary 'Microsoft.CodeAnalysis.CSharp.dll')).Hash -cne $audit.actualCompilerSha256)
{
    throw 'Actual test output owner/compiler changed after the retained control execution.'
}
$tool = Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'
$arguments = @($tool,'pdb',(Join-Path $binary 'Microsoft.AspNetCore.App.Analyzers.Test.pdb'),
    'DetectAmbiguousMappedRoutesTest.cs',
    'C:\src\aspnetcore\src\Framework\AspNetCoreAnalyzers\test\RouteHandlers\DetectAmbiguousMappedRoutesTest.cs')
dotnet @arguments > (Join-Path $destination 'DetectAmbiguousMappedRoutesTest-source-pdb.json')
$code = $LASTEXITCODE
[ordered]@{arguments=$arguments;exitCode=$code} | ConvertTo-Json -Depth 5 |
    Set-Content (Join-Path $destination 'test-source-pdb-command.json') -Encoding utf8
if ($code) { throw 'Actual owning-test source/PDB association failed.' }
[ordered]@{
    candidate='F104';variant=$Variant
    actualTestAssemblySha256=(Get-FileHash (Join-Path $binary 'Microsoft.AspNetCore.App.Analyzers.Test.dll')).Hash
    actualTestPdbSha256=(Get-FileHash (Join-Path $binary 'Microsoft.AspNetCore.App.Analyzers.Test.pdb')).Hash
    actualLoadedOutputOwnerSha256=$ownerHash
    actualTestCommonCompilerSha256=(Get-FileHash (Join-Path $binary 'Microsoft.CodeAnalysis.dll')).Hash
    actualTestCSharpCompilerSha256=$audit.actualCompilerSha256
    actualTestDependencyConfigurationSha256=(Get-FileHash (Join-Path $binary 'Microsoft.AspNetCore.App.Analyzers.Test.deps.json')).Hash
    evidenceToolSha256=(Get-FileHash $tool).Hash;sourcePdbAssociations=1;actualPassedControls=$audit.passed
    sourcePdbAssociationNotMethodCoverage=$true;unchangedControlsNotRerun=$true
    note='Actual owning-test source/PDB and executed output owner/compiler/deps identities supplement all35 exact retained TRX rows and12 literal parameter-row proofs.'
} | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $destination 'actual-binary-execution-proof.json') -Encoding utf8
Write-Output "F104 $Variant executed test binary/compiler/source-PDB identities retained without rerunning controls."
