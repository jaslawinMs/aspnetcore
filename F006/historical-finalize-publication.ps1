$ErrorActionPreference='Stop'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$capsule=Join-Path $output 'F006'
$receipt=Join-Path $capsule 'publication.json'
if((Test-Path $receipt) -or @(git -C $output status --porcelain).Count){throw 'Fresh receipt and clean dedicated results checkout required.'}
if((git -C $output remote get-url origin).Trim()-inotmatch'^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$'){throw 'Only user-fork writes permitted.'}
$count=[int](Get-Content (Join-Path $PSScriptRoot 'F006-immutable-file-count.txt') -Raw)
$remote=@(Get-Content (Join-Path $PSScriptRoot 'F006-remote-blob-verification.json') -Raw|ConvertFrom-Json)
$immutable=(Get-Content (Join-Path $PSScriptRoot 'F006-results-commit.txt') -Raw).Trim()
$audit=Get-Content (Join-Path $capsule 'measurement-audit.json') -Raw|ConvertFrom-Json
$copies=Get-Content (Join-Path $capsule 'raw-file-copy-verification.json') -Raw|ConvertFrom-Json
$source=Get-Content (Join-Path $capsule 'source-branch-publication.json') -Raw|ConvertFrom-Json
$restored=Get-Content (Join-Path $capsule 'source-restoration.json') -Raw|ConvertFrom-Json
$decision=Get-Content (Join-Path $capsule 'post-audit-decision.json') -Raw|ConvertFrom-Json
if($remote.Count-ne$count -or @($remote|Where-Object {-not$_.verified_remote_blob}).Count -or
    $copies.unique_authoritative_destinations+3-ne$count -or -not$copies.all_byte_identical -or -not$copies.copied_portable_audit_passed -or
    $audit.disposition-cne'validated' -or $audit.recommendedCampaignDisposition-cne'no-gain' -or $audit.performancePrJustified -or -not$audit.actualLiveAuditPassed -or
    $audit.sourceComparisons-ne3 -or $audit.benchmarkOutcomes-ne132 -or $audit.actualWorkloadIterations-ne1056 -or $audit.retainedResults-ne1014 -or
    $audit.filteredUpperSamples-ne42 -or $audit.actualWarmups-ne396 -or $audit.actualOverheadIterations-ne2635 -or
    $audit.exactHarnessControlledComparisons-ne3 -or $audit.controlledBenchmarkOutcomes-ne132 -or
    $audit.existingOwningTestRows-ne40 -or $audit.actualCompilerChecks-ne360 -or $audit.actualBL0014Observations-ne4248 -or
    $audit.normalMembershipProducerRecordsAudited-ne312 -or $audit.pePdbBindings-ne20 -or $audit.sourcePdbDocumentChecks-ne38 -or $audit.capturedSettingsRecords-ne264 -or
    $audit.sourceSnapshotsVerified-ne93 -or $audit.liveImageFilesRehashed-ne294 -or -not$audit.comparisonBudgetClosed -or
    -not$source.actualRemoteRefVerified -or -not$source.actualRemoteCanonicalSourceVerified -or $source.sourceChanged -or $source.newSourceCommitCreated -or
    $source.performancePrCreated -or $source.commit-cne'37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
    -not$restored.sourceByteExact -or -not$restored.restoredOwnerDllAndPdbByteExact -or $decision.disposition-cne'no-gain'){throw 'Exact completed no-gain evidence/restoration/disposition differs.'}
$actual=gh api "repos/jaslawinMs/aspnetcore/git/ref/heads/$($source.branch)"
if($LASTEXITCODE -or ($actual|ConvertFrom-Json).object.sha-cne$source.commit){throw 'Actual independent unchanged-baseline fork ref differs.'}
if((Get-FileHash 'C:\src\aspnetcore\src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs').Hash-cne$restored.sourceSha256){throw 'Restored original source changed before final publication.'}
$ledger=Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw|ConvertFrom-Json
$entry=@($ledger.candidates|Where-Object id -CEQ 'F006')
if($entry.Count-ne1 -or $entry[0].status-cne'investigating' -or $entry[0].pr_url){throw 'Unique currently unfinished,no-PR F006 required.'}
$note="Conservative no-gain/trade-off,not zero local benefit. Five-statement lazy AllForVariables comparer-backed HashSet candidate independently built/tested/measured;source and original DLL/PDB restored byte-exact. Cached64 real65-for-local/64-copy-miss stressor has lower BDN/raw time and process-wide heap in6/6,butPotential16/64 slower11/12 andpromotion heap higher8/12;unknown production mix and reversing control times do not establish generalized net benefit. Exactly3/3 fixed22-case exact-harness owner comparisons,6profiles/132reports/1056raw/1014retained/42upper-filtered/396warmups/2635actual overheads;all96 nonowner image files identical from pair1.40fresh exact owningFacts pass0skip;360compiler checks/4248BL0014,312normal producer proofs,20PE/PDB/38documents,93sources/294image hashes,264unchanged-settings observations. First live and copied portable audits passed;omitted DLL/PDB/native/binlog bytes not publicly rehashed. Current49147673 class replay checks10 referenced prerequisites,not whole-default integration;adjacent null fix excluded. Independent unchanged-baseline fork branch$($source.branch),no source commit/PR. Immutable$immutable/$count files/all actual remote blobs verified;all local wins and contrary data retained."
& (Join-Path $PSScriptRoot 'autoperf-campaign.ps1') -Action Update -Id F006 -Status no-gain -Branch $source.branch -Note $note|
    Set-Content (Join-Path $PSScriptRoot 'F006-no-gain-ledger-update.json') -Encoding utf8
& (Join-Path $PSScriptRoot 'autoperf-export.ps1') -OutputRoot $output
$ledger=Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw|ConvertFrom-Json
$finished=@($ledger.candidates|Where-Object status -In 'drafted','no-gain','rejected','duplicate')
if($ledger.candidates.Count-ne358 -or $finished.Count-ne92 -or
    @($ledger.candidates|Where-Object status -CEQ 'drafted').Count-ne60 -or
    @($ledger.candidates|Where-Object status -CEQ 'no-gain').Count-ne13 -or
    @($ledger.candidates|Where-Object status -CEQ 'rejected').Count-ne15 -or
    @($ledger.candidates|Where-Object status -CEQ 'duplicate').Count-ne4){throw 'Exact campaign disposition counts differ.'}
$readmePath=Join-Path $output 'README.md'
$readme=Get-Content $readmePath -Raw
$old='**Progress: 91/358 finalized**: 60 drafts, 12 no-gain, 15 rejected and 4 duplicates;'
if(-not$readme.Contains($old) -or -not$readme.Contains('267 findings remain unfinished.') -or $readme.Contains('| F006 |')){throw 'Expected unchanged preceding root index.'}
$readme=$readme.Replace($old,'**Progress: 92/358 finalized**: 60 drafts, 13 no-gain, 15 rejected and 4 duplicates;').Replace('267 findings remain unfinished.','266 findings remain unfinished.')
$anchor=[regex]::Matches($readme,'(?m)^\|---\|---\|---\|\r?\n')
if($anchor.Count-ne1){throw 'Exact root evaluation table anchor required.'}
$row='| F006 | No-gain/trade-off;repeatable miss-heavy2-3% win retained,potential/promotion regressions and control reversals prevent general net-benefit claim;3 identical-harness pairs,source/owner restored,no PR | [All for-variable symbol membership](F006/README.md) |'
$readme=$readme.Insert($anchor[0].Index+$anchor[0].Length,$row+"`n")
$readme|Set-Content $readmePath -Encoding utf8 -NoNewline
[ordered]@{
    candidate='F006';disposition='no-gain';qualification=$audit.qualification;literal_zero_local_benefit_claimed=$false
    source_branch=$source.branch;source_commit=$source.commit;baseline=$source.baseline;source_changed=$false;new_source_commit_created=$false;tracked_source_files_changed=0
    measured_original_source_sha256=$source.measuredOriginalSourceSha256;candidate_patch_sha256=$source.candidatePatchSha256;candidate_existing_statements=5
    shipping_source_and_original_owner_dll_pdb_restored_byte_exact=$true;immutable_evidence_commit=$immutable;immutable_evidence_files=$count
    authoritative_copy_mappings=$copies.verified_copy_mappings;verified_remote_immutable_blobs=$count;performance_pr_created=$false;performance_pr_url=$null;performance_pr_justified=$false
    source_comparisons=3;maximum_source_comparisons=3;comparison_budget_closed=$true;source_candidate_shapes=1;harness_versions=1;cases_per_role_by_comparison=@(22,22,22)
    exact_harness_controlled_comparisons=3;controlled_comparison_ids=@(1,2,3);controlled_reports=132;exploratory_reports=0;all96_nonowner_image_bytes_identical=$true
    original_profiles=3;candidate_profiles=3;benchmark_outcomes=132;raw_actual_iterations=1056;retained_results=1014;upper_filtered_samples=42;actual_warmups=396;actual_overheads=2635
    all_eight_unfiltered_ratios_gc_rounding_sample_statistics_r7_recorded_confidence_arithmetic_verified=$true;confidence_critical_values_independently_computed=$false
    cached64_lower_time_and_heap_outcomes=6;cached64_bdn_reduction_percent_min=$audit.cached64MinimumBdnReductionPercent;cached64_bdn_reduction_percent_max=$audit.cached64MaximumBdnReductionPercent
    potential_cases_slower_bdn_mean=11;potential_cases_lower_heap=12;promotion_cases_higher_heap=8;all_contrary_cases_control_reversals_retained=$true
    maximum_timing_cv_percent=$audit.maximumCvPercent;global_analyzer_compiler_build_or_browser_speedup_claimed=$false;production_frequency_or_mix_established=$false
    allocation_boundary='process-wide precise BDN allocated bytes/op,including compiler/driver/process workers';isolated_owner_allocation_claimed=$false
    fresh_existing_test_rows=40;owning_test_skips=0;compiler_checks=360;bl0014_observations=4248;normal_membership_producer_proofs=312
    pe_pdb_bindings=20;source_document_checks=38;source_snapshots=93;physical_live_image_files_rehashed=294;method_coverage_or_complete_sdk_native_metadata_inventory_claimed=$false
    settings_records=264;captured_normal_process_and_thread_priorities=$true;captured_affinity=65535;guid_empty_power_plan_configured=$true;continuous_trace_or_isolation_claimed=$false
    current_default_commit='49147673007a4b1d676694e2c5f85b83ad76c36f';source_triples=7;whole_default_equivalent_files=2;referenced_prerequisite_checks=10
    full_current_default_integration_claimed=$false;adjacent_null_fix_not_transplanted=$true;new_shipping_test_or_api_default_dependency_tfm_visibility_change=$false
    first_actual_live_and_copied_portable_audits_passed=$true;raw_dll_pdb_build_images_binlogs_published=$false;portable_omitted_binary_bytes_rehashed=$false
    historical_preaudit_decision_preserved=$true;post_audit_decision_records_exact_restoration=$true;campaign_finalized=92;campaign_total=358;campaign_unfinished=266
    finalized_at=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 12|Set-Content $receipt -Encoding utf8
git -C $output add -- F006/publication.json README.md campaign.json findings.md
if($LASTEXITCODE){throw 'Four-file receipt/root staging failed.'}
git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if($LASTEXITCODE){throw 'Receipt/root whitespace failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F006 receipt-staged $count
if($LASTEXITCODE){throw 'Exact four-file receipt/index scope differs.'}
git -C $output commit -q -m 'Record for-variable no-gain trade-offs and92 finalized findings' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if($LASTEXITCODE){throw 'Receipt/root commit failed.'}
git -C $output rev-parse HEAD|Set-Content (Join-Path $PSScriptRoot 'F006-publication-results-commit.txt') -Encoding ascii
$env:GIT_TERMINAL_PROMPT='0'
git -C $output -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin autoperf-results
if($LASTEXITCODE){throw 'Receipt/root push failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F006 receipt $count
if($LASTEXITCODE){throw 'Actual immutable/receipt/index remote bytes/results ref differ.'}
if(@(git -C $output status --porcelain).Count){throw 'Dedicated results checkout must be clean.'}
Write-Output "F006 persistent no-gain:92/358 finalized,60drafts,13no-gain,15rejected,4duplicates,266unfinished;$($count+4) actual remote evidence/receipt/index entries verified."
