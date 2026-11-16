param([Parameter(Mandatory)][ValidateSet('original','candidate-1','candidate-2','candidate-3')][string]$Variant)
$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
Set-Location $repo
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F103'
$destination = Join-Path $run "tests\$Variant"
$binary = Join-Path $repo 'artifacts\bin\Microsoft.AspNetCore.Components.Analyzers.Tests\Release\net12.0'
$ownerHash = (Get-FileHash (Join-Path $binary 'Microsoft.AspNetCore.Components.Analyzers.dll')).Hash
if ($ownerHash -cne (Get-FileHash (Join-Path $run "binaries\$Variant\Microsoft.AspNetCore.Components.Analyzers.dll")).Hash)
{
    throw 'Actual test output owner differs from frozen measured owner.'
}
$tool = Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'
$commands = @(
    foreach ($name in 'StateHasChangedAnalyzerTest','StateHasChangedCodeFixProviderTest')
    {
        $a = @($tool,'pdb',(Join-Path $binary 'Microsoft.AspNetCore.Components.Analyzers.Tests.pdb'),
            "$name.cs",(Join-Path $repo "src\Components\Analyzers\test\$name.cs"))
        dotnet @a > (Join-Path $destination "$name-source-pdb.json")
        $code = $LASTEXITCODE
        if ($code) { throw 'Actual test source/PDB identity failed.' }
        [ordered]@{arguments=$a;exitCode=$code}
    }
)
$commands | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $destination 'test-source-pdb-commands.json')
[ordered]@{
    variant=$Variant;actualTestAssemblySha256=(Get-FileHash (Join-Path $binary 'Microsoft.AspNetCore.Components.Analyzers.Tests.dll')).Hash
    actualTestPdbSha256=(Get-FileHash (Join-Path $binary 'Microsoft.AspNetCore.Components.Analyzers.Tests.pdb')).Hash
    actualLoadedOutputOwnerSha256=$ownerHash
    actualTestCommonCompilerSha256=(Get-FileHash (Join-Path $binary 'Microsoft.CodeAnalysis.dll')).Hash
    actualTestCSharpCompilerSha256=(Get-FileHash (Join-Path $binary 'Microsoft.CodeAnalysis.CSharp.dll')).Hash
    actualTestDependencyConfigurationSha256=(Get-FileHash (Join-Path $binary 'Microsoft.AspNetCore.Components.Analyzers.Tests.deps.json')).Hash
    evidenceToolSha256=(Get-FileHash $tool).Hash;sourcePdbAssociations=2
    note='Actual test source/PDB/owner/compiler output identities and30 exact TRX controls;PDB association is not method coverage,existing framework-stub controls remain distinct from real-reference driver probes.'
} | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $destination 'actual-binary-execution-proof.json')
& (Join-Path $PSScriptRoot 'F103-test-audit.ps1') -Variant $Variant
Write-Output "F103 $Variant actual test-output binary/compiler/source-PDB/30 TRX controls verified."
