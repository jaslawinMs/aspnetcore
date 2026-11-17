param(
    [Parameter(Mandatory)]
    [ValidateSet('original', 'candidate')]
    [string]$Variant,
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F032'
$execution = Join-Path $run $Label
$source = Join-Path $root 'src\Servers\HttpSys\src\ResponseStream.cs'
$snapshots = @{}
$verified = @{}
foreach ($name in @('original', 'candidate'))
{
    $snapshot = Join-Path $run "validation\$name-existing-1\ResponseStream.cs.executed-source"
    $result = Get-Content -Raw (Join-Path $run "validation\$name-existing-1\verified-result.json") | ConvertFrom-Json
    if ($result.actualPassed -ne 15 -or $result.actualSkipped -ne 0 -or
        (Get-FileHash -LiteralPath $snapshot).Hash -cne $result.actualResponseStreamSourceSha256)
    {
        throw 'Require each actual previously tested source, not a reconstructed equivalent.'
    }
    $snapshots[$name] = $snapshot
    $verified[$name] = $result
}
Push-Location $root
try
{
    if ((Test-Path -LiteralPath $execution) -or
        (& git branch --show-current).Trim() -cne 'autoperf/F032-httpsys-flush-start' -or
        (& git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
        @(& git diff --cached --name-only).Count -ne 0 -or
        @(& git diff --name-only | Where-Object { $_ -cne 'src/Servers/HttpSys/src/ResponseStream.cs' }).Count -ne 0 -or
        (Get-FileHash -LiteralPath $source).Hash -cnotin @($verified.Values.actualResponseStreamSourceSha256))
    {
        throw 'Do not overwrite another edit or an existing restoration attempt.'
    }
    New-Item -ItemType Directory -Path $execution | Out-Null
    Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
    Copy-Item -LiteralPath $source -Destination (Join-Path $execution 'source-before-rebuild.cs')
    Copy-Item -LiteralPath $snapshots[$Variant] -Destination $source
    Copy-Item -LiteralPath $source -Destination (Join-Path $execution 'source-actually-built.cs')
    . .\activate.ps1
    $arguments = @('build', 'src\Servers\HttpSys\src\Microsoft.AspNetCore.Server.HttpSys.csproj',
        '--no-restore', '-c', 'Release', '-f', 'net12.0', '-m:2', '-nr:false',
        '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false', '-p:BuildInParallel=false', '-v', 'minimal')
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @arguments 1> (Join-Path $execution 'build.stdout') 2> (Join-Path $execution 'build.stderr')
    $code = $LASTEXITCODE
    [ordered]@{
        executable = (Get-Command dotnet).Source; arguments = $arguments; workingDirectory = $root; variant = $Variant
        started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o'); actualExitCode = $code
        actualSourceSha256 = (Get-FileHash -LiteralPath $source).Hash
        actualTestRerunPerformed = $false; actualTimingRerunPerformed = $false
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'invocation.json') -Encoding utf8NoBOM
    Get-Content (Join-Path $execution 'build.stdout') -Tail 10
    Get-Content (Join-Path $execution 'build.stderr') -Tail 8
    if ($code -ne 0)
    {
        throw 'Retain the unsuccessful actual owner rebuild.'
    }
    foreach ($owner in $verified[$Variant].actualOwners)
    {
        if ((Get-FileHash -LiteralPath $owner.actualProductPath).Hash -cne $owner.actualOwnerSha256 -or
            (Get-FileHash -LiteralPath ([IO.Path]::ChangeExtension($owner.actualProductPath, '.pdb'))).Hash -cne $owner.actualOwnerPdbSha256)
        {
            throw 'Rebuilt owner must byte-match the originally executed test DLL/PDB.'
        }
    }
    if ((Get-FileHash -LiteralPath $source).Hash -cne $verified[$Variant].actualResponseStreamSourceSha256)
    {
        throw 'The rebuilt source differs from its actual test snapshot.'
    }
    [ordered]@{
        candidate = 'F032'; variant = $Variant; actualRebuiltProductDllAndPdbMatchOriginallyTestedOwners = $true
        actualSourceByteExactToPreviouslyTestedSnapshot = $true; actualOnlyOwnedSourceEditRestored = $true
        actualUnrelatedUntrackedReportsUntouched = $true; actualOwners = $verified[$Variant].actualOwners
        actualSourceSha256 = (Get-FileHash -LiteralPath $source).Hash
        actualTestRerunPerformed = $false; actualTimingRerunPerformed = $false
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'verified-rebuild.json') -Encoding utf8NoBOM
    Write-Output "F032 $Variant owner rebuilt and DLL/PDB/source byte-verified;no test or timing rerun."
}
finally
{
    Pop-Location
}
