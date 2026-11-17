$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F029'
$published = Join-Path $PSScriptRoot 'autoperf-published-results'
$target = Join-Path $published 'F029'
$source = Get-Content -Raw -LiteralPath (Join-Path $run 'source-publication\verified-source-publication.json') | ConvertFrom-Json
$decision = Get-Content -Raw -LiteralPath (Join-Path $run 'decision.json') | ConvertFrom-Json
$budget = Get-Content -Raw -LiteralPath (Join-Path $run 'measurement-budget.json') | ConvertFrom-Json
if ((Test-Path -LiteralPath $target) -or @(git -C $published status --porcelain).Count -or
    !$source.actualAllSourceRefChecksPassed -or $decision.disposition -cne 'rejected' -or
    !$budget.source_comparison_budget_closed -or !$budget.original_diagnostic_budget_closed -or
    $budget.actual_source_comparisons_started -ne 0 -or $budget.actual_diagnostic_profiles_completed -ne 1 -or
    !$decision.actualFinalRunnableWhitespaceCheckPassed -or !$decision.actualFinalRunnableFormattedBuildPassed)
{
    throw 'Require a fresh destination,clean results checkout,verified unchanged source and fully closed/reproduced rejection.'
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
foreach ($file in @(Get-ChildItem -LiteralPath $run -Recurse -File -Force))
{
    $relative = [IO.Path]::GetRelativePath($run, $file.FullName)
    $generated = $relative -match '(^|\\)(bin|obj|consumer|image|images|\.git|node_modules)(\\|$)'
    if ($generated -or $file.Extension -in '.dll','.exe','.pdb','.binlog','.nupkg','.snupkg')
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
    Where-Object { $_.Name -like 'F029-*' -and $_.Extension -in '.ps1','.mjs' }))
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
$profile = Get-Content -Raw -LiteralPath (Join-Path $run 'original-profile.md')
$table = [regex]::Match($profile, '(?m)^\| Existing API[\s\S]+?(?=\r?\n\r?\n)').Value
if (!$table)
{
    throw 'Require the actual audited four-row original diagnostic table.'
}
$readme = (Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'F029-results-readme.md')).Replace('@ORIGINAL_PROFILE@', $table)
if ($readme.Contains('@ORIGINAL_PROFILE@'))
{
    throw 'Unfilled evidence README placeholder.'
}
$readme | Set-Content (Join-Path $target 'README.md') -Encoding utf8NoBOM -NoNewline
$commands = [Collections.Generic.List[string]]::new()
$commands.Add('# F029 exact recorded commands and actual outcomes')
$commands.Add('')
$commands.Add('Historical observations,not overwrite/replay instructions. One original-only four-case profile and zero source comparisons. Both budgets permanently closed. Expected native preparation failures and formatting failures are retained as failures,not relabeled passes. Activate the repository SDK before every dotnet command.')
$commands.Add('')
function Quote([string]$Value)
{
    return "'" + $Value.Replace("'","''") + "'"
}
foreach ($copy in $copies | Where-Object { $_.kind -ceq 'actual-run' -and $_.destination.EndsWith('.json') } | Sort-Object destination)
{
    $data = Get-Content -Raw -LiteralPath (Join-Path $target $copy.destination) | ConvertFrom-Json
    $records = if ($data -is [array]) { @($data) } else { @($data) }
    foreach ($record in $records)
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
$commands.Add('Original existing owning scope:34passed,0failed,0skipped;all TRX identities and each required Partial theory row parsed. This is original preservation evidence,not an optimization red/green test.')
$commands.Add('Initial standalone build fails CS1503 with2CS8602warnings. Next154-file consumer builds but untimed native characterization fails missing Hosting.Abstractions,actual exit-532462766. Broader294-file closure has one EventLog warning;explicit package unification removes it before timing. A later untimed gate conjunction fails,actual exit-532462766;exact failed conjunct not recorded. Sampled pending-thread observation and raw precondition capture replace mutable-state resampling before timing.')
$commands.Add('Authoritative measured and byte-exact relocated builds:0warnings/0errors;each4completed and6pending actual HtmlHelper/RazorView/RazorPage producer contracts pass. Original-only diagnostic:4reports/32retained results,one profile,zero source comparisons. No optimization gain or API-ranking claim;largest CV exceeds33percent.')
$commands.Add('Initial project-based formatter exit0 has workspace warnings and is not direct five-file proof. Direct-folder invalid flag combination and actual whitespace failures remain. Only runnable copy is subsequently whitespace formatted;historical measured sources/images remain byte-exact. Final direct five-file whitespace check passes. Formatted build passes with7CA2007/CA1829analyzer warnings,0errors;formatted4/6producer characterization passes,no additional timing.')
$commands.Add('Original/byte-exact relocated live audit rehashes685unique physical files/984bindings,including588consumer and348loaded assembly bindings. Formatted consumer294files and loaded bindings separately rehashed. Portable audits rehash copied text/receipts,not omitted native bytes.')
$commands.Add('')
$commands.Add('## Copied read-only audits: actual exit0,passed during packaging')
$commands.Add('```powershell')
$commands.Add('node .\F029-audit.mjs . --verify')
$commands.Add('node .\F029-audit-publication.mjs . --verify')
$commands.Add('```')
$commands.Add('Four means/32results,sample variance/SD/SE,34fresh TRX identities,original/relocated producer gates/settings/source-PDB receipts and formatted-runnable evidence verified. Allocation/CI values retained,not independently attributed or recomputed from GC/distribution primitives.')
$commands | Set-Content (Join-Path $target 'validation-commands.md') -Encoding utf8NoBOM
& node (Join-Path $target 'F029-audit-publication.mjs') $target --verify `
    1> (Join-Path $PSScriptRoot 'F029-copied-audit.stdout') 2> (Join-Path $PSScriptRoot 'F029-copied-audit.stderr')
if ($LASTEXITCODE -ne 0)
{
    throw 'Copied standalone text-only audit failed;retain package and inspect without more timing.'
}
foreach ($copy in $copies)
{
    if ((Get-FileHash -LiteralPath (Join-Path $target $copy.destination)).Hash -cne $copy.sha256)
    {
        throw 'A copied authoritative artifact changed during packaging.'
    }
}
[ordered]@{
    candidate = 'F029'; disposition = 'rejected'; actualByteExactCopies = $copies.Count
    actualHashedOmissions = $omissions.Count; actualCopiedPortableAuditPassed = $true
    actualSourceComparisons = 0; actualOriginalDiagnosticProfiles = 1; actualRawResultSamples = 32
    actualSourceCommit = $source.sourceCommit; actualShippingChanges = 0
    actualFinalRunnableWhitespaceAndCharacterizationPassed = $true; actualFinalRunnableAnalyzerWarnings = 7
    historicalMeasuredSourcesAndImagesUnchanged = $true; rawNativeImagesPublished = $false
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $target 'raw-file-copy-verification.json') -Encoding utf8NoBOM
$count = @(Get-ChildItem -LiteralPath $target -Recurse -File -Force).Count
if ($count -ne $copies.Count + 5)
{
    throw 'Actual immutable capsule count differs from copies plus five generated receipts.'
}
$count | Set-Content (Join-Path $PSScriptRoot 'F029-immutable-file-count.txt') -Encoding utf8NoBOM
Write-Output "F029:$count immutable files,$($copies.Count) byte-exact copies,$($omissions.Count) hashed omissions;copied audit passed."
