$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F030'
$published = Join-Path $PSScriptRoot 'autoperf-published-results'
$target = Join-Path $published 'F030'
$source = Get-Content -Raw (Join-Path $run 'source-publication\verified-source-publication.json') | ConvertFrom-Json
$decision = Get-Content -Raw (Join-Path $run 'decision.json') | ConvertFrom-Json
$budget = Get-Content -Raw (Join-Path $run 'measurement-budget.json') | ConvertFrom-Json
$live = Get-Content -Raw (Join-Path $run 'live-frozen-closure-audit.json') | ConvertFrom-Json
if ((Test-Path -LiteralPath $target) -or @(git -C $published status --porcelain).Count -or
    !$source.actualAllSourceRefChecksPassed -or $decision.disposition -cne 'rejected' -or
    !$budget.source_comparison_budget_closed -or !$budget.original_diagnostic_budget_closed -or
    $budget.actual_source_comparisons_started -ne 0 -or $budget.actual_diagnostic_profiles_completed -ne 1 -or
    !$decision.actualWhitespaceVerifiedBeforeFreeze -or $decision.actualPassingBuildWarnings -ne 0 -or
    $live.actualConsumerBindings -ne 588)
{
    throw 'Require a fresh destination,clean results checkout and fully audited/closed original-only rejection.'
}
$copies = [Collections.Generic.List[object]]::new()
$omissions = [Collections.Generic.List[object]]::new()
function Copy-Exact([string]$File, [string]$Relative, [string]$Kind)
{
    $destination = Join-Path $target $Relative
    if (Test-Path -LiteralPath $destination)
    {
        throw "Do not overwrite evidence:$Relative"
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
foreach ($file in @(Get-ChildItem -LiteralPath $run -Recurse -File -Force))
{
    $relative = [IO.Path]::GetRelativePath($run, $file.FullName)
    if ($relative -match '(^|\\)(bin|obj|consumer|image|images|\.git|node_modules)(\\|$)' -or
        $file.Extension -in '.dll','.exe','.pdb','.binlog','.nupkg','.snupkg')
    {
        $omissions.Add([ordered]@{
            original = $relative; bytes = $file.Length; sha256 = (Get-FileHash -LiteralPath $file.FullName).Hash
            reason = 'Compiled,restore,build,package or frozen consumer tree omitted;exact hashes and textual source/native/test/closure receipts remain.'
        })
        continue
    }
    if ($file.Name -cne '.editorconfig' -and $file.Extension -notin '.cs','.csproj','.json','.trx','.log','.txt',
        '.html','.md','.csv','.patch','.diff','.ps1','.mjs','.stdout','.stderr','.config','.xml','.nuspec',
        '.props','.targets','.cmd','.slnx','.sarif','.baseline','.current','.working')
    {
        throw "Unclassified evidence artifact:$relative"
    }
    Copy-Exact $file.FullName $relative 'actual-run'
}
foreach ($file in @(Get-ChildItem -LiteralPath $PSScriptRoot -File |
    Where-Object { $_.Name -like 'F030-*' -and $_.Extension -in '.ps1','.mjs' }))
{
    Copy-Exact $file.FullName $file.Name 'session-driver'
}
foreach ($mapping in @(
    @((Join-Path $PSScriptRoot 'F028-package-gitattributes.txt'),'.gitattributes'),
    @('C:\src\aspnetcore\docs\BuildFromSource.md','BuildFromSource-captured.md'),
    @('C:\src\aspnetcore\src\Mvc\AGENTS.md','MVC-AGENTS-captured.md'),
    @('C:\src\aspnetcore\LICENSE.txt','LICENSE.txt')
))
{
    Copy-Exact $mapping[0] $mapping[1] 'publication-source'
}
$copies | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $target 'authoritative-copy-manifest.json') -Encoding utf8NoBOM
$omissions | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $target 'omitted-file-manifest.json') -Encoding utf8NoBOM
$profile = Get-Content -Raw (Join-Path $run 'original-profile.md')
$table = [regex]::Match($profile, '(?m)^\| Existing API[\s\S]+?(?=\r?\n\r?\n)').Value
if (!$table)
{
    throw 'Require the actual audited original diagnostic table.'
}
$readme = (Get-Content -Raw (Join-Path $PSScriptRoot 'F030-results-readme.md')).Replace('@ORIGINAL_PROFILE@', $table)
if ($readme.Contains('@ORIGINAL_PROFILE@'))
{
    throw 'Unfilled evidence README placeholder.'
}
$readme | Set-Content (Join-Path $target 'README.md') -Encoding utf8NoBOM -NoNewline
$commands = [Collections.Generic.List[string]]::new()
$commands.Add('# F030 exact recorded commands and actual outcomes')
$commands.Add('')
$commands.Add('Historical observations,not overwrite/replay instructions. One original-only four-case profile,zero source comparisons,both budgets permanently closed. Native pending gates are untimed. Activate the repository SDK before every dotnet command.')
$commands.Add('')
function Quote([string]$Value)
{
    return "'" + $Value.Replace("'","''") + "'"
}
foreach ($copy in $copies | Where-Object { $_.kind -ceq 'actual-run' -and $_.destination.EndsWith('.json') } | Sort-Object destination)
{
    $data = Get-Content -Raw (Join-Path $target $copy.destination) | ConvertFrom-Json
    foreach ($record in @($data))
    {
        $executable = if ($record.executable) { $record.executable } elseif ($record.command) { $record.command } else { '' }
        $arguments = if ($record.arguments) { @($record.arguments) } elseif ($record.args) { @($record.args) } else { @() }
        if (!$executable -or !$arguments.Count -or 'actualExitCode' -notin $record.PSObject.Properties.Name)
        {
            continue
        }
        $commands.Add("## $($copy.destination): actual exit$($record.actualExitCode)")
        $commands.Add('```powershell')
        if ($record.workingDirectory)
        {
            $commands.Add('Set-Location ' + (Quote $record.workingDirectory))
        }
        if ([IO.Path]::GetFileNameWithoutExtension($executable) -ceq 'dotnet')
        {
            $commands.Add('. .\activate.ps1')
        }
        $commands.Add('& ' + (Quote $executable) + ' ' + (($arguments | ForEach-Object { Quote $_ }) -join ' '))
        $commands.Add('```')
        $commands.Add('')
    }
}
$commands.Add('## Interpretation and boundaries')
$commands.Add('Fresh existing owning scope:34passed,0failed,0skipped. Every actual TRX identity/result is parsed. Four synchronous immediate exception rows;both three-row expected-argument methods use async MemberData and are not claimed as pending/synchronous-success evidence.')
$commands.Add('First standalone preparation:direct formatting passes,build exits1 with two CS0136 diagnostic-local pattern-variable collisions;exact failed formatted sources remain. Names corrected before any native run or timing. Measured preparation-002 and byte-exact relocated reproduction:direct five-file whitespace checks and Release builds pass,0warnings/0errors.')
$commands.Add('Both native characterizations pass4completed wrappers/6pending success/failure/cancellation producer contracts through actual parent RazorView/CSharp page,public helper,actual partial RazorView/page and real scoped MVC buffer. The pending synchronous outer render has not returned a task,excluding a harness-side GetResult as the observed wait. Ordered caller output,exact errors/cancellation,ViewData,view disposal and caller writer lifetime checked.')
$commands.Add('One original-only native diagnostic passes4reports/32retained results;every Workload.Result sample matches native stdout and JSON,means/variance/SD/SE recomputed. Eight before/after settings observations match. All variability/outlier results retained,no API-ranking or optimization gain. Allocation/CI values retained,not independent GC/distribution derivation.')
$commands.Add('Live audit physically rehashes685unique files/984bindings,including588consumer and348loaded assembly bindings. Portable audit rehashes copied text/receipts,not omitted DLL/PDB/native bytes. Source/PDB witnesses are associations,not complete provenance/coverage.')
$commands.Add('')
$commands.Add('## Copied read-only audit: actual exit0,passed during packaging')
$commands.Add('```powershell')
$commands.Add('node .\F030-audit.mjs . --verify')
$commands.Add('```')
$commands | Set-Content (Join-Path $target 'validation-commands.md') -Encoding utf8NoBOM
& node (Join-Path $target 'F030-audit.mjs') $target --verify `
    1> (Join-Path $PSScriptRoot 'F030-copied-audit.stdout') 2> (Join-Path $PSScriptRoot 'F030-copied-audit.stderr')
if ($LASTEXITCODE -ne 0)
{
    throw 'Copied text-only audit failed;retain package without additional timing.'
}
foreach ($copy in $copies)
{
    if ((Get-FileHash -LiteralPath (Join-Path $target $copy.destination)).Hash -cne $copy.sha256)
    {
        throw 'Copied authoritative evidence changed during packaging.'
    }
}
[ordered]@{
    candidate = 'F030'; disposition = 'rejected'; actualByteExactCopies = $copies.Count
    actualHashedOmissions = $omissions.Count; actualCopiedPortableAuditPassed = $true
    actualSourceComparisons = 0; actualOriginalDiagnosticProfiles = 1; actualRawResultSamples = 32
    actualSourceCommit = $source.sourceCommit; actualShippingChanges = 0
    actualPassingBuildWarnings = 0; actualWhitespaceVerifiedBeforeMeasuredSourceFreeze = $true
    historicalMeasuredSourcesAndImagesUnchanged = $true; rawNativeImagesPublished = $false
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $target 'raw-file-copy-verification.json') -Encoding utf8NoBOM
$count = @(Get-ChildItem -LiteralPath $target -Recurse -File -Force).Count
if ($count -ne $copies.Count + 5)
{
    throw 'Immutable capsule count differs from copies plus five generated receipts.'
}
$count | Set-Content (Join-Path $PSScriptRoot 'F030-immutable-file-count.txt') -Encoding utf8NoBOM
Write-Output "F030:$count immutable files,$($copies.Count) byte-exact copies,$($omissions.Count) hashed omissions;copied audit passed."
