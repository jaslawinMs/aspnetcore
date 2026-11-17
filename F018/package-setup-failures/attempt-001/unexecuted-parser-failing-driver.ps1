$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F018'
$execution = Join-Path $run 'package-execution\attempt-001'
$pack = Join-Path $run 'preparation-execution\candidate-Pack\attempt-001'
$completed = Get-Content (Join-Path $pack 'completed.json') -Raw | ConvertFrom-Json
$gate = Get-Content (Join-Path $pack '001-evaluate-package-gate.log') -Raw | ConvertFrom-Json
$packCommand = Get-Content (Join-Path $pack '002-existing-enabled-package-validation.json') -Raw | ConvertFrom-Json
if ($completed.actualSuccessfulCommands -ne 2 -or $gate.Properties.EnablePackageValidation -cne 'true' -or
    $gate.Properties.PackageValidationBaselineVersion -or $packCommand.actualExitCode -ne 0 -or
    -not (Get-Content (Join-Path $pack '002-existing-enabled-package-validation.log') -Raw).Contains('APICompat ran successfully without finding any breaking changes.'))
{
    throw 'Actual enabled APICompat command,successful output and unset released baseline required.'
}
if (Test-Path $execution)
{
    throw 'Do not overwrite actual package payload verification.'
}
New-Item -ItemType Directory -Path $execution,(Join-Path $run 'packages') | Out-Null
Copy-Item $PSCommandPath (Join-Path $execution 'executed-driver.ps1')
$directory = 'C:\src\aspnetcore\artifacts\packages\Debug\Shipping'
$name = 'Microsoft.AspNetCore.Authentication.Google.12.0.0-dev'
$copies = foreach ($suffix in '.nupkg','.symbols.nupkg')
{
    $from = Join-Path $directory ($name + $suffix)
    $to = Join-Path $run ('packages\' + $name + $suffix)
    Copy-Item $from $to
    if ((Get-FileHash $from).Hash -cne (Get-FileHash $to).Hash)
    {
        throw 'Actual copied package bytes differ.'
    }
    [ordered]@{ original = $from; copy = $to; sha256 = (Get-FileHash $to).Hash; bytes = (Get-Item $to).Length }
}
$package = [IO.Compression.ZipFile]::OpenRead((Join-Path $run ('packages\' + $name + '.nupkg')))
try
{
    $entry = $package.GetEntry('lib/net12.0/Microsoft.AspNetCore.Authentication.Google.dll')
    if ($entry is null)
    {
        throw 'Actual net12 package owner entry required.'
    }
    $inputStream = $entry.Open()
    $memory = [IO.MemoryStream]::new()
    try
    {
        $inputStream.CopyTo($memory)
        $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($memory.ToArray()))
    }
    finally
    {
        $memory.Dispose()
        $inputStream.Dispose()
    }
}
finally
{
    $package.Dispose()
}
$frozen = Join-Path $run 'contexts\candidate\image\Microsoft.AspNetCore.Authentication.Google.dll'
if ($hash -cne (Get-FileHash $frozen).Hash)
{
    throw 'Actual packed owner differs from the frozen tested/executing candidate.'
}
[ordered]@{
    candidate = 'F018'; actualPackageCopies = $copies; actualPackedTarget = 'net12.0'; actualPackedOwnerSha256 = $hash
    packedOwnerMatchesFrozenCandidate = $true; actualEnabledApiCompatPassed = $true
    actualReleaseProductsInDebugNamedPackageOutput = $true; releasedBaselineVersionConfigured = $false
    checkedAt = [DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'package-payload-recheck.json') -Encoding utf8NoBOM
Write-Output 'F018 actual packed net12 owner bytes equal the frozen/tested candidate;enabled APICompat passed,no released-baseline comparison claimed.'
