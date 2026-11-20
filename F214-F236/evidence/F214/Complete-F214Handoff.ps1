$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Write-Json([string] $Path, $Value)
{
    $Value | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $Path -Encoding utf8
}

$receipts = @(Get-ChildItem -LiteralPath 'native' -Filter '*.json' -File | Sort-Object Name | ForEach-Object {
    [pscustomobject]@{
        path = 'native\' + $_.Name
        sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
        value = (Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json)
    }
})
$started = @($receipts | Where-Object { $_.value.nativeStarted })
foreach ($receipt in $started)
{
    if (-not $receipt.value.rootTerminal -or -not $receipt.value.stdoutTerminal -or -not $receipt.value.stderrTerminal -or
        @($receipt.value.liveObservedChildren).Count -ne 0 -or -not $receipt.value.admission.allowed)
    {
        throw "An owned native receipt is not cleanly terminal/admitted: $($receipt.path)"
    }
}

$allProcesses = @(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, CreationDate)
$identities = [Collections.Generic.List[object]]::new()
foreach ($receipt in $started)
{
    $root = Get-Process -Id $receipt.value.pid -ErrorAction SilentlyContinue
    $rootMatches = $root -and $root.StartTime.ToUniversalTime().Ticks -eq ([DateTime]$receipt.value.startedAtUtc).ToUniversalTime().Ticks
    $identities.Add([ordered]@{
        receipt = $receipt.path
        kind = 'recorded native root'
        pid = $receipt.value.pid
        recordedCreationUtc = $receipt.value.startedAtUtc
        recordedIdentityStillLive = [bool]$rootMatches
    })
    foreach ($child in @($receipt.value.observedChildren))
    {
        $live = $allProcesses | Where-Object ProcessId -eq $child.ProcessId
        $childMatches = $live -and $live.CreationDate.ToUniversalTime() -eq ([DateTime]$child.CreationDate).ToUniversalTime()
        $identities.Add([ordered]@{
            receipt = $receipt.path
            kind = 'actually observed descendant'
            pid = $child.ProcessId
            recordedCreationUtc = ([DateTime]$child.CreationDate).ToUniversalTime().ToString('O')
            recordedIdentityStillLive = [bool]$childMatches
        })
    }
}
if (@($identities | Where-Object { $_.recordedIdentityStillLive }).Count -ne 0)
{
    throw 'At least one actual owned root/observed descendant is still live.'
}
Write-Json 'owned-native-terminal.json' ([ordered]@{
    observedAtUtc = [DateTime]::UtcNow.ToString('O')
    nativeRootsStarted = $started.Count
    rootsAndObservedDescendants = $identities
    allRecordedRootsAndBothStreamsTerminal = $true
    liveRecordedIdentities = 0
    boundary = 'Only this owner actual native roots and observed descendants. No assertion about unrelated users, unobserved processes, or global dedicated-host inactivity.'
})

$before = Get-Content -LiteralPath 'reserved-before.hashes.json' -Raw | ConvertFrom-Json
$reservedHashes = @($before | ForEach-Object {
    $afterHash = (Get-FileHash -LiteralPath $_.path -Algorithm SHA256).Hash
    [ordered]@{ path = $_.path; beforeSha256 = $_.sha256; afterSha256 = $afterHash; identical = $_.sha256 -eq $afterHash }
})
$statusUnchanged = [IO.File]::ReadAllText((Join-Path $PWD 'native\001-reserved-status-before.stdout.txt')) -eq
    [IO.File]::ReadAllText((Join-Path $PWD 'native\036-reserved-final-status.stdout.txt'))
$reservedHead = (Get-Content -LiteralPath 'native\037-reserved-final-head.stdout.txt' -Raw).Trim()
if (-not $statusUnchanged -or @($reservedHashes | Where-Object { -not $_.identical }).Count -ne 0 -or
    $reservedHead -ne '24875ef5dabb55567870b39f6eb0002170435e2f')
{
    throw 'Reserved checkout identity/status preservation failed.'
}
Write-Json 'reserved-after-verification.json' ([ordered]@{
    head = $reservedHead
    branch = (Get-Content -LiteralPath 'C:\src\aspnetcore\.git\HEAD' -Raw).Trim()
    beforeAfterStatusIdentical = $statusUnchanged
    beforeAfterMetadataHashes = $reservedHashes
    untrackedFiles = @(Get-Content -LiteralPath 'native\036-reserved-final-status.stdout.txt')
    scope = 'No writes targeted reserved tracked files, four reports, branch, index, or worktree registry. The four report contents were not independently before/after hashed.'
})

$graphs = @(
    @{ role = 'original'; path = 'C:\src\ap-F214-o195'; pin = '37e809ead5824bc753a1c3d56f11615bdb1296c5'; status = 'native\034-original-final-status.stdout.txt'; diff = 'native\038-original-final-diff.stdout.txt' }
    @{ role = 'default'; path = 'C:\src\ap-F214-d195'; pin = 'd3483989953ae3cccd773aea5ea04cb0c7198531'; status = 'native\035-default-final-status.stdout.txt'; diff = 'native\039-default-final-diff.stdout.txt' }
)
[xml]$project = Get-Content -LiteralPath 'qualification\F214.Qualification.Tests.csproj' -Raw
$sourcePaths = @($project.SelectNodes('/Project/ItemGroup/Compile') |
    ForEach-Object { $_.GetAttribute('Include') } |
    Where-Object { $_.StartsWith('$(SourceGraph)\') } |
    ForEach-Object { $_.Replace('$(SourceGraph)\', '') })
$sourcePaths += @('src\Http\Http\src\Microsoft.AspNetCore.Http.csproj', 'src\Http\WebUtilities\src\Microsoft.AspNetCore.WebUtilities.csproj')
$sourceFiles = @($sourcePaths | ForEach-Object {
    $relative = $_
    $originalHash = (Get-FileHash -LiteralPath (Join-Path $graphs[0].path $relative) -Algorithm SHA256).Hash
    $defaultHash = (Get-FileHash -LiteralPath (Join-Path $graphs[1].path $relative) -Algorithm SHA256).Hash
    [ordered]@{ path = $relative; originalSha256 = $originalHash; defaultSha256 = $defaultHash; identical = $originalHash -eq $defaultHash }
})
Write-Json 'source-index.json' ([ordered]@{
    originalPin = $graphs[0].pin
    upstreamRepository = 'dotnet/aspnetcore'
    upstreamDefaultBranch = 'main'
    upstreamDefaultPin = $graphs[1].pin
    observedDefaultCommitPath = 'upstream\default-commit.json'
    observedDefaultSnapshotWrittenUtc = (Get-Item -LiteralPath 'upstream\default-commit.json').LastWriteTimeUtc.ToString('O')
    files = $sourceFiles
})
$shippingDiff = ''
foreach ($graph in $graphs)
{
    $status = Get-Content -LiteralPath $graph.status -Raw
    if (-not $status.Contains('# branch.oid ' + $graph.pin) -or $status -match '(?m)^[12u?] ')
    {
        throw "Private source graph has unexpected identity or changes: $($graph.role)"
    }
    $diff = Get-Content -LiteralPath $graph.diff -Raw
    if ($diff)
    {
        throw "A product change was made without a justified candidate: $($graph.role)"
    }
    $shippingDiff += $diff
}
[IO.File]::WriteAllText((Join-Path $PWD 'shipping-changes.diff'), $shippingDiff, [Text.UTF8Encoding]::new($false))

$testResults = @($graphs | ForEach-Object {
    $result = Get-Content -LiteralPath ($_.role + '-unit-row-results.json') -Raw | ConvertFrom-Json
    if ($result.total -ne 18 -or $result.failed -ne 0 -or $result.skipped -ne 0 -or @($result.rows | Where-Object result -ne 'Pass').Count -ne 0)
    {
        throw 'A selected unit row did not pass or was not executed.'
    }
    [ordered]@{ role = $_.role; total = $result.total; passed = $result.passed; failed = 0; skipped = 0; rows = ($_.role + '-unit-row-results.json'); rawXunitXml = ($_.role + '-unit-results.xml'); environment = $result.framework }
})

$jit = @($graphs | ForEach-Object {
    $role = $_.role
    $path = "$role-jit-disassembly.txt"
    $text = Get-Content -LiteralPath $path -Raw
    $sections = @([regex]::Matches($text, '(?ms)^; Assembly listing for method Microsoft\.AspNetCore\.Internal\.AdaptiveCapacityDictionary.*?(?=^; Assembly listing|\z)') |
        ForEach-Object {
            $body = $_.Value
            $signature = ($body -split "`n")[0].Trim()
            [ordered]@{
                signature = $signature
                normalTier0 = $signature.Contains('(Tier0)') -and $body.Contains('compiling with minopt')
                boxHelperPresent = $body.Contains('CORINFO_HELP_BOX')
                nullThrowPresent = $body.Contains(':ThrowArgumentNullExceptionForKey()')
                nativeNullableHasValueTest = $body.Contains('movzx    eax, byte  ptr [rbp+0x18]') -and $body.Contains('test     eax, eax')
            }
        })
    if ($sections.Count -ne 6 -or @($sections | Where-Object { -not $_.normalTier0 -or $_.boxHelperPresent }).Count -ne 0 -or
        @($sections | Where-Object { $_.signature.Contains('`2[int,') -and $_.nullThrowPresent }).Count -ne 0 -or
        @($sections | Where-Object { $_.nativeNullableHasValueTest }).Count -ne 2)
    {
        throw "Unexpected JIT diagnostic evidence for $role"
    }
    [ordered]@{
        role = $role
        log = $path
        sections = $sections
        nativeGuardInterpretation = 'Reference-key bodies compare the reference directly. Int bodies omit the null-key test/throw. Nullable-int bodies test the HasValue byte directly. These are observed instruction sequences, not an inference from IL box lowering.'
    }
})
Write-Json 'jit-determination.json' ([ordered]@{
    runtime = '.NET 12.0.0-alpha.1.26557.102+76e3c03e6b29f1bbe1aca97d655c560db2320436, Windows x64'
    runtimeIdentity = 'runtime-identity.json'
    frameworkObservedInNativeStdout = @('native\030-original-jit-run.stdout.txt', 'native\033-default-jit-run.stdout.txt')
    diagnostics = $jit
    observationFlagsOnly = 'DOTNET_JitDisasm=ContainsKey TryAdd; DOTNET_JitDisasmAssemblies=F214.JitDiagnostic; DOTNET_JitStdOutFile=<role log>. The capture also contains an incidental System.Text.Json Dictionary method, excluded from F214 interpretation.'
    optimization = 'Normal Release compilation and default runtime Tier0/minopt observed; no tiering, PGO, ReadyToRun, inlining, affinity, priority, or power overrides; no warmup or benchmark loop.'
    noBoxingInInspectedNullGuards = $true
    allocationCountersOrPerformanceMeasurements = $false
    limitations = 'Only ContainsKey/TryAdd for string/string, int/string, and deliberately out-of-annotation int?/string were disassembled. This does not claim whole dictionary operations allocate nothing, establish any shipping struct-key producer, or cover every type, tier, AOT/Mono/browser/runtime/platform.'
})

$commands = @($receipts | ForEach-Object {
    [ordered]@{
        receipt = $_.path
        receiptSha256 = $_.sha256
        executable = $_.value.executable
        arguments = $_.value.arguments
        workingDirectory = $_.value.workingDirectory
        nativeStarted = $_.value.nativeStarted
        pid = $_.value.pid
        exitCode = $_.value.exitCode
        error = $_.value.error
        rootTerminal = $_.value.rootTerminal
        stdoutTerminal = $_.value.stdoutTerminal
        stderrTerminal = $_.value.stderrTerminal
        stdout = $(if (Test-Path -LiteralPath $_.path.Replace('.json', '.stdout.txt')) { $_.path.Replace('.json', '.stdout.txt') } else { $null })
        stderr = $(if (Test-Path -LiteralPath $_.path.Replace('.json', '.stderr.txt')) { $_.path.Replace('.json', '.stderr.txt') } else { $null })
        admissionPolicySha256 = $_.value.admission.policySha256
    }
})
Write-Json 'commands.json' $commands

$authored = @(
    'ACCEPTANCE.json'
    'Collect-F214Source.ps1'
    'Invoke-F214Native.ps1'
    'Prepare-F214Graphs.ps1'
    'Run-F214Qualification.ps1'
    'Complete-F214Handoff.ps1'
    'caller-evidence.json'
    'qualification\F214.Qualification.Tests.csproj'
    'qualification\F214NullGuardQualificationTests.cs'
    'qualification\F214.JitDiagnostic.csproj'
    'qualification\JitDiagnostic.cs'
)
$diagnosticDiff = [Text.StringBuilder]::new()
foreach ($path in $authored)
{
    $lines = [IO.File]::ReadAllLines((Join-Path $PWD $path))
    $null = $diagnosticDiff.AppendLine("--- NUL").AppendLine("+++ $path").AppendLine("@@ -0,0 +1,$($lines.Count) @@")
    foreach ($line in $lines)
    {
        $null = $diagnosticDiff.Append('+').AppendLine($line)
    }
}
[IO.File]::WriteAllText((Join-Path $PWD 'diagnostic-additions.diff'), $diagnosticDiff.ToString(), [Text.UTF8Encoding]::new($false))
$images = @($graphs | ForEach-Object {
    $graph = $_
    foreach ($kind in @('tests', 'jit'))
    {
        $assembly = if ($kind -eq 'tests') { 'F214.Qualification.Tests' } else { 'F214.JitDiagnostic' }
        foreach ($extension in @('.dll', '.pdb', '.deps.json', '.runtimeconfig.json'))
        {
            $path = Join-Path $graph.path ("artifacts\F214\$kind\bin\$assembly$extension")
            [ordered]@{ role = $graph.role; kind = $kind; path = $path; sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }
        }
    }
})
Write-Json 'diagnostic-image-index.json' $images

$failures = @(
    @{ receipt = 'source-history-and-preserved-failure.json'; boundary = 'Read-only source retrieval'; reason = 'Initial collector failed HTTP404 resolving installed runtime version commit as public JIT source; native disassembly later supplies actual runtime evidence. Wrong DictionaryDebugView source path 404s were caught; actual located debugger helpers are in source-index.' }
    @{ receipt = 'native\011-original-dotnet-info.json'; boundary = 'Before native start'; reason = 'Path-resolution guard saw multiple installed dotnet application results. Pure resolution observation proved graph host first; corrected selection still requires the explicit graph executable. No dotnet started in this attempt.' }
    @{ receipt = 'native\015-canonical-shared-tests-no-restore.json'; boundary = 'Before assertions'; reason = 'Canonical project requires absent artifacts\bin\GenerateFiles\Directory.Build.props. No test row reached assertions there; no full-graph bootstrapping or dependency restore was claimed.' }
    @{ receipt = 'native\017-original-linked-tests-build.json'; boundary = 'Harness compilation and execution-control exception'; reason = 'An inline PowerShell argv concatenation combined properties into SourceGraph and therefore failed to apply the intended no-shared-compilation argument. This failed build actually started owned VBCSCompiler PID46248 and its console child. Preserved exactly, not described as compliant. Corrected later build arrays have separate required flags.' }
    @{ receipt = 'native\019-original-tests-build.json'; boundary = 'Harness compilation'; reason = 'Exact shared HttpParseResult helper missing from initial linked closure; included unchanged actual source, not IVT or product edits.' }
    @{ receipt = 'native\021-original-tests-build.json'; boundary = 'Harness compilation'; reason = 'QueryStringEnumerable needed its actual WebUtilities project preprocessor constant, independently read from the canonical project. Corrected harness compilation definition without editing source.' }
    @{ receipt = 'finalization-live-descendant-diagnostic.json'; boundary = 'Finalizer, before handoff'; reason = 'First finalizer exited1 and refused sealing when same-source CIM creation-time comparison found the lingering compiler and console. Earlier wrapper Get-Process/CIM precision comparison missed these two identities.' }
    @{ receipt = 'owned-descendant-cleanup.json'; boundary = 'Actual owned descendant cleanup'; reason = 'Compiler PID46248 creation identity verified and stopped by literal PID; its observed console PID40840 was subsequently observed already terminal, not falsely claimed killed. First variable-PID tool request was not executed; literal-PID request completed successfully. No name-based or foreign termination.' }
    @{ receipt = 'native\042-malformed-build-preflight-denied.json'; boundary = 'Managed preflight only, before activation or native start'; reason = 'Replayed the exact malformed017 argv through the hardened separate-argument guard; expected denial with nativeStarted=false. No further dotnet build/run was started.' }
)
Write-Json 'preserved-failures.json' $failures

$handOff = [ordered]@{
    findingId = 'F214'
    owner = 'a49af7f8-9952-4ab2-bfea-f0c206589028'
    recordedAtUtc = [DateTime]::UtcNow.ToString('O')
    ownerDetermination = 'No justified product candidate: shipping keys are string; captured modern native null guards do not box.'
    candidate = $null
    coordinatorFinalDisposition = $null
    originalPin = $graphs[0].pin
    observedUpstreamDefault = @{ repository = 'dotnet/aspnetcore'; branch = 'main'; pin = $graphs[1].pin; receipt = 'upstream\default-commit.json' }
    sourceIdentity = @{ index = 'source-index.json'; targetSha256 = $sourceFiles[0].originalSha256; originalAndDefaultTargetIdentical = $sourceFiles[0].identical; allLinkedInputsIdentical = @($sourceFiles | Where-Object { -not $_.identical }).Count -eq 0 }
    callerEvidence = @{ file = 'caller-evidence.json'; closedShippingTypes = 3; locatedNewSites = 6; locatedStructKeyProducers = 0; flaggedTryAddShippingDirectCallers = 0; cardinalityBoundary = 'Real query/cookie source and selected canonical tests, not deployed key/frequency data.' }
    runtimeDetermination = @{ file = 'jit-determination.json'; runtime = '.NET 12.0.0-alpha.1.26557.102, Windows x64'; nativeTier = 'Normal default Tier0/minopt'; methods = 'ContainsKey and TryAdd'; partitions = 'string references, int, deliberately out-of-annotation int?'; result = 'Direct pointer comparison / eliminated int guard / direct nullable HasValue test; no surviving boxing in these captured guards.' }
    tests = $testResults
    canonicalProjectCommandBlocked = @{ name = 'Microsoft.AspNetCore.Shared.Tests --filter FullyQualifiedName~AdaptiveCapacityDictionaryTests'; receipt = 'native\015-canonical-shared-tests-no-restore.json'; exitCode = 1; prerequisite = 'artifacts\bin\GenerateFiles\Directory.Build.props'; assertionsReached = $false; substituteBoundary = '18 xUnit3 rows per pin using unchanged canonical tests and source plus 6 private null-contract rows; not the canonical project graph or hosted HTTP.' }
    exactCommandsAndExits = 'commands.json'
    failuresPreserved = 'preserved-failures.json'
    executionControlException = @{ fullyCompliant = $false; receipt = 'owned-descendant-cleanup.json'; failedAttempt = 'native\017-original-linked-tests-build.json'; detail = 'Malformed argv unintentionally enabled shared compilation for this failed attempt. Final audit detected the owned lingering server; actual owned cleanup and hardened managed preflight are recorded. Later passing builds use separate no-sharing/no-reuse/max2 flags. Coordinator must retain this exception.' }
    privateGraphs = 'private-graphs.json'
    changedFilesAndHashes = 'changed-file-index.json'
    shippingDiff = 'shipping-changes.diff'
    diagnosticSourceDiff = 'diagnostic-additions.diff'
    reservedPreserved = 'reserved-after-verification.json'
    quiescence = @{ receipt = 'owned-native-terminal.json'; rootsStarted = $started.Count; allRecordedRootsAndBothStreamsTerminal = $true; liveRecordedIdentities = 0 }
    materialityAndPerformance = @{ verified = $false; comparisonAuthorizations = 0; performanceRuns = 0; allocationCounters = 0; warmups = 0; publication = 'None; coordinator-only'; redGreen = 'No product change or defect reproduction exists, so no bug-fix red/green claim. Passing rows characterize unchanged contracts.'; exclusions = 'Whole-operation allocations/performance, deployed traffic frequency, arbitrary structs/tiers, AOT/Mono/browser/other runtimes, and a shipping value-key producer are not established.' }
}
Write-Json 'HANDOFF.json' $handOff

$indexed = $authored + @(
    'HANDOFF.json', 'source-index.json', 'source-history-and-preserved-failure.json', 'runtime-identity.json',
    'original-unit-row-results.json', 'default-unit-row-results.json', 'original-unit-results.xml', 'default-unit-results.xml',
    'original-jit-disassembly.txt', 'default-jit-disassembly.txt', 'jit-determination.json', 'commands.json',
    'preserved-failures.json', 'diagnostic-image-index.json', 'owned-native-terminal.json', 'reserved-after-verification.json',
    'shipping-changes.diff', 'diagnostic-additions.diff', 'private-graphs.json', 'upstream\default-commit.json',
    'final-readonly-policy-observation.json', 'finalization-live-descendant-diagnostic.json', 'owned-descendant-cleanup.json'
)
Write-Json 'changed-file-index.json' ([ordered]@{
    shippingChanges = @()
    privateGraphTrackedDiffsEmpty = $true
    artifactOnlyFiles = @($indexed | ForEach-Object {
        [ordered]@{ path = $_; sha256 = (Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash; length = (Get-Item -LiteralPath $_).Length }
    })
    diagnosticImages = 'diagnostic-image-index.json'
    selfHashExcluded = $true
})
Write-Output ("F214 HANDOFF SEALED: Original/default each 18 Pass; native roots " + $started.Count + " terminal; product changes 0; performance comparisons 0.")
