$ErrorActionPreference = 'Stop'
$run = Split-Path $PSScriptRoot -Parent
$session = Split-Path (Split-Path $run -Parent) -Parent
$previous = Join-Path $run 'publication-174'
$published = Join-Path $session 'autoperf-published-results'
$capsule = Join-Path $published 'F198'
$archive = Join-Path $previous 'failed-staging-capsule'
$head = & git --no-pager -C $published rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $head -cne 'd8f16e467c033c4f0062eeb1b92d7804adc2bf0e')
{
    throw 'The failed pre-commit publication no longer has the expected parent.'
}
$calls = Get-Content -LiteralPath (Join-Path $previous 'publication-invocations.json') -Raw | ConvertFrom-Json -DateKind String
if (@($calls | Where-Object { $_.command -ceq 'git' -and ($_.arguments -contains 'commit' -or $_.arguments -contains 'push') }).Count)
{
    throw 'This is not the observed pre-commit failure boundary.'
}
$staged = @(& git --no-pager -C $published diff --cached --name-only)
if ($LASTEXITCODE -ne 0 -or $staged.Count -eq 0 -or @($staged | Where-Object { -not $_.StartsWith('F198/', [StringComparison]::Ordinal) }).Count)
{
    throw 'Only the coordinator-owned new F198 files may be unstaged.'
}
$seal = Get-Content -LiteralPath (Join-Path $capsule 'capsule-file-hashes.json') -Raw | ConvertFrom-Json -DateKind String
foreach ($file in $seal.files)
{
    $path = Join-Path $capsule $file.file
    if ((Get-Item -LiteralPath $path).Length -ne $file.bytes -or (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -cne $file.sha256)
    {
        throw 'A byte in the failed publication snapshot changed.'
    }
}
if (Test-Path -LiteralPath $archive)
{
    throw 'The failed publication archive already exists.'
}
& git --no-pager -C $published restore --staged -- F198
if ($LASTEXITCODE -ne 0)
{
    throw 'Cannot unstage only the owned F198 additions.'
}
Move-Item -LiteralPath $capsule -Destination $archive
foreach ($name in @('README.md', 'verify.mjs', 'classification-controls.mjs', 'classification-control-result.json'))
{
    [IO.File]::Copy((Join-Path $previous $name), (Join-Path $PSScriptRoot $name), $false)
}
[IO.File]::Copy((Join-Path $previous 'package.ps1'), (Join-Path $PSScriptRoot 'package.ps1'), $false)
[ordered]@{
    actualNoCommitOrPush = $true
    actualUnstagedOnlyOwnedF198Additions = $true
    actualPriorMaterialFilesHashVerified = $seal.files.Count
    actualCompleteFailedCapsulePreservedAt = $archive
    actualSourcePublisher174Unchanged = $true
    actualOriginalComparisonAndClosedBudgetNotModified = $true
    failure = 'System Git core.autocrlf=true transformed the first staged README blob; byte guard rejected before commit. New capsule-local attributes preserve raw bytes without modifying global/repository Git configuration.'
    recordedUtc = [DateTime]::UtcNow.ToString('o')
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'failed-staging-preservation.json') -Encoding utf8NoBOM
