param(
    [Parameter(Mandatory)]
    [string]$SourceRoot,
    [Parameter(Mandatory)]
    [string]$OutputRoot,
    [ValidateSet('Prepare','Characterize','Measure')]
    [string]$Mode = 'Characterize',
    [string]$CapsuleRoot = ''
)

$ErrorActionPreference = 'Stop'
if (!$IsWindows)
{
    throw 'This capsule records a Windows settings-preserving executor.'
}
$SourceRoot = [IO.Path]::GetFullPath($SourceRoot)
$OutputRoot = [IO.Path]::GetFullPath($OutputRoot)
if (!$CapsuleRoot)
{
    $CapsuleRoot = if (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'harness')) { $PSScriptRoot }
        else { Join-Path $PSScriptRoot 'autoperf-runs\F024' }
}
$CapsuleRoot = [IO.Path]::GetFullPath($CapsuleRoot)
if (Test-Path -LiteralPath $OutputRoot)
{
    throw 'Choose a new independent output directory;never overwrite historical F024 profiles.'
}
New-Item -ItemType Directory -Path $OutputRoot | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $OutputRoot 'executed-fresh-driver.ps1')
$harness = Join-Path $OutputRoot 'harness'
New-Item -ItemType Directory -Path $harness | Out-Null
foreach ($name in @('AutoPerf.Benchmarks.csproj','Program.cs','SessionBenchmarks.cs','SessionFixture.cs','SessionContracts.cs','SettingsPreservingEmitToolchain.cs'))
{
    Copy-Item -LiteralPath (Join-Path $CapsuleRoot "harness\$name") -Destination (Join-Path $harness $name)
}
$invocations = [Collections.Generic.List[object]]::new()
function Invoke-Dotnet([string]$Name, [string[]]$Arguments)
{
    $start = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @Arguments 1> (Join-Path $OutputRoot "$Name.stdout") 2> (Join-Path $OutputRoot "$Name.stderr")
    $code = $LASTEXITCODE
    $record = [ordered]@{
        executable = (Get-Command dotnet).Source
        arguments = $Arguments
        workingDirectory = $SourceRoot
        actualExitCode = $code
        started = $start
        completed = [DateTimeOffset]::UtcNow.ToString('o')
    }
    $invocations.Add($record)
    $record | ConvertTo-Json -Depth 9 | Set-Content -LiteralPath (Join-Path $OutputRoot "$Name-invocation.json") -Encoding utf8NoBOM
    Get-Content -LiteralPath (Join-Path $OutputRoot "$Name.stdout") -Tail 10
    if ($code -ne 0)
    {
        Get-Content -LiteralPath (Join-Path $OutputRoot "$Name.stderr") -Tail 12
        throw "The independent fresh $Name failed. Logs are retained;follow repository prerequisites rather than treating it as passed."
    }
}
Push-Location $SourceRoot
try
{
    . (Join-Path $SourceRoot 'activate.ps1')
    $sdk = (& dotnet --version).Trim()
    if ($sdk -ne '12.0.100-alpha.1.26557.102')
    {
        throw 'Use the captured repository SDK;do not edit global.json to bypass this check.'
    }
    $env:AUTOPERF_ASPNETCORE_ROOT = $SourceRoot
    Invoke-Dotnet 'owner-build' @('build', (Join-Path $SourceRoot 'src\Middleware\Session\src\Microsoft.AspNetCore.Session.csproj'),
        '--no-restore', '-c', 'Release', '-m:2', '-nr:false', '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false', '-v', 'minimal')
    Invoke-Dotnet 'harness-build' @('build', (Join-Path $harness 'AutoPerf.Benchmarks.csproj'),
        '-c', 'Release', '-m:2', '-nr:false', '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false',
        "-p:RestoreConfigFile=$SourceRoot\NuGet.config", '-v', 'minimal')
    $consumer = Join-Path $OutputRoot 'consumer'
    Copy-Item -LiteralPath (Join-Path $harness 'bin\Release\net12.0') -Destination $consumer -Recurse
    $sources = Join-Path $OutputRoot 'sources'
    $ownerSources = Join-Path $sources 'owner'
    $harnessSources = Join-Path $sources 'harness'
    New-Item -ItemType Directory -Path $ownerSources, $harnessSources | Out-Null
    foreach ($name in @('DistributedSession.cs','DistributedSessionStore.cs','SessionOptions.cs','DefaultDistributedSessionStore.cs'))
    {
        Copy-Item -LiteralPath (Join-Path $SourceRoot "src\Middleware\Session\src\$name") -Destination (Join-Path $ownerSources $name)
    }
    Get-ChildItem -LiteralPath $harness -File | Copy-Item -Destination $harnessSources
    $closure = [ordered]@{
        role = 'New independent consumer,not a replay or extension of the closed historical comparison budget'
        files = @(Get-ChildItem -LiteralPath $consumer -File -Recurse | ForEach-Object {
            [ordered]@{ path = [IO.Path]::GetRelativePath($consumer, $_.FullName); sha256 = (Get-FileHash -LiteralPath $_.FullName).Hash; bytes = $_.Length }
        })
    }
    $closurePath = Join-Path $OutputRoot 'closure.json'
    $closure | ConvertTo-Json -Depth 9 | Set-Content -LiteralPath $closurePath -Encoding utf8NoBOM
    if ($Mode -ne 'Prepare')
    {
        $nativeMode = if ($Mode -eq 'Measure') { 'measure' } else { 'characterize' }
        $arguments = @((Join-Path $consumer 'AutoPerf.Benchmarks.dll'), '--mode', $nativeMode,
            '--context', 'independent-fresh-consumer', '--sources', $sources, '--closure', $closurePath,
            '--expected-owner', (Get-FileHash -LiteralPath (Join-Path $consumer 'Microsoft.AspNetCore.Session.dll')).Hash,
            '--artifacts', (Join-Path $OutputRoot 'native'))
        if ($Mode -eq 'Measure')
        {
            $arguments += @('--filter','*')
        }
        Invoke-Dotnet 'native' $arguments
    }
    [ordered]@{
        candidate = 'F024'
        mode = $Mode
        actualSdk = $sdk
        actualSourceRoot = $SourceRoot
        actualSourceHead = (& git rev-parse HEAD).Trim()
        actualSourceSha256 = (Get-FileHash -LiteralPath (Join-Path $ownerSources 'DistributedSession.cs')).Hash
        actualOwnerSha256 = (Get-FileHash -LiteralPath (Join-Path $consumer 'Microsoft.AspNetCore.Session.dll')).Hash
        actualHarnessSha256 = (Get-FileHash -LiteralPath (Join-Path $consumer 'AutoPerf.Benchmarks.dll')).Hash
        actualClosureFiles = $closure.files.Count
        actualInvocations = $invocations.ToArray()
        actualTimingPerformed = $Mode -eq 'Measure'
        historicalF024BudgetReadOrWritten = $false
        historicalBinaryReproductionClaim = $false
        processPolicy = 'No priority,affinity or power changes;at most2 build workers. Shared machine,not isolated.'
    } | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $OutputRoot 'verified-fresh-consumer.json') -Encoding utf8NoBOM
}
finally
{
    Pop-Location
}
