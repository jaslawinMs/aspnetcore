$ErrorActionPreference = 'Stop'
$session = $PSScriptRoot
$root = 'C:\src\aspnetcore'
$run = Join-Path $session 'autoperf-runs\F020'
$published = Join-Path $session 'autoperf-published-results'
$target = Join-Path $published 'F020'
$relocated = Join-Path $session 'F020-portable-check'
$execution = Join-Path $session 'F020-publication-execution\evidence'
$baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$selected = '4c2d4c04460429a9e49e5c78c2091d82ae53e324'
$branch = 'autoperf/F020-jsonpatch-list-type-duplicate'
$preceding = (Get-Content -Raw (Join-Path $session 'F019-publication-results-commit.txt')).Trim()
$ledger = Get-Content -Raw (Join-Path $session 'autoperf-campaign.json') | ConvertFrom-Json
if (@($ledger.candidates | Where-Object { $_.id -eq 'F020' -and $_.status -eq 'investigating' }).Count -ne 1 -or
    @($ledger.candidates | Where-Object status -in @('drafted', 'no-gain', 'rejected', 'duplicate')).Count -ne 103 -or
    (Test-Path $execution) -or (Test-Path $target) -or (Test-Path $relocated))
{
    throw 'Require the actual unpublished F020 source-only alias and fresh publication paths.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
$script:sequence = 0
function Invoke-Captured([string]$Label, [string]$File, [string[]]$Arguments, [string]$WorkingDirectory)
{
    $script:sequence++
    $stem = Join-Path $execution ('{0:D3}-{1}' -f $script:sequence, $Label)
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    Push-Location $WorkingDirectory
    try
    {
        & $File @Arguments 1> ($stem + '.stdout') 2> ($stem + '.stderr')
        $actualExit = $LASTEXITCODE
    }
    finally
    {
        Pop-Location
    }
    [ordered]@{
        executable = $File
        arguments = $Arguments
        workingDirectory = $WorkingDirectory
        started = $started
        completed = [DateTimeOffset]::UtcNow.ToString('o')
        actualExitCode = $actualExit
    } | ConvertTo-Json -Depth 10 | Set-Content ($stem + '.json') -Encoding utf8NoBOM
    if ($actualExit -ne 0)
    {
        throw "Actual publication command failed; preserve $stem"
    }

    return [IO.File]::ReadAllText($stem + '.stdout')
}
function Copy-TreeByteExact([string]$Source, [string]$Destination)
{
    if (Test-Path $Destination)
    {
        throw "Refuse to overwrite an existing destination: $Destination"
    }
    New-Item -ItemType Directory -Path $Destination | Out-Null
    $files = @(Get-ChildItem -LiteralPath $Source -Recurse -File -Force)
    foreach ($file in $files)
    {
        $relative = [IO.Path]::GetRelativePath($Source, $file.FullName)
        $copy = Join-Path $Destination $relative
        [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($copy)) | Out-Null
        Copy-Item -LiteralPath $file.FullName -Destination $copy
        if ((Get-FileHash -LiteralPath $file.FullName).Hash -ne (Get-FileHash -LiteralPath $copy).Hash)
        {
            throw "Copied bytes differ: $relative"
        }
    }
    if (@(Get-ChildItem -LiteralPath $Destination -Recurse -File -Force).Count -ne $files.Count)
    {
        throw 'Copied file inventory differs.'
    }
}
$resultsStatus = Invoke-Captured 'results-status' 'git' @('status', '--porcelain') $published
$resultsHead = (Invoke-Captured 'results-head' 'git' @('rev-parse', 'HEAD') $published).Trim()
$resultsBranch = (Invoke-Captured 'results-branch' 'git' @('branch', '--show-current') $published).Trim()
$resultsRemote = (Invoke-Captured 'results-remote' 'git' @('remote', 'get-url', 'origin') $published).Trim()
$sourceRemote = (Invoke-Captured 'source-remote' 'git' @('remote', 'get-url', 'autoperf') $root).Trim()
$sourceHead = (Invoke-Captured 'source-head' 'git' @('rev-parse', 'HEAD') $root).Trim()
$sourceBranch = (Invoke-Captured 'source-branch' 'git' @('branch', '--show-current') $root).Trim()
$sourceStatus = Invoke-Captured 'source-tracked-status' 'git' @('status', '--porcelain', '--untracked-files=no') $root
if ($resultsStatus.Trim() -or $resultsHead -ne $preceding -or $resultsBranch -ne 'autoperf-results' -or
    $resultsRemote -ne 'https://github.com/jaslawinMs/aspnetcore.git' -or
    $sourceRemote -ne 'https://github.com/jaslawinMs/aspnetcore.git' -or
    $sourceHead -ne $baseline -or $sourceBranch -ne $branch -or $sourceStatus.Trim())
{
    throw 'Actual clean dedicated fork/source contexts differ.'
}
$actualFork = Invoke-Captured 'actual-fork' 'gh' @('api', 'repos/jaslawinMs/aspnetcore') $root | ConvertFrom-Json
$actualResultsRef = Invoke-Captured 'actual-prior-results-ref' 'gh' @('api', 'repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results') $root | ConvertFrom-Json
$actualCanonical = Invoke-Captured 'actual-canonical-draft' 'gh' @('api', 'repos/jaslawinMs/aspnetcore/pulls/91') $root | ConvertFrom-Json
$actualMain = Invoke-Captured 'actual-unchanged-main' 'gh' @('api', 'repos/jaslawinMs/aspnetcore/git/ref/heads/main') $root | ConvertFrom-Json
if ($actualFork.full_name -ne 'jaslawinMs/aspnetcore' -or $actualFork.private -or -not $actualFork.fork -or
    $actualFork.parent.full_name -ne 'dotnet/aspnetcore' -or $actualResultsRef.object.sha -ne $preceding -or
    $actualCanonical.head.sha -ne $selected -or $actualCanonical.state -ne 'open' -or -not $actualCanonical.draft -or
    $actualCanonical.head.repo.full_name -ne 'jaslawinMs/aspnetcore' -or
    $actualCanonical.base.repo.full_name -ne 'jaslawinMs/aspnetcore' -or $actualMain.object.sha -ne $baseline)
{
    throw 'Actual public fork, prior result head, canonical fork draft or unchanged fork main differs.'
}
$priorTracking = (Invoke-Captured 'prior-tracking-ref' 'git' @('ls-remote', '--heads', 'autoperf', "refs/heads/$branch") $root).Trim()
if ($priorTracking -and ($priorTracking -split '\s+')[0] -ne $baseline)
{
    throw 'Do not overwrite a different existing tracking branch.'
}
$null = Invoke-Captured 'push-independent-tracking-branch' 'git' @('push', 'autoperf', "HEAD:refs/heads/$branch") $root
$actualTracking = Invoke-Captured 'actual-tracking-ref' 'gh' @('api', "repos/jaslawinMs/aspnetcore/git/ref/heads/$branch") $root | ConvertFrom-Json
if ($actualTracking.object.sha -ne $baseline)
{
    throw 'Actual independent tracking branch does not point to the unchanged baseline.'
}
$sourcePublication = Join-Path $run 'source-publication'
if (Test-Path $sourcePublication)
{
    throw 'Do not overwrite actual source-ref publication evidence.'
}
New-Item -ItemType Directory -Path $sourcePublication | Out-Null
Get-ChildItem -LiteralPath $execution -File | Copy-Item -Destination $sourcePublication
[ordered]@{
    candidate = 'F020'
    sourceBranch = $branch
    sourceCommit = $baseline
    actualRemoteTrackingRef = $actualTracking
    requestedPublicForkVerified = $true
    actualPriorResultsHead = $preceding
    actualUnchangedMain = $actualMain.object.sha
    actualCanonicalDraftSource = $actualCanonical.head.sha
    canonicalDraftOpen = $true
    canonicalDraftStillDraft = $true
    productSourceChanges = 0
    sourceCommitCreated = $false
    newDraftCreated = $false
} | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $sourcePublication 'verified-source-publication.json') -Encoding utf8NoBOM
Copy-Item -LiteralPath (Join-Path $session 'F020-audit.mjs') -Destination (Join-Path $run 'reproduce-alias.mjs')
Copy-Item -LiteralPath (Join-Path $session 'F020-results-readme.md') -Destination (Join-Path $run 'README.md')
Copy-Item -LiteralPath (Join-Path $root 'LICENSE.txt') -Destination (Join-Path $run 'LICENSE.txt')
Copy-Item -LiteralPath (Join-Path $session 'F020-package-gitattributes.txt') -Destination (Join-Path $run '.gitattributes')
Copy-TreeByteExact $run $relocated
$portableArguments = @((Join-Path $relocated 'reproduce-alias.mjs'), $relocated, '--verify')
$portableOutput = Invoke-Captured 'relocated-offline-alias-audit' 'node' $portableArguments $root
$portableAudit = $portableOutput | ConvertFrom-Json
if (-not $portableAudit.auditPassed -or -not $portableAudit.sourceOnly -or $portableAudit.newComparisons -ne 0 -or
    $portableAudit.canonicalActualRemoteBlobsVerified -ne 171 -or $portableAudit.historicalProcessThreadPrioritiesVerified)
{
    throw 'Actual relocated alias/source audit did not prove the declared source-only boundaries.'
}
$portableEvidence = Join-Path $run 'portable-validation'
New-Item -ItemType Directory -Path $portableEvidence | Out-Null
Get-ChildItem -LiteralPath $execution -File -Filter '*relocated-offline-alias-audit*' |
    Copy-Item -Destination $portableEvidence
[ordered]@{
    candidate = 'F020'
    relocatedWindowsCapsuleAuditActuallyExecuted = $true
    actualExitCode = 0
    inputRunRoot = $run
    newRelocatedRoot = $relocated
    originalCheckoutOrNetworkReadInVerifyMode = $false
    copiedSourceIdentitiesRehashed = 5
    offlineActualCanonicalRemoteTreeReceiptEntries = 171
    omittedCanonicalFilesRehashedByOfflineAliasAudit = $false
    canonicalReadOnlyRawReplayWasExecutedSeparatelyBeforeFreeze = $true
} | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $portableEvidence 'verified-portable-audit.json') -Encoding utf8NoBOM
$manifestPath = Join-Path $run 'capsule-manifest.json'
if (Test-Path $manifestPath)
{
    throw 'Do not replace an immutable alias capsule manifest.'
}
$bindings = @(Get-ChildItem -LiteralPath $run -Recurse -File -Force | Sort-Object FullName | ForEach-Object {
    [ordered]@{
        path = [IO.Path]::GetRelativePath($run, $_.FullName)
        bytes = $_.Length
        sha256 = (Get-FileHash -LiteralPath $_.FullName).Hash
    }
})
[ordered]@{
    candidate = 'F020'
    sourceOnly = $true
    mappings = $bindings
    exactMappedFiles = $bindings.Count
    manifestDoesNotHashItself = $true
    binaryOmissions = 0
    generatedAt = [DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 10 | Set-Content $manifestPath -Encoding utf8NoBOM
Copy-TreeByteExact $run $target
$fileCount = @(Get-ChildItem -LiteralPath $target -Recurse -File -Force).Count
if ($fileCount -ne $bindings.Count + 1)
{
    throw 'Final byte-exact immutable alias inventory differs.'
}
$null = Invoke-Captured 'stage-immutable-evidence' 'git' @('add', '--', 'F020') $published
$null = Invoke-Captured 'verify-staged-evidence' 'node' @((Join-Path $session 'autoperf-verify-publication.mjs'), 'F020', 'staged', "$fileCount") $root
$message = "Record F020 semantic alias of measured JSON Patch metadata cache`n`nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
$null = Invoke-Captured 'commit-immutable-evidence' 'git' @('commit', '--quiet', '-m', $message) $published
$commit = (Invoke-Captured 'actual-immutable-commit' 'git' @('rev-parse', 'HEAD') $published).Trim()
$null = Invoke-Captured 'push-immutable-evidence' 'git' @('push', 'origin', 'HEAD:refs/heads/autoperf-results') $published
$commit | Set-Content (Join-Path $session 'F020-results-commit.txt') -Encoding utf8NoBOM
$fileCount | Set-Content (Join-Path $session 'F020-immutable-file-count.txt') -Encoding utf8NoBOM
$null = Invoke-Captured 'verify-actual-remote-evidence' 'node' @((Join-Path $session 'autoperf-verify-publication.mjs'), 'F020', 'remote', "$fileCount") $root
[ordered]@{
    candidate = 'F020'
    duplicateOf = 'F086'
    immutableEvidenceCommit = $commit
    authoritativeMappings = $bindings.Count
    immutableEvidenceFiles = $fileCount
    actualRemoteImmutableBlobsVerified = @(Get-Content -Raw (Join-Path $session 'F020-remote-blob-verification.json') | ConvertFrom-Json).Count
    actualTrackingRefVerified = $actualTracking.object.sha
    actualCanonicalDraftSourceVerified = $actualCanonical.head.sha
    sourceChanges = 0
    newDraft = $false
    newComparisons = 0
    canonicalComparisons = 1
    canonicalBudgetStaysClosed = $true
    historicalProcessThreadPrioritiesVerified = $false
    pendingReceiptAndRootIndex = $true
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $session 'F020-evidence-publication.json') -Encoding utf8NoBOM
if ((Resolve-Path -LiteralPath $relocated).Path -ne (Join-Path $session 'F020-portable-check'))
{
    throw 'Refuse cleanup of an unexpected relocated-check directory.'
}
Remove-Item -LiteralPath $relocated -Recurse -Force
Get-Content (Join-Path $session 'F020-evidence-publication.json')
