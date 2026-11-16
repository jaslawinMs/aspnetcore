$ErrorActionPreference='Stop'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$capsule=Join-Path $output 'F118'
$receipt=Join-Path $capsule 'publication.json'
if((Test-Path $receipt) -or @(git -C $output status --porcelain).Count){throw 'Never replace receipt or incorporate unrelated results edits.'}
$count=[int](Get-Content (Join-Path $PSScriptRoot 'F118-immutable-file-count.txt') -Raw)
$remote=@(Get-Content (Join-Path $PSScriptRoot 'F118-remote-blob-verification.json') -Raw|ConvertFrom-Json)
$immutable=(Get-Content (Join-Path $PSScriptRoot 'F118-results-commit.txt') -Raw).Trim()
$a=Get-Content (Join-Path $capsule 'measurement-audit.json') -Raw|ConvertFrom-Json
$copies=Get-Content (Join-Path $capsule 'raw-file-copy-verification.json') -Raw|ConvertFrom-Json
$source=Get-Content (Join-Path $capsule 'source-branch-publication.json') -Raw|ConvertFrom-Json
$draft=Get-Content (Join-Path $PSScriptRoot 'F118-draft-publication.json') -Raw|ConvertFrom-Json
if($remote.Count -ne $count -or @($remote|Where-Object {-not $_.verified_remote_blob}).Count -or
    $copies.unique_authoritative_destinations+3 -ne $count -or -not $copies.all_byte_identical -or
    $copies.input_byte_mappings -ne 24 -or $copies.output_byte_mappings -ne 24 -or -not $copies.copied_portable_audit_passed -or
    $a.disposition -cne 'draft-allocation' -or $a.sourceComparisons -ne 3 -or -not $a.performancePrJustified -or
    $a.actualBenchmarkOutcomes -ne 144 -or $a.retainedResultSamples -ne 1152 -or $a.workloadWarmups -ne 432 -or
    $a.retainedOverheadSamples -ne 2370 -or $a.exactHashPidLinkedSetups -ne 144 -or $a.settingsBeforeAfterRecords -ne 288 -or
    $a.capturedPerCaseContracts -ne 192 -or $a.resourceCalipers -ne 240 -or $a.actualOwningTestRows -ne 76 -or
    $a.actualPdbDocumentChecks -ne 48 -or $a.activeFreshColdProcesses -ne 6 -or
    -not $a.ordinaryRazorProducerAlreadyBypassesSelectedSeam -or
    -not $source.actualRemoteRefVerified -or $source.trackedFilesChanged -ne 1 -or
    -not $draft.forkOnly -or -not $draft.draft -or -not $draft.actualRemoteBodyVerified -or
    -not $draft.browserDispatchReturnedSuccessfully -or $draft.headSha -cne $source.commit -or
    $draft.immutableEvidenceCommit -cne $immutable){throw 'Actual immutable source/producer/test/settings/measurement/draft disposition differs.'}
$actualText=gh api "repos/jaslawinMs/aspnetcore/pulls/$($draft.number)"
if($LASTEXITCODE){throw 'Actual live draft unavailable.'}
$actual=$actualText|ConvertFrom-Json
if(-not $actual.draft -or $actual.state -cne 'open' -or $actual.html_url -cne $draft.url -or
    $actual.head.sha -cne $source.commit -or $actual.head.repo.full_name -ine 'jaslawinMs/aspnetcore' -or
    $actual.base.repo.full_name -ine 'jaslawinMs/aspnetcore' -or $actual.base.sha -cne $source.parent){throw 'Live draft/head/base differs.'}
$ledger=Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw|ConvertFrom-Json
$entry=@($ledger.candidates|Where-Object id -CEQ 'F118')
if($entry.Count -ne 1 -or $entry[0].status -cne 'benchmarking'){throw 'Unique currently unfinished F118 required.'}
$note="F118 qualified allocation-focused,NOTmerge-ready;actual fork-only draft$($draft.url)/source$($source.commit),independent parent37e,immutable$immutable/$count files/allremoteimmutableblobsverified,immediatebrowserdispatchreturned. GeneralnonHtmlStringIHtmlContentonly,privateboundedStringBuilderpool/existingpublicpolicy,freshStringWriterpercall/finallyReturn;256chars1320->664B,10244392->2200B,20488488->4248B,realorderedRunner1K4392->2200B,all15immutablegoalsoriginalred/candidategreen. OrdinaryRazorPageBaseproduceralreadyHtmlString/bypass2136Bunchanged,noHTTP/fullpage/application/productionfrequency/coldlatencygain. Oversizedprepared8K+80.47/-4.58/+29.45percentandrealRunner8K+47.91/-9.08/+52.39percent,unchanged33064B;encoded16864BunchangedandmixedURL/controlvariationretained. Pagebypasscontrol+57.60/+8.16/-6.69percentnotattributedtopoolseam. Threesourcecomparisons/oneshape,six24caseprofiles144outcomes1152retained432warmups2370actualoverheads192contracts240calipers144exacthashPIDsetups288settingsrecords76passing0skipownerrows48PDBdocuments(notPEbinding/coverage). Full284file118assetimagesonlytestedMvcRazorDLL/PDBswapped,allharnessfixturesotherproducersruntimedepsidentical,200runtimehosthashesliveverified. BDN0.13processwidepreciseallocationincludesworkers;independentworkers4392->2200B/percall,fastworkers0both;parallel768callbatchnotrequest. Sixfreshprocessescorrect1K/8Koutputs,clearedretainedfirstbuilder/oversizeddiscard;concurrentcharacterization12clearedcapacity1024builders,policy32max/capacity4096notoutputlength,notprecisetotalheap/exhaustiveraces. Freshwriteractualculture/newline/type/disposal,error/reentrant/onceencoding/whitespace/realEndpointRoutingUrlHelperassetversioningpass;postdisposalbuilderownership/freshcapacityassumptionsnotestablishedcompatible. Currentdefault3cd798fe/baseline37e20of20scopedfilesexactplus2contextsnapshots,notfulllatestdefaultintegration. Discovery40vs38auditbeforetest/endpointmetadataenumerable-overloadfixturefailure/previewparserneverinvokedtimingallpreserved,nocompletedtestsorprofilesrerun,sourceformatcheckpassed. NoAPI/default/dependency/TFM/visibility/permanentpoolingxUnittestchanges. SharedVMnotisolated,settings-preservingemittedexecutorGuid.Emptypower,Normal/Normal/affinity65535pointsnotcontinuoustrace. Copiedportableauditpassed;DLL/PDB/runtime/binlogs/imagesomitted,nopublicomittedbyterehashorindependentcriticalvaluerecompute."
& (Join-Path $PSScriptRoot 'autoperf-campaign.ps1') -Action Update -Id F118 -Status drafted -Branch $source.branch -PrUrl $draft.url -Note $note|
    Set-Content (Join-Path $PSScriptRoot 'F118-drafted-ledger-update.json') -Encoding utf8
& (Join-Path $PSScriptRoot 'autoperf-export.ps1') -OutputRoot $output
$ledger=Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw|ConvertFrom-Json
$finished=@($ledger.candidates|Where-Object status -In 'drafted','no-gain','rejected','duplicate')
if($ledger.candidates.Count -ne 358 -or $finished.Count -ne 87 -or
    @($ledger.candidates|Where-Object status -CEQ 'drafted').Count -ne 59 -or
    @($ledger.candidates|Where-Object status -CEQ 'no-gain').Count -ne 11 -or
    @($ledger.candidates|Where-Object status -CEQ 'rejected').Count -ne 13 -or
    @($ledger.candidates|Where-Object status -CEQ 'duplicate').Count -ne 4){throw 'Exact campaign disposition counts differ.'}
$readmePath=Join-Path $output 'README.md'
$readme=Get-Content $readmePath -Raw
$old='**Progress: 86/358 finalized**: 58 drafts, 11 no-gain, 13 rejected and 4 duplicates;'
if(-not $readme.Contains($old) -or -not $readme.Contains('272 findings remain unfinished.') -or $readme.Contains('| F118 |')){throw 'Expected unchanged preceding root index.'}
$readme=$readme.Replace($old,'**Progress: 87/358 finalized**: 59 drafts, 11 no-gain, 13 rejected and 4 duplicates;').Replace('272 findings remain unfinished.','271 findings remain unfinished.')
$anchor=[regex]::Matches($readme,'(?m)^\| F116 \|[^\r\n]*\r?\n')
if($anchor.Count -ne 1){throw 'Exact preceding F116 table row required.'}
$row="| F118 | [Draft jaslawinMs/aspnetcore#$($draft.number)]($($draft.url));general-content1K4392 ->2200B,real runner same;oversized8Kcosts/control drift retained;ordinary Razor already bypasses;3/3 comparisons,qualified allocation-only,**not merge-ready** | [Bounded URL content builders](F118/README.md) |"
$readme=$readme.Insert($anchor[0].Index+$anchor[0].Length,$row+"`n")
$readme|Set-Content $readmePath -Encoding utf8 -NoNewline
[ordered]@{
    candidate='F118';disposition='drafted';specific_disposition=$a.disposition;qualification=$a.qualification;not_merge_ready=$true
    source_branch=$source.branch;source_commit=$source.commit;source_parent=$source.parent;source_changed=$true;shipping_source_files_changed=1
    source_sha256=$source.measuredSourceSha256;measured_binaries_not_relabeled_as_built_from_later_commit=$true
    immutable_evidence_commit=$immutable;immutable_evidence_files=$count;authoritative_copy_mappings=$copies.verified_copy_mappings
    verified_remote_immutable_blobs=$count;performance_pr_url=$draft.url;performance_pr_number=$draft.number;performance_pr_created=$true
    actual_draft_head_base_repo_body_verified=$true;fork_only=$true;browser_open_requested=$true
    browser_dispatch_returned_successfully=$true;browser_dispatch_requested_at=$draft.browserDispatchRequestedAt;actual_browser_tab_render_verified=$false
    source_comparisons=3;maximum_source_comparisons=3;unused_source_comparisons=0;candidate_source_shapes=1;comparison_budget_closed=$true
    original_profiles=3;candidate_profiles=3;outcomes=144;raw_result_samples=1152;raw_warmup_samples=432;actual_overhead_samples=2370
    actual_hash_pid_setups=144;settings_before_after_records=288;normal_process_and_thread_priorities_observed=$true;affinity_observed=65535
    guid_empty_power_plan_configured=$true;continuous_os_trace_claimed=$false
    current_complete_contract_observations=192;current_allocation_calipers=240;selected_expected_red_samples=15;selected_unchanged_green_samples=15
    test_row_executions=76;all_test_rows_passed=$true;test_skips=0;pdb_document_checks=48;pdb_checks_not_pe_binding_or_method_coverage=$true
    scoped_current_baseline_working_source_identities=20;current_default_exact_scoped_files=20;additional_context_source_snapshots=2;full_latest_default_integration_claimed=$false
    copied_application_files_per_active_variant=284;declared_assets_per_active_variant=118;frozen_measured_active_images=2;only_two_tested_mvc_razor_dll_pdb_files_differ=$true
    complete_pinned_runtime_host_file_hashes=200;fresh_process_cold_snapshots=6;pool_snapshots_immediately_materialized=$true
    ordinary_razor_producer_already_bypasses_selected_seam=$true;ordinary_razor_control_allocated_bytes_both=2136
    general_1k_allocated_bytes_original=4392;general_1k_allocated_bytes_candidate=2200;real_ordered_runner_same_allocation_change=$true
    bdn_memory_process_wide_including_workers=$true;worker_general_1k_bytes_original=4392;worker_general_1k_bytes_candidate=2200
    worker_string_fast_path_bytes_both=0;parallel_calls_per_coordinated_batch=768;process_wide_parallel_overhead_not_falsely_reported_zero=$true
    retained_builders_after_concurrent_characterization=12;observed_retained_capacity_each=1024;policy_maximum_capacity=4096;policy_maximum_retained_at_observed_processor_count=32
    exact_instantaneous_measured_writer_capacities_instrumented=$false;precise_total_retained_heap_size_claimed=$false
    fresh_writer_culture_newline_type_disposal_error_reentrant_controls_passed=$true
    post_disposal_builder_ownership_or_fresh_capacity_compatibility_claimed=$false;permanent_pooling_specific_xunit_tests_added=$false
    maximum_cv_percent=$a.maximumCvPercent;whole_http_page_production_frequency_application_cold_latency_speedup_claimed=$false
    exact_active_input_byte_mappings=24;exact_active_output_byte_mappings=24;raw_dll_pdb_binlogs_build_images_published=$false
    public_audit_rehashes_omitted_binary_pdb_runtime_bytes=$false;confidence_critical_values_independently_computed=$false
    campaign_finalized=87;campaign_total=358;campaign_unfinished=271;finalized_at=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 12|Set-Content $receipt -Encoding utf8
git -C $output add -- F118/publication.json README.md campaign.json findings.md
if($LASTEXITCODE){throw 'Actual receipt/root staging failed.'}
git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if($LASTEXITCODE){throw 'Actual receipt/root whitespace failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F118 receipt-staged $count
if($LASTEXITCODE){throw 'Exact receipt/root scope differs.'}
git -C $output commit -q -m 'Record URL builder allocation draft and87 finalized AutoPerf findings' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if($LASTEXITCODE){throw 'Actual receipt/root commit failed.'}
git -C $output rev-parse HEAD|Set-Content (Join-Path $PSScriptRoot 'F118-publication-results-commit.txt') -Encoding ascii
$env:GIT_TERMINAL_PROMPT='0'
git -C $output -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin autoperf-results
if($LASTEXITCODE){throw 'Actual receipt/root push failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F118 receipt $count
if($LASTEXITCODE){throw 'Actual remote immutable/receipt/index verification differs.'}
if(@(git -C $output status --porcelain).Count){throw 'Dedicated results checkout must remain clean.'}
Write-Output "F118 persistent qualified draft:87/358 finalized,59drafts,11no-gain,13rejected,4duplicates,271unfinished;$($count+4) actual immutable/receipt/index entries verified."
