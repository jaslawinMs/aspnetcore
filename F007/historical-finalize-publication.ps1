$ErrorActionPreference='Stop'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$capsule=Join-Path $output 'F007'
$receipt=Join-Path $capsule 'publication.json'
if((Test-Path $receipt) -or @(git -C $output status --porcelain).Count){throw 'Fresh receipt and clean dedicated results checkout required.'}
if((git -C $output remote get-url origin).Trim()-inotmatch'^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$'){throw 'Only user-fork writes permitted.'}
$count=[int](Get-Content (Join-Path $PSScriptRoot 'F007-immutable-file-count.txt') -Raw)
$remote=@(Get-Content (Join-Path $PSScriptRoot 'F007-remote-blob-verification.json') -Raw|ConvertFrom-Json)
$immutable=(Get-Content (Join-Path $PSScriptRoot 'F007-results-commit.txt') -Raw).Trim()
$audit=Get-Content (Join-Path $capsule 'measurement-audit.json') -Raw|ConvertFrom-Json
$copies=Get-Content (Join-Path $capsule 'raw-file-copy-verification.json') -Raw|ConvertFrom-Json
$source=Get-Content (Join-Path $capsule 'source-branch-publication.json') -Raw|ConvertFrom-Json
$draft=Get-Content (Join-Path $PSScriptRoot 'F007-draft-publication.json') -Raw|ConvertFrom-Json
$browser=Get-Content (Join-Path $PSScriptRoot 'F007-browser-open.json') -Raw|ConvertFrom-Json
if($remote.Count-ne$count -or @($remote|Where-Object {-not$_.verified_remote_blob}).Count -or
    $copies.unique_authoritative_destinations+3-ne$count -or -not$copies.all_byte_identical -or -not$copies.copied_portable_audit_passed -or
    $audit.disposition-cne'validated' -or -not$audit.actualLiveAuditPassed -or -not$audit.performancePrJustified -or
    $audit.attemptedComparisonSlots-ne3 -or $audit.exactHarnessControlledComparisons-ne2 -or
    ($audit.controlledComparisonIds -join ',')-cne'2,3' -or ($audit.failedNoSampleComparisonIds -join ',')-cne'1' -or
    $audit.benchmarkOutcomes-ne88 -or $audit.actualWorkloadIterations-ne704 -or $audit.retainedResults-ne665 -or
    $audit.actualWarmups-ne264 -or $audit.actualOverheadIterations-ne1700 -or $audit.existingOwningTestRows-ne66 -or
    $audit.producerRecordsAudited-ne346 -or $audit.validatedOwnerRecordsAudited-ne390 -or $audit.actualTimedSetupPreflightsAudited-ne132 -or
    $audit.pePdbBindings-ne14 -or $audit.sourcePdbDocumentChecks-ne64 -or $audit.capturedSettingsRecords-ne176 -or
    $audit.sourceSnapshotsVerified-ne52 -or $audit.liveImageFilesRehashed-ne292 -or $audit.liveArchivedImageFilesRehashed-ne294 -or
    -not$audit.comparisonBudgetClosed -or $audit.practicalDefaultAppBenefitEstablished -or
    -not$source.actualRemoteCanonicalBytesVerified -or $source.commit-cne$draft.source_commit -or $immutable-cne$draft.immutable_evidence_commit -or
    -not$draft.actual_draft_head_base_body_verified -or -not$browser.start_process_succeeded -or $browser.url-cne$draft.draft_pr){throw 'Actual qualified source/evidence/draft/browser persistence differs.'}
function Api([string]$Endpoint)
{
    $text=gh api $Endpoint
    if($LASTEXITCODE){throw "Actual remote verification failed:$Endpoint"}
    return ($text|ConvertFrom-Json)
}
$number=[int]([uri]$draft.draft_pr).Segments[-1]
$pr=Api "repos/jaslawinMs/aspnetcore/pulls/$number"
$actualHead=Api "repos/jaslawinMs/aspnetcore/git/ref/heads/$($source.branch)"
$body=Get-Content (Join-Path $PSScriptRoot 'F007-pr-body.md') -Raw
if(-not$pr.draft -or $pr.state-cne'open' -or $pr.html_url-cne$draft.draft_pr -or
    $pr.head.repo.full_name-cne'jaslawinMs/aspnetcore' -or $pr.base.repo.full_name-cne'jaslawinMs/aspnetcore' -or
    $pr.head.sha-cne$source.commit -or $actualHead.object.sha-cne$source.commit -or
    $pr.head.ref-cne$source.branch -or $pr.base.ref-cne'main' -or $pr.base.sha-cne$source.parent -or
    $pr.body.TrimEnd()-cne$body.TrimEnd()){throw 'Actual still-open fork-only draft/head/base/body differs;do not overwrite user changes.'}
$ledger=Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw|ConvertFrom-Json
$entry=@($ledger.candidates|Where-Object id -CEQ 'F007')
if($entry.Count-ne1 -or $entry[0].status-cne'validated' -or $entry[0].pr_url){throw 'Unique currently unfinished F007 required.'}
$readmePath=Join-Path $output 'README.md'
$readme=Get-Content $readmePath -Raw
$old='**Progress: 92/358 finalized**: 60 drafts, 13 no-gain, 15 rejected and 4 duplicates;'
if(-not$readme.Contains($old) -or -not$readme.Contains('266 findings remain unfinished.') -or $readme.Contains('| F007 |')){throw 'Expected unchanged preceding root index required.'}
$anchor=[regex]::Matches($readme,'(?m)^\|---\|---\|---\|\r?\n')
if($anchor.Count-ne1){throw 'Exact root table anchor required.'}
$note="Qualified scaling/allocation fork draft$($draft.draft_pr),not default-app/rendering benefit or merge-ready. Exact private owner seam+9/-12 on independent$($source.branch),source$($source.commit),remote canonical bytes verified.3/3 attempted budget slots closed:slot1 original GlobalSetup failed/no samples,candidate not launched;two final order-reversed pairs2/3 identical harness/all144 nonowner files,146-file/26-source images.88 successful reports/704 raw/665 retained/39 filtered/264 warmups/1700 actual overheads. Large4096/16384 parser timing wins repeat with6.7-12.5percent more process-wide allocation;small/129/256 controls reverse,early duplicates slower/higher heap,emptyCV52-65percent retained. Default100 simultaneous roots is not proved batch bound;production frequency/typical-app benefit unmeasured.33 actual existing Facts per role,151 final checks/129 producer proofs/22 actual timed setups per owner;real129/130 marker/parameter/state large-path controls pass. Audit66test rows/346producer/390observations/132preflights,14PE-PDB/64documents,176unchangedNormalsettings. Current selected15 files+5context checks include equal whole owner,but globalSDK differs,no whole-current-default integration. Failed147-file harness,stale output caught before timing,clean146 inventory and read-only enum-case audit failure preserved,no timing rerun. Immutable$immutable/$count files/all remote blobs verified;copied portable audit passes but cannot rehash omitted binaries/native/binlogs. Actual fork head/base/body verified,URL opened in default browser;no visual rendering claim."
& (Join-Path $PSScriptRoot 'autoperf-campaign.ps1') -Action Update -Id F007 -Status drafted -Branch $source.branch -PrUrl $draft.draft_pr -Note $note|
    Set-Content (Join-Path $PSScriptRoot 'F007-drafted-ledger-update.json') -Encoding utf8
& (Join-Path $PSScriptRoot 'autoperf-export.ps1') -OutputRoot $output
$ledger=Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw|ConvertFrom-Json
$finished=@($ledger.candidates|Where-Object status -In 'drafted','no-gain','rejected','duplicate')
if($ledger.candidates.Count-ne358 -or $finished.Count-ne93 -or @($ledger.candidates|Where-Object status -CEQ 'drafted').Count-ne61 -or
    @($ledger.candidates|Where-Object status -CEQ 'no-gain').Count-ne13 -or @($ledger.candidates|Where-Object status -CEQ 'rejected').Count-ne15 -or
    @($ledger.candidates|Where-Object status -CEQ 'duplicate').Count-ne4){throw 'Exact campaign disposition counts differ.'}
$readme=$readme.Replace($old,'**Progress: 93/358 finalized**: 61 drafts, 13 no-gain, 15 rejected and 4 duplicates;').Replace('266 findings remain unfinished.','265 findings remain unfinished.')
$row="| F007 | [Draft jaslawinMs/aspnetcore#$number]($($draft.draft_pr));qualified large-parser CPU/allocation trade-off,2 completed pairs+failed slot1;no default-app/rendering gain claim | [Root-operation duplicate IDs](F007/README.md) |"
$readme=$readme.Insert($anchor[0].Index+$anchor[0].Length,$row+"`n")
$readme|Set-Content $readmePath -Encoding utf8 -NoNewline
[ordered]@{
    candidate='F007';disposition='drafted';qualified_not_merge_ready=$true;qualification=$audit.qualification
    source_branch=$source.branch;source_commit=$source.commit;source_parent=$source.parent;tracked_source_files_changed=1;additions=9;deletions=12
    actual_remote_source_ref=$actualHead;actual_remote_canonical_source_verified=$true;source_raw_sha256=$source.sourceRawSha256;source_canonical_blob=$source.sourceCanonicalGitBlob
    measured_build_baseline_plus_patch_precedes_source_commit=$true;measured_owner_sha256=$source.measuredFinalOwnerSha256
    immutable_evidence_commit=$immutable;immutable_evidence_files=$count;authoritative_copy_mappings=$copies.verified_copy_mappings;verified_remote_immutable_blobs=$count
    tracking_issue=$draft.tracking_issue;draft_pr=$draft.draft_pr;actual_pr_number=$number;actual_draft=$pr.draft;actual_pr_state=$pr.state
    actual_head_repository=$pr.head.repo.full_name;actual_base_repository=$pr.base.repo.full_name;actual_head_branch=$pr.head.ref;actual_base_branch=$pr.base.ref
    actual_head_sha=$pr.head.sha;actual_base_sha=$pr.base.sha;actual_pr_body_verified=$true;browser_open=$browser;visual_browser_rendering_verified=$false
    attempted_comparison_slots=3;maximum_comparison_slots=3;failed_no_sample_comparison_ids=@(1);completed_comparison_ids=@(2,3)
    comparison_budget_closed=$true;attempted_original_profiles=3;attempted_candidate_profiles=2;completed_profiles=4;benchmark_outcomes=88
    raw_actual_iterations=704;retained_results=665;upper_filtered_samples=39;actual_warmups=264;actual_overheads=1700
    final_image_files_per_role=146;all144_nonowner_files_byte_identical=$true;failed_era_image_files_per_role=147
    practical_default_app_benefit_established=$false;production_batch_frequency_established=$false;default_simultaneous_root_limit=100;limit_not_proven_batch_bound=$true
    whole_current_default_sdk_integration_claimed=$false;browser_circuit_dispatch_or_marker_conversion_throughput_claimed=$false
    actual_live_and_copied_portable_audits_passed=$true;portable_omitted_binary_bytes_rehashed=$false;raw_dll_pdb_native_images_binlogs_published=$false
    full_independent_measurement_audit=$audit;raw_copy_verification=$copies
    campaign_finalized=93;campaign_total=358;campaign_unfinished=265;finalized_at=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 16|Set-Content $receipt -Encoding utf8
git -C $output add -- F007/publication.json README.md campaign.json findings.md
if($LASTEXITCODE){throw 'Four-file receipt/root staging failed.'}
git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if($LASTEXITCODE){throw 'Receipt/root whitespace failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F007 receipt-staged $count
if($LASTEXITCODE){throw 'Exact four-file receipt/index scope differs.'}
git -C $output commit -q -m 'Record qualified root-batch draft and93 finalized findings' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if($LASTEXITCODE){throw 'Receipt/root commit failed.'}
git -C $output rev-parse HEAD|Set-Content (Join-Path $PSScriptRoot 'F007-publication-results-commit.txt') -Encoding ascii
$env:GIT_TERMINAL_PROMPT='0'
git -C $output -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin autoperf-results
if($LASTEXITCODE){throw 'Receipt/root push failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F007 receipt $count
if($LASTEXITCODE){throw 'Actual immutable/receipt/index remote bytes/results ref differ.'}
if(@(git -C $output status --porcelain).Count){throw 'Dedicated results checkout must be clean.'}
Write-Output "F007 persistent fork draft$($draft.draft_pr):93/358 finalized,61drafts,13no-gain,15rejected,4duplicates,265unfinished;$($count+4) actual remote evidence/receipt/index entries verified."
