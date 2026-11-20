param(
    [Parameter(Mandatory)][ValidateSet('Original', 'Default')][string]$Role,
    [Parameter(Mandatory)][string]$SourceRoot,
    [Parameter(Mandatory)][string]$SourceRevision,
    [Parameter(Mandatory)][string]$SourceBuiltAssemblies,
    [Parameter(Mandatory)][string]$PlatformVersion,
    [Parameter(Mandatory)][string]$AttemptRoot
)

$ErrorActionPreference = 'Stop'
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:MSBUILDDISABLENODEREUSE = '1'
Set-Location -LiteralPath $SourceRoot
$sdk = (Get-Content -LiteralPath (Join-Path $SourceRoot 'global.json') -Raw | ConvertFrom-Json).sdk.version
if (-not (Test-Path -LiteralPath (Join-Path $SourceRoot ".dotnet\sdk\$sdk\dotnet.dll")))
{
    throw 'The exact already-installed SDK is required; this runner will not install it.'
}
. .\activate.ps1
$dotnet = Join-Path $SourceRoot '.dotnet\dotnet.exe'
if (-not (Test-Path -LiteralPath $dotnet -PathType Leaf))
{
    throw 'The activated checkout-local dotnet executable is missing.'
}
if (Test-Path -LiteralPath $AttemptRoot)
{
    throw 'Never overwrite an earlier preparation.'
}
$null = New-Item -ItemType Directory -Path $AttemptRoot
$commands = [System.Collections.Generic.List[object]]::new()
$protected = (Get-FileHash -LiteralPath (Join-Path $SourceRoot 'global.json') -Algorithm SHA256).Hash
$sourceStatus = & git --no-pager -c core.longpaths=true status --porcelain --untracked-files=no
if ($LASTEXITCODE -ne 0 -or $sourceStatus)
{
    throw 'The source role must start tracked-clean.'
}
$head = & git --no-pager -c core.longpaths=true rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $head -ne $SourceRevision)
{
    throw 'The actual source revision differs from the declared role.'
}

function Invoke-Managed([string]$Label, [string[]]$Arguments)
{
    $start = [System.Diagnostics.ProcessStartInfo]::new()
    $start.FileName = $dotnet
    $start.WorkingDirectory = $SourceRoot
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    foreach ($argument in $Arguments)
    {
        $start.ArgumentList.Add($argument)
    }
    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $start
    $started = [DateTime]::UtcNow.ToString('o')
    if (-not $process.Start())
    {
        throw "Could not start $Label."
    }
    $ownedPid = $process.Id
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    $stdout = $stdoutTask.GetAwaiter().GetResult()
    $stderr = $stderrTask.GetAwaiter().GetResult()
    $exitCode = $process.ExitCode
    $process.Dispose()
    $stdoutFile = Join-Path $AttemptRoot "$Label.stdout.txt"
    $stderrFile = Join-Path $AttemptRoot "$Label.stderr.txt"
    [IO.File]::WriteAllText($stdoutFile, $stdout)
    [IO.File]::WriteAllText($stderrFile, $stderr)
    $commands.Add([ordered]@{
        label = $Label; activation = '. .\activate.ps1'; executable = $dotnet; arguments = $Arguments
        actualOwnedChildPid = $ownedPid; startedAt = $started; completedAt = [DateTime]::UtcNow.ToString('o')
        exitCode = $exitCode
        stdoutSha256 = (Get-FileHash -LiteralPath $stdoutFile -Algorithm SHA256).Hash
        stderrSha256 = (Get-FileHash -LiteralPath $stderrFile -Algorithm SHA256).Hash
    })
    $commands | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $AttemptRoot 'commands.json')
    Write-Host "$Label exit=$exitCode"
    if ($exitCode -ne 0)
    {
        Write-Host $stdout
        Write-Host $stderr
    }
    return $exitCode
}

$properties = @('-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
$generatorProject = Join-Path $SourceRoot 'src\OpenApi\gen\Microsoft.AspNetCore.OpenApi.SourceGenerators.csproj'
$generatorResult = Invoke-Managed 'generator-build-no-restore-001' (@('build', $generatorProject, '-c', 'Release', '--no-restore', '-t:Rebuild', '--verbosity', 'minimal') + $properties)
if ($generatorResult -ne 0)
{
    $log = Get-Content -LiteralPath (Join-Path $AttemptRoot 'generator-build-no-restore-001.stdout.txt') -Raw
    if ($log -notmatch 'NETSDK1004|NU1301|NU1101|NU1102|NU1103|MSB4236|NETSDK1064')
    {
        throw 'Generator compilation failed for a reason other than a missing prerequisite; preserve and inspect.'
    }
    if ((Invoke-Managed 'generator-restore-001' (@('restore', $generatorProject, '--verbosity', 'minimal') + $properties)) -ne 0)
    {
        throw 'Generator restore failed.'
    }
    if ((Invoke-Managed 'generator-build-002' (@('build', $generatorProject, '-c', 'Release', '--no-restore', '-t:Rebuild', '--verbosity', 'minimal') + $properties)) -ne 0)
    {
        throw 'Generator compilation failed after its actual restore.'
    }
}
$generatorOutput = Join-Path $SourceRoot 'artifacts\bin\Microsoft.AspNetCore.OpenApi.SourceGenerators\Release\netstandard2.0'
$frozenGenerator = Join-Path $AttemptRoot 'generator'
Copy-Item -LiteralPath $generatorOutput -Destination $frozenGenerator -Recurse
$generator = Join-Path $frozenGenerator 'Microsoft.AspNetCore.OpenApi.SourceGenerators.dll'
if (-not (Test-Path -LiteralPath $generator))
{
    throw 'The actual source-built generator output is missing.'
}
$frozenDependencies = Join-Path $AttemptRoot 'dependencies'
Copy-Item -LiteralPath $SourceBuiltAssemblies -Destination $frozenDependencies -Recurse
$inputs = Join-Path $AttemptRoot 'exact-inputs'
$null = New-Item -ItemType Directory -Path $inputs
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'owner') -Destination (Join-Path $inputs 'owner') -Recurse
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'probe') -Destination (Join-Path $inputs 'probe') -Recurse
$ownerProject = Join-Path $inputs 'owner\AutoPerf.F142.GeneratedOwner.csproj'
$ownerBin = Join-Path $AttemptRoot 'owner-bin'
$ownerProperties = $properties + @(
    "-p:SourceBuiltAssemblies=$frozenDependencies", "-p:GeneratorAssembly=$generator",
    "-p:BaseIntermediateOutputPath=$AttemptRoot\obj-owner\", "-p:MSBuildProjectExtensionsPath=$AttemptRoot\obj-owner\",
    "-p:OutputPath=$ownerBin\", "-p:CompilerGeneratedFilesOutputPath=$AttemptRoot\generated",
    '-p:AppendTargetFrameworkToOutputPath=false', '-p:ImportDirectoryBuildProps=false', '-p:ImportDirectoryBuildTargets=false'
)
if ((Invoke-Managed 'owner-restore-001' (@('restore', $ownerProject, '--verbosity', 'minimal') + $ownerProperties)) -ne 0)
{
    throw 'New owner project restore failed.'
}
if ((Invoke-Managed 'owner-build-001' (@('build', $ownerProject, '-c', 'Release', '--no-restore', '--verbosity', 'minimal') + $ownerProperties)) -ne 0)
{
    throw 'Actual analyzer-owned application compilation failed.'
}
$probeProject = Join-Path $inputs 'probe\AutoPerf.F142.Characterization.csproj'
$consumer = Join-Path $AttemptRoot 'consumer'
$probeProperties = $properties + @(
    "-p:GeneratedOwnerAssembly=$ownerBin\AutoPerf.F142.GeneratedOwner.dll", "-p:SourceBuiltAssemblies=$frozenDependencies",
    "-p:BaseIntermediateOutputPath=$AttemptRoot\obj-probe\", "-p:MSBuildProjectExtensionsPath=$AttemptRoot\obj-probe\",
    "-p:OutputPath=$consumer\", '-p:AppendTargetFrameworkToOutputPath=false',
    '-p:ImportDirectoryBuildProps=false', '-p:ImportDirectoryBuildTargets=false'
)
if ((Invoke-Managed 'probe-restore-001' (@('restore', $probeProject, '--verbosity', 'minimal') + $probeProperties)) -ne 0)
{
    throw 'New unchanged probe restore failed.'
}
if ((Invoke-Managed 'probe-build-001' (@('build', $probeProject, '-c', 'Release', '--no-restore', '--verbosity', 'minimal') + $probeProperties)) -ne 0)
{
    throw 'Probe compilation failed.'
}
foreach ($file in Get-ChildItem -LiteralPath $frozenDependencies -File -Recurse)
{
    $relative = [IO.Path]::GetRelativePath($frozenDependencies, $file.FullName)
    $destination = Join-Path $consumer $relative
    if (Test-Path -LiteralPath $destination)
    {
        if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash)
        {
            throw "A preexisting compiled dependency differs: $relative"
        }
    }
    else
    {
        $null = New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination)
        Copy-Item -LiteralPath $file.FullName -Destination $destination
    }
}
$files = @(Get-ChildItem -LiteralPath $consumer -File -Recurse | Sort-Object FullName | ForEach-Object {
    [ordered]@{ File = [IO.Path]::GetRelativePath($consumer, $_.FullName); Bytes = $_.Length; Sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash }
})
$inventoryFile = Join-Path $AttemptRoot 'consumer-inventory.json'
[ordered]@{ PlatformVersion = $PlatformVersion; Files = $files } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $inventoryFile
$observations = Join-Path $AttemptRoot 'observations'
if ((Invoke-Managed 'characterize-001' @('exec', '--fx-version', $PlatformVersion, (Join-Path $consumer 'AutoPerf.F142.Characterization.dll'), $Role, $inventoryFile, $observations)) -ne 0)
{
    throw 'The actual generated-app characterization failed.'
}
if ((Get-FileHash -LiteralPath (Join-Path $SourceRoot 'global.json') -Algorithm SHA256).Hash -ne $protected)
{
    throw 'Protected SDK configuration changed.'
}
$finalSourceStatus = & git --no-pager -c core.longpaths=true status --porcelain --untracked-files=no
if ($LASTEXITCODE -ne 0 -or $finalSourceStatus)
{
    throw 'The source role did not remain tracked-clean.'
}
[ordered]@{
    role = $Role; actualSourceRoot = $SourceRoot; actualSourceRevision = $SourceRevision
    actualAllCommandsCompleted = $true; actualProtectedGlobalJsonUnchanged = $true
    actualSourceBuiltDependenciesCopiedFrom = $SourceBuiltAssemblies; actualConsumerFiles = $files.Count
    actualSevenProducerRowsRequired = $true; actualTiming = $false
    actualNoCandidateOrShippingSourceChange = $true
} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $AttemptRoot 'completed.json')
