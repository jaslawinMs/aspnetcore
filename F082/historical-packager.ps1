$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F082'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F082'
if (Test-Path $destination)
{
    throw 'Refusing to overwrite an existing F082 package.'
}
$copies = [System.Collections.Generic.List[object]]::new()
function Copy-Exact([string]$Source, [string]$Target, [string]$Kind, [string]$Relative)
{
    $path = Join-Path $destination $Target
    New-Item -ItemType Directory -Path (Split-Path $path -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $path
    $a = (Get-FileHash -LiteralPath $Source).Hash
    $b = (Get-FileHash -LiteralPath $path).Hash
    if ($a -cne $b) { throw "Authoritative copy differs:$Target" }
    $copies.Add([ordered]@{kind = $Kind; original = $Relative; destination = $Target;
        bytes = (Get-Item -LiteralPath $path).Length; sha256 = $a})
}
& (Join-Path $PSScriptRoot 'autoperf-export.ps1') -OutputRoot $output -Id F082 `
    -ExpectedCaseCount 24 -TestNameFilter '*MicrosoftAccountTests*' -AfterSnapshot after
foreach ($file in Get-ChildItem $run -File)
{
    $target = if ($file.Name -eq 'execution.json') { 'execution-original.json' } else { $file.Name }
    Copy-Exact $file.FullName $target 'run' $file.Name
}
foreach ($folder in 'harness', 'tests-before', 'tests-naive-buffer', 'tests-after',
    'harness-before-build', 'harness-after-build')
{
    $extensions = if ($folder -eq 'harness') { @('.cs', '.csproj') } else { @('.json', '.trx', '.log') }
    foreach ($file in Get-ChildItem (Join-Path $run $folder) -File | Where-Object Extension -in $extensions)
    {
        Copy-Exact $file.FullName "$folder\$($file.Name)" 'run' "$folder\$($file.Name)"
    }
}
foreach ($execution in Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
{
    foreach ($file in Get-ChildItem (Join-Path $run "$($execution.label)\results") -File)
    {
        $name = switch -Wildcard ($file.Name)
        {
            '*-full*.json' { 'results.json' }
            '*.csv' { 'results.csv' }
            '*-github.md' { 'results.md' }
            '*.html' { 'results.html' }
            default { throw "Unexpected measured report:$($file.Name)" }
        }
        Copy-Exact $file.FullName "$($execution.label)\$name" 'run' "$($execution.label)\results\$($file.Name)"
    }
    foreach ($file in Get-ChildItem (Join-Path $run $execution.label) -File -Filter '*.log')
    {
        Copy-Exact $file.FullName "$($execution.label)\$($file.Name)" 'run' "$($execution.label)\$($file.Name)"
    }
}
foreach ($pair in @(
    @('F082-acceptance.md', 'acceptance.md'), @('F082-results-readme.md', 'README.md'),
    @('F082-reproduce-analysis.mjs', 'reproduce-analysis.mjs'),
    @('autoperf-benchmarks.ps1', 'historical-benchmark-runner.ps1'),
    @('autoperf-check-closure.mjs', 'historical-closure-verifier.mjs'),
    @('F082-package.ps1', 'historical-packager.ps1')))
{
    Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
foreach ($file in Get-ChildItem (Join-Path $PSScriptRoot 'autoperf-runs\F071\tools') -File |
    Where-Object Extension -in '.cs', '.csproj')
{
    Copy-Exact $file.FullName "tools\$($file.Name)" 'pdb-tools' $file.Name
}
$sourceCommit = (Get-Content (Join-Path $run 'source-commit.txt') -Raw).Trim()
$sourceIdentity = foreach ($pair in @(
    @('src\Security\Authentication\MicrosoftAccount\src\MicrosoftAccountHandler.cs', 'source-after.cs'),
    @('src\Security\Authentication\test\MicrosoftAccountTests.cs', 'source-tests.cs')))
{
    $text = Get-Content (Join-Path $destination $pair[1]) -Raw
    $gitPath = $pair[0].Replace('\', '/')
    $blob = @(git -C 'C:\src\aspnetcore' show "$sourceCommit`:$gitPath") -join "`n"
    if ($LASTEXITCODE -or $text.Replace("`r`n", "`n").TrimEnd("`n") -cne $blob)
    {
        throw 'Measured source differs from the actual committed source.'
    }
    [ordered]@{path = $pair[0]; source_snapshot = $pair[1];
        source_sha256 = (Get-FileHash (Join-Path $destination $pair[1])).Hash;
        committed_blob = (git -C 'C:\src\aspnetcore' rev-parse "$sourceCommit`:$gitPath");
        committed_source_equal_after_git_line_ending_canonicalization = $true}
}
@{candidate = 'F082'; source_commit = $sourceCommit; documents = @($sourceIdentity)} |
    ConvertTo-Json -Depth 8 | Set-Content (Join-Path $destination 'committed-source-identity.json') -Encoding utf8
node -e "const fs=require('fs'),cp=require('child_process');fs.writeFileSync(process.argv[1],cp.execFileSync('git',['-C','C:\\src\\aspnetcore','diff','--binary','37e809ead5824bc753a1c3d56f11615bdb1296c5',process.argv[2],'--','src/Security/Authentication/MicrosoftAccount/src/MicrosoftAccountHandler.cs','src/Security/Authentication/test/MicrosoftAccountTests.cs']));" (Join-Path $destination 'source.patch') $sourceCommit
if ($LASTEXITCODE) { throw 'Native source patch capture failed.' }
$copies.Add([ordered]@{kind = 'native-git-diff'; original = $sourceCommit; destination = 'source.patch';
    bytes = (Get-Item (Join-Path $destination 'source.patch')).Length;
    sha256 = (Get-FileHash (Join-Path $destination 'source.patch')).Hash})
if (@($copies.destination | Sort-Object -Unique).Count -ne $copies.Count)
{
    throw 'Authoritative copy destinations are duplicated.'
}
$copies | ConvertTo-Json -Depth 6 |
    Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
$validation = [System.Collections.Generic.List[string]]::new()
$validation.Add('# Exact F082 validation commands and results')
$validation.Add('')
$validation.Add('Commands ran from C:\src\aspnetcore after `. .\activate.ps1`. Existing Authentication.Test suffix and two MSBuild workers are preserved. Original and selected preservation pass; the unmeasured raw-memory prototype is an expected-red compatibility control.')
foreach ($spec in @(
    @('Original actual owner', 'tests-before\command.json', 'passed44/44,18 encoding rows,exit0'),
    @('Rejected raw-memory prototype', 'tests-naive-buffer\command.json', 'expected13 failures/31 passes,exit1'),
    @('Selected guarded-memory owner', 'tests-after\command.json', 'passed44/44,18 encoding rows,exit0'),
    @('Original harness build', 'harness-before-build\command.json', 'passed,exit0;new external manifest justified restore'),
    @('Selected harness build', 'harness-after-build\command.json', 'passed,exit0'),
    @('Original producer contracts', 'contracts-before-command.json', 'passed24 owner/12 cancellation profiles,exit0'),
    @('Selected producer contracts', 'contracts-after-command.json', 'passed24 owner/12 cancellation profiles,exit0'),
    @('Focused whitespace', 'formatting.json', 'passed,exit0')))
{
    $record = Get-Content (Join-Path $run $spec[1]) -Raw | ConvertFrom-Json
    $command = 'dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }) -join ' ')
    $validation.Add('')
    $validation.Add("## $($spec[0]):$($spec[2])")
    $validation.Add('')
    $validation.Add('```powershell')
    $validation.Add($command)
    $validation.Add('```')
}
foreach ($record in Get-Content (Join-Path $run 'pdb-commands.json') -Raw | ConvertFrom-Json)
{
    if ($record.exit_code) { throw 'Source/PDB validation did not pass.' }
    $validation.Add('')
    $validation.Add("## $($record.name) source/PDB:passed,exit0")
    $validation.Add('')
    $validation.Add('```powershell')
    $validation.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }) -join ' '))
    $validation.Add('```')
}
$validation | Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8
[ordered]@{
    candidate = 'F082'; baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
    branch = 'autoperf/F082-microsoft-account-utf8-user-info-json'; source_commit = $sourceCommit;
    disposition = 'Qualified UTF8 allocation/scaling draft;not merge-ready because malformed-UTF8 copy costs remain.';
    source_scope = @{files = 2; additions = 133; deletions = 1};
    public_api_or_default_change = $false; measured_comparisons = 3; measured_source_strategies = 1;
    comparison_budget_closed = $true; rejected_unmeasured_raw_memory_prototypes = 1;
    actual_producer = 'Real HttpClient.SendAsync/HttpContent buffering -> initialized MicrosoftAccountHandler -> actual Bearer request,claim actions,async CreatingTicket,ticket/document lifetime';
    http_completion_mode_unchanged = $true; shipping_request_response_disposal_unchanged = $true;
    external_request_response_cleanup_uniform_in_both_timings = $true;
    test_only_protected_method_exposure = $true; shipping_visibility_changes = $false;
    retained_costs = @('MalformedUTF8large median+20.36%,16616B/op extra','MalformedUTF8small median+3.21%,232B/op extra',
        'EmptyJSONmedian+6.03%,72-624B/op extra','UTF16large/small median+3.18/+3.47%;all other fallback/error movements retained');
    limits = @('No external-provider/browser,network-streaming,production-throughput or universal-benefit claim.',
        'Owned UTF8 array is still materialized and retained through async event/document lifetime.',
        'Unicode16KiB timing improves54.56%,but allocation savesonly129B/op;not ASCII-sized savings.',
        'Custom encoding providers,other platforms/runtimes are unverified.');
    shared_windows_host = $true; cpu_heavy_commands_serialized = $true;
    power_or_affinity_changed = $false; raw_binaries_published = $false;
    raw_source_reports_logs_copied_without_transformation = $true
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $destination 'provenance.json') -Encoding utf8
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --write
if ($LASTEXITCODE) { throw 'Raw-derived F082 audit generation failed.' }
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if ($LASTEXITCODE) { throw 'Raw-derived F082 audit reproduction failed.' }
Write-Output "Packaged $(@(Get-ChildItem $destination -Recurse -File).Count) F082 immutable files before package log/copy verification."
