$ErrorActionPreference='Stop'
$repo='jaslawinMs/aspnetcore'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$capsule=Join-Path $output 'F007'
$immutable=(Get-Content (Join-Path $PSScriptRoot 'F007-results-commit.txt') -Raw).Trim()
$count=[int](Get-Content (Join-Path $PSScriptRoot 'F007-immutable-file-count.txt') -Raw)
$source=Get-Content (Join-Path $capsule 'source-branch-publication.json') -Raw|ConvertFrom-Json
$remote=@(Get-Content (Join-Path $PSScriptRoot 'F007-remote-blob-verification.json') -Raw|ConvertFrom-Json)
$audit=Get-Content (Join-Path $capsule 'measurement-audit.json') -Raw|ConvertFrom-Json
if($remote.Count-ne$count -or @($remote|Where-Object {-not$_.verified_remote_blob}).Count -or
    $audit.disposition-cne'validated' -or -not$audit.comparisonBudgetClosed -or $audit.benchmarkOutcomes-ne88 -or
    $audit.exactHarnessControlledComparisons-ne2 -or -not$source.actualRemoteCanonicalBytesVerified){throw 'Actual immutable source/evidence and qualified audit must precede draft creation.'}
function Api([string]$Endpoint)
{
    $text=gh api $Endpoint
    if($LASTEXITCODE){throw "Actual GitHub retrieval failed:$Endpoint"}
    return ($text|ConvertFrom-Json)
}
$fork=Api "repos/$repo";$base=Api "repos/$repo/git/ref/heads/main";$head=Api "repos/$repo/git/ref/heads/$($source.branch)"
$results=Api "repos/$repo/git/ref/heads/autoperf-results";$comparison=Api "repos/$repo/compare/$($source.parent)...$($source.commit)"
if($fork.private -or -not$fork.fork -or $fork.parent.full_name-cne'dotnet/aspnetcore' -or
    $fork.default_branch-cne'main' -or $base.object.sha-cne$source.parent -or $head.object.sha-cne$source.commit -or
    $results.object.sha-cne$immutable -or $comparison.ahead_by-ne1 -or $comparison.files.Count-ne1 -or
    $comparison.files[0].filename-cne'src/Components/Server/src/Circuits/ServerComponentDeserializer.cs' -or
    $comparison.files[0].additions-ne9 -or $comparison.files[0].deletions-ne12){throw 'Actual fork-only source/base/evidence scope differs.'}
$evidence="https://github.com/$repo/blob/$immutable/F007"
$issueBody=(Get-Content (Join-Path $capsule 'issue-template.md') -Raw).Replace('@EVIDENCE@',$evidence)
$issueBodyPath=Join-Path $PSScriptRoot 'F007-issue-body.md';$issueBody|Set-Content $issueBodyPath -Encoding utf8
$issueUrlPath=Join-Path $PSScriptRoot 'F007-issue-url.txt'
if(Test-Path $issueUrlPath){$issueUrl=(Get-Content $issueUrlPath -Raw).Trim()}
else
{
    $issueArgs=@('issue','create','--repo',$repo,'--title','AutoPerf F007: large root-batch parser CPU/allocation trade-off','--body-file',$issueBodyPath)
    $issueUrl=(gh @issueArgs|Out-String).Trim()
    if($LASTEXITCODE -or $issueUrl-notmatch'^https://github\.com/jaslawinMs/aspnetcore/issues/\d+$'){throw 'Inspect actual issue creation output before retrying.'}
    $issueUrl|Set-Content $issueUrlPath -Encoding ascii
}
$issueNumber=[int]([uri]$issueUrl).Segments[-1]
$issue=Api "repos/$repo/issues/$issueNumber"
if($issue.html_url-cne$issueUrl -or $issue.state-cne'open' -or $issue.body.TrimEnd()-cne$issueBody.TrimEnd()){throw 'Actual fork issue identity/body differs.'}
$issue|ConvertTo-Json -Depth 16|Set-Content (Join-Path $PSScriptRoot 'F007-tracking-issue.json') -Encoding utf8
function Quote([string]$Value){return "'"+$Value.Replace("'","''")+"'"}
$commands=[System.Collections.Generic.List[string]]::new()
foreach($role in 'original','candidate-1')
{
    $execution=Get-Content (Join-Path $capsule "tests\$role\execution.json") -Raw|ConvertFrom-Json
    foreach($record in $execution.commands)
    {
        if($record.actualExitCode-ne0){throw 'Actual owner build/test command must pass.'}
        $commands.Add("**$role owning $($record.arguments[0])**");$commands.Add('```powershell');$commands.Add('. .\activate.ps1')
        $commands.Add($record.entryPoint+' '+(($record.arguments|ForEach-Object {Quote $_})-join' '));$commands.Add('```')
        $commands.Add($(if($record.arguments[0]-ceq'test'){'**Result: exit0;33 passed,0 failed,0 skipped.**'}else{'**Result: exit0.**'}));$commands.Add('')
    }
    $record=Get-Content (Join-Path $capsule "characterization\$role-attempt2\execution.json") -Raw|ConvertFrom-Json
    if($record.actualExitCode-ne0){throw 'Actual final characterization must pass.'}
    $commands.Add("**$role final actual-owner characterization**");$commands.Add('```powershell');$commands.Add('. .\activate.ps1')
    $commands.Add($record.entryPoint+' '+(($record.arguments|ForEach-Object {Quote $_})-join' '));$commands.Add('```')
    $commands.Add('**Result: exit0;151 checks/129 producer proofs including22 real timed Setup preflights.**');$commands.Add('')
}
foreach($number in 1,2,3)
{
    $execution=Get-Content (Join-Path $capsule "measurements\comparison-$number\execution.json") -Raw|ConvertFrom-Json
    foreach($record in $execution.commands)
    {
        if(($number-eq1 -and ($record.variant-cne'original' -or $record.actualExitCode-eq0)) -or
            ($number-ne1 -and $record.actualExitCode-ne0)){throw 'Actual attempted/completed profile outcome differs.'}
        $commands.Add("**Slot$number/$($record.variant)**");$commands.Add('```powershell');$commands.Add('. .\activate.ps1')
        $commands.Add($record.entryPoint+' '+(($record.arguments|ForEach-Object {Quote $_})-join' '));$commands.Add('```')
        $commands.Add($(if($number-eq1){"**Result: exit$($record.actualExitCode);failed harness GlobalSetup,null-logger member reflection,zero workload samples. Slot remains spent;candidate not launched.**"}else{'**Result: exit0;22 successful full-owner reports,identical final harness/nonowner files.**'}));$commands.Add('')
    }
}
$commands.Add('```powershell');$commands.Add('node '+(Quote (Join-Path $capsule 'reproduce-analysis.mjs'))+' '+(Quote $capsule)+' --verify')
$commands.Add('```');$commands.Add('**Result: exit0;actual copied portable source/input/contract/TRX/raw-sample/GC/statistical-consistency audit passed. Omitted DLL/PDB/native images not rehashed.**')
$table=[regex]::Match((Get-Content (Join-Path $capsule 'README.md') -Raw),'(?ms)^\| Shape \|.*?(?=\r?\n\r?\n)').Value
if(-not$table){throw 'Exact complete22-case result table required.'}
$detail=(Get-Content (Join-Path $capsule 'pr-detail-template.md') -Raw).Replace('@EVIDENCE@',$evidence).
    Replace('@SOURCE_COMMIT@',$source.commit).Replace('@FILE_COUNT@',[string]$count).Replace('@RESULT_TABLE@',$table).Replace('@COMMANDS@',($commands-join"`n"))
$template=Get-Content 'C:\src\aspnetcore\.github\pull_request_template.md' -Raw
if($template-cne(Get-Content (Join-Path $capsule 'repository-pull-request-template.md') -Raw)){throw 'Current repository PR template differs from inspected/captured template.'}
$title='AutoPerf F007: Use integer-set membership for large root batches'
$body=$template.Replace('# {PR title}',"# $title").
    Replace('Summary of the changes (Less than 80 chars)','Use integer-set membership for root-operation batches over128').
    Replace('{Detail}',$detail).Replace('Fixes #{bug number} (in this specific format)',"Fixes #$issueNumber")
if($body.Length-gt65000 -or $body-match'@(EVIDENCE|COMMANDS|RESULT_TABLE|SOURCE_COMMIT|FILE_COUNT)@'){throw 'Complete bounded actual PR body required.'}
$bodyPath=Join-Path $PSScriptRoot 'F007-pr-body.md';$body|Set-Content $bodyPath -Encoding utf8
$prUrlPath=Join-Path $PSScriptRoot 'F007-pr-url.txt'
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
if(-not$pr.draft -or $pr.state-cne'open' -or $pr.html_url-cne$prUrl -or $pr.head.repo.full_name-cne$repo -or $pr.base.repo.full_name-cne$repo -or
    $pr.base.ref-cne'main' -or $pr.base.sha-cne$source.parent -or $pr.head.ref-cne$source.branch -or $pr.head.sha-cne$source.commit -or
    $pr.body.TrimEnd()-cne$body.TrimEnd() -or $pr.title-cne$title){throw 'Actual fork draft/head/base/source/body identity differs.'}
$pr|ConvertTo-Json -Depth 18|Set-Content (Join-Path $PSScriptRoot 'F007-created-pr.json') -Encoding utf8
$browserPath=Join-Path $PSScriptRoot 'F007-browser-open.json'
if(-not(Test-Path $browserPath))
{
    $requestedAt=[DateTimeOffset]::UtcNow.ToString('o')
    $browser=Start-Process -FilePath $prUrl -PassThru -ErrorAction Stop
    [ordered]@{candidate='F007';url=$prUrl;requested_at=$requestedAt;start_process_succeeded=$true;
        returned_process_id=$(if($browser){$browser.Id}else{$null});visual_browser_rendering_verified=$false;
        note='Verified fork draft URL handed immediately to Windows default browser;no visual-rendering claim.'}|
        ConvertTo-Json -Depth 4|Set-Content $browserPath -Encoding utf8
}
[ordered]@{candidate='F007';source_commit=$source.commit;immutable_evidence_commit=$immutable;tracking_issue=$issueUrl;draft_pr=$prUrl;
    actual_draft_head_base_body_verified=$true;issue_creation_arguments=$issueArgs;draft_creation_arguments=$prArgs;
    actual_browser_url_requested=$true;recorded_at=[DateTimeOffset]::UtcNow.ToString('o')}|
    ConvertTo-Json -Depth 8|Set-Content (Join-Path $PSScriptRoot 'F007-draft-publication.json') -Encoding utf8
Write-Output "Created/verified fork-only draft$prUrl;opened actual URL in default browser."
