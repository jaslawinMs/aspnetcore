$ErrorActionPreference='Stop'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$capsule=Join-Path $output 'F010'
$receipt=Join-Path $capsule 'publication.json'
if((Test-Path $receipt) -or @(git -C $output status --porcelain).Count){throw 'Fresh receipt and clean dedicated results checkout required.'}
if((git -C $output remote get-url origin).Trim()-inotmatch'^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$'){throw 'Only user-fork writes permitted.'}
$count=[int](Get-Content (Join-Path $PSScriptRoot 'F010-immutable-file-count.txt') -Raw)
$remote=@(Get-Content (Join-Path $PSScriptRoot 'F010-remote-blob-verification.json') -Raw|ConvertFrom-Json)
$immutable=(Get-Content (Join-Path $PSScriptRoot 'F010-results-commit.txt') -Raw).Trim()
$audit=Get-Content (Join-Path $capsule 'measurement-audit.json') -Raw|ConvertFrom-Json
$copies=Get-Content (Join-Path $capsule 'raw-file-copy-verification.json') -Raw|ConvertFrom-Json
$source=Get-Content (Join-Path $capsule 'source-branch-publication.json') -Raw|ConvertFrom-Json
$draft=Get-Content (Join-Path $PSScriptRoot 'F010-draft-publication.json') -Raw|ConvertFrom-Json
$browser=Get-Content (Join-Path $PSScriptRoot 'F010-browser-open.json') -Raw|ConvertFrom-Json
if($remote.Count-ne$count -or @($remote|Where-Object {-not$_.verified_remote_blob}).Count -or
    $copies.unique_authoritative_destinations+4-ne$count -or -not$copies.all_byte_identical -or -not$copies.copied_portable_audit_passed -or
    -not$audit.auditPassed -or -not$audit.actualLiveAuditPassed -or -not$audit.performancePrJustified -or -not$audit.budgetClosed -or
    $audit.proposalDisposition-cne'qualified-draft/existing-set-cpu-tradeoff' -or $audit.pairedComparisons-ne3 -or $audit.successfulReports-ne66 -or
    $audit.actualWorkloadIterations-ne528 -or $audit.retainedResults-ne491 -or $audit.actualWarmups-ne198 -or $audit.actualOverheadIterations-ne1120 -or
    $audit.originalUnitProjectRows-ne214 -or $audit.candidateUnitProjectRows-ne219 -or $audit.trxRowsAudited-ne433 -or
    $audit.producerRecordsAudited-ne347 -or $audit.actualTimedSetupPreflightsAudited-ne88 -or $audit.pePdbBindings-ne26 -or
    $audit.sourcePdbDocumentChecks-ne236 -or $audit.sourceSnapshotsVerified-ne192 -or $audit.capturedSettingsRecords-ne132 -or
    $audit.liveImageFilesRehashed-ne236 -or $audit.liveArchivedImageFilesRehashed-ne118 -or $audit.actualSuccessfulPackageValidationTasks-ne1 -or
    $audit.allocationBenefitObserved -or -not$source.actualRemoteCanonicalBytesVerified -or $source.commit-cne$draft.source_commit -or
    $immutable-cne$draft.immutable_evidence_commit -or -not$draft.actual_draft_head_base_body_verified -or
    -not$browser.start_process_succeeded -or $browser.url-cne$draft.draft_pr){throw 'Actual qualified source/evidence/draft/browser persistence differs.'}
function Api([string]$Endpoint)
{
    $text=gh api $Endpoint
    if($LASTEXITCODE){throw "Actual remote verification failed:$Endpoint"}
    return ($text|ConvertFrom-Json)
}
$number=[int]([uri]$draft.draft_pr).Segments[-1]
$pr=Api "repos/jaslawinMs/aspnetcore/pulls/$number"
$actualHead=Api "repos/jaslawinMs/aspnetcore/git/ref/heads/$($source.branch)"
$body=Get-Content (Join-Path $PSScriptRoot 'F010-pr-body.md') -Raw
if(-not$pr.draft -or $pr.state-cne'open' -or $pr.html_url-cne$draft.draft_pr -or
    $pr.head.repo.full_name-cne'jaslawinMs/aspnetcore' -or $pr.base.repo.full_name-cne'jaslawinMs/aspnetcore' -or
    $pr.head.sha-cne$source.commit -or $actualHead.object.sha-cne$source.commit -or
    $pr.head.ref-cne$source.branch -or $pr.base.ref-cne'main' -or $pr.base.sha-cne$source.parent -or
    $pr.body.TrimEnd()-cne$body.TrimEnd()){throw 'Actual still-open fork draft/head/base/body differs;do not overwrite human changes.'}
$ledger=Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw|ConvertFrom-Json
$entry=@($ledger.candidates|Where-Object id -CEQ 'F010')
if($entry.Count-ne1 -or $entry[0].status-cne'validated' -or $entry[0].pr_url){throw 'Unique currently unfinished validated F010 required.'}
$readmePath=Join-Path $output 'README.md'
$readme=Get-Content $readmePath -Raw
$old='**Progress: 94/358 finalized**: 61 drafts, 13 no-gain, 16 rejected and 4 duplicates;'
if(-not$readme.Contains($old) -or -not$readme.Contains('264 findings remain unfinished.') -or $readme.Contains('| F010 |')){throw 'Expected unchanged preceding root index required.'}
$anchor=[regex]::Matches($readme,'(?m)^\|---\|---\|---\|\r?\n')
if($anchor.Count-ne1){throw 'Exact root table anchor required.'}
$note="Qualified existing-large-set CPU fork draft$($draft.draft_pr),not merge-ready/default-app/allocation benefit. Exact private owner seam+15/-1 plus57 test lines/3methods/5rows on independent$($source.branch),source$($source.commit),both remote canonical source bytes verified.3/3 comparison slots closed,no source tuning;6profiles/66reports/528raw/491retained/37upperfiltered/198warmups/1120actualoverheads. One exact compiled harness,all nonowner bytes identical in all3 paired TFM consumer images. Late64 known-comparer sets77.5-81.7percent lower time,but small/default/no-value/early regress up to13.69percent and every allocation unchanged. Noneligible Ignore64 also improves27-30percent;no direct-set causal attribution or JIT explanation. Actual registered public AddAuthorizationCore/RequireClaim/IAuthorizationService boundary includes eager failed-requirement formatting,not copied matcher/HTTP/newrequest/scope/productionfrequency. Original214/candidate219test rows,all identities/durations/new5rows checked;both39legacy/39standard/50native contractchecks pass. Actual net462 on Framework4.8.1 workstationGC;standard2 library on net12 consumer,no legacy throughput. Actual successful enabled package-validation task events/all6API/net12refDLL unchanged;existing nonservicing disabled released-baseline comparison retained. Audit347producer/88setup/26PEPDB/236docs/192sources/132unchangedNormalsettings,rehashed236final118retired16owner-testfiles. Current21selectedfiles equal,not whole SDK/dependency integration. Initial wrong Metadata reference/count assertion25native records,candidate xUnit2017 failure,GCprefix reader and2auditor corrections retained;no timing rerun. Immutable$immutable/$count files/allremote blobs verified,copied portable audit passes but cannot rehash omitted binaries/binlogs/packages. Fork-only draft/head/base/body verified,actual URL opened immediately in default browser,no visual rendering claim."
& (Join-Path $PSScriptRoot 'autoperf-campaign.ps1') -Action Update -Id F010 -Status drafted -Branch $source.branch -PrUrl $draft.draft_pr -Note $note|
    Set-Content (Join-Path $PSScriptRoot 'F010-drafted-ledger-update.json') -Encoding utf8
& (Join-Path $PSScriptRoot 'autoperf-export.ps1') -OutputRoot $output
$ledger=Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw|ConvertFrom-Json
$finished=@($ledger.candidates|Where-Object status -In 'drafted','no-gain','rejected','duplicate')
if($ledger.candidates.Count-ne358 -or $finished.Count-ne95 -or @($ledger.candidates|Where-Object status -CEQ 'drafted').Count-ne62 -or
    @($ledger.candidates|Where-Object status -CEQ 'no-gain').Count-ne13 -or @($ledger.candidates|Where-Object status -CEQ 'rejected').Count-ne16 -or
    @($ledger.candidates|Where-Object status -CEQ 'duplicate').Count-ne4){throw 'Exact campaign disposition counts differ.'}
$readme=$readme.Replace($old,'**Progress: 95/358 finalized**: 62 drafts, 13 no-gain, 16 rejected and 4 duplicates;').Replace('264 findings remain unfinished.','263 findings remain unfinished.')
$row="| F010 | [Draft jaslawinMs/aspnetcore#$number]($($draft.draft_pr));qualified large-existing-set CPU tradeoff,small/default regressions and unchanged allocations,3closed pairs;not default-app/merge-ready | [Claim allowed-value membership](F010/README.md) |"
$readme=$readme.Insert($anchor[0].Index+$anchor[0].Length,$row+"`n")
$readme|Set-Content $readmePath -Encoding utf8 -NoNewline
[ordered]@{
    candidate='F010';disposition='drafted';qualified_not_merge_ready=$true;proposal_disposition=$audit.proposalDisposition
    source_branch=$source.branch;source_commit=$source.commit;source_parent=$source.parent;tracked_source_files_changed=2;additions=72;deletions=1
    actual_remote_source_ref=$actualHead;actual_remote_canonical_sources_verified=$true;source_files=$source.sources
    measured_build_baseline_plus_patch_precedes_source_commit=$true;measured_owner_targets=$source.measuredOwnerTargets
    immutable_evidence_commit=$immutable;immutable_evidence_files=$count;authoritative_copy_mappings=$copies.verified_copy_mappings;verified_remote_immutable_blobs=$count
    tracking_issue=$draft.tracking_issue;draft_pr=$draft.draft_pr;actual_pr_number=$number;actual_draft=$pr.draft;actual_pr_state=$pr.state
    actual_head_repository=$pr.head.repo.full_name;actual_base_repository=$pr.base.repo.full_name;actual_head_branch=$pr.head.ref;actual_base_branch=$pr.base.ref
    actual_head_sha=$pr.head.sha;actual_base_sha=$pr.base.sha;actual_pr_body_verified=$true;browser_open=$browser;visual_browser_rendering_verified=$false
    attempted_comparison_slots=3;maximum_comparison_slots=3;completed_comparison_ids=@(1,2,3);failed_comparison_ids=@();comparison_budget_closed=$true
    original_profiles=3;candidate_profiles=3;completed_profiles=6;benchmark_reports=66;raw_actual_iterations=528;retained_results=491;upper_filtered_samples=37;actual_warmups=198;actual_overheads=1120
    one_compiled_harness_across_all_profiles=$true;all_nonowner_files_byte_identical_per_paired_consumer_image=$true;allocation_benefit_observed=$false
    practical_default_app_benefit_established=$false;production_input_frequency_established=$false;noneligible_fallback_direct_set_gain_claimed=$false
    whole_current_default_sdk_integration_claimed=$false;http_new_request_or_scope_throughput_claimed=$false;legacy_throughput_claimed=$false
    actual_live_and_copied_portable_audits_passed=$true;actual_successful_package_validation_tasks=1;released_package_baseline_comparison_claimed=$false
    portable_omitted_binary_bytes_rehashed=$false;raw_dll_pdb_native_images_binlogs_packages_published=$false;full_independent_measurement_audit=$audit;raw_copy_verification=$copies
    campaign_finalized=95;campaign_total=358;campaign_unfinished=263;finalized_at=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 17|Set-Content $receipt -Encoding utf8
git -C $output add -- F010/publication.json README.md campaign.json findings.md
if($LASTEXITCODE){throw 'Four-file receipt/root staging failed.'}
git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if($LASTEXITCODE){throw 'Receipt/root whitespace failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F010 receipt-staged $count
if($LASTEXITCODE){throw 'Exact four-file receipt/index scope differs.'}
git -C $output commit -q -m 'Record qualified claim-membership draft and95 finalized findings' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if($LASTEXITCODE){throw 'Receipt/root commit failed.'}
git -C $output rev-parse HEAD|Set-Content (Join-Path $PSScriptRoot 'F010-publication-results-commit.txt') -Encoding ascii
$env:GIT_TERMINAL_PROMPT='0'
git -C $output -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin autoperf-results
if($LASTEXITCODE){throw 'Receipt/root push failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F010 receipt $count
if($LASTEXITCODE){throw 'Actual immutable/receipt/index remote bytes/results ref differ.'}
if(@(git -C $output status --porcelain).Count){throw 'Dedicated results checkout must be clean.'}
Write-Output "F010 persistent fork draft$($draft.draft_pr):95/358 finalized,62drafts,13no-gain,16rejected,4duplicates,263unfinished;$($count+4) actual remote evidence/receipt/index entries verified."
