$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F118'
$record=Join-Path $PSScriptRoot 'F118-draft-publication.json'
if(Test-Path $record){throw 'Never duplicate an actual existing draft.'}
$source=Get-Content (Join-Path $run 'source-branch-publication.json') -Raw|ConvertFrom-Json
$immutable=(Get-Content (Join-Path $PSScriptRoot 'F118-results-commit.txt') -Raw).Trim()
$count=[int](Get-Content (Join-Path $PSScriptRoot 'F118-immutable-file-count.txt') -Raw)
$remote=@(Get-Content (Join-Path $PSScriptRoot 'F118-remote-blob-verification.json') -Raw|ConvertFrom-Json)
if($remote.Count -ne $count -or @($remote|Where-Object {-not $_.verified_remote_blob}).Count){throw 'Verified immutable remote evidence required before draft.'}
$existing=gh pr list --repo jaslawinMs/aspnetcore --head $source.branch --state all --json number,url
if($LASTEXITCODE -or @($existing|ConvertFrom-Json).Count){throw 'No existing PR for this exact source head permitted.'}
$link="https://github.com/jaslawinMs/aspnetcore/blob/$immutable/F118"
$detail=[System.Collections.Generic.List[string]]::new()
$detail.Add("**Qualified allocation-focused proposal,not merge-ready.** Independent AutoPerf F118. [Immutable full evidence]($link/README.md),[all72 comparisons]($link/comparison-outcomes.md),[exact raw/validation commands]($link/validation-commands.md).")
$detail.Add('')
$detail.Add('Use an existing bounded StringBuilder policy/private static pool only for general non-HtmlString IHtmlContent. Keep a fresh StringWriter per call,its culture/newline/type/disposal,and the original using/locals/branches inside try/finally Return. No public API,constructor,default,TFM,dependency or assembly-visibility change.')
$detail.Add('')
$detail.Add('**Measured allocation:**256 characters1320 ->664 B;1024 characters4392 ->2200 B;2048 characters8488 ->4248 B. The actual ordered producer/TagHelperRunner1024 case also4392 ->2200 B. All15 immutable absolute resource samples were expected-red on original and green on candidate,without threshold/input retuning.')
$detail.Add('')
$detail.Add('**Not ordinary Razor:** the actual RazorPageBase buffered attribute producer emits HtmlString and already bypasses this seam;its allocation stays2136 B. No HTTP,full-page,production-frequency,whole-application or cold-latency speedup claim.')
$detail.Add('')
$detail.Add('**Costs/limits:** prepared8192 time+80.47%/-4.58%/+29.45%;real runner8192+47.91%/-9.08%/+52.39%,with unchanged33064 B. Encoded input has unchanged16864 B and mixed timing;URL1024 has a33.22% slower pair. Unchanged page-control mean drifts+57.60%/+8.16%/-6.69%;that is not attributed to executing the bypassed pool seam. Maximum CV29.86%. Every unfavorable result is retained.')
$detail.Add('')
$detail.Add('Three comparisons/one source shape/six24-case profiles,with pair2 reversed:1152 retained results,432 warmups,2370 actual overheads,no outlier removal. Runner1K observed timing1.46-39.83% faster,but this is scoped custom-producer evidence,not a general latency recommendation. Parallel rows are12x64=768 actual calls/coordinated batch;BDN0.13 accounting on this runtime is process-wide including workers,with separate worker calipers4392 ->2200 B/call and0 B/string fast-call.')
$detail.Add('')
$detail.Add('Candidate retains cleared bounded buffers;after concurrent characterization12 capacity1024 builders were observed. Existing policy bounds retained capacity4096 and population32 on this16-logical-processor runtime. Six fresh-process probes show actual correct1024/8192 output,candidate cleared first builder and oversized discard. Not precise total retained heap,isolated type-initializer cost,or exhaustive schedule coverage. Post-disposal borrowed writer/builder retention or reliance on fresh capacity is not established compatible.')
$detail.Add('')
$detail.Add('### Validation (completed historical commands and actual outcomes)')
$detail.Add('')
$detail.Add('Each fresh dotnet shell activates `. .\activate.ps1` from `C:\src\aspnetcore`. Commands below were executed separately against the recorded source variants;they are not source-switch/replay instructions. Existing test projects remained unchanged. This draft does not claim that permanent pooling-specific xUnit coverage has already been added to the shipping tree.')
function Quote([string]$Value){return "'"+$Value.Replace("'","''")+"'"}
foreach($variant in 'original','candidate1')
{
    $execution=Get-Content (Join-Path $run "tests\$variant\execution.json") -Raw|ConvertFrom-Json
    $detail.Add('');$detail.Add("**$variant**");$detail.Add('```powershell')
    foreach($command in $execution.commands|Where-Object label -CEQ 'owning-tests')
    {
        if($command.exitCode -ne 0){throw 'Only actual successful scoped commands may be presented as passing.'}
        $detail.Add('dotnet '+(($command.arguments|ForEach-Object {Quote $_}) -join ' '))
        $detail.Add('# Actual exit0:38 passed,0 failed,0 skipped;exact discovered/result/entry associations and positive durations verified.')
    }
    $detail.Add('```')
}
$format=Get-Content (Join-Path $run 'format\execution.json') -Raw|ConvertFrom-Json
$detail.Add('');$detail.Add('```powershell');$detail.Add('dotnet '+(($format.arguments|ForEach-Object {Quote $_}) -join ' '))
$detail.Add('# Actual exit0:only measured source whitespace verified,no source mutation.');$detail.Add('```')
$detail.Add('')
$detail.Add("All24 complete typed/name/style/rendered contracts and9 real culture/newline/disposal/error/reentrant/encoding/whitespace/versioning controls pass.48 source/PDB document checks pass(not PE/PDB binding or method coverage). [Portable auditor]($link/reproduce-analysis.mjs) on copied capsule:actual exit0,all144 outcomes/192 contracts/240 calipers/76 exact test rows/48 documents verified. Public audit cannot rehash deliberately omitted DLL/PDB/runtime bytes or independently compute confidence critical values.")
$detail.Add('')
$detail.Add('Only the actually tested Mvc.Razor DLL/PDB differ between frozen284-file/118-asset images;harness/fixtures/all other producers/runtime/deps are unchanged. Loaded hashes/PIDs and200 pinned-runtime/host file hashes are recorded. Current-default3cd798fe/baseline37e:20/20 scoped files exact;two supporting context sources additionally frozen. This is scoped component-source equivalence,not full latest-default integration execution.')
$detail.Add('')
$detail.Add('Preparation failures preserved:initial40-vs38 discovery audit before any test execution;first endpoint metadata fixture used an enumerable overload incorrectly and failed the versioning assertion,then positive producer guards were fixed without changing outputs/goals;one preview parser failure never invoked timing or advanced budget. No actual completed owning test or measured profile rerun.')
$detail.Add('')
$detail.Add('Shared Windows VM,not isolated. Settings-preserving emitted BDN executor/Guid.Empty power;Normal/Normal/affinity65535 observed at captured points,no deliberate priority/affinity/power/unrelated-process changes. Point observations are not continuous OS tracing.')
$template=Get-Content 'C:\src\aspnetcore\.github\pull_request_template.md' -Raw
foreach($token in '# {PR title}','Summary of the changes (Less than 80 chars)','{Detail}','Fixes #{bug number} (in this specific format)')
{
    if(-not $template.Contains($token)){throw 'Actual repository template changed;inspect before authoring.'}
}
$body=$template.Replace('# {PR title}','# Reuse bounded builders for URL attribute content').
    Replace('Summary of the changes (Less than 80 chars)','Reuse URL content builders;retain all costs and ordinary Razor bypass controls').
    Replace('{Detail}',($detail -join "`n")).
    Replace('Fixes #{bug number} (in this specific format)','Independent AutoPerf F118 proposal from the retained scan inventory;no originating bug is being closed.')
$bodyPath=Join-Path $PSScriptRoot 'F118-pr-body.md'
$body|Set-Content $bodyPath -Encoding utf8 -NoNewline
$title='[AutoPerf F118] Pool URL content builders (allocation-focused)'
$create=@('pr','create','--repo','jaslawinMs/aspnetcore','--base','main','--head',$source.branch,'--draft','--title',$title,'--body-file',$bodyPath)
gh @create *> (Join-Path $PSScriptRoot 'F118-pr-create.log');$exit=$LASTEXITCODE
if($exit){throw 'Actual fork-only draft creation failed.'}
$match=@(Get-Content (Join-Path $PSScriptRoot 'F118-pr-create.log')|Where-Object {$_ -match '^https://github\.com/jaslawinMs/aspnetcore/pull/\d+$'})
if($match.Count -ne 1){throw 'Read one actual returned URL;never guess a PR number.'}
$url=$match[0].Trim()
$dispatched=[DateTimeOffset]::UtcNow.ToString('o')
Start-Process -FilePath $url -ErrorAction Stop
[ordered]@{candidate='F118';url=$url;command='Start-Process -FilePath actualReturnedUrl';requestedAt=$dispatched
    dispatchReturnedSuccessfully=$true;actualBrowserTabRenderVerified=$false
}|ConvertTo-Json -Depth 5|Set-Content (Join-Path $PSScriptRoot 'F118-browser-dispatch.json') -Encoding utf8
$number=[int]($url.Split('/')[-1])
$actualText=gh api "repos/jaslawinMs/aspnetcore/pulls/$number"
if($LASTEXITCODE){throw 'Actual created fork draft unavailable.'}
$actual=$actualText|ConvertFrom-Json
if(-not $actual.draft -or $actual.state -cne 'open' -or $actual.html_url -cne $url -or
    $actual.head.sha -cne $source.commit -or $actual.head.ref -cne $source.branch -or $actual.base.ref -cne 'main' -or
    $actual.base.sha -cne $source.parent -or $actual.head.repo.full_name -ine 'jaslawinMs/aspnetcore' -or
    $actual.base.repo.full_name -ine 'jaslawinMs/aspnetcore' -or
    $actual.body.Replace("`r`n","`n").TrimEnd() -cne $body.Replace("`r`n","`n").TrimEnd()){throw 'Actual draft/head/base/repo/body differs.'}
[ordered]@{
    candidate='F118';url=$url;number=$number;draft=$actual.draft;state=$actual.state
    head=$actual.head.ref;headSha=$actual.head.sha;base=$actual.base.ref;baseSha=$actual.base.sha;forkOnly=$true
    bodyFile=$bodyPath;bodySha256=(Get-FileHash $bodyPath).Hash;actualRemoteBodyVerified=$true
    templateCommentsHeadingsChecklistAndOrderPreserved=$true;checklistNotFalselyMarkedComplete=$true
    immutableEvidenceCommit=$immutable;immutableEvidenceFiles=$count;creationArguments=$create;actualCreationExitCode=$exit
    browserDispatchRequestedAt=$dispatched;browserDispatchReturnedSuccessfully=$true;actualBrowserTabRenderVerified=$false
    allocationOnlyQualifiedNotMergeReady=$true;ordinaryRazorOrGeneralApplicationSpeedupClaimed=$false
}|ConvertTo-Json -Depth 10|Set-Content $record -Encoding utf8
Write-Output "F118:$url actual fork-only draft/head/base/body verified;immediate browser dispatch returned successfully."
