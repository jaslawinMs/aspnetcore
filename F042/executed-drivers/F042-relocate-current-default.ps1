$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F042'
$root = 'C:\src\aspnetcore'
$currentPath = Join-Path $run 'current-default-worktree.json'
$current = Get-Content -LiteralPath $currentPath -Raw | ConvertFrom-Json
$old = $current.actualVerificationRoot
$destination = 'C:\src\autoperf-F042-default'
if ((Test-Path -LiteralPath $destination) -or (Test-Path -LiteralPath (Join-Path $run 'current-default-worktree-initial.json')))
{
    throw 'Inspect the existing relocation state rather than retrying or overwriting it.'
}
$protected = @('global.json', 'autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html', 'autoperf-scan-report.md', 'performance-antipattern-findings.md')
$before = @{}
foreach ($path in $protected)
{
    $before[$path] = (Get-FileHash -LiteralPath (Join-Path $root $path) -Algorithm SHA256).Hash
}
$dirty = & git -c core.longpaths=true -C $old status --porcelain --untracked-files=no | Out-String
if ($LASTEXITCODE -ne 0 -or $dirty.Trim())
{
    throw 'Only relocate an unmodified detached source worktree.'
}
Copy-Item -LiteralPath $currentPath -Destination (Join-Path $run 'current-default-worktree-initial.json')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'F042-bootstrap-default.ps1') -Destination (Join-Path $run 'validation\default-bootstrap-and-owner-build-002\driver-prepared-for-relocated-build.ps1')
$record = [ordered]@{
    candidate = 'F042'
    actualReason = 'The nested worktree inherited both primary and default .globalconfig files, producing MultipleGlobalAnalyzerKeys errors. Relocate the detached worktree rather than disable or change analyzers.'
    actualBeforeRoot = $old
    actualAfterRoot = $destination
    actualCommand = @('git', '-c', 'core.longpaths=true', '-C', $root, 'worktree', 'move', $old, $destination)
    actualSourceEdited = $false
    actualPrimaryProtectedBefore = $before
}
$output = & git -c core.longpaths=true -C $root worktree move $old $destination 2>&1 | Out-String
$record.actualMoveExitCode = $LASTEXITCODE
$record.actualOutput = $output
$record | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $run 'current-default-worktree-relocation.json') -Encoding utf8
if ($record.actualMoveExitCode -ne 0)
{
    throw 'The recorded worktree relocation failed.'
}
$head = & git -c core.longpaths=true -C $destination rev-parse HEAD | Out-String
if ($LASTEXITCODE -ne 0 -or $head.Trim() -ne $current.actualCapturedDefault)
{
    throw 'Relocated worktree commit differs.'
}
foreach ($path in $protected)
{
    if ((Get-FileHash -LiteralPath (Join-Path $root $path) -Algorithm SHA256).Hash -ne $before[$path])
    {
        throw "Primary protected file changed: $path"
    }
}
$current.actualVerificationRoot = $destination
$current | Add-Member -NotePropertyName actualPriorVerificationRoot -NotePropertyValue $old
$current | Add-Member -NotePropertyName actualRelocationReason -NotePropertyValue $record.actualReason
$current | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $currentPath -Encoding utf8
$record.actualCommitPreserved = $head.Trim()
$record.actualPrimaryProtectedHashesPreserved = $true
$record | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $run 'current-default-worktree-relocation.json') -Encoding utf8
$record | ConvertTo-Json -Depth 8
