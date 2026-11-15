param(
    [Parameter(Mandatory)]
    [ValidateSet('before', 'after', 'after-2', 'after-3')]
    [string]$Snapshot
)

$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F073'
$destination = Join-Path $run "http-$Snapshot"
if (Test-Path $destination)
{
    throw 'Refusing to overwrite hosted command evidence.'
}
New-Item -ItemType Directory $destination | Out-Null
$names = @(
    'ProducesAttributeWithTypeOnly_RunsRegularContentNegotiation',
    'ProducesAttribute_SingleContentType_PicksTheFirstSupportedFormatter',
    'ProducesAttribute_MultipleContentTypes_RunsConnegToSelectFormatter',
    'ProducesAttribute_CustomMediaTypeWithJsonSuffix_RunsConnegAndSelectsJsonFormatter',
    'XmlFormatter_SupportedMediaType_DoesNotChangeAcrossRequests',
    'ProducesAttribute_WithMediaTypeHavingParameters_IsCaseInsensitiveMatch',
    'NoProducesAttribute_ActionReturningString_RunsUsingTextFormatter')
$filter = ($names | ForEach-Object { 'FullyQualifiedName~ContentNegotiationTest.' + $_ }) -join '|'
$arguments = @('test',
    'src\Mvc\test\Mvc.FunctionalTests\Microsoft.AspNetCore.Mvc.FunctionalTests.csproj',
    '--no-restore', '-c', 'Release', '-m:2', '--filter', $filter,
    '--logger', 'trx;LogFileName=results.trx', '--results-directory', $destination,
    '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false',
    '-p:CrossgenOutput=false', '-p:GenerateInstallers=false')
$started = [DateTimeOffset]::UtcNow
& dotnet @arguments *> (Join-Path $destination 'command.log')
$exit = $LASTEXITCODE
@{ command = 'dotnet'; arguments = $arguments; exit_code = $exit;
    started_at = $started.ToString('o'); completed_at = [DateTimeOffset]::UtcNow.ToString('o') } |
    ConvertTo-Json -Depth 6 |
    Set-Content (Join-Path $destination 'command.json') -Encoding utf8
Get-Content (Join-Path $destination 'command.log') -Tail 8
if ($exit) { throw 'Actual hosted negotiation cases failed.' }
[xml]$trx = Get-Content (Join-Path $destination 'results.trx') -Raw
$rows = @($trx.TestRun.Results.UnitTestResult)
if ($rows.Count -ne 8 -or @($rows | Where-Object outcome -ne Passed).Count)
{
    throw 'All eight actual hosted negotiation rows must pass.'
}
$rows | Select-Object testName, outcome | ConvertTo-Json |
    Set-Content (Join-Path $destination 'row-validation.json') -Encoding utf8
$actual = (Get-FileHash 'artifacts\bin\Microsoft.AspNetCore.Mvc.FunctionalTests\Release\net12.0\Microsoft.AspNetCore.Mvc.Core.dll').Hash
$frozen = (Get-FileHash (Join-Path $run "binaries\$Snapshot\Microsoft.AspNetCore.Mvc.Core.dll")).Hash
if ($actual -cne $frozen)
{
    throw 'Actual hosted test owner differs from frozen measured owner.'
}
@{ candidate = 'F073'; snapshot = $Snapshot; rows = 8; test_owner_sha256 = $actual;
    frozen_owner_sha256 = $frozen; actual_owner_equal_frozen = $true } |
    ConvertTo-Json |
    Set-Content (Join-Path $destination 'owner-validation.json') -Encoding utf8
Write-Output "$Snapshot`: eight actual hosted rows passed; each test and actual frozen owner validated."
