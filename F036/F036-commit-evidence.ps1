$ErrorActionPreference = 'Stop'
$session = $PSScriptRoot
$published = Join-Path $session 'autoperf-published-results'
$execution = Join-Path $session 'F036-evidence-publication'
$count = [int](Get-Content -Raw (Join-Path $session 'F036-immutable-file-count.txt'))
$previous = Get-Content -Raw (Join-Path $session 'F035-final-verification.json') | ConvertFrom-Json
if ((Test-Path -LiteralPath $execution) -or $count -lt 1 -or !$previous.actualAllPublicationChecksPassed)
{
    throw 'Require a fresh publication and the verified previous receipt.'
}
$head = (& git -C $published rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $head -cne $previous.actualFinalReceiptCommit)
{
    throw 'The verified results prerequisite changed.'
}
$origin = (& git -C $published remote get-url origin).Trim()
if ($LASTEXITCODE -ne 0 -or $origin -notmatch '^https://github\.com/jaslawinMs/aspnetcore(?:\.git)?$')
{
    throw 'Evidence may be pushed only to the public fork.'
}
if (@(& git -C $published diff --name-only).Count -or @(& git -C $published diff --cached --name-only).Count)
{
    throw 'Do not mix unrelated tracked or staged changes into the evidence.'
}
$untracked = @(& git -C $published ls-files --others --exclude-standard)
if ($LASTEXITCODE -ne 0 -or $untracked.Count -ne $count -or @($untracked | Where-Object { !$_.StartsWith('F036/') }).Count)
{
    throw 'Only the exact newly packaged F036 capsule may be untracked.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
& git -C $published add -- F036
if ($LASTEXITCODE -ne 0)
{
    throw 'Immutable capsule staging failed.'
}
$staged = @(& git -C $published diff --cached --name-only)
if ($LASTEXITCODE -ne 0 -or $staged.Count -ne $count -or @($staged | Where-Object { !$_.StartsWith('F036/') }).Count)
{
    throw 'Staged immutable scope differs.'
}
& git -C $published -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol `
    --no-pager diff --cached --check -- F036\README.md F036\comparison-results.md F036\validation-commands.md `
    1> (Join-Path $execution 'authored-whitespace.stdout') 2> (Join-Path $execution 'authored-whitespace.stderr')
if ($LASTEXITCODE -ne 0)
{
    throw 'Authored staged publication whitespace check failed.'
}
& node (Join-Path $session 'autoperf-verify-publication.mjs') F036 staged $count
if ($LASTEXITCODE -ne 0)
{
    throw 'Staged immutable blobs did not all verify.'
}
$message = "Archive F036 ViewData enumeration no-gain evidence`n`nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
& git -C $published commit --quiet -m $message
if ($LASTEXITCODE -ne 0)
{
    throw 'Immutable evidence commit failed.'
}
$evidence = (& git -C $published rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0)
{
    throw 'Could not observe the actual evidence commit.'
}
$evidence | Set-Content (Join-Path $session 'F036-results-commit.txt') -Encoding utf8NoBOM
& git -C $published -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin HEAD:refs/heads/autoperf-results
if ($LASTEXITCODE -ne 0)
{
    throw 'Fork evidence push failed.'
}
& node (Join-Path $session 'autoperf-verify-publication.mjs') F036 remote $count
if ($LASTEXITCODE -ne 0)
{
    throw 'Remote immutable blobs did not all verify.'
}
[ordered]@{
    candidate='F036';actualEvidenceCommit=$evidence;actualImmutableFileCount=$count
    actualStagedAndRemoteImmutableBlobsVerified=$true;actualAuthoredWhitespaceExit=0
    actualCrAtEolCommandScopedOnly=$true;actualRawEvidenceByteChanges=$false
} | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $execution 'verified-result.json') -Encoding utf8NoBOM
Write-Output "F036:evidence$evidence,$count staged/remote immutable blobs verified."
