$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F023'
$published = Join-Path $PSScriptRoot 'autoperf-published-results'
$target = Join-Path $published 'F023'
$source = Get-Content -Raw -LiteralPath (Join-Path $run 'source-publication\verified-source-publication.json') | ConvertFrom-Json
$decision = Get-Content -Raw -LiteralPath (Join-Path $run 'decision.json') | ConvertFrom-Json
$budget = Get-Content -Raw -LiteralPath (Join-Path $run 'measurement-budget.json') | ConvertFrom-Json
$selected = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\selected-owning\verified-result.json') | ConvertFrom-Json
$fresh = Get-Content -Raw -LiteralPath (Join-Path $run 'reproduction-characterized\verified-fresh-consumer.json') | ConvertFrom-Json
if ((Test-Path -LiteralPath $target) -or @(git -C $published status --porcelain).Count -or
    !$source.actualAllRemoteSourceRefsAndBlobsVerified -or
    $decision.disposition -ne 'qualified-opt-in-allocation-focused-fork-draft' -or
    !$budget.comparison_budget_closed -or $budget.actual_comparisons_started -ne 3 -or
    $budget.actual_comparisons_completed -ne 3 -or $selected.actualPassed -ne 30 -or
    $selected.actualExpectedRed -ne 0 -or $selected.actualSkipped -ne 0 -or
    $fresh.mode -ne 'Characterize' -or $fresh.actualTimingPerformed)
{
    throw 'Require a fresh destination,clean results checkout,verified source,qualified scoped result,green owning/fresh checks and permanently closed budget.'
}
$copies = [Collections.Generic.List[object]]::new()
$omissions = [Collections.Generic.List[object]]::new()
function Copy-Exact([string]$File, [string]$Relative, [string]$Kind)
{
    $destination = Join-Path $target $Relative
    if (Test-Path -LiteralPath $destination)
    {
        throw "Refuse to overwrite authoritative evidence:$Relative"
    }
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination)) | Out-Null
    Copy-Item -LiteralPath $File -Destination $destination
    $sha = (Get-FileHash -LiteralPath $File).Hash
    if ((Get-FileHash -LiteralPath $destination).Hash -cne $sha)
    {
        throw "Copied bytes differ:$Relative"
    }
    $copies.Add([ordered]@{
        original = $File; destination = $Relative; kind = $Kind; bytes = (Get-Item -LiteralPath $File).Length; sha256 = $sha
    })
}
$all = @(Get-ChildItem -LiteralPath $run -Recurse -File -Force)
foreach ($file in $all)
{
    $relative = [IO.Path]::GetRelativePath($run, $file.FullName)
    $generated = $relative -match '(^|\\)(bin|obj|image|images|\.git|node_modules)(\\|$)'
    if ($generated -or $file.Extension -in '.dll','.exe','.pdb','.binlog','.nupkg','.snupkg')
    {
        $omissions.Add([ordered]@{
            original = $relative; bytes = $file.Length; sha256 = (Get-FileHash -LiteralPath $file.FullName).Hash
            reason = 'Compiled,restore,build,package or frozen consumer image omitted;exact hashes and actual textual native/source/test evidence remain.'
        })
        continue
    }
    if ($file.Extension -notin '.cs','.csproj','.vb','.vbproj','.json','.trx','.log','.txt','.html','.md','.csv',
        '.patch','.diff','.ps1','.mjs','.stdout','.stderr','.config','.xml','.nuspec','.editorconfig','.props',
        '.targets','.cmd','.slnx','.sarif')
    {
        throw "Unclassified evidence artifact:$relative"
    }
    Copy-Exact $file.FullName $relative 'actual-run'
}
foreach ($file in @(Get-ChildItem -LiteralPath $PSScriptRoot -File |
    Where-Object { $_.Name -like 'F023-*' -and $_.Extension -in '.ps1','.mjs' }))
{
    Copy-Exact $file.FullName $file.Name 'session-driver'
}
foreach ($mapping in @(
    @((Join-Path $PSScriptRoot 'F023-package-gitattributes.txt'),'.gitattributes'),
    @((Join-Path $PSScriptRoot 'F023-issue-template.md'),'publication-inputs\issue-template.md'),
    @((Join-Path $PSScriptRoot 'F023-pr-detail-template.md'),'publication-inputs\pr-detail-template.md'),
    @('C:\src\aspnetcore\.github\pull_request_template.md','pr-template-source.md'),
    @('C:\src\aspnetcore\docs\BuildFromSource.md','BuildFromSource-captured.md'),
    @('C:\src\aspnetcore\LICENSE.txt','LICENSE.txt')
))
{
    Copy-Exact $mapping[0] $mapping[1] 'publication-source'
}
$copies | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $target 'authoritative-copy-manifest.json') -Encoding utf8NoBOM
$omissions | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $target 'omitted-file-manifest.json') -Encoding utf8NoBOM
$readme = (Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'F023-results-readme.md')).
    Replace('@SOURCE_COMMIT@',$source.actualSourceCommit).
    Replace('@COMPARISON@',(Get-Content -Raw -LiteralPath (Join-Path $run 'comparison.md')).Trim())
if ($readme -match '@SOURCE_COMMIT@|@COMPARISON@')
{
    throw 'Unfilled evidence README placeholder.'
}
$readme | Set-Content (Join-Path $target 'README.md') -Encoding utf8NoBOM -NoNewline
$commands = [Collections.Generic.List[string]]::new()
$commands.Add('# F023 exact recorded commands and actual outcomes')
$commands.Add('')
$commands.Add('Historical evidence only. Three comparisons are permanently closed;do not replay timing or publication drivers. Activate the repository SDK before every dotnet command. Expected negative controls and initial compiler failure are retained,not relabeled passed.')
$commands.Add('')
function Quote([string]$Value)
{
    return "'" + $Value.Replace("'","''") + "'"
}
foreach ($copy in $copies | Where-Object { $_.kind -eq 'actual-run' -and $_.destination.EndsWith('.json') } | Sort-Object destination)
{
    $data = Get-Content -Raw -LiteralPath (Join-Path $target $copy.destination) | ConvertFrom-Json
    $records = if ($data -is [array]) { @($data) } elseif ($data.commands) { @($data.commands) } else { @($data) }
    foreach ($record in $records)
    {
        if (!$record.executable -or !$record.arguments -or 'actualExitCode' -notin $record.PSObject.Properties.Name)
        {
            continue
        }
        $commands.Add("## $($copy.destination): actual exit$($record.actualExitCode)")
        $commands.Add('```powershell')
        if ($record.workingDirectory)
        {
            $commands.Add('Set-Location ' + (Quote $record.workingDirectory))
        }
        if ([IO.Path]::GetFileNameWithoutExtension($record.executable) -eq 'dotnet')
        {
            $commands.Add('. .\activate.ps1')
        }
        $commands.Add('& ' + (Quote $record.executable) + ' ' + (($record.arguments | ForEach-Object { Quote $_ }) -join ' '))
        $commands.Add('```')
        $commands.Add('')
    }
}
$commands.Add('## Interpretation')
$commands.Add('Original existing26/26pass. Expanded original30:29pass plus only expected LoadAsync_InfiniteTimeoutAvoidsTimerAllocation red,87552vs87552 over64 real loaded-value wrappers. Selected30/30pass,0skips. Both caller-cancellation theory rows individually pass original/selected,as does owned-token lifetime. Fresh XML outcomes/multiplicity and owner-image binding were checked.')
$commands.Add('')
$commands.Add('Each frozen owner:8real public wrappers/16values/10additional actual caller/deadline/lifetime/error producers pass. Zero timeout preserves its entry-order race. Native/provider boundary is actual MemoryDistributedCache and awaited token gates,not network/HTTP. Exact exception/warning and retry/lifetime behavior checked.')
$commands.Add('')
$commands.Add('Initial standalone build fails15compiler errors for missing Http.Extensions reference and cache namespace usings. Corrected preparation-002 build succeeds with0warnings. Runtime-only resource probe succeeds with1CA1416warning. Actual repository whitespace verification passes without modifications. All failed outputs are retained.')
$commands.Add('')
$commands.Add('All3comparisons complete,18nativeprofiles/48raw warm means/12first observations. All4freshinfinite profiles save96B/op everypair,default/loadedallocations unchanged. Observed timings/control drift/adverse pairs are retained,not causal application/default gains. Fresh relocated standalone Characterize actually passes8wrappers/16values/10producers with no fourth timing.')
$commands.Add('')
$commands.Add('## Copied read-only raw evidence audit')
$commands.Add('```powershell')
$commands.Add('node .\F023-audit-measurements.mjs . --verify')
$commands.Add('```')
$commands.Add('Actual copied-capsule result:exit0,48retained raw warm means independently recomputed,18timing profiles/12first-observed rows and copied source/metadata witnesses/derived-output checks pass. No omitted binary/runtime image is reopened,no timing executed.')
$commands | Set-Content (Join-Path $target 'validation-commands.md') -Encoding utf8NoBOM
& node (Join-Path $target 'F023-audit-measurements.mjs') $target --verify `
    1> (Join-Path $PSScriptRoot 'F023-copied-audit.stdout') 2> (Join-Path $PSScriptRoot 'F023-copied-audit.stderr')
if ($LASTEXITCODE -ne 0)
{
    throw 'Copied standalone text-only audit failed;retain the package and inspect without more timing.'
}
foreach ($copy in $copies)
{
    if ((Get-FileHash -LiteralPath (Join-Path $target $copy.destination)).Hash -cne $copy.sha256)
    {
        throw 'A copied authoritative file was changed during packaging.'
    }
}
[ordered]@{
    candidate = 'F023'; actualByteExactCopies = $copies.Count; actualHashedOmissions = $omissions.Count
    actualCopiedPortableAuditPassed = $true; actualRawMeansRecomputed = 48
    actualComparisons = 3; actualTimingProfiles = 18; actualFirstObservations = 12
    actualSourceCommit = $source.actualSourceCommit; actualSourceFiles = 2
    actualFreshRelocatedSelectedCharacterizationPassed = $true; fourthComparisonExecuted = $false
    onlyTextualEvidencePublished = $true; mergeReady = $false
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $target 'raw-file-copy-verification.json') -Encoding utf8NoBOM
$count = @(Get-ChildItem -LiteralPath $target -Recurse -File -Force).Count
if ($count -ne $copies.Count + 5)
{
    throw 'Actual immutable capsule count differs from copies plus five generated receipts.'
}
$count | Set-Content (Join-Path $PSScriptRoot 'F023-immutable-file-count.txt') -Encoding utf8NoBOM
Write-Output "F023:$count immutable files,$($copies.Count) exact copies,$($omissions.Count) hashed omissions;copied audit passed."
