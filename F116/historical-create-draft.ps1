$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F116'
$record=Join-Path $PSScriptRoot 'F116-draft-publication.json'
if (Test-Path $record) {throw 'Never duplicate an actual existing draft.'}
$source=Get-Content (Join-Path $run 'source-branch-publication.json') -Raw|ConvertFrom-Json
$immutable=(Get-Content (Join-Path $PSScriptRoot 'F116-results-commit.txt') -Raw).Trim()
$count=[int](Get-Content (Join-Path $PSScriptRoot 'F116-immutable-file-count.txt') -Raw)
$remote=@(Get-Content (Join-Path $PSScriptRoot 'F116-remote-blob-verification.json') -Raw|ConvertFrom-Json)
if ($remote.Count -ne $count -or @($remote|Where-Object {-not $_.verified_remote_blob}).Count) {throw 'Verified immutable remote evidence required before draft.'}
$existing=gh pr list --repo jaslawinMs/aspnetcore --head $source.branch --state all --json number,url
if ($LASTEXITCODE -or @($existing|ConvertFrom-Json).Count) {throw 'No existing PR for this exact source head permitted.'}
$link="https://github.com/jaslawinMs/aspnetcore/blob/$immutable/F116"
$detail=[System.Collections.Generic.List[string]]::new()
$detail.Add("**Qualified allocation-only proposal, not merge-ready.** Independent AutoPerf F116;only the private shared endpoint-port cache changes. [Immutable full evidence]($link/README.md),[all72 comparisons]($link/comparison-outcomes.md),[exact raw/validation commands]($link/validation-commands.md).")
$detail.Add('')
$detail.Add('Retain a second stable boxed port and publish both slots with startup-only CompareExchange. Never replace a populated slot;preserve ordered typed endpoint tags,feature precedence/fallback and actual metric/activity contracts. No public API/default/TFM/dependency or visibility changes.')
$detail.Add('')
$detail.Add('**Measured benefit:** actual warmed second-port getter/tag/list24 ->0 B/call;real enabled Kestrel queued start/stop48 ->0 B/second-port stream. All25 unchanged absolute resource samples were expected-red on original and green on candidate. The isolated second getter is26.57-38.60% faster;that is not a request/hub speedup.')
$detail.Add('')
$detail.Add('**Costs/limits:** first-port queue2.49-6.66% slower in every pair;third-port getter4.36-23.90% slower and list1.77-16.33% slower. TagsSecond has a4.39% slower pair;consumer timing is modest/mixed. Additional retained boxed int/static reference per warmed participating owner and startup CAS cost. Parallel time essentially unchanged. Shared-VM variation,including original GetFirst CV45.38%,is retained rather than called a win. No application/HTTP/full hub/production-frequency or cold-latency claim.')
$detail.Add('')
$detail.Add('Exactly3 comparisons/one source shape/six24-case profiles,alternating order for pair2;1152 retained results,432 warmups,2249 actual overheads,no outlier removal. BDN0.13 accounting on this runtime is process-wide and includes workers;independent per-worker calipers attribute actual helper loops. Only the three tested owner DLL/PDB pairs differ between frozen233-file/105-asset images;harness/fixtures/runtime/deps are identical. Http.Connections is a linked control,not a claimed third hot caller.')
$detail.Add('')
$detail.Add('### Validation (completed historical commands and actual outcomes)')
$detail.Add('')
$detail.Add('Each fresh dotnet shell activates `. .\activate.ps1` from `C:\src\aspnetcore`. Commands below were run separately against the recorded original/candidate source;they are not source-switch/replay instructions. Existing test projects remained unchanged. This draft does not claim that permanent cache-specific regression tests have already been added to the shipping tree.')
function Quote([string]$Value) {return "'"+$Value.Replace("'","''")+"'"}
foreach ($variant in 'original','candidate1')
{
    $execution=Get-Content (Join-Path $run "tests\$variant\execution.json") -Raw|ConvertFrom-Json
    $detail.Add('');$detail.Add("**$variant**");$detail.Add('```powershell')
    foreach ($command in $execution.commands|Where-Object label -Like '*-owning-tests')
    {
        if ($command.exitCode -ne 0) {throw 'Only actual successful scoped commands may be presented as passing.'}
        $detail.Add('dotnet '+(($command.arguments|ForEach-Object {Quote $_}) -join ' '))
        $rows=if ($command.label.StartsWith('kestrel')) {21} else {10}
        $detail.Add("# Actual exit0:$rows passed,0 failed,0 skipped;exact discovered/result/entry associations and positive durations verified.")
    }
    $detail.Add('```')
}
$detail.Add('')
$detail.Add("All24 ordered typed outputs and27 endpoint controls passed for both variants.40 source/PDB document checks passed(not PE/PDB binding or method coverage). [Portable auditor]($link/reproduce-analysis.mjs) on the copied capsule:actual exit0,all144 outcomes/192 contracts/240 calipers/62 exact test rows/40 documents verified. Public audit cannot rehash deliberately omitted DLL/PDB/runtime bytes or independently compute confidence critical values.")
$detail.Add('')
$detail.Add('The first full auditor exposed a real reporting defect:historical cold before/intermediate nested Select snapshots were deferred until post-warm serialization. Those labels are not treated as point observations. Failed source/log/raw JSON retained;independent immediately-materialized cold-only probes against identical owner DLLs passed in six fresh processes,with12 concurrent actual Kestrel helper returns and bounded/stable/distinct warm state for all three owners. Other owners are warmed sequentially. No frozen timing harness/source edit or comparison rerun.')
$detail.Add('')
$detail.Add('Current-default source snapshot0d5708d0:21/22 scoped files exact;one Kestrel metrics test adds an observation wait. This is measured-component source equivalence,not a full latest-default integration execution. Prior merged dotnet/aspnetcore#69558 deliberately chose a stable first cache after replacing-last-port contention regressions;this is only a bounded two-port follow-on.')
$detail.Add('')
$detail.Add('Shared Windows VM,not isolated. Settings-preserving emitted BDN executor/Guid.Empty power;Normal/Normal/affinity65535 observed at captured points,no deliberate priority/affinity/power/unrelated-process changes. Point observations are not continuous OS tracing.')
$template=Get-Content 'C:\src\aspnetcore\.github\pull_request_template.md' -Raw
foreach ($token in '# {PR title}','Summary of the changes (Less than 80 chars)','{Detail}','Fixes #{bug number} (in this specific format)')
{
    if (-not $template.Contains($token)) {throw 'Actual repository template changed;inspect before authoring.'}
}
$body=$template.Replace('# {PR title}','# Cache a second stable boxed endpoint port').
    Replace('Summary of the changes (Less than 80 chars)','Reuse two boxed endpoint ports; retain all allocation and timing trade-offs').
    Replace('{Detail}',($detail -join "`n")).
    Replace('Fixes #{bug number} (in this specific format)','Related design/history: dotnet/aspnetcore#69558. Independent AutoPerf proposal;no originating bug is being closed.')
$bodyPath=Join-Path $PSScriptRoot 'F116-pr-body.md'
$body|Set-Content $bodyPath -Encoding utf8 -NoNewline
$title='[AutoPerf F116] Cache a second boxed endpoint port (allocation-only)'
$create=@('pr','create','--repo','jaslawinMs/aspnetcore','--base','main','--head',$source.branch,'--draft','--title',$title,'--body-file',$bodyPath)
gh @create *> (Join-Path $PSScriptRoot 'F116-pr-create.log');$exit=$LASTEXITCODE
if ($exit) {throw 'Actual fork-only draft creation failed.'}
$match=@(Get-Content (Join-Path $PSScriptRoot 'F116-pr-create.log')|Where-Object {$_ -match '^https://github\.com/jaslawinMs/aspnetcore/pull/\d+$'})
if ($match.Count -ne 1) {throw 'Read one actual returned URL;never guess a PR number.'}
$url=$match[0].Trim()
$dispatched=[DateTimeOffset]::UtcNow.ToString('o')
Start-Process -FilePath $url -ErrorAction Stop
[ordered]@{candidate='F116';url=$url;command='Start-Process -FilePath actualReturnedUrl';requestedAt=$dispatched;dispatchReturnedSuccessfully=$true;actualBrowserTabRenderVerified=$false}|ConvertTo-Json -Depth 5|Set-Content (Join-Path $PSScriptRoot 'F116-browser-dispatch.json') -Encoding utf8
$number=[int]($url.Split('/')[-1])
$actualText=gh api "repos/jaslawinMs/aspnetcore/pulls/$number"
if ($LASTEXITCODE) {throw 'Actual created fork draft unavailable.'}
$actual=$actualText|ConvertFrom-Json
if (-not $actual.draft -or $actual.state -cne 'open' -or $actual.html_url -cne $url -or
    $actual.head.sha -cne $source.commit -or $actual.head.ref -cne $source.branch -or $actual.base.ref -cne 'main' -or
    $actual.base.sha -cne $source.parent -or $actual.head.repo.full_name -ine 'jaslawinMs/aspnetcore' -or
    $actual.base.repo.full_name -ine 'jaslawinMs/aspnetcore' -or
    $actual.body.Replace("`r`n","`n").TrimEnd() -cne $body.Replace("`r`n","`n").TrimEnd()) {throw 'Actual draft/head/base/repo/body differs.'}
[ordered]@{
    candidate='F116';url=$url;number=$number;draft=$actual.draft;state=$actual.state
    head=$actual.head.ref;headSha=$actual.head.sha;base=$actual.base.ref;baseSha=$actual.base.sha;forkOnly=$true
    bodyFile=$bodyPath;bodySha256=(Get-FileHash $bodyPath).Hash;actualRemoteBodyVerified=$true
    templateCommentsHeadingsChecklistAndOrderPreserved=$true;checklistNotFalselyMarkedComplete=$true
    immutableEvidenceCommit=$immutable;immutableEvidenceFiles=$count;creationArguments=$create;actualCreationExitCode=$exit
    browserDispatchRequestedAt=$dispatched;browserDispatchReturnedSuccessfully=$true;actualBrowserTabRenderVerified=$false
    allocationOnlyQualifiedNotMergeReady=$true;generalApplicationSpeedupClaimed=$false
}|ConvertTo-Json -Depth 10|Set-Content $record -Encoding utf8
Write-Output "F116:$url actual fork-only draft/head/base/body verified;immediate browser dispatch returned successfully."
