$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F088'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F088'
if (Test-Path $destination) { throw 'F088 package exists;inspect rather than overwrite.' }
if (@(git -C $output status --porcelain).Count) { throw 'Dedicated evidence checkout must start clean.' }
$copies = [System.Collections.Generic.List[object]]::new()
function Copy-Exact([string]$Source, [string]$Target, [string]$Kind, [string]$Relative)
{
    $file = Join-Path $destination $Target
    New-Item -ItemType Directory -Path (Split-Path $file -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $file
    $hash = (Get-FileHash -LiteralPath $Source).Hash
    if ($hash -cne (Get-FileHash -LiteralPath $file).Hash) { throw "Raw copy differs:$Target" }
    $copies.Add([ordered]@{kind=$Kind;original=$Relative;destination=$Target;
        bytes=(Get-Item -LiteralPath $file).Length;sha256=$hash})
}
function Copy-RunFolder([string]$Relative)
{
    $folder = Join-Path $run $Relative
    if (-not (Test-Path -LiteralPath $folder)) { throw "Required evidence folder absent:$Relative" }
    foreach ($entry in Get-ChildItem -LiteralPath $folder -Force)
    {
        if ($entry.PSIsContainer)
        {
            if ($entry.Name -notin @('bin','obj','node_modules','.git'))
            {
                Copy-RunFolder "$Relative\$($entry.Name)"
            }
        }
        elseif ($entry.Extension -in @('.cs','.csproj','.json','.trx','.log','.txt',
            '.html','.png','.xml','.runsettings','.mjs','.js','.md','.csv','.zip'))
        {
            Copy-Exact $entry.FullName "$Relative\$($entry.Name)" 'run' "$Relative\$($entry.Name)"
        }
    }
}
foreach ($file in Get-ChildItem -LiteralPath $run -File)
{
    if ($file.Extension -in @('.dll','.pdb')) { throw 'Raw binaries are intentionally not published.' }
    $target = if ($file.Name -eq 'execution.json') { 'execution-original.json' } else { $file.Name }
    Copy-Exact $file.FullName $target 'run' $file.Name
}
foreach ($folder in 'harness','sample','tests-before-existing','tests-before','tests-after',
    'tests-e2e-after','tests-e2e-after-configured','tests-e2e-after-final','tests-e2e-after-debug',
    'states-before-verification','states-after-verification','states-round-1','states-rounds-2-3',
    'playwright-startup-probe')
{
    Copy-RunFolder $folder
}
$execution = @(Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
foreach ($record in $execution) { Copy-RunFolder $record.label }
foreach ($pair in @(
    @('F088-acceptance.md','acceptance.md'),@('F088-results-readme.md','README.md'),
    @('F088-measurement-audit.mjs','reproduce-analysis.mjs'),
    @('F088-xml-audit.ps1','F088-xml-audit.ps1'),
    @('F088-package.ps1','historical-packager.ps1'),
    @('autoperf-benchmarks.ps1','historical-benchmark-runner.ps1'),
    @('autoperf-check-closure.mjs','historical-closure-verifier.mjs')))
{
    Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
$tools = Join-Path $PSScriptRoot 'autoperf-runs\F071\tools'
foreach ($file in Get-ChildItem -LiteralPath $tools -File | Where-Object Extension -in '.cs','.csproj')
{
    Copy-Exact $file.FullName "tools\$($file.Name)" 'pdb-tools' $file.Name
}
if (@($copies.destination | Sort-Object -Unique).Count -ne $copies.Count)
{
    throw 'Authoritative copy destinations are duplicated.'
}
$sourceCommit = (Get-Content (Join-Path $run 'source-commit.txt') -Raw).Trim()
$baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$owner = 'src/Components/AI/src/Components/MessageListContext.cs'
$tests = 'src/Components/AI/test/Components/MessageListTests.cs'
$documents = foreach ($spec in @(
    @($baseline,$owner,'source-before.cs'),@($sourceCommit,$owner,'source-after.cs'),
    @($baseline,$tests,'source-tests-before-existing.cs'),@($sourceCommit,$tests,'source-tests-after.cs')))
{
    $snapshot = Get-Content (Join-Path $destination $spec[2]) -Raw
    $blob = @(& git -C 'C:\src\aspnetcore' show "$($spec[0]):$($spec[1])") -join "`n"
    if ($LASTEXITCODE -or $snapshot.Replace("`r`n","`n").TrimEnd("`n") -cne $blob)
    {
        throw 'Actual committed source differs from the recorded original/proposal source.'
    }
    [ordered]@{revision=$spec[0];path=$spec[1];source_snapshot=$spec[2];
        source_sha256=(Get-FileHash (Join-Path $destination $spec[2])).Hash;
        committed_blob=(git -C 'C:\src\aspnetcore' rev-parse "$($spec[0]):$($spec[1])");
        equal_after_git_line_ending_canonicalization=$true}
}
@{candidate='F088';source_commit=$sourceCommit;baseline=$baseline;documents=@($documents);
    tests_against_both_measured_owners='The identical six new executions were compiled against original and selected owners.'} |
    ConvertTo-Json -Depth 8 | Set-Content (Join-Path $destination 'committed-source-identity.json') -Encoding utf8
$publicExecution = $execution | ConvertTo-Json -Depth 8
$publicExecution.Replace($PSScriptRoot.Replace('\','\\'),'<SESSION_FILES>').Replace($PSScriptRoot,'<SESSION_FILES>') |
    Set-Content (Join-Path $destination 'execution.json') -Encoding utf8
$audit = Get-Content (Join-Path $run 'measurement-audit.json') -Raw | ConvertFrom-Json
$xml = Get-Content (Join-Path $run 'actual-xml-audit.json') -Raw | ConvertFrom-Json
if ($audit.measured_outcomes -ne 198 -or $audit.result_samples -ne 1584 -or
    $audit.actual_console_workload_rows -ne 1584 -or $audit.actual_console_result_rows -ne 1584 -or
    $audit.actual_state_files -ne 198 -or $audit.source_pdb_proofs -ne 9 -or
    $xml.actual_xml_executions -ne 82 -or $xml.passing -ne 79 -or $xml.expected_resource_failures -ne 3)
{
    throw 'Complete actual measurement/XML/source audit required.'
}
$validation = [System.Collections.Generic.List[string]]::new()
$validation.Add('# Exact F088 commands and results')
$validation.Add('')
$validation.Add('Dotnet ran from C:\src\aspnetcore after `. .\activate.ps1`. Builds/tests were serialized and requested `-m:2`; no fourth comparison.')
foreach ($spec in @(
    @('Original existing selected managed suites','tests-before-existing\command.json','23/23 passed,exit0'),
    @('Original identical six new executions','tests-before\command.json','26 passed/3 expected Assert.Same failures/0 skip,exit1;every Left/Center/Right row reached'),
    @('Selected identical managed suites','tests-after\command.json','29/29 passed,exit0,0 skip;all six new executions reached'),
    @('Actual unchanged real-browser matrix','tests-e2e-after-debug\command.json','1/1 passed,exit0;actual default-Debug app prepared'),
    @('Initial real matrix setup','tests-e2e-after\command.json','failed initialization before assertion;default Chromium headless shell absent'),
    @('Second real matrix setup','tests-e2e-after-configured\command.json','failed initialization before assertion;uppercase nested Playwright channel ignored'),
    @('Real matrix app-launch prerequisite','tests-e2e-after-final\command.json','browser initialized but Debug AIApp.exe absent;assertion not reached'),
    @('Original external harness restore','harness-restore-command.json','passed,exit0;new project manifests justify restore'),
    @('Original external harness build','harness-build-before-command.json','passed,exit0'),
    @('Corrected actual public producer build','harness-build-corrected-producer-command.json','passed,exit0;actual ordered user/assistant block preparation'),
    @('Selected external harness build','harness-build-after-command.json','passed,exit0;--no-restore,same exact tested owner'),
    @('First original oracle assumption','capture-original-oracles-attempt-1-command.json','failed setup,unmeasured;incorrect one-block premise'),
    @('Second original oracle assumption','capture-original-oracles-attempt-2-command.json','failed setup,unmeasured;actual producer result not yet selected'),
    @('Actual original repeated oracle capture','capture-original-oracles-command.json','all11 profiles captured/repeated unchanged,exit0;unmeasured'),
    @('Original actual setups','verify-original-setups-command.json','all11 original oracles pass,exit0;unmeasured'),
    @('Selected actual setups','verify-selected-setups-command.json','all11 unchanged original oracles pass,exit0;unmeasured'),
    @('Original canonical sample','sample-build-before-command.json','passed,exit0,Debug'),
    @('Selected canonical sample','sample-build-after-command.json','passed,exit0,Debug'),
    @('Missing actual E2E assets','existing-richtext-e2e-direct-build-before-restore-command.json','failed NETSDK1004;actual prerequisite,not a test failure'),
    @('Targeted E2E restore','existing-richtext-e2e-targeted-restore-command.json','passed,exit0;actual missing-assets failure justified restore'),
    @('Actual Debug E2E graph','existing-richtext-e2e-debug-build-command.json','passed,exit0;dependency-aware actual Debug app output'),
    @('Initial startup-probe compile','playwright-startup-probe-build-attempt-1-command.json','failed missing Microsoft.Bcl.AsyncInterfaces reference;not a browser/Blazor execution'),
    @('Corrected actual-driver startup probe','playwright-startup-probe-build-command.json','passed,exit0'),
    @('Actual .NET Edge adapter startup/click/cleanup','playwright-startup-probe-command.json','passed,exit0;prerequisite isolation only')))
{
    $record = Get-Content (Join-Path $run $spec[1]) -Raw | ConvertFrom-Json
    $validation.Add('')
    $validation.Add("## $($spec[0]): $($spec[2])")
    $validation.Add('')
    $validation.Add("Raw exact record: [$($spec[1].Replace('\','/'))]($($spec[1].Replace('\','/'))).")
    if ($record.environment)
    {
        $validation.Add('')
        $validation.Add('Shell-local environment:')
        $validation.Add('```json')
        $validation.Add(($record.environment | ConvertTo-Json -Depth 6))
        $validation.Add('```')
    }
    if ($record.arguments)
    {
        $validation.Add('```powershell')
        $validation.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'","''") + "'" }) -join ' '))
        $validation.Add('```')
    }
}
foreach ($record in $execution)
{
    $validation.Add('')
    $validation.Add("## $($record.label): passed33/33 measured cases,eight result iterations each,exit0")
    $validation.Add('')
    $validation.Add('```powershell')
    $validation.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'","''") + "'" }) -join ' '))
    $validation.Add('```')
}
foreach ($record in Get-Content (Join-Path $run 'format-whitespace-commands.json') -Raw | ConvertFrom-Json)
{
    if ($record.exit_code) { throw 'Cited scoped format check failed.' }
    $validation.Add('')
    $validation.Add('## Scoped selected owner/test whitespace: passed,exit0')
    $validation.Add('')
    $validation.Add('```powershell')
    $validation.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'","''") + "'" }) -join ' '))
    $validation.Add('```')
}
foreach ($record in @(
    @(Get-Content (Join-Path $run 'pdb-commands.json') -Raw | ConvertFrom-Json) +
    @(Get-Content (Join-Path $run 'pdb-snapshot-harness-commands.json') -Raw | ConvertFrom-Json)))
{
    if ($record.exit_code) { throw 'Cited actual source/PDB check failed.' }
    $validation.Add('')
    $validation.Add("## Actual $($record.name) source/PDB: passed,exit0")
    $validation.Add('')
    $validation.Add('```powershell')
    $validation.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'","''") + "'" }) -join ' '))
    $validation.Add('```')
}
$validation.Add('')
$validation.Add('## Canonical browser probes and preserved failed setup')
$validation.Add('')
$validation.Add('Final original/selected `browser-before-command.json`/`browser-after-command.json` passed: actual send/release,2-to-8 rows,CSS,plain control,owner/PID,zero page errors/failed requests. Earlier socket-only and incorrect assistant-turn selector attempts failed before all assertions and are retained. `existing-richtext-e2e-build-command.json` returned zero without preparing any actual testasset output;it is not credited as successful preparation.')
$validation.Add('')
$validation.Add('## Original-host and prepared-publication audits')
$validation.Add('')
$validation.Add('`node F088-measurement-audit.mjs <original-run-root>` passed:198 outcomes/1584 actual-result rows/samples,198 exact states,204 owner markers,9 source/PDB proofs and89/31 full original-host owner-only closure. Initial console-section EOF parsing was corrected without remeasurement. The actual XML leaf-text parser was corrected and every expected original Assert.Same failure individually rechecked.')
$validation.Add('')
$validation.Add('`node .\reproduce-analysis.mjs . --published-records --verify` passes against the copied raw records. It does not independently rehash omitted copied binaries/PDBs;their checks remain explicit original-host records. `F088-xml-audit.ps1 -RunRoot <package> -Verify` reparses82 actual XML executions without replacing their recorded JSON:79pass/3expectedresourcefailures/0skip. `git diff --check` and scoped formatter checks passed,exit0. All exact supporting command records/logs are retained.')
$validation | Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8
[ordered]@{
    candidate='F088';source_commit=$sourceCommit;baseline=$baseline;branch='autoperf/F088-table-alignment-classes';
    disposition='Qualified allocation/scaling proposal;not merge-ready,small-Center/fallback/control costs retained.';
    source_scope=@{files=2;additions=173;deletions=1;existing_owner_arguments_changed=1};
    measured_comparisons=3;measured_strategies=1;comparison_budget_closed=$true;
    paired_cases=33;measured_outcomes=198;raw_result_samples=1584;
    actual_console_workload_rows=1584;actual_console_result_rows=1584;
    actual_measured_state_files=198;setup_owner_markers=198;startup_owner_markers=6;source_pdb_checks=9;
    actual_xml_executions=82;actual_xml_passes=79;expected_resource_failures=3;skips=0;
    original_existing_rows=23;original_with_new_rows=@{pass=26;expected_fail=3};
    selected_managed_rows=29;new_managed_rows=6;selected_real_browser_matrix=1;
    original_host_execution_files=89;declared_runtime_assets=31;raw_binaries_published=$false;
    actual_producer='Provider presentation snapshot/public UIAgent/default mapping/AgentBoundary/MessageList/RenderBlock/HtmlRenderer';
    actual_default_table_passes=7;actual_custom_table_passes=0;
    input_node_and_di_service_provider_construction_measured=$false;
    retained_costs=@('Full Center+20.81/+7.78/+8.29%,median+8.29%,lowerheap',
        'Prepared missing/negative/positive medians+4.75/+3.04/+2.45%,unchangedheap',
        'Custom Left/mixed-small/sparse medians+3.16/+2.84/+2.42%;causes unestablished');
    canonical_browser_original_and_selected_verified=$true;canonical_sample_and_project_removed_or_restored=$true;
    actual_unchanged_real_browser_matrix_reached_and_passed=$true;
    public_api_default_dependency_or_shipping_visibility_changed=$false;
    shared_host=$true;heavy_work_serialized=$true;max_msbuild_workers=2;power_or_affinity_changed=$false;
    raw_source_state_report_and_log_copies_byte_identical=$true
} | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $destination 'provenance.json') -Encoding utf8
$copies | ConvertTo-Json -Depth 6 |
    Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
& node (Join-Path $destination 'reproduce-analysis.mjs') $destination --published-records --verify
if ($LASTEXITCODE) { throw 'Prepared raw-source/state/console/result audit differs from original host.' }
& (Join-Path $destination 'F088-xml-audit.ps1') -RunRoot $destination -Verify
foreach ($copy in $copies)
{
    if ((Get-FileHash (Join-Path $destination $copy.destination)).Hash -cne $copy.sha256)
    {
        throw "Prepared authoritative copy changed:$($copy.destination)"
    }
}
@{candidate='F088';verified_copies=$copies.Count;all_byte_identical=$true;raw_binaries_published=$false;
    actual_source_state_console_report_xml_arithmetic_verified=$true} |
    ConvertTo-Json | Set-Content (Join-Path $destination 'raw-file-copy-verification.json') -Encoding utf8
Write-Output "F088 prepared: $($copies.Count) exact authoritative mappings;all33 raw pairs and source/XML identities verified."
