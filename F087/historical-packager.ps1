$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F087'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F087'
if (Test-Path $destination) { throw 'Refusing to overwrite an existing F087 package.' }
if (-not (Test-Path (Join-Path $output '.git'))) { throw 'Dedicated evidence checkout required.' }
$copies = [System.Collections.Generic.List[object]]::new()
function Copy-Exact([string]$Source, [string]$Target, [string]$Kind, [string]$Relative)
{
    $file = Join-Path $destination $Target
    New-Item -ItemType Directory -Path (Split-Path $file -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $file
    $hash = (Get-FileHash $Source).Hash
    if ($hash -cne (Get-FileHash $file).Hash) { throw "Raw copy differs:$Target" }
    $copies.Add([ordered]@{kind=$Kind;original=$Relative;destination=$Target;bytes=(Get-Item $file).Length;sha256=$hash})
}
foreach ($file in Get-ChildItem $run -File)
{
    $target = if ($file.Name -eq 'execution.json') { 'execution-original.json' } else { $file.Name }
    Copy-Exact $file.FullName $target 'run' $file.Name
}
foreach ($folder in 'harness','harness-initial','hot-reload-app','hot-reload-control','pdb-initial-harness',
    'tests-before-unit','tests-before-integration','tests-before-integration-corrected','tests-before-functional-corrected',
    'tests-strong-unit','tests-no-invalidation-unit','tests-no-invalidation-unit-corrected',
    'tests-no-invalidation-unit-corrected2','tests-after-unit','tests-after-integration','tests-after-functional',
    'contracts-before-attempt1-states','contracts-before-states','contracts-before-observed-states',
    'contracts-after-states','contracts-after-2-states','formatting-before-report','formatting-after-report')
{
    $path = Join-Path $run $folder
    if (-not (Test-Path $path)) { throw "Required raw source/report folder absent:$folder" }
    foreach ($file in Get-ChildItem $path -File | Where-Object Extension -in '.cs','.csproj','.json','.trx','.log')
    {
        Copy-Exact $file.FullName "$folder\$($file.Name)" 'run' "$folder\$($file.Name)"
    }
}
Copy-Exact (Join-Path $run 'formatting-baseline\.editorconfig') 'formatting-editorconfig.txt' 'run' 'formatting-baseline\.editorconfig'
$execution = @(Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
foreach ($record in $execution)
{
    foreach ($file in Get-ChildItem (Join-Path $run "$($record.label)\results") -File)
    {
        $name = switch -Wildcard ($file.Name)
        {
            '*-full*.json' { 'results.json' }
            '*.csv' { 'results.csv' }
            '*-github.md' { 'results.md' }
            '*.html' { 'results.html' }
            default { throw "Unexpected raw measured report:$($file.Name)" }
        }
        Copy-Exact $file.FullName "$($record.label)\$name" 'run' "$($record.label)\results\$($file.Name)"
    }
    foreach ($file in Get-ChildItem (Join-Path $run $record.label) -File -Filter '*.log')
    {
        Copy-Exact $file.FullName "$($record.label)\$($file.Name)" 'run' "$($record.label)\$($file.Name)"
    }
}
foreach ($pair in @(
    @('F087-acceptance.md','acceptance.md'),@('F087-results-readme.md','README.md'),
    @('F087-reproduce-analysis.mjs','reproduce-analysis.mjs'),
    @('F087-validate.ps1','historical-validation-runner.ps1'),
    @('F087-package.ps1','historical-packager.ps1'),
    @('autoperf-benchmarks.ps1','historical-benchmark-runner.ps1'),
    @('autoperf-check-closure.mjs','historical-closure-verifier.mjs')))
{
    Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
foreach ($file in Get-ChildItem (Join-Path $PSScriptRoot 'autoperf-runs\F071\tools') -File |
    Where-Object Extension -in '.cs','.csproj')
{
    Copy-Exact $file.FullName "tools\$($file.Name)" 'pdb-tools' $file.Name
}
$sourceCommit = (Get-Content (Join-Path $run 'source-commit.txt') -Raw).Trim()
$baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$sourcePaths = @('src\Mvc\Mvc.Core\src\ModelBinding\Validation\DefaultUnionValidationStrategy.cs',
    'src\Mvc\Mvc.Core\test\ModelBinding\Validation\DefaultUnionValidationStrategyTest.cs',
    'src\Mvc\test\Mvc.IntegrationTests\UnionValidationIntegrationTest.cs')
$documents = foreach ($spec in @(
    @($baseline,$sourcePaths[0],'source-before.cs'),@($sourceCommit,$sourcePaths[0],'source-after.cs'),
    @($sourceCommit,$sourcePaths[1],'source-unit-after.cs'),
    @($baseline,$sourcePaths[2],'source-integration-before.cs'),@($sourceCommit,$sourcePaths[2],'source-integration.cs')))
{
    $gitPath = $spec[1].Replace('\','/')
    $snapshot = Get-Content (Join-Path $destination $spec[2]) -Raw
    $blob = @(git -C 'C:\src\aspnetcore' show "$($spec[0]):$gitPath") -join "`n"
    if ($LASTEXITCODE -or $snapshot.Replace("`r`n","`n").TrimEnd("`n") -cne $blob)
    {
        throw 'Actual committed source differs from tested/measured source.'
    }
    [ordered]@{revision=$spec[0];path=$spec[1];source_snapshot=$spec[2];
        source_sha256=(Get-FileHash (Join-Path $destination $spec[2])).Hash;
        committed_blob=(git -C 'C:\src\aspnetcore' rev-parse "$($spec[0]):$gitPath");
        equal_after_git_line_ending_canonicalization=$true}
}
@{candidate='F087';source_commit=$sourceCommit;documents=@($documents);
    original_unit_source='New lifetime test was run against unchanged original owner before the proposed cache;not an existing main test blob.'} |
    ConvertTo-Json -Depth 8 | Set-Content (Join-Path $destination 'committed-source-identity.json') -Encoding utf8
node -e "const fs=require('fs'),cp=require('child_process');fs.writeFileSync(process.argv[1],cp.execFileSync('git',['-C','C:\\src\\aspnetcore','diff','--binary',process.argv[2],process.argv[3],'--','src/Mvc/Mvc.Core/src/ModelBinding/Validation/DefaultUnionValidationStrategy.cs','src/Mvc/Mvc.Core/test/ModelBinding/Validation/DefaultUnionValidationStrategyTest.cs','src/Mvc/test/Mvc.IntegrationTests/UnionValidationIntegrationTest.cs']));" (Join-Path $destination 'source.patch') $baseline $sourceCommit
if ($LASTEXITCODE) { throw 'Native source patch capture failed.' }
node -e "const fs=require('fs'),cp=require('child_process');fs.writeFileSync(process.argv[1],cp.execFileSync('git',['-C','C:\\src\\aspnetcore','show','--format=fuller','c7a1c5c982ab0468714b7d9c67175c02f3c1a0cc','--','src/Mvc/Mvc.Core/src/ModelBinding/Validation/DefaultUnionValidationStrategy.cs']));" (Join-Path $destination 'union-owner-history.patch')
if ($LASTEXITCODE) { throw 'Native owner-history patch capture failed.' }
foreach ($name in 'source.patch','union-owner-history.patch')
{
    $copies.Add([ordered]@{kind='native-git-patch';original=$name;destination=$name;
        bytes=(Get-Item (Join-Path $destination $name)).Length;sha256=(Get-FileHash (Join-Path $destination $name)).Hash})
}
if (@($copies.destination | Sort-Object -Unique).Count -ne $copies.Count)
{
    throw 'Duplicated authoritative destinations.'
}
$copies | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
$publicExecution = $execution | ConvertTo-Json -Depth 8
$publicExecution.Replace($PSScriptRoot.Replace('\','\\'),'<SESSION_FILES>').Replace($PSScriptRoot,'<SESSION_FILES>') |
    Set-Content (Join-Path $destination 'execution.json') -Encoding utf8
$audit = Get-Content (Join-Path $run 'measurement-audit.json') -Raw | ConvertFrom-Json
@{candidate='F087';actual_xml_suites=$audit.test_suites;original_required_rows=119;selected_required_rows=121;
    initial_expectation_failures=1;expected_unmeasured_lifetime_failures=1;expected_unmeasured_invalidation_failures=2;
    no_skips=$true;notes='Raw XML executions,not duplicate legacy display names,are counted;initial compile/selection failures are not executed tests.'} |
    ConvertTo-Json -Depth 10 | Set-Content (Join-Path $destination 'correctness.json') -Encoding utf8
$validation = [System.Collections.Generic.List[string]]::new()
$validation.Add('# Exact F087 validation commands and results')
$validation.Add('')
$validation.Add('Dotnet ran after `. .\activate.ps1` from C:\src\aspnetcore. Heavy work serialized,explicit builds/tests use `-m:2`. Baseline/current source whitespace both exit0. No fourth comparison.')
foreach ($spec in @(
    @('Original focused unit suite','tests-before-unit\command.json','54pass/0fail/0skip,exit0;new lifetime assertion reached'),
    @('Initial Namesake expectation','tests-before-integration\command.json','38pass/1 incorrect new expectation,exit1;original shared-key suppression preserved'),
    @('Corrected original union integration','tests-before-integration-corrected\command.json','39pass/0fail/0skip,exit0;all5 new rows reached'),
    @('Original hosted HTTP union suite','tests-before-functional-corrected\command.json','26pass/0fail/0skip,exit0'),
    @('Rejected strong cache','tests-strong-unit\command.json','0pass/1 expected actual collectible-Type failure,exit1;unmeasured'),
    @('Initial empty invalidation mutation','tests-no-invalidation-unit\command.json','exit1,analyzers blocked assertions;not an executed test'),
    @('Second invalidation setup','tests-no-invalidation-unit-corrected\command.json','exit1,new nullable test context blocked assertions;not an executed test'),
    @('Actual no-invalidation mutation','tests-no-invalidation-unit-corrected2\command.json','bothfalse/true rows failed exactly atAssert.NotSame,exit1;unmeasured'),
    @('Selected focused unit suite','tests-after-unit\command.json','56pass/0fail/0skip,exit0;all3 new rows reached'),
    @('Selected actual union integration','tests-after-integration\command.json','39pass/0fail/0skip,exit0;all5 new rows reached'),
    @('Selected hosted HTTP union suite','tests-after-functional\command.json','26pass/0fail/0skip,exit0'),
    @('Initial original harness build','harness-build-before.json','exit0,4 nullable warnings;corrected before snapshots/timing'),
    @('Observed original harness build','harness-build-before-observed.json','exit0,0warnings/0errors;actual cold getter counters'),
    @('Selected harness build','harness-build-after.json','exit0,0warnings/0errors;--no-restore'),
    @('Initial depth contract','contracts-before-attempt1-command.json','17 completed profiles thenoriginal internalstate-depth32 blocksinvalidDepth64;failed,not32/32'),
    @('Observed original actual contracts','contracts-before-observed-command.json','all32 actual profiles pass,exit0;128 actual cold getter calls'),
    @('Controlled proposal contracts','contracts-after-2-command.json','all32 actual profiles pass,exit0;64 authoritative state files equal'),
    @('Original whole-file whitespace','formatting-before.json','passed,exit0'),
    @('Selected whole-file whitespace','formatting-after.json','passed,exit0'),
    @('Initial real-watch helper','hot-reload-build-command.json','exit0,2 legacy/generatorreference warnings;corrected before realwatch'),
    @('Controlled real-watch helper','hot-reload-build-corrected-command.json','exit0,0warnings/0errors,exactcontrolledowner/dependencies'),
    @('Actual real watcher','hot-reload-watch-command.json','getter-bodydelta/modelstate/cache/no-restart verified;ownerPID30140,one launch;stoppedownedattachedhelper;attribute/interface-remapping probes remainunverified')))
{
    $record = Get-Content (Join-Path $run $spec[1]) -Raw | ConvertFrom-Json
    $validation.Add('')
    $validation.Add("## $($spec[0]): $($spec[2])")
    $validation.Add('')
    if ($record.working_directory) { $validation.Add("Working directory: $($record.working_directory).") }
    $validation.Add('```powershell')
    $validation.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'","''") + "'" }) -join ' '))
    $validation.Add('```')
}
foreach ($record in $execution)
{
    $validation.Add('')
    $validation.Add("## $($record.label):passed32/32 measuredprofiles,8 resultiterations each,exit$($record.exit_code)")
    $validation.Add('')
    $validation.Add('```powershell')
    $validation.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'","''") + "'" }) -join ' '))
    $validation.Add('```')
}
foreach ($record in Get-Content (Join-Path $run 'pdb-commands.json') -Raw | ConvertFrom-Json)
{
    if ($record.exit_code) { throw 'Cited PDB check failed.' }
    $validation.Add('')
    $validation.Add("## $($record.name) source/PDB:passed,exit0")
    $validation.Add('')
    $validation.Add('```powershell')
    $validation.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'","''") + "'" }) -join ' '))
    $validation.Add('```')
}
$validation.Add('')
$validation.Add('## Prepared-package raw audit:passed,exit0')
$validation.Add('')
$validation.Add('`node .\reproduce-analysis.mjs . --verify` verifies192 outcomes/1536 result samples/282 distinct XML executions,actual cold producer batches,64 exact states,198 owner markers,13 PDB proofs and292/121 controlled closure.')
$validation.Add('')
$validation.Add('Historical `node autoperf-check-closure.mjs F087 Microsoft.AspNetCore.Mvc.Core after-2` passed,exit0. `git diff --check` andstaged source check passed,exit0. Initial rawauditor duplicate-display-name assumption was corrected without any newtiming.')
$validation | Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8
[ordered]@{
    candidate='F087';baseline=$baseline;source_commit=$sourceCommit;branch='autoperf/F087-union-validation-interface-map';
    disposition='Qualified private weak runtime-Type/interface MethodInfo warm cache;not merge-ready,cold/control/runtime boundaries retained.';
    source_scope=(Get-Content (Join-Path $run 'source-scope.json') -Raw | ConvertFrom-Json);
    selected_snapshot='after-2';selected_rounds=@(1,2,3);measured_comparisons=3;measured_strategies=1;comparison_budget_closed=$true;
    actual_result_samples=1536;actual_workload_console_rows=1536;actual_xml_outcomes=282;actual_xml_passes=278;actual_xml_failures=4;
    controlled_execution_files=292;declared_runtime_assets=121;verified_pdb_documents=13;identical_actual_state_files=64;
    public_api_or_default_change=$false;shipping_visibility_bridges=$false;dependency_manifests_changed=$false;
    actual_producer='Actual DI-created public IObjectModelValidator/default metadata/ValidationVisitor/union strategy -> ModelState/getter/filter/active-case effects';
    lifetime_boundary='Actual emitted RunAndCollect Type/GetInterfaceMap throughowningmethod;notfullMVCunloadability dueexistingPropertyHelperroots';
    actual_real_watch_delta='Getter-bodyedit changesactualpublicMVCvalidation;threeactualownercallbacks,fourobservedtables,samePID/owner,onestartup';
    real_watch_attribute_refresh_or_interface_remapping_verified=$false;raw_binaries_published=$false;
    retained_costs=@('DecoratedNamesakeInvalid round2+22.10%;controlmedian+3.02/+0.47/+1.91%,heapsunchanged',
        'FreshDerivedpairedheap+84/+351/+310B;FreshDeclared+501/-780/+295B;coldtimebenefitnotverified');
    limits=@('No universal/production/first-process/startup/whole-process/type-distribution/key-growth claim.',
        'Deep64invalidblockedbyoriginalinternalModelStatedepth32;explicitDepth64Validconfigurationonly.',
        'Initialattributeandexplicit-interfaceprobesappliedbutdidnotreachintendedmetadata/mapvalidationeffects;rawlimitsretained.',
        'No trimmed,NativeAOT,browser,normalweb-hostmetadatarefreshorotherOS/runtimeclaim.');
    shared_host=$true;heavy_work_serialized=$true;max_build_workers=2;power_or_affinity_changed=$false;
    raw_sources_reports_logs_copied_without_transformation=$true
} | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $destination 'provenance.json') -Encoding utf8
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if ($LASTEXITCODE) { throw 'Prepared package audit differs from actualsource audit.' }
Write-Output "F087 prepared:authoritative raw mappings=$($copies.Count);allsource/report/log identities retained."
