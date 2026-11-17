$ErrorActionPreference='Stop'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$capsule=Join-Path $output 'F001'
$receipt=Join-Path $capsule 'publication.json'
if((Test-Path $receipt) -or @(git -C $output status --porcelain).Count){throw 'Fresh receipt and clean dedicated results checkout required.'}
$count=[int](Get-Content (Join-Path $PSScriptRoot 'F001-immutable-file-count.txt') -Raw)
$remote=@(Get-Content (Join-Path $PSScriptRoot 'F001-remote-blob-verification.json') -Raw|ConvertFrom-Json)
$immutable=(Get-Content (Join-Path $PSScriptRoot 'F001-results-commit.txt') -Raw).Trim()
$audit=Get-Content (Join-Path $capsule 'measurement-audit.json') -Raw|ConvertFrom-Json
$copies=Get-Content (Join-Path $capsule 'raw-file-copy-verification.json') -Raw|ConvertFrom-Json
$source=Get-Content (Join-Path $capsule 'source-branch-publication.json') -Raw|ConvertFrom-Json
if($remote.Count -ne $count -or @($remote|Where-Object {-not $_.verified_remote_blob}).Count -or
    $copies.unique_authoritative_destinations+3 -ne $count -or -not $copies.all_byte_identical -or
    -not $copies.copied_portable_audit_passed -or $copies.local_only_optional_vstest_traces.Count -ne 2 -or
    $audit.disposition -cne 'rejected' -or $audit.performancePrJustified -or $audit.sourceChanged -or
    $audit.sourceComparisons -ne 0 -or $audit.originalDiagnosticProfiles -ne 1 -or $audit.candidateProfiles -ne 0 -or
    $audit.benchmarkOutcomes -ne 3 -or $audit.retainedResults -ne 24 -or $audit.actualWarmups -ne 9 -or
    $audit.preparedOwningFixtures -ne 36 -or $audit.validatedClosedFixtures -ne 36 -or
    $audit.capturedSettingsRecords -ne 6 -or $audit.exactOwningTestRows -ne 17 -or $audit.owningTestSkips -ne 0 -or
    $audit.sourcePdbDocumentChecks -ne 19 -or $audit.activeProducerControlRows -ne 6 -or
    $audit.activeImageFiles -ne 149 -or $audit.scopedSourceTriples -ne 21 -or $audit.currentDefaultEquivalentFiles -ne 20 -or
    $audit.liveQuicOrContendedStreamCancellationRegistrationExercised -or
    -not $source.actualRemoteRefVerified -or $source.sourceChanged -or $source.newSourceCommitCreated -or
    $source.commit -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5'){throw 'Exact rejected original-only evidence/source/disposition differs.'}
$actual=gh api "repos/jaslawinMs/aspnetcore/git/ref/heads/$($source.branch)"
if($LASTEXITCODE -or ($actual|ConvertFrom-Json).object.sha -cne $source.commit){throw 'Actual unchanged-baseline fork ref differs.'}
$ledger=Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw|ConvertFrom-Json
$entry=@($ledger.candidates|Where-Object id -CEQ 'F001')
if($entry.Count -ne 1 -or $entry[0].status -cne 'investigating' -or $entry[0].pr_url){throw 'Unique currently unfinished,no-PR F001 required.'}
$note="F001 rejected/design-blocked-unestablished-performance-gain,NOTcomparative-no-gain/false-positive-proof;separateforkbranch$($source.branch)unchangedbaseline$($source.commit),noshippingedit/newsourcecommit/performancePR. ActualownerOnClientConnectionClosed,notsessionDispose;leafawaitsregistration+pipecompletion,notQuicStreamContext.DisposeAsync. ActualHTTP3SETTINGS/CONNECT+headerparse/association/Acceptproducers,CONNECTEOF0/1/16,actualinput/outputleafandpublicAbortcontrolsallpass;bothleafValueTaskssynchronouslycompleted. InmemoryassociatedstreamConnectionCloseduncancellable,noliveQUIC/contendedregistration/incomplete-disposalproducer/starvation/productionfrequencyclaim;detachedTaskRun/asyncvoid/discardwouldchangecompletion/errorownership. Oneoriginal-onlyMonitoringprofile3cases24retained9warmups0overheads36prepared36checkedclosedfixtures,0/3comparisons/nocandidate/0changedshapesbudgetclosed. Means59762.5/80662.5/87862.5ns,processwide3232/3152/3648B;oneinvocation/sharedVM,notpurecleanupallocation/notimprovement. MaxCV24.8355percent/outlierretained. SixNormalNormalaffinity65535pointobservations,settings-preservingemittedexecutorGuid.Emptypower,noOSalterations/noisolatedenvironmentclaim. SeventeenexistingrowsPASS0skip,17uniqueGUIDs/twoheaderrowscollidetruncateddisplay16distinct;initialouterunique-displaycheckerexit1beforetests,preserved/samediscoverycontinuednorediscovery/testsrunonce;noexactdisplaytosourcepayloadreconstructionclaim. NineteenPDBdocumentchecksnotPEbinding/coverage,live149fileimageandcapturedphysicalruntimeidentityhashesverified;portablecopiedauditcannotrehashomittedbinaries/runtime. Bothbuildsexit0,first2redundantmissingreferencewarnings/firstprepenumnamespaceTypeLoadexit-532462766preserved;secondbuild0warnings/realproducerprepPASS,nosuccessfulprofilesrepeated. Twentyonesourcetriples/20defaultequivalent/twoexactselectedcleanupneighborhoods;default49147673hasoutsideHttp3Streamframe/pathchanges,nofullcurrentdefaultintegration. Immutable$immutable/$countfiles/allactualremoteblobsverified;twodetailedoptionalVSTesthostprotocoltraceskeptlocallywithhashomissions,exactTRXandallrawbenchmarkresults/sourceinputspublished. NoshippingAPI/default/TFM/dependency/visibilitybridge/permanenttestchanges."
& (Join-Path $PSScriptRoot 'autoperf-campaign.ps1') -Action Update -Id F001 -Status rejected -Branch $source.branch -Note $note|
    Set-Content (Join-Path $PSScriptRoot 'F001-rejected-ledger-update.json') -Encoding utf8
& (Join-Path $PSScriptRoot 'autoperf-export.ps1') -OutputRoot $output
$ledger=Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw|ConvertFrom-Json
$finished=@($ledger.candidates|Where-Object status -In 'drafted','no-gain','rejected','duplicate')
if($ledger.candidates.Count -ne 358 -or $finished.Count -ne 88 -or
    @($ledger.candidates|Where-Object status -CEQ 'drafted').Count -ne 59 -or
    @($ledger.candidates|Where-Object status -CEQ 'no-gain').Count -ne 11 -or
    @($ledger.candidates|Where-Object status -CEQ 'rejected').Count -ne 14 -or
    @($ledger.candidates|Where-Object status -CEQ 'duplicate').Count -ne 4){throw 'Exact campaign disposition counts differ.'}
$readmePath=Join-Path $output 'README.md'
$readme=Get-Content $readmePath -Raw
$old='**Progress: 87/358 finalized**: 59 drafts, 11 no-gain, 13 rejected and 4 duplicates;'
if(-not $readme.Contains($old) -or -not $readme.Contains('271 findings remain unfinished.') -or $readme.Contains('| F001 |')){throw 'Expected unchanged preceding root index.'}
$readme=$readme.Replace($old,'**Progress: 88/358 finalized**: 59 drafts, 11 no-gain, 14 rejected and 4 duplicates;').Replace('271 findings remain unfinished.','270 findings remain unfinished.')
$anchor=[regex]::Matches($readme,'(?m)^\|---\|---\|---\|\r?\n')
if($anchor.Count -ne 1){throw 'Exact root evaluation table anchor required.'}
$row='| F001 | Rejected/design-blocked;no compatible local optimization or live QUIC blocking schedule established;one original-only3-case diagnostic,0 comparisons,no source edit/PR | [WebTransport shutdown ownership](F001/README.md) |'
$readme=$readme.Insert($anchor[0].Index+$anchor[0].Length,$row+"`n")
$readme|Set-Content $readmePath -Encoding utf8 -NoNewline
[ordered]@{
    candidate='F001';disposition='rejected';specific_disposition=$audit.specificDisposition;comparative_no_gain_or_proven_false_positive=$false
    source_branch=$source.branch;source_commit=$source.commit;baseline=$source.baseline;source_changed=$false;new_source_commit_created=$false
    tracked_source_files_changed=0;measured_session_source_sha256=$source.measuredSessionSourceSha256
    immutable_evidence_commit=$immutable;immutable_evidence_files=$count;authoritative_copy_mappings=$copies.verified_copy_mappings
    verified_remote_immutable_blobs=$count;performance_pr_created=$false;performance_pr_url=$null;performance_pr_justified=$false
    source_comparisons=0;maximum_source_comparisons=3;unused_source_comparisons=3;candidate_source_shapes=0;comparison_budget_closed=$true
    original_diagnostic_profiles=1;candidate_profiles=0;original_monitoring_cases=3;retained_results=24;actual_warmups=9;actual_overhead_samples=0
    prepared_owning_fixtures=36;validated_closed_owning_fixtures=36;settings_records=6;captured_normal_process_and_thread_priorities=$true;captured_affinity=65535
    guid_empty_power_plan_configured=$true;continuous_os_trace_or_isolated_machine_claimed=$false
    passing_owning_test_rows=17;owning_test_skips=0;unique_test_and_execution_ids=17;distinct_truncated_discovery_display_names=16
    full_truncated_display_to_source_payload_reconstruction_claimed=$false;local_only_optional_vstest_traces=2
    pdb_document_checks=19;pdb_checks_not_pe_binding_or_method_coverage=$true;active_producer_control_rows=6
    actual_input_and_output_leaf_disposals_completed_synchronously=2;associated_inmemory_stream_connection_closed_cancellable=$false
    live_quic_or_contended_stream_cancellation_registration_exercised=$false;await_removal_compatibility_or_performance_benefit_claimed=$false
    scoped_source_triples=21;current_default_equivalent_files=20;selected_equal_cleanup_neighborhoods=2;full_current_default_integration_executed=$false
    frozen_active_image_files=149;complete_live_frozen_image_rehashed=$true;captured_physical_runtime_identities_rehashed=$true
    full_runtime_host_inventory_captured=$false;original_build_warning_and_failed_preparation_evidence_retained=$true
    original_display_uniqueness_checker_failure_preserved=$true;successful_existing_tests_and_benchmark_not_repeated=$true
    maximum_cv_percent=$audit.maximumCvPercent;processwide_memory_includes_other_workers_and_not_pure_owner_cost=$true
    copied_portable_audit_passed=$true;raw_dll_pdb_build_images_certificates_published=$false;public_omitted_binary_runtime_bytes_rehashed=$false
    confidence_critical_values_independently_computed=$false;permanent_tests_or_shipping_api_default_dependency_visibility_changes=$false
    campaign_finalized=88;campaign_total=358;campaign_unfinished=270;finalized_at=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 10|Set-Content $receipt -Encoding utf8
git -C $output add -- F001/publication.json README.md campaign.json findings.md
if($LASTEXITCODE){throw 'Actual four-file receipt/root staging failed.'}
git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if($LASTEXITCODE){throw 'Actual receipt/root whitespace failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F001 receipt-staged $count
if($LASTEXITCODE){throw 'Exact four-file receipt/index scope differs.'}
git -C $output commit -q -m 'Record design-blocked WebTransport evaluation and88 finalized findings' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if($LASTEXITCODE){throw 'Actual receipt/root commit failed.'}
git -C $output rev-parse HEAD|Set-Content (Join-Path $PSScriptRoot 'F001-publication-results-commit.txt') -Encoding ascii
$env:GIT_TERMINAL_PROMPT='0'
git -C $output -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin autoperf-results
if($LASTEXITCODE){throw 'Actual receipt/root push failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F001 receipt $count
if($LASTEXITCODE){throw 'Actual immutable/receipt/index remote bytes or branch ref differ.'}
if(@(git -C $output status --porcelain).Count){throw 'Dedicated results checkout must be clean.'}
Write-Output "F001 persistent rejection:88/358 finalized,59drafts,11no-gain,14rejected,4duplicates,270unfinished;$($count+4) actual immutable/receipt/index entries verified."
