$ErrorActionPreference = 'Stop'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$capsule = Join-Path $output 'F013'
$receipt = Join-Path $capsule 'publication.json'
if ((Test-Path $receipt) -or @(git -C $output status --porcelain).Count)
{
    throw 'Fresh receipt and clean dedicated results checkout required.'
}
if ((git -C $output remote get-url origin).Trim() -inotmatch '^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$')
{
    throw 'Only user-fork writes permitted.'
}
$count = [int](Get-Content (Join-Path $PSScriptRoot 'F013-immutable-file-count.txt') -Raw)
$remote = @(Get-Content (Join-Path $PSScriptRoot 'F013-remote-blob-verification.json') -Raw | ConvertFrom-Json)
$immutable = (Get-Content (Join-Path $PSScriptRoot 'F013-results-commit.txt') -Raw).Trim()
$audit = Get-Content (Join-Path $capsule 'measurement-audit.json') -Raw | ConvertFrom-Json
$copies = Get-Content (Join-Path $capsule 'raw-file-copy-verification.json') -Raw | ConvertFrom-Json
$source = Get-Content (Join-Path $capsule 'source-branch-publication.json') -Raw | ConvertFrom-Json
if ($remote.Count -ne $count -or @($remote | Where-Object { -not $_.verified_remote_blob }).Count -or
    $copies.unique_authoritative_destinations + 4 -ne $count -or -not $copies.all_byte_identical -or
    -not $copies.copied_portable_audit_passed -or -not $audit.auditPassed -or -not $audit.actualLiveAuditPassed -or
    $audit.performancePrJustified -or $audit.proposalDisposition -cne 'no-gain' -or -not $audit.budgetClosed -or
    $audit.originalOnlyDiagnosticProfiles -ne 0 -or $audit.pairedComparisons -ne 3 -or
    $audit.originalProfiles -ne 3 -or $audit.candidateProfiles -ne 3 -or $audit.sourceCandidateShapesMeasured -ne 2 -or
    $audit.benchmarkOutcomes -ne 84 -or $audit.actualWorkloadIterations -ne 672 -or $audit.retainedResults -ne 645 -or
    $audit.actualWarmups -ne 252 -or $audit.actualOverheadIterations -ne 1511 -or
    $audit.actualFreshOwningTestRuns -ne 3 -or $audit.actualFreshOwningRows -ne 84 -or
    $audit.explicitlyReusedOriginalAreaRows -ne 27 -or $audit.repositoryAlwaysTestSentinelRows -ne 0 -or
    $audit.producerRecordsAudited -ne 108 -or $audit.validatedBenchmarkRecordsAudited -ne 168 -or
    $audit.actualTimedSetupPreflightsAudited -ne 168 -or $audit.pePdbBindings -ne 84 -or
    $audit.sourcePdbDocumentChecks -ne 216 -or $audit.sourceSnapshotsVerified -ne 623 -or
    $audit.capturedSettingsRecords -ne 168 -or -not $source.actualRemoteCanonicalBytesVerified -or
    $source.sourceChanged -or $source.newSourceCommitCreated -or $source.performancePrCreated -or
    $source.commit -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5')
{
    throw 'Exact audited no-gain comparisons, unchanged independent source and persistent evidence required.'
}
$actual = gh api "repos/jaslawinMs/aspnetcore/git/ref/heads/$($source.branch)"
if ($LASTEXITCODE)
{
    throw 'Actual source ref lookup failed.'
}
$actualHead = $actual | ConvertFrom-Json
if ($actualHead.object.sha -cne $source.commit)
{
    throw 'Published source branch differs; do not overwrite user changes.'
}
$ledger = Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw | ConvertFrom-Json
$entry = @($ledger.candidates | Where-Object id -CEQ 'F013')
$finished = @($ledger.candidates | Where-Object status -In 'drafted', 'no-gain', 'rejected', 'duplicate')
if ($entry.Count -ne 1 -or $entry[0].status -cne 'investigating' -or $entry[0].pr_url -or
    $ledger.candidates.Count -ne 358 -or $finished.Count -ne 97)
{
    throw 'Unique unfinished F013 and preceding97 finalized findings required.'
}
$readmePath = Join-Path $output 'README.md'
$readme = Get-Content $readmePath -Raw
$old = '**Progress: 97/358 finalized**: 62 drafts, 13 no-gain, 18 rejected and 4 duplicates;'
if (-not $readme.Contains($old) -or -not $readme.Contains('261 findings remain unfinished.') -or $readme.Contains('| F013 |'))
{
    throw 'Unchanged preceding root index required.'
}
$anchor = [regex]::Matches($readme, '(?m)^\|---\|---\|---\|\r?\n')
if ($anchor.Count -ne 1)
{
    throw 'Unique root evaluation table anchor required.'
}
$issueReceipt = Join-Path $PSScriptRoot 'F013-tracking-issue.json'
if (Test-Path $issueReceipt)
{
    throw 'Preserve actual tracking issue; do not create a duplicate.'
}
$existing = gh issue list --repo jaslawinMs/aspnetcore --state all --search 'F013 in:title' --json number,title,url --limit 20
if ($LASTEXITCODE -or @($existing | ConvertFrom-Json).Count)
{
    throw 'No existing F013 tracking issue permitted for this new publication.'
}
$analysis = Get-Content (Join-Path $capsule 'analysis.json') -Raw | ConvertFrom-Json
$evidence = "https://github.com/jaslawinMs/aspnetcore/blob/$immutable/F013/README.md"
$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('**Measured no-gain: two actual targeted-send specializations, three complete comparisons. No performance-win PR or shipping change recommended.**')
$lines.Add('')
$lines.Add('The actual >16-target SendConnectionsAsync branch still rescans caller-owned targets for each connection. Variant001 uses exact List.Contains and Array.IndexOf; variant002 removes the List fast path and uses array-only AsSpan().Contains. Existing <=16/direct-lookup and custom/derived collection dispatch are preserved. Neither experiment eliminates the original asymptotic cost.')
$lines.Add('')
$lines.Add("[Immutable runnable project, complete raw experiments, proposed source/test snapshots and limitations]($evidence)")
$lines.Add('')
$lines.Add('## All measured outcomes')
$lines.Add('')
$lines.Add('Negative change means lower candidate time. C1 is variant001 once; C2/C3 are variant002 twice, not three replications of one implementation. Role order original/candidate, candidate/original, original/candidate. No pooling or production weighting.')
$lines.Add('')
$lines.Add('| Shape | C1 time change | C2 time change | C3 time change |')
$lines.Add('|---|---:|---:|---:|')
foreach ($case in $analysis.cases)
{
    $deltas = @($case.comparisons | ForEach-Object {
        [string]::Format([Globalization.CultureInfo]::InvariantCulture, '{0:+0.00;-0.00;0.00}%', $_.meanTimeChangePercent)
    })
    $lines.Add("| $($case.shape) | $($deltas -join ' | ') |")
}
$lines.Add('')
$lines.Add('Variant001 regresses important large List/array cases, up to28.84% here. Array-only variant002 still regresses128-connections/256-array-miss time in both comparisons:38,849.417->41,572.482ns (+7.01%) and38,463.555->42,062.017ns (+9.36%). Small-array effects vary; untouched List/read-only/small-target and empty-store paths also move. No causal attribution of these control movements, isolated Contains gain, universal speedup or proof every possible optimization is impossible.')
$lines.Add('')
$lines.Add('Six complete14-case profiles:84 reports,672 raw actual samples,645 retained,27 upper-filtered,252 warmups,1511 actual overheads. Every raw/retained/overhead/GC/settings result and mean/SD/CV/N remains in the immutable capsule. All3 authorized comparison slots are permanently spent, including any failed/partial timing; no extra F013 timing.')
$lines.Add('')
$lines.Add('Allocation is actual BDN0.13/net12 process-wide GC bytes/op, not isolated membership/enumerator/serializer costs. All measured array-path allocations are unchanged. C3 unchanged List fallback reports66->65B/op; that single1B observation is retained, not an allocation win. Identical actual BDN DLL and prior source attribution verified, not freshly rebuilt source-to-DLL binding.')
$lines.Add('')
$lines.Add('## Faithful boundary and coverage')
$lines.Add('')
$lines.Add('Actual public DefaultHubLifetimeManager.SendConnectionsAsync over pre-created real HubConnectionContext/store connections, real lazy cached JSON serialization and fixed256-byte synchronous transport writers. Minimal call/frame/byte counters are timed; full exact recipient/frame validation is outside timing. Not network, handshake, connection creation, stateful reconnect, production frequency or general application throughput.')
$lines.Add('')
$lines.Add('Fresh unchanged-original and each candidate actually pass28/28 owning rows (84 fresh total), including SendConnectionsAsyncPreservesDerivedListContainsDispatch and all four actual16/17 array/List rows of SendConnectionsAsyncWritesOnceToSpecifiedConnections.24 Facts per suite include12 inherited specification Facts. Zero skipped/failed rows or sentinel rows; not whole SignalR. Preservation is expected green on original/candidates, not functional bug-fix red/green.')
$lines.Add('')
$lines.Add('Original and both candidate owners independently pass18 real producer checks+14 timed wrappers under both original/current JSON producers: six contexts. Real JSON argument getters remove initially requested IDs from same-count17-target arrays/Lists/read-only wrappers: one actual recipient, versus eight for explicit copied-input controls using the unchanged owner. Custom/derived ICollection.Contains dispatch, real17/256/2048 repeated misses, lazy serialization and actual Pipe completion/cancellation are established. Snapshot-input controls are not indexed owner implementations or timed optimizations.')
$lines.Add('')
$lines.Add('Independent live and copied portable audits pass:108 producer/168 setup/168 delivery records,84 bounded PE/PDB witnesses/216 selected documents,623 source snapshots and168 unchanged settings point records. Paired80-file images share the exact compiled harness/PDB/BDN and other78 files; only owner DLL/PDB differ. Paired89-source trees differ only in owner, with identical fresh test source. Current JSON images differ only in JSON DLL/PDB.')
$lines.Add('')
$lines.Add('Initial old F01127-row preparation evidence and original/current JSON bytes are explicitly borrowed/rehashed, not new F013 test runs/current producer builds. Fresh original test assembly and both candidate suites actually run. Every F013 producer observation/timing is independent; no prior group/broadcast timing reused. Captured default49147673007a4b1d676694e2c5f85b83ad76c36f selected source/JSON check, not whole-main SDK integration.')
$lines.Add('')
$lines.Add('First added-helper test build fails CS1513/CS1519 before any owning test/assertion; exact bad source/full build log/binlog hash and premature raw plan-marker qualification retained. Two read-only audit schema/padding expectation failures retain exact failed readers/full stderr; corrected audit passes without changing experiments or rerunning a test/profile. A display-only original-runner interpolation typo is separately qualified. Preparation has17 native commands (16 successful/one failed build) plus4 passing whitespace checks.')
$lines.Add('')
$lines.Add("Exact historical commands with observed exits: https://github.com/jaslawinMs/aspnetcore/blob/$immutable/F013/validation-commands.md")
$lines.Add('')
$lines.Add("Independent unchanged source branch: $($source.url), baseline ``$($source.commit)``; actual remote ref/owner bytes verified. Both measured proposals and the new passing preservation test remain in capsule source snapshots.20 original source files restored byte-exact, no tracked source change; eight known output identities verified, six exact owner/test DLL-PDB replacements restored. No new build/test claimed for restoration.")
$lines.Add('')
$lines.Add('Related dotnet/aspnetcore#69189 optimizes the already-existing <=16 path, not this remaining large-target scan; no upstream numbers reused. F011/F012 are separate group/broadcast findings; F014 remains independent.')
$lines.Add('')
$lines.Add('Shared Windows VM, SDK12.0.100-alpha.1.26557.102/runtime12.0.0-alpha.1.26562.105, settings-preserving executor; no deliberate power/priority/affinity changes or isolation claim. Portable audit cannot rehash deliberately omitted binaries/binlogs or replay PE/PDB bindings. Full scope and limitations are in the immutable README.')
$body = $lines -join "`n"
$bodyPath = Join-Path $PSScriptRoot 'F013-tracking-issue-body.md'
$body | Set-Content $bodyPath -Encoding utf8 -NoNewline
$title = '[AutoPerf F013] Targeted membership: no-gain after three comparisons'
$url = gh issue create --repo jaslawinMs/aspnetcore --title $title --body-file $bodyPath
if ($LASTEXITCODE -or $url.Trim() -cnotmatch '^https://github\.com/jaslawinMs/aspnetcore/issues/(\d+)$')
{
    throw 'Actual new fork tracking issue URL required.'
}
$number = [int]$Matches[1]
$actualIssue = gh api "repos/jaslawinMs/aspnetcore/issues/$number"
if ($LASTEXITCODE)
{
    throw 'Actual created issue lookup failed; do not recreate it.'
}
$issue = $actualIssue | ConvertFrom-Json
if ($issue.title -cne $title -or $issue.body -cne $body -or $issue.html_url -cne $url.Trim() -or $issue.pull_request)
{
    throw 'Actual remote tracking issue body/title/URL differs.'
}
[ordered]@{
    candidate = 'F013'; number = $number; url = $issue.html_url; title = $issue.title
    bodySha256 = (Get-FileHash $bodyPath).Hash; actualRemoteBodyExactlyVerified = $true
    immutableEvidenceCommit = $immutable; actualRemoteIssue = $issue
} | ConvertTo-Json -Depth 12 | Set-Content $issueReceipt
Start-Process $issue.html_url
$browser = [ordered]@{
    candidate = 'F013'; actualUrl = $issue.html_url; browserOpenRequested = $true
    launchReturnedWithoutError = $true; visualRenderingVerified = $false
    qualification = 'Actual verified no-gain fork tracking issue, not a performance-win PR or visual browser confirmation.'
}
$browser | ConvertTo-Json | Set-Content (Join-Path $PSScriptRoot 'F013-browser-open.json')
$note = "Measured no-gain: two compatible SendConnectionsAsync >16 membership specializations across all3 closed comparison slots. Variant001 exact List.Contains/Array.IndexOf once, up to28.84% regression; array-only span variant002 twice, large-array misses+7.01/+9.36%,small/control shifts not causally attributed. No index/asymptotic-cost elimination, no justified performance PR/source change.6 profiles/84reports/672raw/645retained/27filtered/252warmups/1511overheads;all adverse data retained. Array allocations unchanged; C3 unchanged List fallback66->65B/op explicitly retained,not isolated allocation gain. Fresh unchanged-original+eachcandidate28rows=84 actual,including all4 16/17 array/List Theory payloads and new derived-dispatch Fact;24Facts/suite including12inherited. Initial27-row F011 preparation evidence/current JSON bytes explicitly reused/rehashed,not new runs/builds.6 actual18+14 producer contexts,realJSON getter same-count17 targets1recipient versus8 explicit snapshot-input controls,custom/deriveddispatch,17/256/2048scans,realPipes. Live/portable audit108producer/168setup/168delivery,84PE-PDB/216docs,623sources,168settings. Only ownerDLL/PDB differ in80-file pairs; paired89sources differ onlyowner. One failed helper build beforetests,2 failed readers/fullstderr preserved,corrected fresh tests/audit pass.20originalsources exact/no trackedchanges;8knownoutputidentitiesverified/6restored. No whole-current-default integration,sharedhostnotisolated,originalfindingremains. Independent unchanged branch$($source.branch) at$($source.commit); immutable$immutable/$($count)files/allremoteverified. Tracking$($issue.html_url) exactbodyverified/browserrequested,no visualclaim."
& (Join-Path $PSScriptRoot 'autoperf-campaign.ps1') -Action Update -Id F013 -Status no-gain -Branch $source.branch -Note $note |
    Set-Content (Join-Path $PSScriptRoot 'F013-no-gain-ledger-update.json')
& (Join-Path $PSScriptRoot 'autoperf-export.ps1') -OutputRoot $output
$ledger = Get-Content (Join-Path $PSScriptRoot 'autoperf-campaign.json') -Raw | ConvertFrom-Json
$finished = @($ledger.candidates | Where-Object status -In 'drafted', 'no-gain', 'rejected', 'duplicate')
if ($finished.Count -ne 98 -or @($ledger.candidates | Where-Object status -CEQ 'drafted').Count -ne 62 -or
    @($ledger.candidates | Where-Object status -CEQ 'no-gain').Count -ne 14 -or
    @($ledger.candidates | Where-Object status -CEQ 'rejected').Count -ne 18 -or
    @($ledger.candidates | Where-Object status -CEQ 'duplicate').Count -ne 4)
{
    throw 'Exact final campaign counts differ.'
}
$readme = $readme.Replace($old, '**Progress: 98/358 finalized**: 62 drafts, 14 no-gain, 18 rejected and 4 duplicates;').
    Replace('261 findings remain unfinished.', '260 findings remain unfinished.')
$row = "| F013 | Measured no-gain,2 variants/3 comparisons; [tracking jaslawinMs/aspnetcore#$number]($($issue.html_url)); no shipping change | [SignalR targeted membership](F013/README.md) |"
$readme = $readme.Insert($anchor[0].Index + $anchor[0].Length, $row + "`n")
$readme | Set-Content $readmePath -Encoding utf8 -NoNewline
[ordered]@{
    candidate = 'F013'; disposition = 'no-gain'; performance_pr_created = $false; performance_pr_justified = $false
    source_branch = $source.branch; source_commit = $source.commit; source_changed = $false; new_source_commit_created = $false
    actual_remote_source_ref = $actualHead; actual_remote_source_canonical_blob_verified = $true
    source_canonical_blob = $source.actualRemoteSourceBlob
    immutable_evidence_commit = $immutable; immutable_evidence_files = $count
    authoritative_copy_mappings = $copies.verified_copy_mappings; verified_remote_immutable_blobs = $count
    original_finding_linear_cost_still_present = $true; not_claiming_every_other_optimization_impossible = $true
    paired_comparisons = 3; maximum_paired_comparisons = 3; original_profiles = 3; candidate_profiles = 3
    original_only_diagnostic_profiles = 0; comparison_budget_closed = $true; source_candidate_shapes_measured = 2
    benchmark_outcomes = 84; raw_actual_iterations = 672; retained_results = 645; upper_filtered_samples = 27
    actual_warmups = 252; actual_overheads = 1511
    actual_fresh_owning_test_runs = 3; actual_fresh_owning_rows = 84; explicitly_reused_original_area_rows = 27
    inherited_specification_rows_per_fresh_suite = 12; actual_theory_rows_per_fresh_suite = 4; repository_sentinel_rows = 0
    actual_producer_contexts = 6; logical_untimed_checks_per_context = 18; timed_wrapper_preflights_per_context = 14
    actual_new_current_producer_builds = 0; failed_preparation_sources_and_full_stderr_retained = $true
    actual_live_and_copied_portable_audits_passed = $true; portable_omitted_binary_bytes_rehashed = $false
    raw_dll_pdb_native_images_binlogs_published = $false; whole_current_default_sdk_integration_claimed = $false
    actual_tracking_issue = $issue; tracking_issue_remote_body_exactly_verified = $true
    browser_open = $browser; full_independent_measurement_audit = $audit; raw_copy_verification = $copies
    campaign_finalized = 98; campaign_total = 358; campaign_unfinished = 260
    finalized_at = [DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 16 | Set-Content $receipt
git -C $output add -- F013/publication.json README.md campaign.json findings.md
if ($LASTEXITCODE)
{
    throw 'Exact four-file receipt/root staging failed.'
}
git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if ($LASTEXITCODE)
{
    throw 'Receipt/root whitespace failed.'
}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F013 receipt-staged $count
if ($LASTEXITCODE)
{
    throw 'Exact four-file receipt/index scope differs.'
}
git -C $output commit -q -m 'Record targeted membership no-gain and 98 finalized findings' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if ($LASTEXITCODE)
{
    throw 'Receipt/root commit failed.'
}
git -C $output rev-parse HEAD | Set-Content (Join-Path $PSScriptRoot 'F013-publication-results-commit.txt') -Encoding ascii
$env:GIT_TERMINAL_PROMPT = '0'
git -C $output -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin autoperf-results
if ($LASTEXITCODE)
{
    throw 'Receipt/root push failed.'
}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F013 receipt $count
if ($LASTEXITCODE)
{
    throw 'Actual immutable/receipt/index remote bytes or results ref differ.'
}
if (@(git -C $output status --porcelain).Count)
{
    throw 'Dedicated results checkout must be clean.'
}
Write-Output "F013 persistent:98/358 finalized,62 drafts,14 no-gain,18 rejected,4 duplicates,260 unfinished; tracking$($issue.html_url)."
