$ErrorActionPreference='Stop'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$capsule=Join-Path $output 'F002'
$receipt=Join-Path $capsule 'publication.json'
if((Test-Path $receipt) -or @(git -C $output status --porcelain).Count){throw 'Fresh receipt and clean dedicated results checkout required.'}
$count=[int](Get-Content (Join-Path $PSScriptRoot 'F002-immutable-file-count.txt') -Raw)
$remote=@(Get-Content (Join-Path $PSScriptRoot 'F002-remote-blob-verification.json') -Raw|ConvertFrom-Json)
$immutable=(Get-Content (Join-Path $PSScriptRoot 'F002-results-commit.txt') -Raw).Trim()
$audit=Get-Content (Join-Path $capsule 'measurement-audit.json') -Raw|ConvertFrom-Json
$copies=Get-Content (Join-Path $capsule 'raw-file-copy-verification.json') -Raw|ConvertFrom-Json
$source=Get-Content (Join-Path $capsule 'source-branch-publication.json') -Raw|ConvertFrom-Json
if($remote.Count -ne $count -or @($remote|Where-Object {-not $_.verified_remote_blob}).Count -or
    $copies.unique_authoritative_destinations+3 -ne $count -or -not $copies.all_byte_identical -or
    -not $copies.copied_portable_audit_passed -or $audit.disposition -cne 'rejected' -or
    $audit.performancePrJustified -or $audit.sourceChanged -or $audit.sourceComparisons -ne 0 -or
    $audit.originalDiagnosticProfiles -ne 1 -or $audit.candidateProfiles -ne 0 -or $audit.benchmarkOutcomes -ne 4 -or
    $audit.retainedResults -ne 32 -or $audit.actualWarmups -ne 12 -or $audit.preparedOwningFixtures -ne 48 -or
    $audit.validatedRemovedFixtures -ne 48 -or $audit.capturedSettingsRecords -ne 8 -or $audit.borrowedOwningTestRows -ne 17 -or
    $audit.newExistingTestExecutions -ne 0 -or $audit.owningTestSkips -ne 0 -or $audit.sourcePdbDocumentChecks -ne 26 -or
    $audit.borrowedF001PdbWitnesses -ne 16 -or $audit.freshF002PdbWitnesses -ne 10 -or
    $audit.componentControlRows -ne 5 -or $audit.actualNativeFinControlRows -ne 1 -or
    -not $audit.nativeFinAutomaticallyRemovedBeforeDirectInvocation -or $audit.fullNetworkHttp3OrContendedRegistrationProofClaimed -or
    $audit.activeImageFiles -ne 151 -or $audit.scopedSourceTriples -ne 28 -or $audit.currentDefaultEquivalentFiles -ne 27 -or
    $audit.actualNativePreparationAttempts -ne 5 -or $audit.failedNativePreparationAttempts -ne 4 -or
    -not $source.actualRemoteRefVerified -or $source.sourceChanged -or $source.newSourceCommitCreated -or
    $source.commit -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5'){throw 'Exact rejected original-only/native evidence/source/disposition differs.'}
$actual=gh api "repos/jaslawinMs/aspnetcore/git/ref/heads/$($source.branch)"
if($LASTEXITCODE -or ($actual|ConvertFrom-Json).object.sha -cne $source.commit){throw 'Actual unchanged-baseline fork ref differs.'}
$ledger=Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw|ConvertFrom-Json
$entry=@($ledger.candidates|Where-Object id -CEQ 'F002')
if($entry.Count -ne 1 -or $entry[0].status -cne 'investigating' -or $entry[0].pr_url){throw 'Unique currently unfinished,no-PR F002 required.'}
$note="Rejected/design-blocked-unestablished-performance-gain,not comparative no-gain/proven false-positive. TryRemoveStream wait and actual native callback exist. Native FIN/real QuicStreamContext cancellation plus genuine HTTP3 header association automatically removes target before any direct call;session/pending accept remain open. Hybrid in-memory HTTP3 parent;registration-only heartbeat follows QuicTestHelpers,no full-network HTTP3/contention/incomplete-disposal latency proof. Four component removal/repeat/real CONNECT EOF cases plus public Abort pass. One original-only4-case Monitoring profile,32 retained/12 warmups/48 setup+48 checked removals,8 normal settings records;0/3 comparisons/no candidate/no shipping edit/new source commit/PR. 17 exact borrowed F001 passed0skip rows,0 new existing-test executions;26 source/PDB witnesses(16 borrowed/10 fresh),not PE binding/coverage. 28 source triples/27 default-equivalent,no full current-default integration. Live151-file image/captured runtime/QUIC/msquic hashes audited;portable copied audit passes but cannot rehash omitted binaries. Six builds/five native attempts preserved:CS0122,actual server ephemeral-key failure,missing heartbeat prerequisite,final native6 assertion pass. Existing test certificate/import helper,no stores/global settings changes;no injected closure callbacks. Raw results/failures/source/config/deps published unchanged. Immutable$immutable/$count files/all actual remote blobs verified;independent unchanged-baseline fork branch$($source.branch)."
& (Join-Path $PSScriptRoot 'autoperf-campaign.ps1') -Action Update -Id F002 -Status rejected -Branch $source.branch -Note $note|
    Set-Content (Join-Path $PSScriptRoot 'F002-rejected-ledger-update.json') -Encoding utf8
& (Join-Path $PSScriptRoot 'autoperf-export.ps1') -OutputRoot $output
$ledger=Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw|ConvertFrom-Json
$finished=@($ledger.candidates|Where-Object status -In 'drafted','no-gain','rejected','duplicate')
if($ledger.candidates.Count -ne 358 -or $finished.Count -ne 89 -or
    @($ledger.candidates|Where-Object status -CEQ 'drafted').Count -ne 59 -or
    @($ledger.candidates|Where-Object status -CEQ 'no-gain').Count -ne 11 -or
    @($ledger.candidates|Where-Object status -CEQ 'rejected').Count -ne 15 -or
    @($ledger.candidates|Where-Object status -CEQ 'duplicate').Count -ne 4){throw 'Exact campaign disposition counts differ.'}
$readmePath=Join-Path $output 'README.md'
$readme=Get-Content $readmePath -Raw
$old='**Progress: 88/358 finalized**: 59 drafts, 11 no-gain, 14 rejected and 4 duplicates;'
if(-not $readme.Contains($old) -or -not $readme.Contains('270 findings remain unfinished.') -or $readme.Contains('| F002 |')){throw 'Expected unchanged preceding root index.'}
$readme=$readme.Replace($old,'**Progress: 89/358 finalized**: 59 drafts, 11 no-gain, 15 rejected and 4 duplicates;').Replace('270 findings remain unfinished.','269 findings remain unfinished.')
$anchor=[regex]::Matches($readme,'(?m)^\|---\|---\|---\|\r?\n')
if($anchor.Count -ne 1){throw 'Exact root evaluation table anchor required.'}
$row='| F002 | Rejected/design-blocked;actual native FIN removal passes at hybrid boundary,no compatible measured optimization;one original-only4-case profile,0 comparisons,no source edit/PR | [WebTransport stream removal](F002/README.md) |'
$readme=$readme.Insert($anchor[0].Index+$anchor[0].Length,$row+"`n")
$readme|Set-Content $readmePath -Encoding utf8 -NoNewline
[ordered]@{
    candidate='F002';disposition='rejected';specific_disposition=$audit.specificDisposition;comparative_no_gain_or_proven_false_positive=$false
    source_branch=$source.branch;source_commit=$source.commit;baseline=$source.baseline;source_changed=$false;new_source_commit_created=$false
    tracked_source_files_changed=0;measured_session_source_sha256=$source.measuredSessionSourceSha256
    immutable_evidence_commit=$immutable;immutable_evidence_files=$count;authoritative_copy_mappings=$copies.verified_copy_mappings;verified_remote_immutable_blobs=$count
    performance_pr_created=$false;performance_pr_url=$null;performance_pr_justified=$false
    source_comparisons=0;maximum_source_comparisons=3;unused_source_comparisons=3;candidate_source_shapes=0;comparison_budget_closed=$true
    original_diagnostic_profiles=1;candidate_profiles=0;original_monitoring_cases=4;retained_results=32;actual_warmups=12;actual_overhead_samples=0
    prepared_owning_fixtures=48;validated_removed_owning_fixtures=48;settings_records=8;captured_normal_process_and_thread_priorities=$true;captured_affinity=65535
    guid_empty_power_plan_configured=$true;continuous_os_trace_or_isolated_machine_claimed=$false
    borrowed_owning_test_rows=17;new_existing_test_executions=0;owning_test_skips=0;unique_test_and_execution_ids=17;distinct_truncated_discovery_display_names=16
    full_truncated_display_to_source_payload_reconstruction_claimed=$false;pdb_document_checks=26;borrowed_f001_pdb_witnesses=16;fresh_f002_pdb_witnesses=10
    pdb_checks_not_pe_binding_or_method_coverage=$true;component_control_rows=5;actual_native_fin_control_rows=1
    real_native_cancellation_automatically_removed_before_direct_call=$true;actual_cancellable_native_tokens_observed=$true
    native_parent_is_inmemory_http3=$true;full_network_http3_or_contended_registration_proof_claimed=$false;heartbeat_or_pool_expiry_callbacks_driven=$false
    scoped_source_triples=28;current_default_equivalent_files=27;selected_equal_cleanup_neighborhoods=2;full_current_default_integration_executed=$false
    frozen_active_image_files=151;complete_live_frozen_image_rehashed=$true;captured_physical_runtime_quic_native_identities_rehashed=$true
    full_runtime_host_inventory_captured=$false;actual_native_preparation_attempts=5;failed_native_preparation_attempts=4
    original_build_attempts=6;failed_build_attempts=1;all_original_preparation_failures_preserved=$true
    maximum_cv_percent=$audit.maximumCvPercent;processwide_memory_includes_other_workers_and_not_pure_owner_cost=$true
    copied_portable_audit_passed=$true;raw_dll_pdb_build_images_certificates_published=$false;public_omitted_binary_runtime_bytes_rehashed=$false
    confidence_critical_values_independently_computed=$false;permanent_tests_or_shipping_api_default_dependency_visibility_changes=$false
    campaign_finalized=89;campaign_total=358;campaign_unfinished=269;finalized_at=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 10|Set-Content $receipt -Encoding utf8
git -C $output add -- F002/publication.json README.md campaign.json findings.md
if($LASTEXITCODE){throw 'Actual four-file receipt/root staging failed.'}
git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if($LASTEXITCODE){throw 'Actual receipt/root whitespace failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F002 receipt-staged $count
if($LASTEXITCODE){throw 'Exact four-file receipt/index scope differs.'}
git -C $output commit -q -m 'Record native WebTransport evaluation and89 finalized findings' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if($LASTEXITCODE){throw 'Actual receipt/root commit failed.'}
git -C $output rev-parse HEAD|Set-Content (Join-Path $PSScriptRoot 'F002-publication-results-commit.txt') -Encoding ascii
$env:GIT_TERMINAL_PROMPT='0'
git -C $output -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin autoperf-results
if($LASTEXITCODE){throw 'Actual receipt/root push failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F002 receipt $count
if($LASTEXITCODE){throw 'Actual immutable/receipt/index remote bytes or branch ref differ.'}
if(@(git -C $output status --porcelain).Count){throw 'Dedicated results checkout must be clean.'}
Write-Output "F002 persistent rejection:89/358 finalized,59drafts,11no-gain,15rejected,4duplicates,269unfinished;$($count+4) actual immutable/receipt/index entries verified."
