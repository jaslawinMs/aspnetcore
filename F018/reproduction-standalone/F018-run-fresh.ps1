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
if (-not $IsWindows -or (Test-Path -LiteralPath $OutputRoot) -or -not (Test-Path -LiteralPath $project) -or
    $PSScriptRoot.StartsWith($AspNetCoreRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase) -or
    $OutputRoot.StartsWith($AspNetCoreRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase))
{
    throw 'Windows PowerShell7,a standalone harness and a new output directory outside the source checkout are required.'
}
Set-Location $AspNetCoreRoot
$revision = (git rev-parse HEAD).Trim()
if ($LASTEXITCODE)
{
    throw 'An actual known source checkout revision is required.'
}
$trackedStatus = @(git status --porcelain --untracked-files=no)
if ($LASTEXITCODE)
{
    throw 'Actual tracked source state could not be recorded.'
}
New-Item -ItemType Directory -Path $OutputRoot | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $OutputRoot 'executed-driver.ps1')
git --no-pager diff --binary "--output=$(Join-Path $OutputRoot 'source-tracked.patch')" HEAD
if ($LASTEXITCODE)
{
    throw 'Actual source delta could not be preserved.'
}
. .\activate.ps1
$commands = [System.Collections.Generic.List[object]]::new()
function InvokeRecorded([string] $Name, [string] $Executable, [string[]] $Arguments)
{
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & $Executable @Arguments *> (Join-Path $OutputRoot "$Name.log")
    $code = $LASTEXITCODE
    $commands.Add([ordered]@{
        name = $Name; executable = $Executable; arguments = $Arguments
        started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o'); actualExitCode = $code
        output = "$Name.log"; outputSha256 = (Get-FileHash (Join-Path $OutputRoot "$Name.log")).Hash
    })
    $commands | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $OutputRoot 'commands.json') -Encoding utf8NoBOM

    return $code
}
$build = @('build', $project, '-c', 'Release', '-f', 'net12.0', '-m:2', '-v:minimal', "-p:AspNetCoreRoot=$AspNetCoreRoot")
if (InvokeRecorded 'build' (Get-Command dotnet).Source $build)
{
    Get-Content (Join-Path $OutputRoot 'build.log') -Tail 35
    throw 'Actual standalone net12 build/restore failed;retain output.'
}
$image = Join-Path $OutputRoot 'image'
$sources = Join-Path $OutputRoot 'sources'
New-Item -ItemType Directory -Path $image,(Join-Path $sources 'owner'),(Join-Path $sources 'harness') | Out-Null
Get-ChildItem (Join-Path $PSScriptRoot 'harness\bin\Release\net12.0') -Force | Copy-Item -Destination $image -Recurse
foreach ($source in @(
    'src\Security\Authentication\Google\src\GoogleHandler.cs',
    'src\Security\Authentication\Google\src\GoogleOptions.cs',
    'src\Security\Authentication\OAuth\src\Events\OAuthCreatingTicketContext.cs',
    'src\Security\Authentication\OAuth\src\OAuthTokenResponse.cs'
))
{
    Copy-Item -LiteralPath (Join-Path $AspNetCoreRoot $source) -Destination (Join-Path $sources 'owner')
}
Get-ChildItem (Join-Path $PSScriptRoot 'harness') -File |
    Where-Object Extension -In '.cs','.csproj' |
    Copy-Item -Destination (Join-Path $sources 'harness')
$files = @(Get-ChildItem $image,$sources -Recurse -File | Sort-Object FullName | ForEach-Object {
    [ordered]@{ path = [IO.Path]::GetRelativePath($OutputRoot, $_.FullName); bytes = $_.Length; sha256 = (Get-FileHash $_.FullName).Hash }
})
[ordered]@{
    candidate = 'F018'; sourceCheckoutRevision = $revision; sourceCheckout = $AspNetCoreRoot; mode = $Mode
    sourceTrackedStatus = $trackedStatus; sourceTrackedPatchSha256 = (Get-FileHash (Join-Path $OutputRoot 'source-tracked.patch')).Hash
    standaloneTarget = 'net12.0'; referencedActualProductTarget = 'net12.0'; processArchitecture = 'x64'
    files = $files; historicalCampaignReexecuted = $false; nativeExecutionRequested = $Mode -ne 'Prepare'
    historicalCampaignBudgetReopened = $false
} | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $OutputRoot 'prepared.json') -Encoding utf8NoBOM
if ($Mode -eq 'Prepare')
{
    Write-Output 'Standalone net12 project built and fresh images/sources prepared;no native benchmark or timing executed.'

    return
}
$native = @((Join-Path $image 'AutoPerf.Benchmarks.dll'), '--sources', $sources, '--context', "fresh-$($revision.Substring(0, 12))",
    '--mode', $Mode.ToLowerInvariant(), '--artifacts', (Join-Path $OutputRoot 'artifacts'), '--filter', '*')
if (InvokeRecorded 'native' (Get-Command dotnet).Source $native)
{
    Get-Content (Join-Path $OutputRoot 'native.log') -Tail 35
    throw 'Actual independent native run failed;retain its full output and state records.'
}
Write-Output "Independent $Mode execution exited0;historical campaign profiles were not changed or relabeled."
