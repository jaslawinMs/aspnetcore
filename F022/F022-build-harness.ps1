param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label,
    [switch]$Restore
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F022'
$execution = Join-Path $run "validation\build-harness-$Label"
$harness = Join-Path $run 'harness'
$project = Join-Path $harness 'AutoPerf.Benchmarks.csproj'
$source = Join-Path $root 'src\Mvc\Mvc.ViewFeatures\src\ExpressionHelper.cs'
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual harness restore/build.'
}
if ((Get-FileHash -LiteralPath $source).Hash -ne '04A769BED0B513DFE135FB75E40168CF8BBA8B65BDA82642192BC234EF7DB8AC')
{
    throw 'Require the selected source,not a diagnostic prototype.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
Get-ChildItem -LiteralPath $harness -File | Where-Object Extension -in '.cs','.csproj' |
    Copy-Item -Destination $execution
Push-Location $root
try
{
    . .\activate.ps1
    $env:AUTOPERF_ASPNETCORE_ROOT = $root
    $phases = @()
    if ($Restore)
    {
        $phases += 'restore'
    }
    $phases += 'build'
    foreach ($phase in $phases)
    {
        $arguments = if ($phase -eq 'restore')
        {
            @('restore', $project, '--disable-parallel', '-m:2', '-nr:false',
                '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false',
                '-p:BuildProjectReferences=false', '-p:BuildInParallel=false', '-v', 'minimal')
        }
        else
        {
            @('build', $project, '--no-restore', '-c', 'Release', '-f', 'net12.0', '-m:2', '-nr:false',
                '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false', '-p:BuildProjectReferences=false', '-v', 'minimal')
        }
        $started = [DateTimeOffset]::UtcNow.ToString('o')
        & dotnet @arguments 1> (Join-Path $execution ($phase + '.stdout')) 2> (Join-Path $execution ($phase + '.stderr'))
        $code = $LASTEXITCODE
        [ordered]@{
            executable = (Get-Command dotnet).Source
            arguments = $arguments
            workingDirectory = $root
            sourceHead = (& git rev-parse HEAD).Trim()
            started = $started
            completed = [DateTimeOffset]::UtcNow.ToString('o')
            actualExitCode = $code
            timingProfile = $false
        } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution ($phase + '.invocation.json')) -Encoding utf8NoBOM
        Get-Content -LiteralPath (Join-Path $execution ($phase + '.stdout')) -Tail 14
        Get-Content -LiteralPath (Join-Path $execution ($phase + '.stderr')) -Tail 10
        if ($code -ne 0)
        {
            throw "Actual harness $phase failed:$code"
        }
    }
    $output = Join-Path $harness 'bin\Release\net12.0'
    $owner = Join-Path $output 'Microsoft.AspNetCore.Mvc.ViewFeatures.dll'
    $verified = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\selected-callers\verified-result.json') | ConvertFrom-Json
    if ((Get-FileHash -LiteralPath $owner).Hash -ne $verified.actualOwnerSha256)
    {
        throw 'The compiled consumer did not receive the selected,96-case-green MVC owner.'
    }
    [ordered]@{
        candidate = 'F022'
        actualHarnessSha256 = (Get-FileHash -LiteralPath (Join-Path $output 'AutoPerf.Benchmarks.dll')).Hash
        actualOwnerSha256 = (Get-FileHash -LiteralPath $owner).Hash
        actualOwnerMatchesOwningTestClosure = $true
        output = $output
        timingProfiles = 0
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $execution 'verified-result.json') -Encoding utf8NoBOM
}
finally
{
    Pop-Location
}
