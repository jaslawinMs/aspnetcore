param(
    [Parameter(Mandatory)]
    [ValidateSet('existing-tests', 'existing-tests-managed', 'debug-owner', 'hot-reload-probe', 'hot-reload-probe-references', 'hot-reload-probe-vb', 'hot-reload-probe-live-path')]
    [string]$Phase
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F022'
$execution = Join-Path $run "validation\baseline-$Phase"
$test = Join-Path $root 'src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj'
$product = Join-Path $root 'src\Mvc\Mvc.ViewFeatures\src\Microsoft.AspNetCore.Mvc.ViewFeatures.csproj'
$probe = Join-Path $run 'probes\HotReload\HotReloadProbe.csproj'
if (Test-Path $execution)
{
    throw 'Do not overwrite an actual baseline validation attempt.'
}
Push-Location $root
try
{
    $head = (& git rev-parse HEAD).Trim()
    $branch = (& git branch --show-current).Trim()
    $changes = & git status --porcelain --untracked-files=no
    if ($LASTEXITCODE -ne 0 -or $head -ne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
        $branch -ne 'autoperf/F022-indexer-metadata-cache' -or $changes)
    {
        throw 'Require the independent, unchanged original source owner.'
    }
    New-Item -ItemType Directory -Path $execution | Out-Null
    Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
    . .\activate.ps1
    $env:AUTOPERF_ASPNETCORE_ROOT = $root
    $script:sequence = 0
    function Invoke-Validation([string]$Label, [string[]]$Arguments)
    {
        $script:sequence++
        $stem = Join-Path $execution ('{0:D3}-{1}' -f $script:sequence, $Label)
        $started = [DateTimeOffset]::UtcNow.ToString('o')
        & dotnet @Arguments 1> ($stem + '.stdout') 2> ($stem + '.stderr')
        $actualExit = $LASTEXITCODE
        [ordered]@{
            executable = (Get-Command dotnet).Source
            arguments = $Arguments
            workingDirectory = $root
            sourceHead = $head
            sourceBranch = $branch
            sourceTrackedChanges = @($changes)
            started = $started
            completed = [DateTimeOffset]::UtcNow.ToString('o')
            actualExitCode = $actualExit
            timingProfile = $false
        } | ConvertTo-Json -Depth 10 | Set-Content ($stem + '.json') -Encoding utf8NoBOM
        if ($actualExit -ne 0)
        {
            Get-Content -LiteralPath ($stem + '.stdout') -Tail 45 | ForEach-Object { Write-Host $_ }
            Get-Content -LiteralPath ($stem + '.stderr') -Tail 25 | ForEach-Object { Write-Host $_ }
            throw "Actual baseline validation failed; preserve $stem"
        }

        return [IO.File]::ReadAllText($stem + '.stdout')
    }
    $sdk = (Invoke-Validation 'actual-sdk' @('--version')).Trim()
    if ($sdk -ne '12.0.100-alpha.1.26557.102')
    {
        throw "The activated SDK differs: $sdk"
    }
    if ($Phase -in @('existing-tests', 'existing-tests-managed'))
    {
        $arguments = @('test', $test, '--no-restore', '-c', 'Release',
            '-f', 'net12.0', '-m:2', '-nr:false', '-p:UseSharedCompilation=false',
            '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.ViewFeatures.ExpressionHelperTest',
            '--logger', 'trx;LogFileName=baseline-existing.trx', '--results-directory', $execution, '-v', 'minimal')
        if ($Phase -eq 'existing-tests-managed')
        {
            $arguments += '-p:UseIisNativeAssets=false'
        }
        $output = Invoke-Validation 'owning-expression-tests' $arguments
    }
    elseif ($Phase -eq 'debug-owner')
    {
        $output = Invoke-Validation 'build-debug-owner' @('build', $product, '--no-restore', '-c', 'Debug',
            '-m:2', '-nr:false', '-p:UseSharedCompilation=false', '-v', 'minimal')
    }
    else
    {
        $null = Invoke-Validation 'restore-new-probe-manifest' @('restore', $probe, '--configfile',
            (Join-Path $root 'NuGet.config'), '--disable-parallel', '-m:2', '-nr:false', '-v', 'minimal')
        if ($Phase -eq 'hot-reload-probe-vb')
        {
            $null = Invoke-Validation 'build-real-indexed-property-model' @('build',
                (Join-Path $run 'probes\HotReloadModel\HotReloadModel.vbproj'), '--no-restore', '-c', 'Debug',
                '-m:2', '-nr:false', '-p:UseSharedCompilation=false', '-v', 'minimal')
        }
        $output = Invoke-Validation 'build-private-debug-probe' @('build', $probe, '--no-restore', '-c', 'Debug',
            '-m:2', '-nr:false', '-p:BuildProjectReferences=false', '-p:UseSharedCompilation=false', '-v', 'minimal')
        if ($Phase -eq 'hot-reload-probe-live-path')
        {
            $output += Invoke-Validation 'actual-original-private-characterization' @(
                (Join-Path $run 'probes\HotReload\bin\Debug\net12.0\HotReloadProbe.dll'), '--once')
        }
    }
    $output -split '\r?\n' | Select-Object -Last 14
}
finally
{
    Pop-Location
}
