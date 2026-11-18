$ErrorActionPreference = 'Stop'
$session = $PSScriptRoot
$run = Join-Path $session 'autoperf-runs\F042'
$root = 'C:\src\aspnetcore'
$defaultRoot = 'C:\src\aspnetcore\.git\autoperf-sources\F042-current-default'
$archive = Join-Path $run 'intake-preparation-001'
$recordPath = Join-Path $run 'current-default-worktree.json'
if ((Test-Path -LiteralPath $recordPath) -or (Test-Path -LiteralPath $archive) -or (Test-Path -LiteralPath $defaultRoot))
{
    throw 'Inspect the existing isolated-default preparation; do not overwrite or reset it.'
}

$reference = Get-Content -LiteralPath (Join-Path $run 'current-default-ref.json') -Raw | ConvertFrom-Json
$sha = $reference.actualRef.object.sha
$previous = Get-Content -LiteralPath (Join-Path $session 'autoperf-runs\F041\source-inputs.json') -Raw | ConvertFrom-Json
$calls = [System.Collections.Generic.List[object]]::new()
function Invoke-RecordedGit([string[]]$Arguments)
{
    $stdout = & git -C $root @Arguments 2>&1 | Out-String
    $code = $LASTEXITCODE
    $calls.Add([pscustomobject]@{ executable = 'git'; arguments = @('-C', $root) + $Arguments; actualExitCode = $code; output = $stdout })
    $calls | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $run 'current-default-worktree-invocations.json') -Encoding utf8
    if ($code -ne 0)
    {
        throw "Git preparation failed: $($Arguments -join ' ')`n$stdout"
    }

    return $stdout.Trim()
}

if ((Invoke-RecordedGit @('rev-parse', 'HEAD')) -ne $previous.baseline -or
    (Invoke-RecordedGit @('branch', '--show-current')) -ne $previous.branch -or
    (Invoke-RecordedGit @('status', '--porcelain', '--untracked-files=no')))
{
    throw 'Primary source checkout changed unexpectedly.'
}

$globalPath = Join-Path $root 'global.json'
$globalHash = (Get-FileHash -LiteralPath $globalPath -Algorithm SHA256).Hash
[System.IO.Directory]::CreateDirectory($archive) | Out-Null
Copy-Item -LiteralPath (Join-Path $session 'F042-intake.mjs') -Destination (Join-Path $archive 'F042-intake.mjs')
Copy-Item -LiteralPath (Join-Path $run 'intake-invocations.json') -Destination (Join-Path $archive 'invocations.json')
[pscustomobject]@{
    actualFailure = 'The pre-switch guard detected upstream global.json build-SDK pins differing from the primary checkout.'
    actualFailedBeforeBranchSwitch = $true
    actualPrimaryManifestChanged = $false
    actualOptimizationEditPerformed = $false
    actualSourceComparisons = 0
    resolution = 'Verify the unmodified captured default in a detached, non-stageable worktree; do not change the primary global.json or fork main.'
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $archive 'observation.json') -Encoding utf8
$manifestDiff = Invoke-RecordedGit @('--no-pager', 'diff', $previous.baseline, $sha, '--', 'global.json')
[System.IO.File]::WriteAllText((Join-Path $archive 'global-sdk-pin-delta.diff'), $manifestDiff, [System.Text.UTF8Encoding]::new($false))
$area = 'src/Features/JsonPatch.SystemTextJson'
$primaryTree = Invoke-RecordedGit @('rev-parse', "$($previous.baseline):$area")
$defaultTree = Invoke-RecordedGit @('rev-parse', "$($sha):$area")
if ($primaryTree -ne $defaultTree)
{
    throw 'The entire JSON Patch area is not identical; inspect before choosing any comparison baseline.'
}

[System.IO.Directory]::CreateDirectory((Split-Path -Parent $defaultRoot)) | Out-Null
$null = Invoke-RecordedGit @('worktree', 'add', '--detach', $defaultRoot, $sha)
$dotnetTarget = Join-Path $root '.dotnet'
$dotnetLink = Join-Path $defaultRoot '.dotnet'
if (Test-Path -LiteralPath $dotnetLink)
{
    throw 'Unexpected SDK directory in the new detached worktree.'
}
New-Item -ItemType Junction -Path $dotnetLink -Target $dotnetTarget | Out-Null
$defaultGlobalPath = Join-Path $defaultRoot 'global.json'
$oldSettings = Get-Content -LiteralPath $globalPath -Raw | ConvertFrom-Json
$defaultSettings = Get-Content -LiteralPath $defaultGlobalPath -Raw | ConvertFrom-Json
if ($oldSettings.sdk.version -ne $defaultSettings.sdk.version)
{
    throw 'The default requires a different actual .NET SDK; do not silently substitute the primary toolchain.'
}
if ((Get-FileHash -LiteralPath $globalPath -Algorithm SHA256).Hash -ne $globalHash)
{
    throw 'Primary global.json changed unexpectedly.'
}
foreach ($item in $previous.preservedUntrackedReports)
{
    if ((Get-FileHash -LiteralPath (Join-Path $root $item.path) -Algorithm SHA256).Hash -ne $item.sha256)
    {
        throw "Unrelated report changed: $($item.path)"
    }
}
$record = [pscustomobject]@{
    candidate = 'F042'
    actualCapturedDefault = $sha
    actualVerificationRoot = $defaultRoot
    actualVerificationWorktreeDetached = $true
    actualVerificationSourceEdited = $false
    actualEntireJsonPatchAreaTree = $defaultTree
    actualEntireJsonPatchAreaMatchesPrimaryBaseline = $true
    actualPrimaryBaseline = $previous.baseline
    actualPrimaryBranchUnchanged = $previous.branch
    actualPrimaryGlobalSha256Preserved = $globalHash
    actualSamePinnedDotnetSdk = $defaultSettings.sdk.version
    actualSdkDirectoryJunctionTarget = $dotnetTarget
    actualPrimaryManifestChanged = $false
    actualForkMainUpdated = $false
    actualNextGate = 'Activate this detached repository and faithfully validate its actual owner before any primary-source optimization.'
}
$record | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $recordPath -Encoding utf8
$record | ConvertTo-Json -Depth 8
