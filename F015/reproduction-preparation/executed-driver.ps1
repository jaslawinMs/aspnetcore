param(
    [string] $AspNetCoreRoot = 'C:\src\aspnetcore',
    [Parameter(Mandatory)]
    [string] $OutputRoot,
    [ValidateSet('Prepare', 'Characterize', 'Measure')]
    [string] $Mode = 'Prepare'
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$AspNetCoreRoot = [IO.Path]::GetFullPath($AspNetCoreRoot)
$OutputRoot = [IO.Path]::GetFullPath($OutputRoot)
$project = Join-Path $PSScriptRoot 'harness\AutoPerf.Benchmarks.csproj'
if ((Test-Path -LiteralPath $OutputRoot) -or -not (Test-Path -LiteralPath $project) -or
    $PSScriptRoot.StartsWith($AspNetCoreRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase) -or
    $OutputRoot.StartsWith($AspNetCoreRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase))
{
    throw 'A standalone harness and new output directory outside the source checkout are required.'
}
New-Item -ItemType Directory -Path $OutputRoot | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $OutputRoot 'executed-driver.ps1')
Set-Location $AspNetCoreRoot
. .\activate.ps1
$revision = (git rev-parse HEAD).Trim()
$commands = [System.Collections.Generic.List[object]]::new()
function InvokeRecorded([string] $Name, [string] $Executable, [string[]] $Arguments)
{
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & $Executable @Arguments *> (Join-Path $OutputRoot "$Name.log")
    $code = $LASTEXITCODE
    $commands.Add([ordered]@{
        name = $Name; executable = $Executable; arguments = $Arguments
        started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o'); actualExitCode = $code
    })
    $commands | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $OutputRoot 'commands.json') -Encoding utf8NoBOM

    return $code
}
$build = @('build', $project, '-c', 'Release', '-f', 'net472', '--no-restore', '-m:2', '-v:minimal', "-p:AspNetCoreRoot=$AspNetCoreRoot")
$code = InvokeRecorded 'build-001' (Get-Command dotnet).Source $build
if ($code -and (Get-Content (Join-Path $OutputRoot 'build-001.log') -Raw).Contains('NETSDK1004'))
{
    $restore = @('restore', $project, '-m:2', '-v:minimal', "-p:AspNetCoreRoot=$AspNetCoreRoot")
    if (InvokeRecorded 'restore-after-missing-assets' (Get-Command dotnet).Source $restore)
    {
        throw 'Restore after actual missing assets failed; retain output.'
    }
    $code = InvokeRecorded 'build-002' (Get-Command dotnet).Source $build
}
if ($code)
{
    Get-Content (Join-Path $OutputRoot 'build-001.log') -Tail 30
    throw 'Actual standalone Framework build failed; retain output.'
}
$image = Join-Path $OutputRoot 'image'
$sources = Join-Path $OutputRoot 'sources'
New-Item -ItemType Directory -Path $image,(Join-Path $sources 'owner'),(Join-Path $sources 'harness') | Out-Null
Copy-Item -Path (Join-Path $PSScriptRoot 'harness\bin\Release\net472\*') -Destination $image -Recurse
$ownerFiles = @(
    'Managed\ManagedAuthenticatedEncryptor.cs',
    'AuthenticatedEncryption\ManagedAuthenticatedEncryptorFactory.cs',
    'AuthenticatedEncryption\ConfigurationModel\ManagedAuthenticatedEncryptorConfiguration.cs',
    'AuthenticatedEncryption\ConfigurationModel\ManagedAuthenticatedEncryptorDescriptor.cs',
    'Secret.cs',
    'AuthenticatedEncryption\IAuthenticatedEncryptor.cs',
    'KeyManagement\IKey.cs'
)
foreach ($source in $ownerFiles)
{
    Copy-Item -LiteralPath (Join-Path $AspNetCoreRoot "src\DataProtection\DataProtection\src\$source") -Destination (Join-Path $sources 'owner')
}
Get-ChildItem (Join-Path $PSScriptRoot 'harness') -File |
    Where-Object Extension -In '.cs','.csproj' |
    Copy-Item -Destination (Join-Path $sources 'harness')
$files = @(Get-ChildItem $image,$sources -Recurse -File | Sort-Object FullName | ForEach-Object {
    [ordered]@{ path = [IO.Path]::GetRelativePath($OutputRoot, $_.FullName); bytes = $_.Length; sha256 = (Get-FileHash $_.FullName).Hash }
})
[ordered]@{
    sourceCheckoutRevision = $revision; sourceCheckout = $AspNetCoreRoot; mode = $Mode
    standaloneTarget = 'net472'; referencedActualProductTarget = 'net462'; processArchitecture = 'x64'
    files = $files; historicalCampaignReexecuted = $false; nativeExecutionRequested = $Mode -ne 'Prepare'
} | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $OutputRoot 'prepared.json') -Encoding utf8NoBOM
if ($Mode -eq 'Prepare')
{
    Write-Output 'Standalone Framework project built and fresh images/sources prepared; no native benchmark or timing executed.'

    return
}
$executable = Join-Path $image 'AutoPerf.Benchmarks.exe'
$native = @('--sources', $sources, '--context', "fresh-$($revision.Substring(0, 12))", '--mode', $Mode.ToLowerInvariant(),
    '--artifacts', (Join-Path $OutputRoot 'artifacts'), '--filter', '*')
if (InvokeRecorded 'native' $executable $native)
{
    throw 'Actual independent native run failed; retain its full output and state records.'
}
Write-Output "Independent $Mode execution exited0; historical campaign profiles were not changed."
