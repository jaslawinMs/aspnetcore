param(
    [ValidateSet('before','after','strong')]
    [string]$Variant,
    [string]$Attempt = '',
    [string[]]$Suites = @('unit','integration','functional')
)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F087'
if ($Variant -eq 'strong')
{
    $specifications = ,@('unit','src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj',
        'FullyQualifiedName~DefaultUnionValidationStrategyTest.IsUnionValueProperty_DoesNotRetainCollectibleUnionType')
}
else
{
    $specifications = @(
        @('unit','src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj',
            'FullyQualifiedName~DefaultUnionValidationStrategyTest|FullyQualifiedName~DefaultComplexObjectValidationStrategyTest|FullyQualifiedName~DefaultObjectValidatorTests'),
        @('integration','src\Mvc\test\Mvc.IntegrationTests\Microsoft.AspNetCore.Mvc.IntegrationTests.csproj',
            'FullyQualifiedName~UnionValidationIntegrationTest'),
        @('functional','src\Mvc\test\Mvc.FunctionalTests\Microsoft.AspNetCore.Mvc.FunctionalTests.csproj',
            'FullyQualifiedName~SystemTextJsonInputFormatterTest.UnionValidation_')
    )
}
$selected = @($specifications | Where-Object { $_[0] -in $Suites })
if (-not $selected.Count) { throw 'No actual validation suites selected.' }
foreach ($specification in $selected)
{
    $directory = Join-Path $run "tests-$Variant-$($specification[0])$Attempt"
    if (Test-Path $directory) { throw "Validation record exists:$directory" }
    New-Item -ItemType Directory $directory | Out-Null
    $arguments = @('test',$specification[1],'--no-restore','-c','Release','-m:2','-v:q',
        '--filter',$specification[2],'--logger','trx;LogFileName=results.trx',
        '--results-directory',$directory,'-p:UseIisNativeAssets=false','-p:BuildNodeJS=false',
        '-p:CrossgenOutput=false','-p:GenerateInstallers=false')
    . .\activate.ps1
    & dotnet @arguments *> (Join-Path $directory 'console.log')
    $exit = $LASTEXITCODE
    @{arguments=$arguments;exit_code=$exit;variant=$Variant;working_directory=(Get-Location).Path;
        expected_failure=$Variant -eq 'strong'} | ConvertTo-Json -Depth 6 |
        Set-Content (Join-Path $directory 'command.json') -Encoding utf8
    Get-Content (Join-Path $directory 'console.log') -Tail 8
    $trx = Join-Path $directory 'results.trx'
    if (-not (Test-Path $trx)) { throw 'Chosen validation did not reach its XML assertion outcomes.' }
    [xml]$xml = Get-Content $trx -Raw
    $rows = @($xml.TestRun.Results.UnitTestResult)
    if (-not $rows.Count) { throw 'No actual discovered validation rows.' }
    $failed = @($rows | Where-Object outcome -eq 'Failed')
    $passed = @($rows | Where-Object outcome -eq 'Passed')
    if ($Variant -eq 'strong')
    {
        if ($exit -ne 1 -or $rows.Count -ne 1 -or $failed.Count -ne 1 -or
            -not $failed[0].testName.Contains('IsUnionValueProperty_DoesNotRetainCollectibleUnionType') -or
            -not $failed[0].Output.ErrorInfo.Message.Contains('Assert.False()'))
        {
            throw 'Unmeasured strong-cache lifetime rejection differs from expected actual failure.'
        }
    }
    elseif ($exit -ne 0 -or $failed.Count -or $passed.Count -ne $rows.Count)
    {
        throw 'Actual required validation rows did not all pass without skips.'
    }
    $project = [IO.Path]::GetFileNameWithoutExtension($specification[1])
    $owner = Join-Path 'C:\src\aspnetcore\artifacts\bin' "$project\Release\net12.0\Microsoft.AspNetCore.Mvc.Core.dll"
    @{variant=$Variant;suite=$specification[0];actual_rows=$rows.Count;passed=$passed.Count;
        failed=$failed.Count;skipped=$rows.Count-$passed.Count-$failed.Count;
        owner_path=$owner;owner_sha256=(Get-FileHash $owner).Hash;
        source_sha256=(Get-FileHash 'src\Mvc\Mvc.Core\src\ModelBinding\Validation\DefaultUnionValidationStrategy.cs').Hash;
        test_names=@($rows | ForEach-Object testName)} |
        ConvertTo-Json -Depth 6 | Set-Content (Join-Path $directory 'actual-outcomes.json') -Encoding utf8
    Write-Output "F087 $Variant $($specification[0]):actual$($rows.Count) rows,$($passed.Count)pass/$($failed.Count)fail,exit$exit."
}
