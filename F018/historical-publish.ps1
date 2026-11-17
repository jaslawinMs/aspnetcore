param(
    [Parameter(Mandatory)]
    [ValidateSet('Evidence','Draft','Receipt')]
    [string] $Stage
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$repo = 'jaslawinMs/aspnetcore'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$capsule = Join-Path $output 'F018'
$count = [int](Get-Content (Join-Path $PSScriptRoot 'F018-immutable-file-count.txt') -Raw)
$source = Get-Content (Join-Path $capsule 'source-publication\verified-source-publication.json') -Raw | ConvertFrom-Json
$audit = Get-Content (Join-Path $capsule 'measurement-audit.json') -Raw | ConvertFrom-Json
if (-not $audit.auditPassed -or -not $audit.actualLiveAuditPassed -or -not $audit.performancePrJustified -or -not $audit.budgetClosed -or
    -not $audit.prespecifiedClearGainEarlyStopJustified -or $audit.successfulReports -ne 48 -or $audit.pairedComparisons -ne 1 -or
    -not $source.actualRemoteRefVerified -or -not $source.onlyIntendedTwoSourceFilesCommitted -or
    (git -C $output branch --show-current).Trim() -cne 'autoperf-results' -or
    (git -C $output remote get-url origin).Trim() -inotmatch '^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$')
{
    throw 'Only complete qualified F018 evidence in the dedicated fork checkout is permitted.'
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
    node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F018 $Mode $count
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
        @(git -C $output status --porcelain | Where-Object { -not $_.StartsWith('?? F018/') }))
    {
        throw 'Only the complete new F018 immutable capsule may be staged.'
    }
    git -C $output add -- F018
    if ($LASTEXITCODE)
    {
        throw 'Immutable evidence staging failed.'
    }
    $pending = @(git -C $output diff --cached --name-only)
    if ($pending.Count -ne $count -or @($pending | Where-Object { -not $_.StartsWith('F018/') }))
    {
        throw 'Exact immutable staging scope differs.'
    }
    $authored = @('F018/README.md','F018/harness/*.cs','F018/harness/*.csproj','F018/F018-*.mjs','F018/F018-run-fresh.ps1',
        'F018/historical-*.ps1','F018/historical-*.mjs','F018/issue-template.md','F018/pr-detail-template.md',
        'F018/readme-template-source.md','F018/.gitattributes','F018/authoritative-copy-manifest.json',
        'F018/raw-file-copy-verification.json','F018/validation-commands.md')
    git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check -- @authored
    if ($LASTEXITCODE)
    {
        throw 'Authored whitespace failed;never normalize raw evidence to silence it.'
    }
    Check 'staged'
    git -C $output commit -q -m 'Publish guarded Google UTF8 allocation and synthetic-scaling evidence' `
        -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
    if ($LASTEXITCODE)
    {
        throw 'Actual immutable evidence commit failed.'
    }
    git -C $output rev-parse HEAD | Set-Content (Join-Path $PSScriptRoot 'F018-results-commit.txt') -Encoding ascii
    PushResults
    Check 'remote'
    if (@(git -C $output status --porcelain).Count)
    {
        throw 'Results checkout is not clean after immutable verification.'
    }
    Write-Output "F018:$count immutable remote blobs verified;all24 outcomes and failed preparation evidence retained."

    return
}
$immutable = (Get-Content (Join-Path $PSScriptRoot 'F018-results-commit.txt') -Raw).Trim()
$remote = @(Get-Content (Join-Path $PSScriptRoot 'F018-remote-blob-verification.json') -Raw | ConvertFrom-Json)
if ($remote.Count -ne $count -or @($remote | Where-Object { -not $_.verified_remote_blob }))
{
    throw 'Actual complete immutable remote verification must precede draft or receipt.'
}
$issueUrlPath = Join-Path $PSScriptRoot 'F018-issue-url.txt'
$prUrlPath = Join-Path $PSScriptRoot 'F018-pr-url.txt'
$browserPath = Join-Path $PSScriptRoot 'F018-browser-open.json'
$bodyPath = Join-Path $PSScriptRoot 'F018-pr-body.md'
if ($Stage -eq 'Draft')
{
    $fork = Api "repos/$repo"
    $base = Api "repos/$repo/git/ref/heads/main"
    $head = Api "repos/$repo/git/ref/heads/$($source.branch)"
    $results = Api "repos/$repo/git/ref/heads/autoperf-results"
    $comparison = Api "repos/$repo/compare/$($source.baseline)...$($source.commit)"
    if ($fork.private -or -not $fork.fork -or $fork.parent.full_name -cne 'dotnet/aspnetcore' -or
        $fork.default_branch -cne 'main' -or $base.object.sha -cne $source.baseline -or $head.object.sha -cne $source.commit -or
        $results.object.sha -cne $immutable -or $comparison.ahead_by -ne 1 -or $comparison.files.Count -ne 2 -or
        ($comparison.files | Measure-Object additions -Sum).Sum -ne 143 -or ($comparison.files | Measure-Object deletions -Sum).Sum -ne 1)
    {
        throw 'Actual public fork/source/base/evidence scope differs.'
    }
    foreach ($binding in $source.canonicalSourceBindings)
    {
        $actual = @($comparison.files | Where-Object filename -CEQ $binding.path)
        if ($actual.Count -ne 1 -or $actual[0].sha -cne $binding.gitBlob)
        {
            throw 'Actual remote canonical source blob differs.'
        }
    }
    $evidence = "https://github.com/$repo/blob/$immutable/F018"
    $issueBody = (Get-Content (Join-Path $capsule 'issue-template.md') -Raw).Replace('@EVIDENCE@',$evidence)
    $issueBodyPath = Join-Path $PSScriptRoot 'F018-issue-body.md'
    $issueBody | Set-Content $issueBodyPath -Encoding utf8NoBOM
    if (Test-Path $issueUrlPath)
    {
        $issueUrl = (Get-Content $issueUrlPath -Raw).Trim()
    }
    else
    {
        $issueArgs = @('issue','create','--repo',$repo,'--title','[AutoPerf F018] Guarded Google UTF8 parsing: allocation/scaling trade-off','--body-file',$issueBodyPath)
        $issueUrl = (gh @issueArgs | Out-String).Trim()
        if ($LASTEXITCODE -or $issueUrl -notmatch '^https://github\.com/jaslawinMs/aspnetcore/issues/\d+$')
        {
            throw 'Inspect actual issue creation output before retrying.'
        }
        $issueUrl | Set-Content $issueUrlPath -Encoding ascii
    }
    $issueNumber = [int]([uri]$issueUrl).Segments[-1]
    $issue = Api "repos/$repo/issues/$issueNumber"
    if ($issue.html_url -cne $issueUrl -or $issue.state -cne 'open' -or $issue.body.TrimEnd() -cne $issueBody.TrimEnd())
    {
        throw 'Actual fork tracking issue identity/body differs.'
    }
    $issue | ConvertTo-Json -Depth 20 | Set-Content (Join-Path $PSScriptRoot 'F018-tracking-issue.json') -Encoding utf8NoBOM
    function Quote([string] $Value)
    {
        return "'" + $Value.Replace("'","''") + "'"
    }
    $commands = [System.Collections.Generic.List[string]]::new()
    function AddCommand([string] $Label, [string] $Relative, [string] $Result)
    {
        $record = Get-Content (Join-Path $capsule $Relative) -Raw | ConvertFrom-Json
        if ($record.actualExitCode -ne 0)
        {
            throw 'Selected validation command must actually pass.'
        }
        $commands.Add("**$Label**")
        $commands.Add('```powershell')
        $commands.Add('. .\activate.ps1')
        $commands.Add('& ' + (Quote $record.executable) + ' ' + (($record.arguments | ForEach-Object { Quote $_ }) -join ' '))
        $commands.Add('```')
        $commands.Add("**Result: actual exit0; $Result**")
        $commands.Add('')
    }
    foreach ($role in 'original','candidate')
    {
        AddCommand "$role product build" "preparation-execution\$role-BuildProduct\attempt-001\004-build-all-product-targets.json" 'net12.0,zero warnings/errors.'
        $attempt = if ($role -eq 'original') { 'attempt-002' } else { 'attempt-001' }
        AddCommand "$role owning GoogleTests" "preparation-execution\$role-Test\$attempt\001-owning-GoogleTests-net12.0.json" `
            '68passed,zero failures/skips;all18new Theory rows individually XML-checked;managed TestServer mode,actual references built.'
    }
    AddCommand 'Final standalone harness build' 'preparation-execution\original-BuildHarness\attempt-002\001-build-standalone-harness.json' `
        'net12,zero warnings/errors;the exact harness image is shared by original/candidate.'
    AddCommand 'Changed-file formatter' 'preparation-execution\candidate-Format\attempt-001\001-verify-changed-whitespace.json' `
        'exactly2files selected;0of2changed.'
    AddCommand 'Existing enabled package-validation gate' 'preparation-execution\candidate-Pack\attempt-001\002-existing-enabled-package-validation.json' `
        'APICompat actually runs successfully,zero warnings/errors;packed owner equals frozen/tested candidate;released baseline version unset.'
    $commands.Add('```powershell')
    $commands.Add('node .\F018-analyze.mjs . --verify')
    $commands.Add('node .\F018-audit.mjs . --verify')
    $commands.Add('```')
    $commands.Add('**Result: both actual exit0 in the copied standalone capsule;all raw/native/source/TRX/statistical checks pass. Omitted binary images are not reopened.**')
    $detail = (Get-Content (Join-Path $capsule 'pr-detail-template.md') -Raw).
        Replace('@EVIDENCE@',$evidence).Replace('@SOURCE_COMMIT@',$source.commit).Replace('@FILE_COUNT@',[string]$count).
        Replace('{{AGGREGATE_TABLE}}',(Get-Content (Join-Path $capsule 'analysis-table.md') -Raw).TrimEnd()).
        Replace('@COMMANDS@',($commands -join "`n"))
    $template = Get-Content 'C:\src\aspnetcore\.github\pull_request_template.md' -Raw
    if ($template -cne (Get-Content (Join-Path $capsule 'pr-template-source.md') -Raw))
    {
        throw 'Actual inspected/captured repository template changed.'
    }
    $title = '[AutoPerf F018] Avoid the UTF16 bridge for declared UTF8 Google user info'
    $body = $template.Replace('# {PR title}',"# $title").
        Replace("- [ ] You've included unit or integration tests","- [x] You've included unit or integration tests").
        Replace("- [ ] There's an open issue","- [x] There's an open issue").
        Replace('Summary of the changes (Less than 80 chars)','Avoid a selected UTF16 bridge while preserving Google user-info decoding').
        Replace('{Detail}',$detail).Replace('Fixes #{bug number} (in this specific format)',"Fixes jaslawinMs/aspnetcore#$issueNumber")
    if ($body.Length -gt 65000 -or $body -match '@(EVIDENCE|COMMANDS|SOURCE_COMMIT|FILE_COUNT)@|\{\{AGGREGATE_TABLE\}\}')
    {
        throw 'Complete bounded actual PR body required.'
    }
    $body | Set-Content $bodyPath -Encoding utf8NoBOM
    if (Test-Path $prUrlPath)
    {
        $prUrl = (Get-Content $prUrlPath -Raw).Trim()
    }
    else
    {
        $prArgs = @('pr','create','--repo',$repo,'--base','main','--head',$source.branch,'--draft','--title',$title,'--body-file',$bodyPath)
        $prUrl = (gh @prArgs | Out-String).Trim()
        if ($LASTEXITCODE -or $prUrl -notmatch '^https://github\.com/jaslawinMs/aspnetcore/pull/\d+$')
        {
            throw 'Inspect actual draft output before retrying.'
        }
        $prUrl | Set-Content $prUrlPath -Encoding ascii
    }
    if (-not (Test-Path $browserPath))
    {
        $requested = [DateTimeOffset]::UtcNow.ToString('o')
        $browser = Start-Process -FilePath $prUrl -PassThru -ErrorAction Stop
        [ordered]@{
            candidate = 'F018'; url = $prUrl; requestedAt = $requested; startProcessSucceeded = $true
            returnedProcessId = $(if ($browser) { $browser.Id } else { $null }); visualRenderingVerified = $false
            note = 'Actual newly created fork draft handed immediately to Windows default browser before subsequent body verification;no visual rendering claim.'
        } | ConvertTo-Json -Depth 5 | Set-Content $browserPath -Encoding utf8NoBOM
    }
    $prNumber = [int]([uri]$prUrl).Segments[-1]
    $pr = Api "repos/$repo/pulls/$prNumber"
    if (-not $pr.draft -or $pr.state -cne 'open' -or $pr.html_url -cne $prUrl -or $pr.head.repo.full_name -cne $repo -or
        $pr.base.repo.full_name -cne $repo -or $pr.head.ref -cne $source.branch -or $pr.base.ref -cne 'main' -or
        $pr.head.sha -cne $source.commit -or $pr.base.sha -cne $source.baseline -or
        $pr.title -cne $title -or $pr.body.TrimEnd() -cne $body.TrimEnd())
    {
        throw 'Actual fork draft/head/base/body identity differs.'
    }
    $pr | ConvertTo-Json -Depth 24 | Set-Content (Join-Path $PSScriptRoot 'F018-created-pr.json') -Encoding utf8NoBOM
    [ordered]@{
        candidate = 'F018'; source_commit = $source.commit; immutable_evidence_commit = $immutable; tracking_issue = $issueUrl
        draft_pr = $prUrl; actual_draft_head_base_body_verified = $true; actual_remote_canonical_source_blobs_verified = $true
        issue_creation_arguments = $issueArgs; draft_creation_arguments = $prArgs
        actual_browser_url_requested = $true; recorded_at = [DateTimeOffset]::UtcNow.ToString('o')
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $PSScriptRoot 'F018-draft-publication.json') -Encoding utf8NoBOM
    Write-Output "F018 qualified fork draft$prUrl created/verified and immediately opened;not merge-ready."

    return
}
$receipt = Join-Path $capsule 'publication.json'
if ((Test-Path $receipt) -or @(git -C $output status --porcelain).Count)
{
    throw 'Fresh receipt and clean dedicated results checkout required.'
}
$published = Get-Content (Join-Path $PSScriptRoot 'F018-draft-publication.json') -Raw | ConvertFrom-Json
$browser = Get-Content $browserPath -Raw | ConvertFrom-Json
$copies = Get-Content (Join-Path $capsule 'raw-file-copy-verification.json') -Raw | ConvertFrom-Json
$number = [int]([uri]$published.draft_pr).Segments[-1]
$pr = Api "repos/$repo/pulls/$number"
$head = Api "repos/$repo/git/ref/heads/$($source.branch)"
if ($copies.unique_authoritative_destinations + 5 -ne $count -or -not $copies.all_byte_identical -or
    -not $copies.copied_portable_audit_passed -or -not $published.actual_draft_head_base_body_verified -or
    -not $published.actual_remote_canonical_source_blobs_verified -or $published.source_commit -cne $source.commit -or
    $published.immutable_evidence_commit -cne $immutable -or $head.object.sha -cne $source.commit -or
    -not $pr.draft -or $pr.state -cne 'open' -or $pr.html_url -cne $published.draft_pr -or
    $pr.head.repo.full_name -cne $repo -or $pr.base.repo.full_name -cne $repo -or
    $pr.head.ref -cne $source.branch -or $pr.base.ref -cne 'main' -or $pr.head.sha -cne $source.commit -or
    $pr.base.sha -cne $source.baseline -or $pr.body.TrimEnd() -cne (Get-Content $bodyPath -Raw).TrimEnd() -or
    -not $browser.startProcessSucceeded -or $browser.url -cne $pr.html_url)
{
    throw 'Actual qualified source/evidence/draft/browser persistence differs;do not overwrite human changes.'
}
$ledger = Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw | ConvertFrom-Json
$entry = @($ledger.candidates | Where-Object id -CEQ 'F018')
$readmePath = Join-Path $output 'README.md'
$readme = Get-Content $readmePath -Raw
$old = '**Progress: 101/358 finalized**: 63 drafts, 15 no-gain, 19 rejected and 4 duplicates;'
if ($entry.Count -ne 1 -or $entry[0].status -cne 'validated' -or $entry[0].pr_url -or
    -not $readme.Contains($old) -or -not $readme.Contains('257 findings remain unfinished.') -or $readme.Contains('| F018 |'))
{
    throw 'Unique unfinished validated F018 and exact preceding101/358 progress required.'
}
$note = "Qualified allocation/synthetic-scaling fork draft$($pr.html_url),notmerge-ready. Exact2-file+143/-1sourceforkcommit$($source.commit),branch$($source.branch),bothcanonicalremoteblobsverified;public/protected/default/challenge/APIbaseline/dependency/TFM/ownershipunchanged. Onepairedcomparison/2profiles/48reports/384raw/357retained/27upperfiltered/144warmups/940overheads;64KiBASCIIpaddingtime-80.09%,B/op-32.75%;16KiB-50.86%/-31.12%;all24rowsretainedincludinginvalidUTF8large+15.19%time/+31.26%allocation,small/charset/UTF16controlsnotuniversallyfaster. Prespecified>=50%largecaseclear-gainruleclosesbudgetafter1of3;noextranative/timingprofiles. Actualnet12/x64/serverGC/sharedWindowsHyperV/Normalprocess-thread-affinityobserved;settings-preservingexecutor,nopowerchangeasked. RealDI/optionsGoogleHandler/protectedwrapper,HttpClient/HttpContent-producedbuffering,actualclaims/event/ticket,equalexternalcleanup;notstreaming/copiedowner/externalnetwork/browser/fullcallback/login/productioninputdistributionclaim. Both68-rowGooglesuites/all36newTheoryexecutionspass;hostedchallenge-callback-cookieexactdecoding/awaited-yieldingevent/documentlifetime. Native192profile/24producer-cancellation/48wrapper/192settings/96executingownerchecks;290files/30sources/12PEPDB/32selecteddocs,identical124-fileimagesexceptGoogleDLLPDB;selectednotwholecompilerortestPDBprovenance. ActualenabledAPICompat/packednet12ownerpass,noreleasedbaseline;initialANCMandharnessfailuresretained;managedTestServerreferencesbuilt,nativeANCMunverified. FreshrelocatedcandidatePrepare133filespasses,nonativeexecution;notoriginalrelocationcheck. Currentdefault491476captured,18triplesonlyVersionspropsselecteddelta,notwholemainSDKintegration;F082priorartnotreusedtimings. Immutable$immutable/$countfiles/allremoteblobsverified,rawbyteexact/copiedportableauditpasses,omittedimages/binlogs/packageshashesonly. ActualnewforkdraftURLopenedimmediately,norenderingclaim;issue$($published.tracking_issue)."
& (Join-Path $PSScriptRoot 'autoperf-campaign.ps1') -Action Update -Id F018 -Status drafted -Branch $source.branch -PrUrl $pr.html_url -Note $note |
    Set-Content (Join-Path $PSScriptRoot 'F018-drafted-ledger-update.json') -Encoding utf8NoBOM
& (Join-Path $PSScriptRoot 'autoperf-export.ps1') -OutputRoot $output
$ledger = Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw | ConvertFrom-Json
if ($ledger.candidates.Count -ne 358 -or @($ledger.candidates | Where-Object status -In 'drafted','no-gain','rejected','duplicate').Count -ne 102 -or
    @($ledger.candidates | Where-Object status -CEQ 'drafted').Count -ne 64 -or
    @($ledger.candidates | Where-Object status -CEQ 'no-gain').Count -ne 15 -or
    @($ledger.candidates | Where-Object status -CEQ 'rejected').Count -ne 19 -or
    @($ledger.candidates | Where-Object status -CEQ 'duplicate').Count -ne 4)
{
    throw 'Exact campaign disposition counts differ.'
}
$readme = $readme.Replace($old,'**Progress: 102/358 finalized**: 64 drafts, 15 no-gain, 19 rejected and 4 duplicates;').
    Replace('257 findings remain unfinished.','256 findings remain unfinished.')
$anchor = [regex]::Matches($readme,'(?m)^\|---\|---\|---\|\r?\n')
if ($anchor.Count -ne 1)
{
    throw 'Exact root GFM table anchor required after count replacements.'
}
$row = "| F018 | [Draft jaslawinMs/aspnetcore#$number]($($pr.html_url));qualified synthetic UTF8 allocation/scaling gain,invalid-byte costs retained,1closed clear-gain pair;not login/merge-ready | [Guarded Google user-info parsing](F018/README.md) |"
$readme = $readme.Insert($anchor[0].Index + $anchor[0].Length,$row + "`n")
$readme | Set-Content $readmePath -Encoding utf8NoBOM -NoNewline
[ordered]@{
    candidate = 'F018'; disposition = 'drafted'; proposal_disposition = $audit.proposalDisposition; merge_ready = $false
    source_branch = $source.branch; source_commit = $source.commit; source_parent = $source.baseline
    tracked_source_files_changed = 2; additions = 143; deletions = 1; canonical_source_bindings = $source.canonicalSourceBindings
    actual_remote_source_ref = $head; actual_remote_canonical_source_blobs_verified = $true
    measured_build_baseline_plus_patch_precedes_source_commit = $true
    immutable_evidence_commit = $immutable; immutable_evidence_files = $count
    authoritative_copy_mappings = $copies.verified_copy_mappings; verified_remote_immutable_blobs = $count
    tracking_issue = $published.tracking_issue; draft_pr = $pr.html_url; actual_pr_number = $number
    actual_draft = $pr.draft; actual_pr_state = $pr.state; actual_head_repository = $pr.head.repo.full_name
    actual_base_repository = $pr.base.repo.full_name; actual_head_branch = $pr.head.ref; actual_base_branch = $pr.base.ref
    actual_head_sha = $pr.head.sha; actual_base_sha = $pr.base.sha; actual_pr_body_verified = $true
    browser_open = $browser; visual_browser_rendering_verified = $false
    attempted_comparison_slots = 1; maximum_comparison_slots = 3; completed_comparison_ids = @(1); failed_comparison_ids = @()
    comparison_budget_closed = $true; prespecified_clear_gain_early_stop = $true; unused_comparison_slots = 2
    original_profiles = 1; candidate_profiles = 1; completed_profiles = 2; benchmark_reports = 48
    raw_actual_iterations = 384; retained_results = 357; upper_filtered_samples = 27; actual_warmups = 144; actual_overheads = 940
    network_login_or_production_speedup_claimed = $false; production_input_distribution_established = $false
    whole_current_default_sdk_integration_claimed = $false; raw_dll_pdb_build_images_binlogs_packages_published = $false
    actual_live_and_copied_portable_audits_passed = $true; actual_enabled_package_validation_passed = $true
    released_package_baseline_comparison_claimed = $false; portable_omitted_binary_bytes_rehashed = $false
    full_independent_measurement_audit = $audit; raw_copy_verification = $copies
    actual_fresh_candidate_prepare_passed = $true; actual_fresh_original_prepare_claimed = $false
    actual_fresh_preparation_native_execution = $false
    campaign_finalized = 102; campaign_total = 358; campaign_unfinished = 256; finalized_at = [DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 24 | Set-Content $receipt -Encoding utf8NoBOM
git -C $output add -- F018/publication.json README.md campaign.json findings.md
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
git -C $output commit -q -m 'Record Google UTF8 draft and102 finalized findings' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if ($LASTEXITCODE)
{
    throw 'Actual receipt/root commit failed.'
}
git -C $output rev-parse HEAD | Set-Content (Join-Path $PSScriptRoot 'F018-publication-results-commit.txt') -Encoding ascii
PushResults
Check 'receipt'
if (@(git -C $output status --porcelain).Count)
{
    throw 'Actual results checkout not clean after complete publication.'
}
Write-Output "F018 persistent fork draft$($pr.html_url):102/358 finalized,64drafts,15no-gain,19rejected,4duplicates,256unfinished;$($count + 4)remote entries verified."
