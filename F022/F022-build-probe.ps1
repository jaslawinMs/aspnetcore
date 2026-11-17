param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label,
    [Parameter(Mandatory)]
    [ValidatePattern('^[A-F0-9]{64}$')]
    [string]$ExpectedSourceSha256
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F022'
$execution = Join-Path $run "validation\build-probe-$Label"
$source = Join-Path $root 'src\Mvc\Mvc.ViewFeatures\src\ExpressionHelper.cs'
$ownerProject = Join-Path $root 'src\Mvc\Mvc.ViewFeatures\src\Microsoft.AspNetCore.Mvc.ViewFeatures.csproj'
$probeDirectory = Join-Path $run 'probes\HotReload'
$probeProject = Join-Path $probeDirectory 'HotReloadProbe.csproj'
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual owner/probe build.'
}
if ((Get-FileHash -LiteralPath $source).Hash -ne $ExpectedSourceSha256)
{
    throw 'Require the explicitly selected product variant.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
Copy-Item -LiteralPath $source -Destination (Join-Path $execution 'executed-ExpressionHelper.cs')
Copy-Item -LiteralPath (Join-Path $probeDirectory 'Program.cs') -Destination (Join-Path $execution 'executed-Program.cs')
Copy-Item -LiteralPath (Join-Path $probeDirectory 'IndexerModel.cs') -Destination (Join-Path $execution 'executed-IndexerModel.cs')
Copy-Item -LiteralPath $probeProject -Destination (Join-Path $execution 'executed-HotReloadProbe.csproj')
Push-Location $root
try
{
    . .\activate.ps1
    $env:AUTOPERF_ASPNETCORE_ROOT = $root
    $builds = @(
        @{ label = 'owner'; project = $ownerProject },
        @{ label = 'probe'; project = $probeProject }
    )
    foreach ($build in $builds)
    {
        $arguments = @('build', $build.project, '--no-restore', '-c', 'Debug', '-f', 'net12.0',
            '-m:2', '-nr:false', '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false', '-v', 'minimal')
        if ($build.label -eq 'probe')
        {
            $arguments += '-p:BuildProjectReferences=false'
        }
        $started = [DateTimeOffset]::UtcNow.ToString('o')
        & dotnet @arguments 1> (Join-Path $execution ($build.label + '.stdout')) 2> (Join-Path $execution ($build.label + '.stderr'))
        $code = $LASTEXITCODE
        [ordered]@{
            executable = (Get-Command dotnet).Source
            arguments = $arguments
            workingDirectory = $root
            sourceHead = (& git rev-parse HEAD).Trim()
            actualSourceSha256 = $ExpectedSourceSha256
            started = $started
            completed = [DateTimeOffset]::UtcNow.ToString('o')
            actualExitCode = $code
            timingProfile = $false
        } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution ($build.label + '.invocation.json')) -Encoding utf8NoBOM
        Get-Content -LiteralPath (Join-Path $execution ($build.label + '.stdout')) -Tail 8
        if ($code -ne 0)
        {
            Get-Content -LiteralPath (Join-Path $execution ($build.label + '.stderr')) -Tail 15
            throw "Actual $($build.label) build failed:$code"
        }
    }
    $ownerDirectory = Join-Path $root 'artifacts\bin\Microsoft.AspNetCore.Mvc.ViewFeatures\Debug\net12.0'
    $probeOutput = Join-Path $probeDirectory 'bin\Debug\net12.0'
    $files = foreach ($extension in @('dll', 'pdb'))
    {
        $name = 'Microsoft.AspNetCore.Mvc.ViewFeatures.' + $extension
        $ownerFile = Join-Path $ownerDirectory $name
        $consumerFile = Join-Path $probeOutput $name
        $hash = (Get-FileHash -LiteralPath $ownerFile).Hash
        if ((Get-FileHash -LiteralPath $consumerFile).Hash -ne $hash)
        {
            throw 'The rebuilt actual consumer owner/PDB do not match the product output.'
        }
        Copy-Item -LiteralPath $ownerFile -Destination (Join-Path $execution $name)
        [ordered]@{ name = $name; product = $ownerFile; consumer = $consumerFile; sha256 = $hash }
    }
    $probeArguments = @((Join-Path $probeOutput 'HotReloadProbe.dll'), '--once')
    & dotnet @probeArguments 1> (Join-Path $execution 'normal-once.stdout') 2> (Join-Path $execution 'normal-once.stderr')
    $code = $LASTEXITCODE
    if ($code -ne 0)
    {
        Get-Content -LiteralPath (Join-Path $execution 'normal-once.stderr')
        throw "The actual once-only consumer failed:$code"
    }
    $events = @(Get-Content -LiteralPath (Join-Path $execution 'normal-once.stdout') | ForEach-Object { $_ | ConvertFrom-Json })
    $start = @($events | Where-Object kind -eq F022_PROCESS_START)
    $state = @($events | Where-Object kind -eq F022_STATE)
    if ($start.Count -ne 1 -or $state.Count -ne 1 -or $start[0].ownerSha256 -ne $files[0].sha256 -or
        $start[0].metadataUpdatesSupported -or $state[0].classifierAllocatedBytes -ne 0 -or
        $state[0].expressionText -ne '[7].Name' -or !$state[0].classifiedAsIndexer -or
        $state[0].unsupportedClassifiedAsIndexer -or $state[0].unsupportedExpressionText -ne 'Name')
    {
        throw 'The actual normal consumer did not verify cache use and preserved public/control behavior.'
    }
    if ((Get-FileHash -LiteralPath $source).Hash -ne $ExpectedSourceSha256)
    {
        throw 'The product source changed during validation.'
    }
    [ordered]@{
        candidate = 'F022'
        actualSourceSha256 = $ExpectedSourceSha256
        actualNormalConsumerExitCode = $code
        actualOwnerAndPdbMatchProduct = $true
        actualMetadataUpdatesSupported = $false
        actualWarmClassifierAllocatedBytes = $state[0].classifierAllocatedBytes
        actualClassifierCalls = $state[0].successfulClassifierCalls
        actualRuntime = $start[0].runtime
        actualOwnerModule = $start[0].ownerModule
        actualOnceProcessId = $start[0].processId
        actualObservedSettings = @{ priority = $start[0].priority; affinity = $start[0].affinity; threadPriority = $start[0].threadPriority }
        files = @($files)
        timingProfiles = 0
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'verified-result.json') -Encoding utf8NoBOM
    Get-Content -LiteralPath (Join-Path $execution 'normal-once.stdout')
}
finally
{
    Pop-Location
}
