param(
    [Parameter(Mandatory)]
    [ValidateSet('Evidence','Issue','Receipt')]
    [string] $Stage
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$repo = 'jaslawinMs/aspnetcore'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$capsule = Join-Path $output 'F016'
$count = [int](Get-Content (Join-Path $PSScriptRoot 'F016-immutable-file-count.txt') -Raw)
$source = Get-Content (Join-Path $capsule 'source-branch-publication.json') -Raw | ConvertFrom-Json
$audit = Get-Content (Join-Path $capsule 'measurement-audit.json') -Raw | ConvertFrom-Json
if (-not $audit.auditPassed -or -not $audit.actualLiveAuditPassed -or $audit.performancePrJustified -or -not $audit.budgetClosed -or
    $audit.successfulReports -ne 126 -or -not $source.actualRemoteCanonicalBytesVerified -or $source.sourceChanged -or
    (git -C $output branch --show-current).Trim() -cne 'autoperf-results' -or
    (git -C $output remote get-url origin).Trim() -inotmatch '^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$')
{
    throw 'Only complete conservative no-gain evidence in the dedicated fork checkout is permitted.'
}
function Api([string] $Endpoint)
{
    $result = gh api $Endpoint
    if ($LASTEXITCODE)
    {
        throw "Actual remote retrieval failed:$Endpoint"
    }

    return ($result | ConvertFrom-Json)
}
function Check([string] $Mode)
{
    node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F016 $Mode $count
    if ($LASTEXITCODE)
    {
        throw "Actual $Mode evidence/receipt/index scope or bytes differ."
    }
}
function PushResults
{
    $env:GIT_TERMINAL_PROMPT = '0'
    git -C $output -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin autoperf-results
    if ($LASTEXITCODE)
    {
        throw 'Actual fork results push failed.'
    }
}
if ($Stage -eq 'Evidence')
{
    if ($count -ne @(Get-ChildItem $capsule -Recurse -Force -File).Count -or
        @(git -C $output status --porcelain | Where-Object { -not $_.StartsWith('?? F016/') }))
    {
        throw 'Only the complete new F016 immutable capsule may be staged.'
    }
    git -C $output add -- F016
    if ($LASTEXITCODE)
    {
        throw 'Immutable evidence staging failed.'
    }
    $pending = @(git -C $output diff --cached --name-only)
    if ($pending.Count -ne $count -or @($pending | Where-Object { -not $_.StartsWith('F016/') }))
    {
        throw 'Exact immutable staging scope differs.'
    }
    $authored = @('F016/README.md','F016/harness/*.cs','F016/harness/*.csproj','F016/F016-*.mjs','F016/F016-run-fresh.ps1',
        'F016/historical-*.ps1','F016/historical-*.mjs','F016/issue-template.md','F016/readme-template-source.md',
        'F016/.gitattributes','F016/authoritative-copy-manifest.json','F016/raw-file-copy-verification.json','F016/validation-commands.md')
    git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check -- @authored
    if ($LASTEXITCODE)
    {
        throw 'Authored whitespace failed;never normalize raw evidence to silence it.'
    }
    Check 'staged'
    git -C $output commit -q -m 'Publish legacy decryption capacity trade-off and no-gain evidence' `
        -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
    if ($LASTEXITCODE)
    {
        throw 'Actual immutable evidence commit failed.'
    }
    git -C $output rev-parse HEAD | Set-Content (Join-Path $PSScriptRoot 'F016-results-commit.txt') -Encoding ascii
    PushResults
    Check 'remote'
    if (@(git -C $output status --porcelain).Count)
    {
        throw 'Results checkout is not clean after immutable verification.'
    }
    Write-Output "F016:$count immutable remote blobs verified;all allocation wins and adverse/control timings retained."

    return
}
$immutable = (Get-Content (Join-Path $PSScriptRoot 'F016-results-commit.txt') -Raw).Trim()
$remote = @(Get-Content (Join-Path $PSScriptRoot 'F016-remote-blob-verification.json') -Raw | ConvertFrom-Json)
if ($remote.Count -ne $count -or @($remote | Where-Object { -not $_.verified_remote_blob }))
{
    throw 'Actual complete immutable remote verification must precede issue or receipt.'
}
$issueUrlPath = Join-Path $PSScriptRoot 'F016-issue-url.txt'
$browserPath = Join-Path $PSScriptRoot 'F016-browser-open.json'
$bodyPath = Join-Path $PSScriptRoot 'F016-issue-body.md'
if ($Stage -eq 'Issue')
{
    $fork = Api "repos/$repo"
    $head = Api "repos/$repo/git/ref/heads/$($source.branch)"
    $base = Api "repos/$repo/git/ref/heads/main"
    $results = Api "repos/$repo/git/ref/heads/autoperf-results"
    if ($fork.private -or -not $fork.fork -or $fork.parent.full_name -cne 'dotnet/aspnetcore' -or
        $head.object.sha -cne $source.commit -or $base.object.sha -cne $source.commit -or $results.object.sha -cne $immutable)
    {
        throw 'Actual public fork/original-source/evidence scope differs.'
    }
    $evidence = "https://github.com/$repo/blob/$immutable/F016"
    $body = (Get-Content (Join-Path $capsule 'issue-template.md') -Raw).
        Replace('@EVIDENCE@',$evidence).Replace('@AGGREGATE_TABLE@',(Get-Content (Join-Path $capsule 'analysis-table.md') -Raw).TrimEnd())
    $body += "`n`nUnchanged independent source branch: https://github.com/$repo/tree/$($source.branch)`n"
    if ($body.Length -gt 65000 -or $body.Contains('@EVIDENCE@') -or $body.Contains('@AGGREGATE_TABLE@'))
    {
        throw 'Complete bounded actual issue body required.'
    }
    $body | Set-Content $bodyPath -Encoding utf8NoBOM
    if (Test-Path $issueUrlPath)
    {
        $issueUrl = (Get-Content $issueUrlPath -Raw).Trim()
    }
    else
    {
        $issueArgs = @('issue','create','--repo',$repo,'--title','[AutoPerf F016] Legacy decryption capacity: allocation win, mixed latency (no PR)','--body-file',$bodyPath)
        $issueUrl = (gh @issueArgs | Out-String).Trim()
        if ($LASTEXITCODE -or $issueUrl -notmatch '^https://github\.com/jaslawinMs/aspnetcore/issues/\d+$')
        {
            throw 'Inspect actual issue creation output before retrying.'
        }
        $issueUrl | Set-Content $issueUrlPath -Encoding ascii
    }
    if (-not (Test-Path $browserPath))
    {
        $requested = [DateTimeOffset]::UtcNow.ToString('o')
        $browser = Start-Process -FilePath $issueUrl -PassThru -ErrorAction Stop
        [ordered]@{
            candidate = 'F016'; actualUrl = $issueUrl; browserOpenRequested = $true; launchReturnedWithoutError = $true
            returnedProcessId = $(if ($browser) { $browser.Id } else { $null }); requestedAt = $requested
            visualRenderingVerified = $false; qualification = 'Actual no-gain fork tracking issue,not an optimization PR or visual browser confirmation.'
        } | ConvertTo-Json -Depth 5 | Set-Content $browserPath -Encoding utf8NoBOM
    }
    $number = [int]([uri]$issueUrl).Segments[-1]
    $issue = Api "repos/$repo/issues/$number"
    if ($issue.html_url -cne $issueUrl -or $issue.state -cne 'open' -or $issue.body.TrimEnd() -cne $body.TrimEnd())
    {
        throw 'Actual fork issue identity/body differs.'
    }
    $issue | ConvertTo-Json -Depth 18 | Set-Content (Join-Path $PSScriptRoot 'F016-tracking-issue.json') -Encoding utf8NoBOM
    [ordered]@{
        candidate = 'F016'; source_commit = $source.commit; immutable_evidence_commit = $immutable; tracking_issue = $issueUrl
        actual_issue_body_verified = $true; performance_pr_created = $false; issue_creation_arguments = $issueArgs
        actual_browser_url_requested = $true; recorded_at = [DateTimeOffset]::UtcNow.ToString('o')
    } | ConvertTo-Json -Depth 9 | Set-Content (Join-Path $PSScriptRoot 'F016-issue-publication.json') -Encoding utf8NoBOM
    Write-Output "F016 no-gain tracking issue$issueUrl created/verified and opened;no optimization PR."

    return
}
$receipt = Join-Path $capsule 'publication.json'
if ((Test-Path $receipt) -or @(git -C $output status --porcelain).Count)
{
    throw 'Fresh receipt and clean dedicated results checkout required.'
}
$published = Get-Content (Join-Path $PSScriptRoot 'F016-issue-publication.json') -Raw | ConvertFrom-Json
$browser = Get-Content $browserPath -Raw | ConvertFrom-Json
$copies = Get-Content (Join-Path $capsule 'raw-file-copy-verification.json') -Raw | ConvertFrom-Json
$number = [int]([uri]$published.tracking_issue).Segments[-1]
$issue = Api "repos/$repo/issues/$number"
$head = Api "repos/$repo/git/ref/heads/$($source.branch)"
if ($copies.unique_authoritative_destinations + 5 -ne $count -or -not $copies.all_byte_identical -or
    -not $copies.copied_portable_audit_passed -or -not $published.actual_issue_body_verified -or $published.performance_pr_created -or
    $published.immutable_evidence_commit -cne $immutable -or $head.object.sha -cne $source.commit -or
    $issue.html_url -cne $published.tracking_issue -or $issue.state -cne 'open' -or
    $issue.body.TrimEnd() -cne (Get-Content $bodyPath -Raw).TrimEnd() -or
    -not $browser.launchReturnedWithoutError -or $browser.actualUrl -cne $issue.html_url)
{
    throw 'Actual no-gain source/evidence/issue/browser persistence differs;do not overwrite human changes.'
}
$ledger = Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw | ConvertFrom-Json
$entry = @($ledger.candidates | Where-Object id -CEQ 'F016')
$readmePath = Join-Path $output 'README.md'
$readme = Get-Content $readmePath -Raw
$old = '**Progress: 100/358 finalized**: 63 drafts, 14 no-gain, 19 rejected and 4 duplicates;'
if ($entry.Count -ne 1 -or $entry[0].status -cne 'validated' -or $entry[0].pr_url -or
    -not $readme.Contains($old) -or -not $readme.Contains('258 findings remain unfinished.') -or $readme.Contains('| F016 |'))
{
    throw 'Unique unfinished validated F016 and exact preceding100/358 progress required.'
}
$note = "Measured allocation/time trade-off,no recommended shipping PR;$($issue.html_url). Unchanged independent fork branch$($source.branch),baseline$($source.commit),both actual remote canonical source blobs verified,no new source commit;exact measured2file+37/-1 candidate patch/new9-row preservation test retained,only own edits restored,4unrelated reports preserved.3/3 comparisons permanently closed,one candidate,6actual Framework profiles/126reports/1008raw/952retained/56upper-filtered/378warmups/2256overheads. Partial-large allocation39.69-39.95% lower;SHA25664KiB+1 time35.30% loweraggregate and34-36% everypair. But SHA5121MiB+1 C3+57.11%,aggregate+8.91%,CV18.80% causeunestablished;small/aligned/empty costs retained,combined gatefails,notzeroallocationbenefit. Actual public factory/Secret.Random/descriptor,real untimed Encrypt-produced payload and actual timed Decrypt,no per-call RNG/private access/copied owner/modern-path/productionfrequencyclaim. Actual net472/x64host/net462owner/corelib4.8.10008/workstationGC;91-file Framework and77-file compatibility paired images onlyownerDLL/PDBdifferent. Both rolesall3productTFMs build,40+24owning rows pass,36newTheoryexecutions verified,formatter0of2;enabledAPICompatpasses,3packedownersmatch,releasedbaselineunset. Live/copy audit406files/28sources/20PEPDB/110documents/504roundtrips/12contracts/252unchangedsettings passes,selectednotwholecompilerprovenance. Fresh relocated original/candidatePrepare builds91-fileimages,notiming/nativeexecution. Immutable$immutable/$countfiles/allremoteverified,rawcopiesbyteexact,omittedbinaries/binlogs/packageshashesonly. Actual19sourcetriples/default491476captured,onlyVersionspropsselecteddelta,notwholemainSDKintegration. Trackingissuebodyandforkrefverified,actualnewissueURLopenedimmediately,noperformancePRorvisualrenderingclaim."
& (Join-Path $PSScriptRoot 'autoperf-campaign.ps1') -Action Update -Id F016 -Status no-gain -Branch $source.branch -Note $note |
    Set-Content (Join-Path $PSScriptRoot 'F016-no-gain-ledger-update.json') -Encoding utf8NoBOM
& (Join-Path $PSScriptRoot 'autoperf-export.ps1') -OutputRoot $output
$ledger = Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw | ConvertFrom-Json
if ($ledger.candidates.Count -ne 358 -or @($ledger.candidates | Where-Object status -In 'drafted','no-gain','rejected','duplicate').Count -ne 101 -or
    @($ledger.candidates | Where-Object status -CEQ 'drafted').Count -ne 63 -or
    @($ledger.candidates | Where-Object status -CEQ 'no-gain').Count -ne 15 -or
    @($ledger.candidates | Where-Object status -CEQ 'rejected').Count -ne 19 -or
    @($ledger.candidates | Where-Object status -CEQ 'duplicate').Count -ne 4)
{
    throw 'Exact campaign disposition counts differ.'
}
$readme = $readme.Replace($old,'**Progress: 101/358 finalized**: 63 drafts, 15 no-gain, 19 rejected and 4 duplicates;').
    Replace('258 findings remain unfinished.','257 findings remain unfinished.').
    Replace('|---|---|---|| F015','|---|---|---|' + "`n" + '| F015')
$readme = [regex]::Replace($readme,'(?m)^(\| F015 \|[^\r\n]*)\r?\n\r?\n(?=\| F014 \|)','$1' + "`n")
$anchor = [regex]::Matches($readme,'(?m)^\|---\|---\|---\|\r?\n')
if ($anchor.Count -ne 1)
{
    throw 'Exact repaired GFM root table anchor required.'
}
$row = "| F016 | No-gain/mixed trade-off;[tracking jaslawinMs/aspnetcore#$number]($($issue.html_url));partial-block allocation gains and adverse latency retained,3closed pairs,no PR | [Legacy managed decryption capacity](F016/README.md) |"
$readme = $readme.Insert($anchor[0].Index + $anchor[0].Length,$row + "`n")
$readme | Set-Content $readmePath -Encoding utf8NoBOM -NoNewline
[ordered]@{
    candidate = 'F016'; disposition = 'no-gain'; proposal_disposition = $audit.proposalDisposition
    performance_pr_justified = $false; performance_pr_created = $false; allocation_improvement_observed = $true
    no_gain_bucket_is_not_zero_allocation_benefit_claim = $true; source_branch = $source.branch; source_commit = $source.commit
    source_changed = $false; new_source_commit_created = $false; actual_remote_source_ref = $head
    actual_remote_source_canonical_blobs_verified = $true; retained_candidate_patch = 'candidate.patch'
    immutable_evidence_commit = $immutable; immutable_evidence_files = $count
    authoritative_copy_mappings = $copies.verified_copy_mappings; verified_remote_immutable_blobs = $count
    actual_tracking_issue = $issue; tracking_issue_remote_body_exactly_verified = $true; browser_open = $browser
    visual_browser_rendering_verified = $false; comparison_budget_closed = $true; paired_comparisons = 3
    maximum_paired_comparisons = 3; original_profiles = 3; candidate_profiles = 3; benchmark_reports = 126
    full_independent_measurement_audit = $audit; raw_copy_verification = $copies
    source_restoration_is_not_new_test_run = $true; actual_fresh_preparation_native_execution = $false
    actual_live_and_copied_portable_audits_passed = $true; portable_omitted_binary_bytes_rehashed = $false
    existing_F015_table_line_break_repaired_at_F016_insertion = $true
    campaign_finalized = 101; campaign_total = 358; campaign_unfinished = 257; finalized_at = [DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 24 | Set-Content $receipt -Encoding utf8NoBOM
git -C $output add -- F016/publication.json README.md campaign.json findings.md
if ($LASTEXITCODE)
{
    throw 'Four-file receipt/root staging failed.'
}
git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if ($LASTEXITCODE)
{
    throw 'Receipt/root whitespace failed.'
}
Check 'receipt-staged'
git -C $output commit -q -m 'Record decryption trade-off and101 finalized findings' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if ($LASTEXITCODE)
{
    throw 'Actual receipt/root commit failed.'
}
git -C $output rev-parse HEAD | Set-Content (Join-Path $PSScriptRoot 'F016-publication-results-commit.txt') -Encoding ascii
PushResults
Check 'receipt'
if (@(git -C $output status --porcelain).Count)
{
    throw 'Actual results checkout not clean after complete publication.'
}
Write-Output "F016 persistent no-gain/trade-off$($issue.html_url):101/358 finalized,63drafts,15no-gain,19rejected,4duplicates,257unfinished;$($count + 4)remote entries verified."
