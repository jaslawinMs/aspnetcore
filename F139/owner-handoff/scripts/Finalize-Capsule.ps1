$ErrorActionPreference = 'Stop'
$scope = $PSScriptRoot
$capsule = Join-Path $scope 'capsule'
function Save-Json([string]$Path, $Value) {
    $Value | ConvertTo-Json -Depth 100 | Set-Content $Path -Encoding utf8NoBOM
}
function Inventory([string]$Root) {
    @(Get-ChildItem $Root -File -Recurse | Sort-Object FullName | ForEach-Object {
        [ordered]@{
            path = [IO.Path]::GetRelativePath($Root, $_.FullName)
            bytes = $_.Length
            sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
        }
    })
}
$testRows = @()
$testSummaries = @()
foreach ($role in @('original', 'default')) {
    [xml]$xml = Get-Content "$capsule\native-tests\$role.trx" -Raw
    $results = @($xml.SelectNodes("//*[local-name()='UnitTestResult']"))
    foreach ($row in $results) {
        $testRows += [ordered]@{
            role = $role; executionId = $row.executionId; testId = $row.testId
            testName = $row.testName; outcome = $row.outcome
        }
    }
    $counters = $xml.SelectSingleNode("//*[local-name()='Counters']")
    $testSummaries += [ordered]@{
        role = $role; observedRows = $results.Count; total = [int]$counters.total
        executed = [int]$counters.executed; passed = [int]$counters.passed; failed = [int]$counters.failed
        nativeXml = "native-tests\$role.trx"
        category = 'Existing unit tests, including lower-level direct Emit tests and mocked compiler-option tests; not a hosted/file-change/browser proof.'
    }
    if ($results.Count -ne 26 -or @($results | Where-Object outcome -NE 'Passed').Count -ne 0) { throw "Native test rows do not reconcile for $role" }
}
Save-Json "$capsule\native-test-rows.json" $testRows
Save-Json "$capsule\native-test-summary.json" $testSummaries
$imageInventories = @()
$omittedInventories = @()
foreach ($role in @('original', 'default')) {
    $final = Inventory "$capsule\images\$role"
    $imageInventories += [ordered]@{ role = $role; noPrefixExclusions = $true; files = $final }
    $all = Inventory "$scope\runtime-images\$role"
    $included = @{}
    foreach ($entry in $final) { $included[$entry.path] = $entry.sha256 }
    $omittedInventories += [ordered]@{
        role = $role
        originalInputRoot = "$scope\runtime-images\$role"
        scope = 'Complete per-file preparation runtime image inventory, including tests, fixtures, analyzers, PDBs, and JSON. Payload selects the actually loaded closure plus four owner PDBs. No prefix-based inventory exclusion.'
        allEntries = $all
        intentionallyOmittedEntries = @($all | Where-Object { -not $included.ContainsKey($_.path) })
        nativeUnitTestImageRoot = "$scope\$role\artifacts\bin\Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test\Debug\net12.0"
        nativeUnitTestImageAllEntries = (Inventory "$scope\$role\artifacts\bin\Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test\Debug\net12.0")
        nativeUnitTestImagePayloadBoundary = 'This separate native unit-test output is fully inventoried recursively, including refs, resources, fixtures and runner assets. Only the runtime producer loaded closure and four owner PDBs are selected into the final runtime images; native runner closure is deliberately omitted.'
    }
}
Save-Json "$capsule\image-inventories.json" $imageInventories
Save-Json "$capsule\omitted-input-image-entries.json" $omittedInventories
Copy-Item "$scope\fixture-line-ending-receipt.json" -Destination $capsule -Force
Copy-Item "$scope\Normalize-Fixtures.mjs" -Destination "$capsule\scripts" -Force
$fixtureInventory = Inventory "$capsule\fixtures"
Save-Json "$capsule\fixture-inventory.json" $fixtureInventory
$failedEvidence = @()
foreach ($directory in @('results\original-producer', 'results\default-producer', 'failed-attempts\033-original-crlf-render', 'failed-attempts\033-default-crlf-render')) {
    $root = Join-Path $scope $directory
    if (-not (Test-Path $root)) { continue }
    foreach ($file in Get-ChildItem $root -File -Recurse | Sort-Object FullName) {
        $failedEvidence += [ordered]@{
            attempt = $directory
            path = [IO.Path]::GetRelativePath($root, $file.FullName)
            sha256 = (Get-FileHash $file.FullName -Algorithm SHA256).Hash
            content = [IO.File]::ReadAllText($file.FullName)
        }
    }
}
Save-Json "$capsule\failed-attempt-results.json" $failedEvidence
$commands = @()
foreach ($file in Get-ChildItem "$scope\logs" -Filter '*.json' -File | Where-Object Name -NotLike '*.started.json' | Sort-Object Name) {
    $receipt = Get-Content $file.FullName -Raw | ConvertFrom-Json
    $prefix = $file.FullName.Substring(0, $file.FullName.Length - 5)
    if ($null -eq $receipt.id) { continue }
    if (-not $receipt.terminal -or -not $receipt.streamsTerminal) { throw "Unfinished native command: $($receipt.id)" }
    $commands += [ordered]@{
        receipt = $receipt
        stdout = [IO.File]::ReadAllText("$prefix.stdout.log")
        stderr = [IO.File]::ReadAllText("$prefix.stderr.log")
        stdoutSha256 = (Get-FileHash "$prefix.stdout.log" -Algorithm SHA256).Hash
        stderrSha256 = (Get-FileHash "$prefix.stderr.log" -Algorithm SHA256).Hash
    }
}
Save-Json "$capsule\commands.json" $commands
$hostTraces = @(Get-ChildItem "$scope\logs" -Filter '*.host.log' -File | Sort-Object Name | ForEach-Object {
    [ordered]@{ name = $_.Name; sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash; content = [IO.File]::ReadAllText($_.FullName) }
})
Save-Json "$capsule\host-traces.json" $hostTraces
$ownerProofs = @(Get-Content "$scope\staged-owner-proofs.json" -Raw | ConvertFrom-Json)
foreach ($proof in $ownerProofs) {
    $loaded = Get-Content "$capsule\results\$($proof.role)-producer\loaded-assemblies.json" -Raw | ConvertFrom-Json
    $actual = @($loaded | Where-Object name -EQ $proof.name)[0]
    if ($actual.sha256 -ne $proof.sha256 -or $actual.mvid -ne $proof.mvid) { throw "Final image owner identity changed: $($proof.name)" }
    $proof.actualLoadedPath = $actual.path
}
$commonClosure = @(Get-Content "$scope\common-closure.json" -Raw | ConvertFrom-Json)
$runtimeIdentities = @()
foreach ($role in @('original', 'default')) {
    $runtimeResult = Get-Content "$capsule\results\$role-producer\runtime.json" -Raw | ConvertFrom-Json
    $hostPath = $runtimeResult.processPath
    $hostFile = Get-Item $hostPath
    $runtimeIdentities += [ordered]@{
        role = $role
        actualProcessHostPath = $hostPath
        hostSha256 = (Get-FileHash $hostPath -Algorithm SHA256).Hash
        hostFileVersion = $hostFile.VersionInfo.FileVersion
        hostProductVersion = $hostFile.VersionInfo.ProductVersion
        actualCoreLibPath = $runtimeResult.coreLibPath
        actualCoreLibSha256 = $runtimeResult.coreLibSha256
        actualCoreLibInformationalVersion = $runtimeResult.coreLibInformationalVersion
        actualFrameworkDescription = $runtimeResult.framework
        requestedRollForward = $runtimeResult.rollForward
        actualRuntimeDirectory = $runtimeResult.runtimeDirectory
        payloadOmitted = $true
    }
}
$active = @(Get-CimInstance Win32_Process | Where-Object {
    $_.ProcessId -ne $PID -and $_.CommandLine -like "*finding-F139-010*" -and
    $_.Name -match '^(dotnet|testhost|csc|VBCSCompiler|MSBuild|node)\.exe$'
} | Select-Object ProcessId, ParentProcessId, Name, ExecutablePath, CommandLine)
$terminal = [ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('O')
    recorderCommands = $commands.Count
    allRecordedDirectCommandsTerminal = @($commands | Where-Object { -not $_.receipt.terminal }).Count -eq 0
    allRecordedStreamsTerminal = @($commands | Where-Object { -not $_.receipt.streamsTerminal }).Count -eq 0
    stillObservedScopedNativeProcesses = $active
    initialPidCaptureGaps = 'Initial interactive metadata-only git, LSP, file discovery, and Get-Date probes preceded the recorder. Direct native child PIDs are captured for all recorder commands; exhaustive fast-descendant PID capture is not proven. Shared MSBuild node reuse and compiler sharing were disabled.'
    heavyIo = 'Synchronous staging, hashing, and log collection in this script complete before the terminal receipt and sealing command return. No background stream copier was started.'
}
Save-Json "$capsule\terminal-state.json" $terminal
if ($active.Count -ne 0) { throw 'Scoped native process remains active.' }
$facts = [ordered]@{
    finding = 'F139'
    officialState = 'PENDING'
    sourceRewriteApplied = $false
    candidateAdopted = $false
    performanceMeasurements = $false
    comparisonAuthorized = $false
    fullCompilerInputAttestation = $false
    roles = @('original', 'default')
    originalCommit = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
    freshlyObservedDefaultCommit = '00560e2dd1954a2acf2bc54b35422b0f32484bf1'
    startOfPreparationDefaultObservation = [ordered]@{
        commit = ((Get-Content "$scope\logs\001-fresh-upstream.stdout.log" -Raw).Trim() -split '\s+')[0]
        receipt = Get-Content "$scope\logs\001-fresh-upstream.json" -Raw | ConvertFrom-Json
        actualSourceBuilt = $true
    }
    closingUpstreamObservation = [ordered]@{
        commit = ((Get-Content "$scope\logs\045-closing-upstream-observation.stdout.log" -Raw).Trim() -split '\s+')[0]
        receipt = Get-Content "$scope\logs\045-closing-upstream-observation.json" -Raw | ConvertFrom-Json
        actualSourceBuilt = $false
        consequence = 'Upstream moved after the entry pin. Default role source-build/run evidence belongs only to 00560e2dd1954a2acf2bc54b35422b0f32484bf1. No source-built or runtime claim is made for closing head c97a797f19154e97f9723634a8033ef8325cb277; outputs are not relabeled.'
    }
    nativeBuild = [ordered]@{
        sdk = '12.0.100-alpha.1.26557.102'
        roleRoots = 'New isolated local shared-object clones and detached checkouts; source-built outputs not reused from prior findings.'
        nativeLanguageDefaults = 'Existing dependency preview defaults preserved; only new common verifier and fixture artifacts specify C# 13.'
        nonCiBoundary = 'The first role builds failed on a missing static-web-assets manifest. Focused retries disabled StaticWebAssetsEnabled and BuildNodeJS, and UseIisNativeAssets=false. No native build warning suppression was added. These are MVC managed-path preparations, not full CI or static asset validation; the common artifact local obsolete-API pragma is disclosed separately.'
        sharedToolchain = 'Read-only existing root .dotnet junctions. No SDK or package cache included in capsule; existing NuGet cache reused. Restores followed observed missing-assets failures.'
        trackedSourceCheck = 'Fresh clone status/diff without per-process core.longpaths reported unrelated long-name Validation snapshots. Recorded retries with git -c core.longpaths=true are clean; no persistent Git setting was changed. Raw selected document checks remain separately attested.'
    }
    commonConsumer = [ordered]@{
        compiledSuccessfullyExactlyOnce = $true
        buildReceipt = '022-common-build-once'
        initialNoRestoreAttemptReachedCompiler = $false
        compileWarningsPreserved = '11 emitted warnings: unresolved Roslyn 4.0 versus analyzer 5.11 reference conflicts and nullable analysis, all retained. Native owner builds and selected native tests succeeded. The common artifact has one local ASPDEPR003 pragma around the deliberately obsolete runtime-compilation registration; do not describe the common build as suppression-free or CI-clean.'
        localObsoleteApiPragma = $true
        localObsoleteApiPragmaBoundary = 'Artifact-only diagnostic probe; native dependency warning policies were unchanged. A genuine compiler blocker requiring this local pragma was not demonstrated. This is an explicit preparation guardrail limitation, not an accepted exception, and no second verifier compilation was performed to conceal it.'
        files = $commonClosure
        commonFixtureClosureReusedAcrossRoles = $true
        fixtureMetadataConfiguration = 'Only two throwaway fixture dependency-context languageVersion settings were changed from generated 13.0 to supported 8.0 after preserving failed Debug-assertion attempts. Their generated portable/none debugType settings were retained. No assembly was recompiled; configured common closure is identical across roles.'
        literalFixtureConfiguration = 'Apply-patch produced CRLF Razor input. The first material render assertion correctly rejected CRLF against its fixed LF expected output. The original fixture bytes and failed rows are preserved; an automated input-copy normalization changed only the four fixture line endings to LF. The compiled assertion and all verifier/fixture assemblies were unchanged.'
        sourceRuntimeLanguageLimit = 'C# 13 is used to compile the new verifier/context artifacts. Generated Razor code is deliberately parsed as C# 8 by the existing package Roslyn 4.0.0 via application dependency-context metadata. This is not a successful C# 13 Razor runtime-compilation compatibility claim.'
    }
    ownerProofs = $ownerProofs
    producerBoundary = 'Public AddControllersWithViews/AddRazorRuntimeCompilation registration, physical .cshtml provider, actual RuntimeViewCompilerProvider and RuntimeViewCompiler, RazorProjectEngine processing, native package Roslyn.Emit, original Assembly.Load(byte[], byte[]?), emitted view type, and RazorView.RenderAsync string consumer. Application parts deliberately empty; additional compile references are the actual role image and trusted runtime closure.'
    consumerEvidence = 'Known output F139|42|rendered followed by LF, repeated compiler task/descriptor/type retention and repeated rendering, actual emitted exception stack frames with portable PDB present and absent via owning dependency-context settings, real C# CS0103 and Razor RZ1006 failures, retained exception task/instance.'
    runtimeBoundary = 'Original explicitly requests 12.0.0-alpha.1.26562.105 from the root host; default explicitly requests private read-only 12.0.0-alpha.1.26568.110. SDK host is 12.0.100-alpha.1.26557.102. Roll-forward disabled and host traces preserved. Different role runtime/dependency closures are not a causal performance pair.'
    runtimeIdentities = $runtimeIdentities
    loaderBoundary = 'Only existing Assembly.Load(byte[], byte[]?) executed. Actual emitted assembly identities, load-context names, location and IsCollectible captured. No LoadFromStream replacement, equivalence, zero-copy, length/capacity/trailing-byte, allocation benefit, full dependency-resolution matrix, or unloadability claim.'
    lifecycleBoundary = 'Repeated compile/render and failure-cache identity observed in each provider lifetime. Providers, scopes, physical file providers and diagnostic listeners disposed. No source mutation, watcher invalidation, long-run retention, unloading, hosted HTTP, browser, or HotReload validation.'
    sourceBoundary = 'Selected raw physical documents are copied with separate raw SHA256, normalized Git-LF SHA256, pinned Git blob SHA1 and PDB document associations. No whole-tree or full compiler-input provenance is claimed from selected documents.'
    nativeTests = $testSummaries
    portableAudit = 'node audit.mjs; metadata-only default reads this capsule only, starts no .NET and uses no original absolute graph path. A passing metadata audit verifies the selected payload and recorded observations, not CI cleanliness, acceptance or performance.'
    portableGraphUnavailableAudit = $(if (Test-Path "$scope\portable-graph-unavailable-audit.json") { Get-Content "$scope\portable-graph-unavailable-audit.json" -Raw | ConvertFrom-Json } else { $null })
    omitted = 'No SDK, runtime/toolchain, NuGet cache, whole source tree, archive, obj directory, or native test runner closure. Full preparation image entry hashes and explicit omitted entries are retained in omitted-input-image-entries.json.'
    authority = 'Coordinator alone accepts, disposes or publishes; this preparation makes no performance decision.'
}
Save-Json "$capsule\facts.json" $facts
Get-ChildItem "$scope" -Filter '*.ps1' -File | Copy-Item -Destination "$capsule\scripts" -Force
Copy-Item "$scope\audit.mjs" -Destination "$capsule\audit.mjs" -Force
