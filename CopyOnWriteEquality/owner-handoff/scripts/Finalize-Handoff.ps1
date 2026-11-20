$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$reportPath = Join-Path $root 'handoff.json'
$frozenRoot = Join-Path $root 'frozen'
if ((Test-Path $reportPath) -or (Test-Path $frozenRoot))
{
    throw 'Refusing to overwrite an existing frozen handoff.'
}

$expectedTests = @(
    'Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvokerProviderTest.OnExecuting_ConfiguresModelState_WithMvcOptions',
    'Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvokerTest.AddingValueProviderFactory_AtResourceFilter_IsAvailableInControllerContext',
    'Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvokerTest.DeletingValueProviderFactory_AtResourceFilter_IsNotAvailableInControllerContext'
)
$pins = @{
    original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
    default = 'ae89581dfd24c6277b4267a9779d05f7b9f047f1'
}

function Read-TestResults([string]$RelativePath, [string]$RelativeLog)
{
    [xml]$trx = Get-Content (Join-Path $root $RelativePath) -Raw
    $cases = @($trx.TestRun.Results.UnitTestResult | ForEach-Object {
        [pscustomobject]@{ test = $_.testName; outcome = $_.outcome }
    })
    if ($cases.Count -ne 3 -or @($cases | Where-Object { $_.outcome -ne 'Passed' }).Count -ne 0)
    {
        throw "Expected three explicit passing test results: $RelativePath"
    }

    foreach ($test in $expectedTests)
    {
        if (@($cases | Where-Object { $_.test -eq $test }).Count -ne 1)
        {
            throw "Test did not execute exactly once: $test"
        }
    }

    $log = Get-Content (Join-Path $root $RelativeLog) -Raw
    if ($log -notmatch '\(64-bit \.NET (?<runtime>[^)]+)\)')
    {
        throw "Actual test runtime not found in $RelativeLog"
    }

    return [pscustomobject]@{ cases = $cases; actual_runtime = $Matches.runtime; trx = $RelativePath }
}

$originalTests = Read-TestResults 'outputs\original\test-results\targeted.trx' 'logs\original\003-existing-mvc-tests.stdout.txt'
$defaultTests = Read-TestResults 'outputs\default\test-results\resume03-explicit-runtime.trx' 'logs\default\resume03-existing-tests-explicit-runtime.stdout.txt'
if ($originalTests.actual_runtime -ne '12.0.0-alpha.1.26562.105' -or $defaultTests.actual_runtime -ne '12.0.0-alpha.1.26557.102')
{
    throw 'Unexpected actual existing-test runtime.'
}

$sourceStatus = @()
$producerEvidence = @()
$extraSourceFiles = @(
    'src\Mvc\Mvc.Abstractions\src\ModelBinding\IValueProviderFactory.cs',
    'src\Mvc\Mvc.Core\src\ModelBinding\CompositeValueProvider.cs',
    'src\Mvc\Mvc.Core\src\Infrastructure\MvcCoreMvcOptionsSetup.cs',
    'src\Mvc\Mvc.Core\test\Infrastructure\ControllerActionInvokerTest.cs'
)
$selectedSources = @(Get-Content (Join-Path $root 'manifest\selected-sources.json') -Raw | ConvertFrom-Json)
foreach ($version in @('original', 'default'))
{
    $sourceRoot = "C:\src\autoperf-finding-F151-$version"
    $head = & git --no-pager -c core.longpaths=true -C $sourceRoot rev-parse HEAD
    if ($LASTEXITCODE -ne 0 -or $head -ne $pins[$version])
    {
        throw "Unexpected source pin: $version"
    }

    $status = @(& git --no-pager -c core.longpaths=true -C $sourceRoot status --porcelain=v1)
    if ($LASTEXITCODE -ne 0 -or $status.Count -ne 0)
    {
        throw "Source worktree is not clean: $version"
    }

    & git --no-pager -c core.longpaths=true -C $sourceRoot symbolic-ref -q HEAD | Out-Null
    if ($LASTEXITCODE -ne 1)
    {
        throw "Source worktree is not detached: $version"
    }

    $sourceStatus += [pscustomobject]@{ version = $version; path = $sourceRoot; head = $head; detached = $true; porcelain = $status }
    foreach ($relative in $extraSourceFiles)
    {
        $source = Join-Path $sourceRoot $relative
        $snapshot = Join-Path $root "source\$version\$relative"
        New-Item -ItemType Directory -Force -Path (Split-Path $snapshot -Parent) | Out-Null
        Copy-Item -LiteralPath $source -Destination $snapshot
        $blob = & git --no-pager -c core.longpaths=true -C $sourceRoot rev-parse "HEAD:$($relative.Replace('\', '/'))"
        if ($LASTEXITCODE -ne 0)
        {
            throw "Unable to identify source blob: $relative"
        }

        $selectedSources += [pscustomobject]@{ version = $version; physical_source = $source; snapshot = $snapshot; sha256 = (Get-FileHash $source -Algorithm SHA256).Hash; git_blob = $blob }
    }

    $resultRelative = "outputs\$version\resume02-producer-characterization.json"
    $result = Get-Content (Join-Path $root $resultRelative) -Raw | ConvertFrom-Json
    if (-not $result.passed -or @($result.assertions | Where-Object { -not $_.passed }).Count -ne 0 -or $result.requests.Count -ne 4)
    {
        throw "Producer characterization did not pass all exercised conditions: $version"
    }

    if ((Get-FileHash $result.association.expected_owner -Algorithm SHA256).Hash -ne $result.association.owner_sha256 -or
        (Get-FileHash $result.association.pdb_path -Algorithm SHA256).Hash -ne $result.association.pdb_sha256)
    {
        throw "Selected owner PE/PDB changed after characterization: $version"
    }

    $ownerDirectory = Join-Path $frozenRoot "$version\owner"
    $probeDirectory = Join-Path $frozenRoot "$version\probe"
    New-Item -ItemType Directory -Force -Path $ownerDirectory, $probeDirectory | Out-Null
    Copy-Item -LiteralPath $result.association.expected_owner, $result.association.pdb_path -Destination $ownerDirectory
    Get-ChildItem (Join-Path $root "projects\$version\bin\Debug\net12.0") -File -Filter 'F151F152.ProducerProbe.*' |
        Copy-Item -Destination $probeDirectory
    $loader = Get-Content (Join-Path $root "$resultRelative.loader.json") -Raw | ConvertFrom-Json
    foreach ($dependency in @($loader | Where-Object { $_.kind -eq 'private-probe-dependency' }))
    {
        Copy-Item -LiteralPath $dependency.loaded_path -Destination $probeDirectory
    }

    $producerEvidence += [pscustomobject]@{
        version = $version
        real_MVC_assertions_passed = 136
        helper_only_assertions_passed = 36
        ownership_runtime_assertions_passed = 11
        requests = 4
        actual_runtime = $result.runtime.actual
        owner_sha256 = $result.association.owner_sha256
        pdb_sha256 = $result.association.pdb_sha256
        codeview_and_pdb_guid = $result.association.pdb_guid
        exact_assertions_and_associations = $resultRelative
        exact_loaded_dependency_paths_and_hashes = "$resultRelative.loader.json"
    }
}

$selectedSources | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $root 'manifest\selected-sources-final.json')
$sourceStatus | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $root 'manifest\final-source-status.json')
$testResults = [ordered]@{
    exact_test_names = $expectedTests
    original_canonical = $originalTests
    original_requested_runtime = '12.0.0-alpha.1.26562.105'
    default_canonical = @{
        status = 'host_startup_blocked_no_test_assertions_reached'
        requested_runtime = '12.0.0-alpha.1.26568.110'
        missing_prerequisite = 'Microsoft.NETCore.App x64 12.0.0-alpha.1.26568.110 is not installed.'
        blocked_tests = $expectedTests
        command = 'logs\default\resume02-existing-mvc-tests.command.json'
        stderr = 'logs\default\resume02-existing-mvc-tests.stderr.txt'
        unchanged_canonical_runtimeconfig = 'outputs\default\failed-canonical-existing-tests\Microsoft.AspNetCore.Mvc.Core.Test.runtimeconfig.json'
    }
    default_explicit_installed_runtime_fallback = $defaultTests
    default_fallback_requested_runtime = '12.0.0-alpha.1.26557.102'
    default_fallback_roll_forward = 'Disable'
    no_fallback_is_reported_as_a_canonical_pass = $true
}
$testResults | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $root 'manifest\existing-test-results.json')

gh api repos/dotnet/aspnetcore/commits/main --jq '{sha,committer:.commit.committer.date}' 1>(Join-Path $root 'logs\live-default-final.json') 2>(Join-Path $root 'logs\live-default-final.stderr.txt')
$liveDefaultExit = $LASTEXITCODE
$liveDefault = if ($liveDefaultExit -eq 0) { Get-Content (Join-Path $root 'logs\live-default-final.json') -Raw | ConvertFrom-Json } else { $null }

$lifecycle = @(Get-ChildItem (Join-Path $root 'logs') -Recurse -Filter '*.lifecycle.json' | ForEach-Object {
    $record = Get-Content $_.FullName -Raw | ConvertFrom-Json
    if ($record.state -ne 'exited')
    {
        throw "A recorded native process is not terminal: $($_.FullName)"
    }

    [pscustomobject]@{ manifest = $_.FullName; process_id = $record.process_id; state = $record.state; exit_code = $record.exit_code }
})
$processes = @(Get-CimInstance Win32_Process)
$matching = @($processes | Where-Object {
    $_.ProcessId -ne $PID -and $_.CommandLine -and
    ($_.CommandLine.Contains('autoperf-finding-F151-original') -or $_.CommandLine.Contains('autoperf-finding-F151-default') -or $_.CommandLine.Contains('finding-F151-F152-005'))
} | Select-Object ProcessId, ParentProcessId, Name, CommandLine)
$recordedPids = @($lifecycle.process_id)
$descendantPids = @($recordedPids)
do
{
    $new = @($processes | Where-Object { $_.ProcessId -ne $PID -and $_.ParentProcessId -in $descendantPids -and $_.ProcessId -notin $descendantPids } | Select-Object -ExpandProperty ProcessId)
    $descendantPids += $new
} while ($new.Count -ne 0)
$liveDescendants = @($processes | Where-Object { $_.ProcessId -in $descendantPids } | Select-Object ProcessId, ParentProcessId, Name)
if ($matching.Count -ne 0 -or $liveDescendants.Count -ne 0)
{
    throw 'A related live process requires investigation; no frozen completion claim is permitted.'
}

$processEvidence = [ordered]@{
    utc = [DateTime]::UtcNow.ToString('O')
    computer_name = $env:COMPUTERNAME
    recorded_native_dotnet_roots = $lifecycle
    related_live_processes = $matching
    live_recorded_pids_or_descendants = $liveDescendants
    processes_terminated_by_this_study = @()
    limit = 'Ephemeral testhost child PIDs were not sampled during execution. Terminal roots and the final absence of surviving related processes/descendants were checked.'
}
$processEvidence | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $root 'manifest\final-process-lifecycle.json')

$syntaxErrors = @()
foreach ($script in Get-ChildItem $PSScriptRoot -Filter '*.ps1')
{
    $tokens = $null
    $errors = $null
    [System.Management.Automation.Language.Parser]::ParseFile($script.FullName, [ref]$tokens, [ref]$errors) | Out-Null
    $syntaxErrors += @($errors)
}
if ($syntaxErrors.Count -ne 0)
{
    throw "Private handoff script syntax errors: $syntaxErrors"
}

$report = [ordered]@{
    schema_version = 1
    purpose = 'Bounded untimed F151/F152 investigation and non-authoritative disposition recommendation; not a campaign verdict or ledger update.'
    status = 'complete_with_explicit_canonical_default_runtime_limit'
    root = $root
    physical_host = $env:COMPUTERNAME
    source_pins = $pins
    live_default_final_read_exit = $liveDefaultExit
    live_default_final = $liveDefault
    acceptance = 'acceptance.json'
    source_and_history_contract = 'manifest\source-contract.json'
    recommendations = @(
        @{
            finding = 'F151'
            method = 'CopyOnWriteList<T>.Contains'
            recommendation = 'Do not admit a boxing optimization to timing on present evidence; retain only a conditional helper-level informational observation.'
            reason = 'The exercised MVC producer closes T over IValueProviderFactory, not a value type. No material shipping value-type T producer was established. Replacing object.Equals with EqualityComparer<T>.Default also changes helper equality for divergent IEquatable<T> types in both storage states.'
        },
        @{
            finding = 'F152'
            method = 'CopyOnWriteList<T>.IndexOf'
            recommendation = 'Do not admit a boxing optimization to timing on present evidence; retain only a conditional helper-level informational observation.'
            reason = 'The same unestablished value-type T precondition applies, but this is a distinct first-index/-1 contract, independently exercised before and after copying. It is not a duplicate method or a replay of F123.'
        }
    )
    faithful_producer_boundary = @{
        mechanism = 'Real MVC service registration, options, application-part/controller discovery, endpoint routing and resource-filter invocation; no injected CopyOnWriteList for producer cases.'
        modes = @('default ControllerRequestDelegateFactory', 'EnableActionInvokers=true -> ActionEndpointFactory -> ControllerActionInvokerProvider')
        per_mode = 'Two requests; membership and first-index semantics before and after real Add-triggered copy; removal, options isolation, fresh-request isolation, and retained boxed interface-factory identity.'
        material_observable = 'The resource filter observes membership/index results and request-local collection changes without modifying configured MVC options or the next request.'
        generic_argument_observed = 'IValueProviderFactory (IsValueType=false), including when a real options entry is an application-defined struct already stored through the interface.'
        source_owner_loading = 'Private AssemblyLoadContext prevents framework pruning/default-context unification from replacing the selected source-built owner. Owner hash, PE/PDB GUID, and four physical-source/PDB checksums passed on each pin.'
    }
    producer_results = $producerEvidence
    helper_only_boundary = 'Manually closed CopyOnWriteList<FactoryValue> and CopyOnWriteList<FactoryReference>; intentionally divergent typed/object equality. These demonstrate helper semantic incompatibility, not shipping value-type-generic reachability.'
    helper_observations = @(
        'In both read-only and copied states, Contains/IndexOf reject typed-equal-only probes and accept object-equal-only probes.',
        'EqualityComparer<T>.Default gives the opposite results for the same deliberately divergent concrete IEquatable<T> probes.',
        'Existing Remove delegates to List<T>.Remove and uses typed equality; that existing difference was observed, not changed or generalized into a cleanup proposal.'
    )
    existing_tests = 'manifest\existing-test-results.json'
    existing_test_summary = 'Original canonical: 3/3 passed on requested/actual 12.0.0-alpha.1.26562.105. Default canonical: no tests reached due to missing 12.0.0-alpha.1.26568.110. Explicit fallback: the same 3/3 passed on requested/actual 12.0.0-alpha.1.26557.102, RollForward=Disable.'
    failed_preparations_preserved = @(
        @{ label = 'default/003-producer-probe-run'; producer_executed = $false; cause = 'Framework-pruned project reference loaded installed owner; SHA256 guard failed.'; evidence = 'outputs\default\failed-preparation-003' },
        @{ label = 'default/resume01-producer-run'; producer_executed = $false; cause = 'Default-context LoadFromAssemblyPath still unified to installed owner; explicit source hash guard failed.'; evidence = 'outputs\default\failed-preparation-resume01' },
        @{ label = 'default/resume02-existing-mvc-tests'; tests_reached = 0; cause = 'Missing requested canonical runtime.'; evidence = 'outputs\default\failed-canonical-existing-tests' }
    )
    other_failed_lookups = @(
        'Initial gh searches embedded quoted repo qualifiers incorrectly; failure stderr retained and corrected --repo searches retained.',
        'LSP returned only five in-file references per pin; read_agent(lsp-csharp) could not find a log agent. Inventory is not complete.',
        'ResourceExecutingContext was first looked up under Mvc.Core; the actual Mvc.Abstractions path was resolved/read.',
        'Documentation pagination at offset 15000 returned no more content; the authoritative Remarks were subsequently read at offset 12000.'
    )
    performance_preparation = @{
        admitted_candidate = $false
        artifact_patch_created = $false
        benchmark_project_created = $false
        primary = $null
        gain_gate = $null
        reason = 'No justified optimization remains under the observed producer/equality contracts. An artificial value-type helper benchmark would substitute an unproven workload.'
        no_measurements_or_allocation_counters_used = $true
        existing_F120_F123_work = 'Source diffs inspected only: concrete copied-list enumeration retaining object.Equals, distinct from these boxing findings. Closed work was not reopened or replayed.'
    }
    limitations = @(
        'No complete reference inventory: aliases, generated/unindexed code, reflection, friend-assembly consumers, and external extensions remain outside the bounded search.',
        'No material value-type T shipping producer was established; this is not proof that every conceivable such producer is absent.',
        'Controller MVC paths were exercised; Razor Pages producers were inspected in source only.',
        'Source-owned collection/producer code ran on exact installed 12.0.0-alpha.1.26557.102. Canonical default test-runtime 12.0.0-alpha.1.26568.110 remains unvalidated.',
        'Supporting assemblies came from each retained source graph where available, otherwise the exact installed ASP.NET Core transport. Full per-run paths/hashes are retained; this was not a byte-identical entire-framework comparison.',
        'Resource filters intentionally short-circuit with EmptyResult; factory execution/model-binding output, network hosting and arbitrary custom-source-list behavior were not asserted.'
    )
    reproduction = @{
        working_directory = $root
        command = '& .\scripts\Resume-Characterization.ps1 -RunId repro001 -UseInstalledRuntimeForDefaultExistingTests'
        prerequisites = 'Retained detached worktrees, exact SDK junctions, generated build files/restored assets, and the recorded installed runtimes. Use a fresh RunId; existing invocation logs are never overwritten.'
        canonical_default_command = 'logs\default\resume02-existing-mvc-tests.command.json'
        explicit_fallback_command = 'logs\default\resume03-existing-tests-explicit-runtime.command.json'
        exact_invocations_and_streams = 'logs\<original|default>\*.command.json, *.stdout.txt, *.stderr.txt, *.lifecycle.json'
        future_hold_guard = 'Invoke-RecordedDotNet.ps1 refuses new dotnet processes while this private manifest\hold.json has hold_active=true.'
    }
    safety_and_completion = @{
        source_status = 'manifest\final-source-status.json'
        all_source_worktrees_clean_and_detached = $true
        source_and_PDB_manifest = 'manifest\selected-sources-final.json'
        process_lifecycle = 'manifest\final-process-lifecycle.json'
        recorded_native_dotnet_roots_terminal = $lifecycle.Count
        related_live_processes = 0
        shipping_changes = $false
        machine_wide_installation = $false
        shared_campaign_policy_budget_verdict_ledger_writes = $false
        github_writes_or_publication = $false
        remote_helpers_used = $false
    }
}
$report | ConvertTo-Json -Depth 20 | Set-Content $reportPath

$frozenFiles = @()
$files = @(
    Get-ChildItem $frozenRoot -Recurse -File
    Get-ChildItem (Join-Path $root 'source') -Recurse -File
    Get-ChildItem (Join-Path $root 'scripts') -File
    Get-ChildItem (Join-Path $root 'projects') -Recurse -Filter '*.csproj' -File
    Get-ChildItem (Join-Path $root 'manifest') -File
    Get-ChildItem (Join-Path $root 'logs') -Recurse -File
    Get-Item $reportPath, (Join-Path $root 'acceptance.json')
    foreach ($version in @('original', 'default'))
    {
        Get-Item (Join-Path $root "outputs\$version\resume02-producer-characterization.json"), (Join-Path $root "outputs\$version\resume02-producer-characterization.json.loader.json")
    }
    Get-ChildItem (Join-Path $root 'outputs\original\test-results') -File
    Get-ChildItem (Join-Path $root 'outputs\default\test-results') -File
    Get-ChildItem (Join-Path $root 'outputs\default\failed-preparation-003') -Recurse -File
    Get-ChildItem (Join-Path $root 'outputs\default\failed-preparation-resume01') -Recurse -File
    Get-ChildItem (Join-Path $root 'outputs\default\failed-canonical-existing-tests') -Recurse -File
)
foreach ($file in $files | Sort-Object FullName -Unique)
{
    $frozenFiles += [pscustomobject]@{ path = $file.FullName.Substring($root.Length + 1); sha256 = (Get-FileHash $file.FullName -Algorithm SHA256).Hash }
}
$frozenFiles | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $root 'frozen-files.json')
(Get-FileHash (Join-Path $root 'frozen-files.json') -Algorithm SHA256).Hash | Set-Content (Join-Path $root 'frozen-files.sha256')
Write-Output "Frozen handoff: $reportPath"
Write-Output "Producer results: both passed; existing tests: original canonical 3/3, default explicit fallback 3/3; canonical default blocked."
Write-Output "Owned native roots terminal: $($lifecycle.Count); related live processes: 0; frozen file records: $($frozenFiles.Count)."
