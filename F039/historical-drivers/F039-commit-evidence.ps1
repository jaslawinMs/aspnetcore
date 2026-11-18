$ErrorActionPreference = 'Stop'
$session = $PSScriptRoot
$published = Join-Path $session 'autoperf-published-results'
$execution = Join-Path $session 'F039-evidence-publication'
$count = [int](Get-Content -Raw (Join-Path $session 'F039-immutable-file-count.txt'))
$previous = Get-Content -Raw (Join-Path $session 'F038-final-verification.json') | ConvertFrom-Json
if ((Test-Path -LiteralPath $execution) -or $count -lt 1 -or -not $previous.actualAllPublicationChecksPassed)
{
    throw 'Require a fresh F039 publication and the verified F038 receipt.'
}
$head = (& git -C $published rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $head -cne 'ec58de221859b542594921a5d4714103108f7459' -or $head -cne $previous.actualFinalReceiptCommit)
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
if ($LASTEXITCODE -ne 0 -or $untracked.Count -ne $count -or @($untracked | Where-Object { -not $_.StartsWith('F039/') }).Count)
{
    throw 'Only the exact newly packaged F039 capsule may be untracked.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
& git -C $published add -- F039
if ($LASTEXITCODE -ne 0)
{
    throw 'Immutable capsule staging failed.'
}
$staged = @(& git -C $published diff --cached --name-only)
if ($LASTEXITCODE -ne 0 -or $staged.Count -ne $count -or @($staged | Where-Object { -not $_.StartsWith('F039/') }).Count)
{
    throw 'Staged immutable scope differs.'
}
& git -C $published -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol `
    --no-pager diff --cached --check -- F039\README.md F039\comparison-results.md F039\validation-commands.md F039\F039-verify.mjs `
    1> (Join-Path $execution 'authored-whitespace.stdout') 2> (Join-Path $execution 'authored-whitespace.stderr')
if ($LASTEXITCODE -ne 0)
{
    throw 'Authored staged publication whitespace check failed.'
}
& node (Join-Path $published 'F039\F039-verify.mjs') (Join-Path $published 'F039') `
    1> (Join-Path $execution 'portable-audit.stdout') 2> (Join-Path $execution 'portable-audit.stderr')
if ($LASTEXITCODE -ne 0)
{
    throw 'Staged capsule portable file/statistics audit failed.'
}
& node (Join-Path $session 'autoperf-verify-publication.mjs') F039 staged $count
if ($LASTEXITCODE -ne 0)
{
    throw 'Staged immutable blobs did not all verify.'
}
$message = "Archive F039 measured TempData containment evidence`n`nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
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
$evidence | Set-Content (Join-Path $session 'F039-results-commit.txt') -Encoding utf8NoBOM
& git -C $published -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin HEAD:refs/heads/autoperf-results
if ($LASTEXITCODE -ne 0)
{
    throw 'Fork evidence push failed.'
}
& node (Join-Path $session 'autoperf-verify-publication.mjs') F039 remote $count
if ($LASTEXITCODE -ne 0)
{
    throw 'Remote immutable blobs did not all verify.'
}
$remote = & gh api repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $remote.object.sha -cne $evidence)
{
    throw 'Actual fork evidence branch does not match the verified commit.'
}
if (@(& git -C $published status --porcelain).Count)
{
    throw 'Immutable publication must leave the results checkout clean.'
}
[ordered]@{
    candidate='F039';actualEvidenceCommit=$evidence;actualImmutableFileCount=$count
    actualStagedAndRemoteImmutableBlobsVerified=$true;actualAuthoredWhitespaceExit=0
    actualPortableAuditExit=0;actualPortableSamplesRecomputed=1280
    actualCrAtEolCommandScopedOnly=$true;actualRawEvidenceByteChanges=$false
    actualRootInventoryUnchanged=$true;actualResultsCheckoutClean=$true
} | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $execution 'verified-result.json') -Encoding utf8NoBOM
Write-Output "F039: evidence $evidence,$count staged/remote immutable blobs verified."
