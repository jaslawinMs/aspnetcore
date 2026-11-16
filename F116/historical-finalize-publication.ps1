$ErrorActionPreference='Stop'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$capsule=Join-Path $output 'F116'
$receipt=Join-Path $capsule 'publication.json'
if ((Test-Path $receipt) -or @(git -C $output status --porcelain).Count) {throw 'Never replace receipt or incorporate unrelated results edits.'}
$count=[int](Get-Content (Join-Path $PSScriptRoot 'F116-immutable-file-count.txt') -Raw)
$remote=@(Get-Content (Join-Path $PSScriptRoot 'F116-remote-blob-verification.json') -Raw|ConvertFrom-Json)
$immutable=(Get-Content (Join-Path $PSScriptRoot 'F116-results-commit.txt') -Raw).Trim()
$a=Get-Content (Join-Path $capsule 'measurement-audit.json') -Raw|ConvertFrom-Json
$copies=Get-Content (Join-Path $capsule 'raw-file-copy-verification.json') -Raw|ConvertFrom-Json
$source=Get-Content (Join-Path $capsule 'source-branch-publication.json') -Raw|ConvertFrom-Json
$draft=Get-Content (Join-Path $PSScriptRoot 'F116-draft-publication.json') -Raw|ConvertFrom-Json
if ($remote.Count -ne $count -or @($remote|Where-Object {-not $_.verified_remote_blob}).Count -or
    $copies.unique_authoritative_destinations+3 -ne $count -or -not $copies.all_byte_identical -or
    $copies.input_byte_mappings -ne 24 -or $copies.output_byte_mappings -ne 24 -or -not $copies.copied_portable_audit_passed -or
    $a.disposition -cne 'draft-allocation' -or $a.sourceComparisons -ne 3 -or -not $a.performancePrJustified -or
    $a.actualBenchmarkOutcomes -ne 144 -or $a.retainedResultSamples -ne 1152 -or $a.workloadWarmups -ne 432 -or
    $a.retainedOverheadSamples -ne 2249 -or $a.exactHashPidLinkedSetups -ne 144 -or $a.settingsBeforeAfterRecords -ne 288 -or
    $a.capturedPerCaseContracts -ne 192 -or $a.resourceCalipers -ne 240 -or $a.actualOwningTestRows -ne 62 -or
    $a.actualPdbDocumentChecks -ne 40 -or $a.independentMaterializedFreshColdProcesses -ne 6 -or
    -not $a.historicalColdBeforeAndIntermediateSnapshotsAreDeferred -or
    -not $source.actualRemoteRefVerified -or $source.trackedFilesChanged -ne 1 -or
    -not $draft.forkOnly -or -not $draft.draft -or -not $draft.actualRemoteBodyVerified -or
    -not $draft.browserDispatchReturnedSuccessfully -or $draft.headSha -cne $source.commit -or $draft.immutableEvidenceCommit -cne $immutable) {throw 'Actual immutable source/producer/test/settings/measurement/draft disposition differs.'}
$actualText=gh api "repos/jaslawinMs/aspnetcore/pulls/$($draft.number)"
if ($LASTEXITCODE) {throw 'Actual live draft unavailable.'}
$actual=$actualText|ConvertFrom-Json
if (-not $actual.draft -or $actual.state -cne 'open' -or $actual.html_url -cne $draft.url -or
    $actual.head.sha -cne $source.commit -or $actual.head.repo.full_name -ine 'jaslawinMs/aspnetcore' -or
    $actual.base.repo.full_name -ine 'jaslawinMs/aspnetcore' -or $actual.base.sha -cne $source.parent) {throw 'Live draft/head/base differs.'}
$ledger=Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw|ConvertFrom-Json
$entry=@($ledger.candidates|Where-Object id -CEQ 'F116')
if ($entry.Count -ne 1 -or $entry[0].status -cne 'benchmarking') {throw 'Unique currently unfinished F116 required.'}
$note="F116 qualified allocation-only,NOTmerge-ready;actual fork-only draft$($draft.url)/source$($source.commit),independent parent37e,immutable$immutable/$count files/allremoteimmutableblobsverified,immediatebrowserdispatchreturned. Two stable startup-onlyCASboxedports;actual warmedsecondget/tag/list24->0B andrealqueuedsecondstream48->0B/twoporttwostreambatch48->0B;all25unchangedabsolutegoals expectedred/green. Firstqueue2.49-6.66percent,thirdgetter4.36-23.90percent/list1.77-16.33percent repeatedcosts;modestmixedconsumertiming,firstcaseCV45.38andallcontrolvariationretained,nofullrequest/hub/application/productionfrequency/coldlatencygain. Threesourcecomparisons/oneshape,six24caseprofiles144outcomes1152retained432warmups2249actualoverheads192contracts240calipers144exacthashPIDsetups288settingsrecords62passing0skipownerrows40PDBdocuments(notPEbinding/coverage). Full233file105assetimagesonlythreeactualtestedownerDLL/PDBpairsswapped;SignalRhelperlistnotfullhub,HttpConnectionslinknotthirdhotconsumer,oneextrabox/staticreferenceperwarmedownerretained. Currentdefault0d5708d0/baseline37e21of22scopedfilesexact,oneKestreltestwaitdifference;notfulllatestdefaultintegration. BDN0.13processwidepreciseallocationincludesworkers;independentworkerloops12->0B/tagtwomix,24Ballmissboth. Wrongscope/memoryannotationpre-timingandcandidatePSpre-characterizationpipelinefailurepreserved. Firstfullauditorfounddeferredbefore/intermediatecoldJSONlabels:notvalidpointobservations. Sixadditionalfreshimmediatelymaterializedcold-onlyprobesloadidenticalownerDLLs,12realKestrelworkers/correctports/stableboundedpublication,otherownerssequentialwarm;nofrozentimingharnessorSourcechange,noretiming,budgetclosed3of3. SharedVMnotisolated,settings-preservingemittedexecutorGuid.Emptypower,Normal/Normal/affinity65535pointobservationsnotcontinuoustrace;nopowercfgprepostclaim. Exactcopiedportableauditpassed;DLL/PDB/runtime/binlogs/imagesomitted,notomittedbyterehashorindependentcriticalvaluerecompute."
& (Join-Path $PSScriptRoot 'autoperf-campaign.ps1') -Action Update -Id F116 -Status drafted -Branch $source.branch -PrUrl $draft.url -Note $note|
    Set-Content (Join-Path $PSScriptRoot 'F116-drafted-ledger-update.json') -Encoding utf8
& (Join-Path $PSScriptRoot 'autoperf-export.ps1') -OutputRoot $output
$ledger=Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw|ConvertFrom-Json
$finished=@($ledger.candidates|Where-Object status -In 'drafted','no-gain','rejected','duplicate')
if ($ledger.candidates.Count -ne 358 -or $finished.Count -ne 86 -or
    @($ledger.candidates|Where-Object status -CEQ 'drafted').Count -ne 58 -or
    @($ledger.candidates|Where-Object status -CEQ 'no-gain').Count -ne 11 -or
    @($ledger.candidates|Where-Object status -CEQ 'rejected').Count -ne 13 -or
    @($ledger.candidates|Where-Object status -CEQ 'duplicate').Count -ne 4) {throw 'Exact campaign disposition counts differ.'}
$readmePath=Join-Path $output 'README.md'
$readme=Get-Content $readmePath -Raw
$old='**Progress: 85/358 finalized**: 57 drafts, 11 no-gain, 13 rejected and 4 duplicates;'
if (-not $readme.Contains($old) -or -not $readme.Contains('273 findings remain unfinished.') -or $readme.Contains('| F116 |')) {throw 'Expected unchanged preceding root index.'}
$readme=$readme.Replace($old,'**Progress: 86/358 finalized**: 58 drafts, 11 no-gain, 13 rejected and 4 duplicates;').Replace('273 findings remain unfinished.','272 findings remain unfinished.')
$anchor=[regex]::Matches($readme,'(?m)^\| F115 \|[^\r\n]*\r?\n')
if ($anchor.Count -ne 1) {throw 'Exact preceding F115 table row required.'}
$row="| F116 | [Draft jaslawinMs/aspnetcore#$($draft.number)]($($draft.url));second-port24/48B ->0,first-queue2.49-6.66% and third-getter4.36-23.90% repeated costs retained;3/3 comparisons,qualified allocation-only,**not merge-ready**;cold snapshot-label defect independently repaired without retiming | [Bounded endpoint-port boxing cache](F116/README.md) |"
$readme=$readme.Insert($anchor[0].Index+$anchor[0].Length,$row+"`n")
$readme|Set-Content $readmePath -Encoding utf8 -NoNewline
[ordered]@{
    candidate='F116';disposition='drafted';specific_disposition=$a.disposition;qualification=$a.qualification;not_merge_ready=$true
    source_branch=$source.branch;source_commit=$source.commit;source_parent=$source.parent;source_changed=$true;shipping_source_files_changed=1
    source_sha256=$source.measuredSourceSha256;measured_binaries_not_relabeled_as_built_from_later_commit=$true
    immutable_evidence_commit=$immutable;immutable_evidence_files=$count;authoritative_copy_mappings=$copies.verified_copy_mappings
    verified_remote_immutable_blobs=$count;performance_pr_url=$draft.url;performance_pr_number=$draft.number;performance_pr_created=$true
    actual_draft_head_base_repo_body_verified=$true;fork_only=$true;browser_open_requested=$true
    browser_dispatch_returned_successfully=$true;browser_dispatch_requested_at=$draft.browserDispatchRequestedAt;actual_browser_tab_render_verified=$false
    source_comparisons=3;maximum_source_comparisons=3;unused_source_comparisons=0;candidate_source_shapes=1;comparison_budget_closed=$true
    original_profiles=3;candidate_profiles=3;outcomes=144;raw_result_samples=1152;raw_warmup_samples=432;actual_overhead_samples=2249
    actual_hash_pid_setups=144;settings_before_after_records=288;normal_process_and_thread_priorities_observed=$true;affinity_observed=65535
    guid_empty_power_plan_configured=$true;continuous_os_trace_claimed=$false;powercfg_prepost_claimed=$false
    current_complete_contract_observations=192;current_allocation_calipers=240;selected_expected_red_samples=25;selected_unchanged_green_samples=25
    test_row_executions=62;all_test_rows_passed=$true;test_skips=0;pdb_document_checks=40;pdb_checks_not_pe_binding_or_method_coverage=$true
    scoped_current_baseline_working_source_identities=22;current_default_exact_scoped_files=21;full_latest_default_integration_claimed=$false
    copied_application_files_per_active_variant=233;declared_assets_per_active_variant=105;frozen_measured_active_images=2;only_six_tested_owner_dll_pdb_files_differ=$true
    active_historical_fresh_cold_processes=6;archived_earlier_cold_processes=3;historical_before_intermediate_cold_snapshots_deferred=$true
    additional_immediately_materialized_cold_only_processes=6;cold_only_probe_uses_exact_measured_owner_dlls=$true
    cold_concurrent_producer='Kestrel,12 workers/four ports';other_linked_owners_warmed_sequentially=$true;timing_rerun_to_repair_cold_evidence=$false
    bdn_memory_process_wide_including_workers=$true;worker_two_port_bytes_per_tag_original=12;worker_two_port_bytes_per_tag_candidate=0;worker_all_miss_bytes_per_tag_both=24
    process_wide_parallel_overhead_not_falsely_reported_zero=$true;maximum_cv_percent=$a.maximumCvPercent
    extra_retained_box_and_static_reference_per_warmed_owner=$true;precise_total_retained_heap_size_claimed=$false
    whole_http_hub_production_frequency_application_cold_latency_speedup_claimed=$false
    exact_active_input_byte_mappings=24;exact_active_output_byte_mappings=24;raw_dll_pdb_binlogs_build_images_published=$false
    public_audit_rehashes_omitted_binary_pdb_runtime_bytes=$false;confidence_critical_values_independently_computed=$false
    campaign_finalized=86;campaign_total=358;campaign_unfinished=272;finalized_at=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 12|Set-Content $receipt -Encoding utf8
git -C $output add -- F116/publication.json README.md campaign.json findings.md
if ($LASTEXITCODE) {throw 'Actual receipt/root staging failed.'}
git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if ($LASTEXITCODE) {throw 'Actual receipt/root whitespace failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F116 receipt-staged $count
if ($LASTEXITCODE) {throw 'Exact receipt/root scope differs.'}
git -C $output commit -q -m 'Record boxed-port allocation draft and86 finalized AutoPerf findings' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if ($LASTEXITCODE) {throw 'Actual receipt/root commit failed.'}
git -C $output rev-parse HEAD|Set-Content (Join-Path $PSScriptRoot 'F116-publication-results-commit.txt') -Encoding ascii
$env:GIT_TERMINAL_PROMPT='0'
git -C $output -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin autoperf-results
if ($LASTEXITCODE) {throw 'Actual receipt/root push failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F116 receipt $count
if ($LASTEXITCODE) {throw 'Actual remote immutable/receipt/index verification differs.'}
if (@(git -C $output status --porcelain).Count) {throw 'Dedicated results checkout must remain clean.'}
Write-Output "F116 persistent qualified draft:86/358 finalized,58drafts,11no-gain,13rejected,4duplicates,272unfinished;$($count+4) actual immutable/receipt/index entries verified."
