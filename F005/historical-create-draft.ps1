$ErrorActionPreference='Stop'
$repo='jaslawinMs/aspnetcore'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$capsule=Join-Path $output 'F005'
$immutable=(Get-Content (Join-Path $PSScriptRoot 'F005-results-commit.txt') -Raw).Trim()
$count=[int](Get-Content (Join-Path $PSScriptRoot 'F005-immutable-file-count.txt') -Raw)
$source=Get-Content (Join-Path $capsule 'source-branch-publication.json') -Raw|ConvertFrom-Json
$remote=@(Get-Content (Join-Path $PSScriptRoot 'F005-remote-blob-verification.json') -Raw|ConvertFrom-Json)
$audit=Get-Content (Join-Path $capsule 'measurement-audit.json') -Raw|ConvertFrom-Json
if($remote.Count-ne$count -or @($remote|Where-Object {-not $_.verified_remote_blob}).Count -or
    $audit.disposition-cne'validated' -or -not $audit.comparisonBudgetClosed -or $audit.benchmarkOutcomes-ne100 -or
    $audit.controlledBenchmarkOutcomes-ne72 -or $audit.exploratoryBenchmarkOutcomes-ne28 -or
    -not $source.actualRemoteCanonicalBytesVerified){throw 'Actual immutable source/evidence and qualified audit must precede the fork draft.'}
function Api([string]$Endpoint)
{
    $text=gh api $Endpoint
    if($LASTEXITCODE){throw "Actual GitHub retrieval failed:$Endpoint"}
    return ($text|ConvertFrom-Json)
}
$fork=Api "repos/$repo";$base=Api "repos/$repo/git/ref/heads/main";$head=Api "repos/$repo/git/ref/heads/$($source.branch)"
$results=Api "repos/$repo/git/ref/heads/autoperf-results";$comparison=Api "repos/$repo/compare/$($source.parent)...$($source.commit)"
if($fork.private -or -not $fork.fork -or $fork.parent.full_name-cne'dotnet/aspnetcore' -or
    $fork.default_branch-cne'main' -or $base.object.sha-cne$source.parent -or $head.object.sha-cne$source.commit -or
    $results.object.sha-cne$immutable -or $comparison.ahead_by-ne1 -or $comparison.files.Count-ne1 -or
    $comparison.files[0].filename-cne'src/Components/Analyzers/src/ForLoopIteratorInClosureAnalyzer.cs' -or
    $comparison.files[0].additions-ne4 -or $comparison.files[0].deletions-ne4){throw 'Actual fork-only source/base/evidence/four-line scope differs.'}
$evidence="https://github.com/$repo/blob/$immutable/F005"
$issueBody=(Get-Content (Join-Path $capsule 'issue-template.md') -Raw).Replace('@EVIDENCE@',$evidence)
$issueBodyPath=Join-Path $PSScriptRoot 'F005-issue-body.md'
$issueBody|Set-Content $issueBodyPath -Encoding utf8
$issueUrlPath=Join-Path $PSScriptRoot 'F005-issue-url.txt'
if(Test-Path $issueUrlPath){$issueUrl=(Get-Content $issueUrlPath -Raw).Trim()}
else
{
    $issueArgs=@('issue','create','--repo',$repo,'--title','AutoPerf F005: potential loop-symbol allocation/scaling trade-off','--body-file',$issueBodyPath)
    $issueUrl=(gh @issueArgs|Out-String).Trim()
    if($LASTEXITCODE -or $issueUrl-notmatch'^https://github\.com/jaslawinMs/aspnetcore/issues/\d+$'){throw 'Inspect actual issue creation output before retrying.'}
    $issueUrl|Set-Content $issueUrlPath -Encoding ascii
}
$issueNumber=[int]([uri]$issueUrl).Segments[-1]
$issue=Api "repos/$repo/issues/$issueNumber"
if($issue.html_url-cne$issueUrl -or $issue.state-cne'open' -or $issue.body.TrimEnd()-cne$issueBody.TrimEnd()){throw 'Actual fork issue identity/body differs.'}
$issue|ConvertTo-Json -Depth 16|Set-Content (Join-Path $PSScriptRoot 'F005-tracking-issue.json') -Encoding utf8
function Quote([string]$Value){return "'"+$Value.Replace("'","''")+"'"}
$commands=[System.Collections.Generic.List[string]]::new()
foreach($role in 'original','candidate-1')
{
    $execution=Get-Content (Join-Path $capsule "tests\$role\execution.json") -Raw|ConvertFrom-Json
    $test=@($execution.commands|Where-Object {$_.arguments[0]-ceq'test'})
    if($test.Count-ne1 -or $test[0].actualExitCode-ne0){throw 'Actual exact owning test command required.'}
    $commands.Add("**$role owning tests**");$commands.Add('```powershell');$commands.Add('. .\activate.ps1')
    $commands.Add($test[0].entryPoint+' '+(($test[0].arguments|ForEach-Object {Quote $_})-join' '));$commands.Add('```')
    $commands.Add('**Result: exit0;20 passed,0 failed,0 skipped.**');$commands.Add('')
}
foreach($variant in 'original','candidate-1','current-default-class','original-small-controls','candidate-1-small-controls')
{
    $record=Get-Content (Join-Path $capsule "characterization\$variant-attempt1\execution.json") -Raw|ConvertFrom-Json
    if($record.actualExitCode-ne0){throw 'Actual compiler characterization must pass.'}
    $commands.Add("**$variant compiler characterization**");$commands.Add('```powershell')
    $commands.Add($record.entryPoint+' '+(($record.arguments|ForEach-Object {Quote $_})-join' '));$commands.Add('```')
    $commands.Add('**Result: exit0;112 checks/1408 exact BL0014 observations passed.**');$commands.Add('')
}
foreach($number in 1,2,3)
{
    $execution=Get-Content (Join-Path $capsule "measurements\comparison-$number\execution.json") -Raw|ConvertFrom-Json
    foreach($record in $execution.commands)
    {
        if($record.actualExitCode-ne0){throw 'Actual measurement command did not complete.'}
        $reports=if($number-eq1){14}else{18}
        $label=if($number-eq1){'exploratory,different harness bytes'}else{'controlled,identical harness bytes'}
        $commands.Add("**Comparison$number/$($record.variant):$label**");$commands.Add('```powershell')
        $commands.Add($record.entryPoint+' '+(($record.arguments|ForEach-Object {Quote $_})-join' '));$commands.Add('```')
        $commands.Add("**Result: exit0;$reports reports.**");$commands.Add('')
    }
}
$commands.Add('```powershell');$commands.Add('node '+(Quote (Join-Path $capsule 'reproduce-analysis.mjs'))+' '+(Quote $capsule)+' --verify')
$commands.Add('```');$commands.Add('**Result: exit0;copied portable source/producer/contract/sample/GC/statistical consistency audit passed;omitted binaries not rehashed.**')
$table=[regex]::Match((Get-Content (Join-Path $capsule 'README.md') -Raw),'(?ms)^\| Shape / compilation.*?(?=\r?\n\r?\n)').Value
if(-not $table){throw 'Exact full result table required.'}
$detail=(Get-Content (Join-Path $capsule 'pr-detail-template.md') -Raw).Replace('@EVIDENCE@',$evidence).
    Replace('@SOURCE_COMMIT@',$source.commit).Replace('@FILE_COUNT@',[string]$count).Replace('@RESULT_TABLE@',$table).Replace('@COMMANDS@',($commands-join"`n"))
$template=Get-Content 'C:\src\aspnetcore\.github\pull_request_template.md' -Raw
if($template-cne(Get-Content (Join-Path $capsule 'repository-pull-request-template.md') -Raw)){throw 'Current repository PR template differs from captured template.'}
$title='AutoPerf F005: Lazily track potential loop iterators by symbol'
$body=$template.Replace('# {PR title}',"# $title").
    Replace('Summary of the changes (Less than 80 chars)','Use lazy symbol-set membership for potential loop iterators').
    Replace('{Detail}',$detail).Replace('Fixes #{bug number} (in this specific format)',"Fixes #$issueNumber")
if($body.Length-gt65000 -or $body-match'@(EVIDENCE|COMMANDS|RESULT_TABLE|SOURCE_COMMIT|FILE_COUNT)@'){throw 'Complete bounded actual PR body required.'}
$bodyPath=Join-Path $PSScriptRoot 'F005-pr-body.md';$body|Set-Content $bodyPath -Encoding utf8
$prUrlPath=Join-Path $PSScriptRoot 'F005-pr-url.txt'
if(Test-Path $prUrlPath){$prUrl=(Get-Content $prUrlPath -Raw).Trim()}
else
{
    $prArgs=@('pr','create','--repo',$repo,'--base','main','--head',$source.branch,'--draft','--title',$title,'--body-file',$bodyPath)
    $prUrl=(gh @prArgs|Out-String).Trim()
    if($LASTEXITCODE -or $prUrl-notmatch'^https://github\.com/jaslawinMs/aspnetcore/pull/\d+$'){throw 'Inspect actual draft output before retrying.'}
    $prUrl|Set-Content $prUrlPath -Encoding ascii
}
$prNumber=[int]([uri]$prUrl).Segments[-1]
$pr=Api "repos/$repo/pulls/$prNumber"
if(-not $pr.draft -or $pr.state-cne'open' -or $pr.html_url-cne$prUrl -or
    $pr.head.repo.full_name-cne$repo -or $pr.base.repo.full_name-cne$repo -or
    $pr.base.ref-cne'main' -or $pr.base.sha-cne$source.parent -or $pr.head.ref-cne$source.branch -or
    $pr.head.sha-cne$source.commit -or $pr.body.TrimEnd()-cne$body.TrimEnd() -or $pr.title-cne$title){throw 'Actual fork draft/head/base/source/body identity differs.'}
$pr|ConvertTo-Json -Depth 18|Set-Content (Join-Path $PSScriptRoot 'F005-created-pr.json') -Encoding utf8
$browserPath=Join-Path $PSScriptRoot 'F005-browser-open.json'
if(-not(Test-Path $browserPath))
{
    $requestedAt=[DateTimeOffset]::UtcNow.ToString('o')
    $browser=Start-Process -FilePath $prUrl -PassThru -ErrorAction Stop
    [ordered]@{candidate='F005';url=$prUrl;requested_at=$requestedAt;start_process_succeeded=$true;
        returned_process_id=$(if($browser){$browser.Id}else{$null});visual_browser_rendering_verified=$false;
        note='Actual verified fork draft URL handed immediately to the Windows default browser;no visual rendering claim.'}|
        ConvertTo-Json -Depth 4|Set-Content $browserPath -Encoding utf8
}
[ordered]@{candidate='F005';source_commit=$source.commit;immutable_evidence_commit=$immutable;tracking_issue=$issueUrl;draft_pr=$prUrl;
    actual_draft_head_base_body_verified=$true;issue_creation_arguments=$issueArgs;draft_creation_arguments=$prArgs;
    actual_browser_url_requested=$true;recorded_at=[DateTimeOffset]::UtcNow.ToString('o')}|
    ConvertTo-Json -Depth 8|Set-Content (Join-Path $PSScriptRoot 'F005-draft-publication.json') -Encoding utf8
Write-Output "Created and verified fork-only draft$prUrl;opened its actual URL in the default browser."
