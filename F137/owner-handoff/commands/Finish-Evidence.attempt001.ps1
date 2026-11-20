. (Join-Path $PSScriptRoot 'Common.ps1')
$extraSources = @(
    'src\Mvc\Mvc.Razor.RuntimeCompilation\src\FileProviderRazorProjectFileSystem.cs',
    'src\Razor\Razor.Runtime\src\Hosting\RazorCompiledItemLoader.cs',
    'src\Razor\Razor.Runtime\src\Hosting\DefaultRazorCompiledItem.cs',
    'src\Razor\Razor.Runtime\src\Hosting\RazorCompiledItemAttribute.cs',
    'src\Mvc\Mvc.Razor\src\ApplicationParts\IRazorCompiledItemProvider.cs',
    'src\Mvc\Mvc.Razor\src\DependencyInjection\MvcRazorMvcCoreBuilderExtensions.cs',
    'src\Mvc\Mvc\src\MvcServiceCollectionExtensions.cs',
    'src\Mvc\Mvc.Razor\src\RazorView.cs',
    'src\Mvc\Mvc.Razor\src\RuntimeViewCompilerProvider.cs'
)
$extra = @()
foreach($role in @('original','default'))
{
    $checkout = Join-Path $Root "scratch\$role"
    [void](Run-Native "$role-final-pin-metadata" 'git' @('--no-pager','-C',$checkout,'show','-s','--format=fuller','HEAD') $checkout)
    [void](Run-Native "$role-final-selected-git-blobs" 'git' @('--no-pager','-C',$checkout,'ls-tree','HEAD','--',
        'src/Mvc/Mvc.Razor.RuntimeCompilation/src/RuntimeViewCompiler.cs',
        'src/Mvc/Mvc.Razor.RuntimeCompilation/src/RuntimeViewCompilerProvider.cs',
        'src/Mvc/Mvc.Razor/src/ApplicationParts/RazorCompiledItemFeatureProvider.cs',
        'src/Mvc/Mvc.Core/src/ApplicationParts/ApplicationPartManager.cs',
        'src/Razor/Razor.Runtime/src/Hosting/RazorCompiledItemLoader.cs') $checkout)
    [void](Run-Native "$role-final-source-status" 'git' @('--no-pager','-C',$checkout,'status','--porcelain=v1','--untracked-files=normal') $checkout)
    $status = Get-Content (Join-Path $Root "evidence\$role-final-source-status\stdout.txt") -Raw
    if(-not [string]::IsNullOrWhiteSpace($status)) {throw "Unexpected changes in own $role source checkout"}
    foreach($relative in $extraSources)
    {
        $physical = Join-Path $checkout $relative
        if(-not (Test-Path $physical)) {continue}
        $target = Join-Path $Root "source\$role\$relative"
        if(-not (Test-Path $target))
        {
            New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
            Copy-Item -LiteralPath $physical -Destination $target
        }
        $extra += [ordered]@{
            role=$role; repositoryPath=$relative; physicalSourcePath=$physical
            physicalSha256=(Get-FileHash $physical -Algorithm SHA256).Hash.ToLowerInvariant()
            frozenRelativePath=[IO.Path]::GetRelativePath($Root,$target)
        }
    }
    foreach($name in @('Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation','Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test'))
    {
        $assets = Join-Path $checkout "artifacts\obj\$name\project.assets.json"
        if(Test-Path $assets) {Copy-Item -LiteralPath $assets -Destination (Join-Path $Root "evidence\$role-$name.project.assets.json")}
    }
    foreach($name in @('Directory.Build.props','Directory.Build.targets'))
    {
        $generated = Join-Path $checkout "artifacts\bin\GenerateFiles\$name"
        if(Test-Path $generated) {Copy-Item -LiteralPath $generated -Destination (Join-Path $Root "evidence\$role-generated-$name")}
    }
}
Save-Json (Join-Path $Root 'evidence\additional-selected-source.json') $extra
[void](Run-Native 'original-ordering-origin-history' 'git' @('--no-pager','-C',(Join-Path $Root 'scratch\original'),'log','--follow','-SView ordering has precedence','--format=fuller','-p','-n','2','--','src/Mvc/Mvc.Razor.RuntimeCompilation/src/RuntimeViewCompiler.cs'))
[void](Run-Native 'node-version' 'C:\Program Files\nodejs\node.exe' @('--version'))

$runtimeInventories = @()
foreach($entry in @(
    @{role='original';root=$SdkRoot;version='12.0.0-alpha.1.26562.105'},
    @{role='default';root=(Split-Path $PrivateRuntime -Parent);version='12.0.0-alpha.1.26568.110'}
))
{
    $directory = Join-Path $entry.root "shared\Microsoft.NETCore.App\$($entry.version)"
    $runtimeInventories += [ordered]@{
        role=$entry.role; externalRuntimeRoot=$entry.root; runtimeVersion=$entry.version
        runtimeDirectory=$directory; files=@(Inventory $directory)
        host=[ordered]@{path=(Join-Path $entry.root 'dotnet.exe');sha256=(Get-FileHash (Join-Path $entry.root 'dotnet.exe') -Algorithm SHA256).Hash.ToLowerInvariant()}
        readOnlyPrerequisite=$true; installedByThisWorker=$false
    }
}
$sdkFiles = @(
    (Join-Path $SdkRoot 'dotnet.exe'),
    (Join-Path $SdkRoot 'sdk\12.0.100-alpha.1.26557.102\.version'),
    (Join-Path $SdkRoot 'sdk\12.0.100-alpha.1.26557.102\MSBuild.dll'),
    (Join-Path $SdkRoot 'sdk\12.0.100-alpha.1.26557.102\vstest.console.dll'),
    (Join-Path $SdkRoot 'sdk\12.0.100-alpha.1.26557.102\Roslyn\bincore\csc.dll'),
    'C:\Program Files\nodejs\node.exe'
)
Save-Json (Join-Path $Root 'evidence\external-pinned-prerequisites.json') ([ordered]@{
    expectedSDK='12.0.100-alpha.1.26557.102'
    runtimeInventories=$runtimeInventories
    selectedSDKAndAuditToolFiles=@($sdkFiles | Where-Object {Test-Path $_} | ForEach-Object {
        [ordered]@{path=$_;length=(Get-Item $_).Length;sha256=(Get-FileHash $_ -Algorithm SHA256).Hash.ToLowerInvariant()}
    })
    SDKRuntimeScope='SDK/build host is existing R .dotnet junction; current canonical runtime268 is only the existing private runtime, not an installed R SDK/runtime.'
    completeSDKInputAttestation=$false
})
$roleSummaries = @()
$matrix = @()
$traceEvidence = @()
foreach($role in @('original','default'))
{
    $producer = Get-Content (Join-Path $Root "results\$role-complete\producer.json") -Raw | ConvertFrom-Json
    $edge = Get-Content (Join-Path $Root "results\$role-empty-edge\producer.json") -Raw | ConvertFrom-Json
    $tests = Get-Content (Join-Path $Root "results\$role\existing-tests-parsed.json") -Raw | ConvertFrom-Json
    if($tests.count -ne 10 -or @($tests.rows | Where-Object outcome -NE 'Passed').Count -ne 0) {throw 'Exact XML row audit failed'}
    $correctRows = @($producer.rows | Where-Object outcome -EQ 'Passed')
    if($correctRows.Count -ne 17 -or $edge.outcome -ne 'Passed' -or $edge.assertions -ne 5) {throw 'Producer coverage incomplete'}
    foreach($row in $correctRows)
    {
        $matrix += [ordered]@{role=$role;requirementOrPartition=$row.name;evidence="results\$role-complete\producer.json";outcome='Passed';assertions=$row.assertions}
    }
    $matrix += [ordered]@{role=$role;requirementOrPartition=$edge.name;evidence="results\$role-empty-edge\producer.json";outcome='Passed';assertions=$edge.assertions}
    $version = $tests.requestedRuntime
    $tracePaths = @(
        "results\$role\existing-tests-native-host-trace.log",
        "results\$role-complete\producer-native-host-trace.log",
        "results\$role-empty-edge\native-host-trace.log"
    )
    foreach($relative in $tracePaths)
    {
        $lines = @(Get-Content (Join-Path $Root $relative))
        $runtimeDirectory = $producer.runtime.runtimeDirectory.TrimEnd('\')
        if(-not (($lines -join "`n").Contains($runtimeDirectory))) {throw "Runtime directory absent from actual native trace $relative"}
        $selected = @()
        for($i=0;$i -lt $lines.Count;$i++)
        {
            if($lines[$i] -match 'Chose FX version|CoreCLR path|Resolved framework|roll_forward|rollForward|roll-forward|Using dotnet root|hostfxr.dll|Property RUNTIME_IDENTIFIER')
            {
                $selected += [ordered]@{line=$i+1;text=$lines[$i]}
            }
        }
        $traceEvidence += [ordered]@{role=$role;trace=$relative;expectedAndObservedRuntime=$version;actualRuntimeDirectory=$runtimeDirectory;selectedNativeResolutionLines=$selected}
    }
    $roleSummaries += [ordered]@{
        role=$role;sourceCommit=$(if($role -eq 'original'){$Original}else{$Default})
        nativeBuildSucceeded=$true;existingTestRowsPassed=10;eachTheoryRowParsed=$true
        originalCommonProbe=[ordered]@{rows=18;passedRows=17;failedRows=1;assertionChecks=97;knownWrongProbeAssertions=1;exitCode=1;bytesNeverRecompiled=$true}
        additiveCommonEmptyEdge=[ordered]@{name=$edge.name;rows=1;passedRows=1;assertionChecks=5;exitCode=0;compiledOnceAndReused=$true}
        acceptedContractRows=18;validProducerAndIdentityAssertionChecks=101;totalExecutedAssertionChecksIncludingKnownBadProbe=102
        canonicalRuntimeVersion=$version;actualRuntime=$producer.runtime
        selectedLoadedSourceOwnerIdentities=$producer.ownerIdentities
        publicStandardProducerBoundary='Assembly RazorCompiledItem attributes -> CompiledRazorAssemblyPart/RazorCompiledItemLoader -> registered ApplicationPartManager feature provider -> CompiledViewDescriptor -> registered RuntimeViewCompilerProvider -> RuntimeViewCompiler constructor -> CompileAsync -> real RazorView rendering.'
        extensionOnlyBoundary='Null descriptor/default descriptor-null-path were produced by a registered custom public feature provider, not standard assembly metadata. No private dictionary field writes.'
    }
}
Save-Json (Join-Path $Root 'evidence\native-host-resolution-audit.json') $traceEvidence
Save-Json (Join-Path $Root 'evidence\requirement-coverage.json') $matrix
Save-Json (Join-Path $Root 'evidence\contract-edge-audit.json') ([ordered]@{
    constructorGuardSource='source\<role>\src\Mvc\Mvc.Razor.RuntimeCompilation\src\RuntimeViewCompiler.cs lines41-45: fileProvider, projectEngine, csharpCompiler, precompiledViews, logger null guards. These five direct-constructor null arguments were source-audited, not separately executed.'
    nullItemIsNotNecessarilyBad='Existing CompileAsync_ReturnsPrecompiledViews constructs a descriptor with non-null RelativePath and null Item and asserts the exact descriptor is returned; that native existing test passed at both pins. Standard attribute loader rows have non-null Item.'
    standardMetadataNullIdentifier='NullIdentifier_RejectedByAttributeLoader: ArgumentNullException(identifier), from DefaultRazorCompiledItem constructor before descriptor/dictionary insertion.'
    standardMetadataEmptyIdentifier='EmptyIdentifier_RejectedBeforeCompilerInsertion: IndexOutOfRangeException from CompiledViewDescriptor -> ViewPath.NormalizePath, before RuntimeViewCompiler constructor.'
    samePartDuplicates='SamePartCaseDuplicates_RejectedByStandardFeatureProvider: InvalidOperationException. Feature provider groups within each part with OrdinalIgnoreCase; cross-part duplicates are accepted and reach constructor.'
    wrongViewType='WrongViewType_DescriptorAcceptedButRazorPageFactoryRejects: compiler retains System.String metadata; real view-engine factory throws ArgumentException(type) because string lacks a default constructor. This does not claim every wrong type fails identically.'
    nullDescriptor='ExtensionProvider_NullDescriptorFailsAtConstructor: NullReferenceException at constructor log dereference. Invalid custom provider case, not standard metadata.'
    nullDescriptorPath='ExtensionProvider_NullPathFailsDictionaryKeyContract: ArgumentNullException(key) at Dictionary.ContainsKey. Invalid custom provider case, not standard metadata.'
    compileNullPath='NullCompilePath_ArgumentGuard: ArgumentNullException(relativePath).'
    compileEmptyPath='Earlier common probe wrongly expected IndexOutOfRangeException. Unchanged common probe bytes/outcomes retained. Additive real-producer EmptyCompilePath_RealProjectFileSystemRejectsEmptyPath verifies ArgumentException(path) from RazorProject.NormalizeAndEnsureValidPath at both pins.'
    sourceOwnerAssociationBoundary='Four actual loaded source-owner PE/PDB associations per role, matching CodeView GUID/stamp and selected physical-source document hashes. Local informational versions are 12.0.0-dev and do not attest the complete compile input graph or an embedded commit identity.'
    intentionallyUnverified=@('No candidate TryAdd implementation or equivalence claim','No complete malformed/custom IList or concurrent descriptor mutation contract','No dynamic Razor source recompilation/checksum invalidation or Razor SDK .cshtml generation coverage in the new producer','No browser or HTTP hosted end-to-end coverage','No performance magnitude, zero-cost, no-gain or unreachability conclusion')
})
$imageAudit = Get-Content (Join-Path $Root 'evidence\complete-image-audit.json') -Raw | ConvertFrom-Json
$failureRecords = @(
    [ordered]@{commands=@('original-build-initial-no-restore','default-build-initial-no-restore');boundary='Missing generated repository imports; generated using existing target, then restored missing graph and built unchanged sources successfully.'},
    [ordered]@{commands=@('common-probe-build-initial-no-restore','fixture-build-initial-no-restore','empty-edge-initial-no-restore');boundary='Missing new-project assets. Restores were performed only after chosen no-restore builds failed; no package/dependency manifest edits or installations.'},
    [ordered]@{commands=@('original-real-managed-producer','default-real-managed-producer');boundary='Missing private consumer dependency Microsoft.AspNetCore.Authorization.Policy during service registration. Eighteen producer cases blocked before assertion execution; raw outputs and original images retained. Added already-built source dependencies to new image graphs, no common probe recompilation.'},
    [ordered]@{commands=@('original-complete-real-managed-producer','default-complete-real-managed-producer');boundary='Seventeen rows passed, one inaccurate EmptyCompilePath_NormalizerRejects probe assertion failed; exit1 preserved. Source audit found GetNormalizedPath empty-length guard, and additive compile-once real producer validated actual ArgumentException(path).'},
    [ordered]@{commands=@('full-image-and-gate-audit');boundary='python resolves to Windows Store alias, exit9009. No Python installed. Equivalent explicit Node audit executed successfully with all checks; the unexecuted Python script is retained as a failed prerequisite attempt.'}
)
Save-Json (Join-Path $Root 'evidence\failed-attempts-and-boundaries.json') $failureRecords
[void](Run-Native 'main-repo-final-readonly-status' 'git' @('--no-pager','-C',$Repo,'status','--porcelain=v1','--untracked-files=normal'))
[void](Run-Native 'github-main-end' 'gh' @('api','repos/dotnet/aspnetcore/commits/main'))
$endMain = (Get-Content (Join-Path $Root 'evidence\github-main-end\stdout.txt') -Raw | ConvertFrom-Json).sha

$nativeReceipts = @()
foreach($receipt in Get-ChildItem (Join-Path $Root 'evidence') -Filter 'result.json' -Recurse -File)
{
    $result = Get-Content $receipt.FullName -Raw | ConvertFrom-Json
    foreach($entry in $result.ownedObservedProcesses)
    {
        if(-not $entry.terminalObserved) {throw "Native PID not terminal in receipt: $($entry.pid)"}
    }
    $nativeReceipts += [ordered]@{
        command=[IO.Path]::GetRelativePath((Join-Path $Root 'evidence'),$receipt.DirectoryName)
        exitCode=$result.exitCode;endedUtc=$result.endedUtc;observedProcesses=$result.ownedObservedProcesses
    }
}
$stillRunning = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,CommandLine | Where-Object {
    $_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine.Contains($Root)
})
if($stillRunning.Count -ne 0) {throw "An owned-root command line remains active: $($stillRunning.ProcessId -join ',')"}
Save-Json (Join-Path $Root 'evidence\native-process-terminal-audit.json') ([ordered]@{
    recordedNativeCommands=$nativeReceipts.Count;everyObservedNativePidTerminal=$true
    finalOwnedRootCommandLinesStillRunning=@();auditControllerPid=$PID
    nativeCommandReceipts=$nativeReceipts
    boundary='Roots were awaited; observed descendants were recursively polled via Win32_Process and awaited if still present. Short-lived between-poll descendants are not claimed as a complete creation-event inventory. Early read-only entry probes were synchronous tool calls without child-PID instrumentation.'
})
$handoff = [ordered]@{
    finding='F137';handoffStatus='Untimed functional preparation executed; coordinator disposition remains pending'
    originalPin=$Original;entryFreshGitHubMainPin=$Default;endFreshGitHubMainPin=$endMain
    freshnessBoundary=$(if($endMain -eq $Default){'Both fresh read-only GitHub observations match the actual newly fetched and built default pin.'}else{'Default graph is the actual entry-fresh pin. End observation moved; no claim to rebuilding the newer graph.'})
    proposalStatus='TryAdd remains unadopted; no candidate source application/build, no semantic substitution, no gain-gate adoption.'
    lifecycle='Constructor insertion is compiler initialization. Registered provider retains the compiler and CompileAsync caches descriptors; this handoff does not turn insertion into a per-render hot path.'
    roleExecutions=$roleSummaries
    commonConsumerBytes='Main verify-only consumer and each fixture compiled once and byte-reused across roles. Additive independent empty-edge consumer compiled once and byte-reused. Original common probe was never edited/recompiled to erase its false assertion. App DLL/PDB/deps/runtimeconfig/apphost and fixture identities are all checked without prefix exclusions.'
    imageAudit=[ordered]@{path='evidence\complete-image-audit.json';actualConsumerImages=$imageAudit.unchangedAfterExecution;strictGateSelfTestsPassed=$imageAudit.gateSelfTests.Count;originalDefaultNonOwnerImageDifferences=$imageAudit.originalDefaultRealFullImageGate.rejectedDifferenceCount;actualOriginalDefaultRuntimeIdentical=$false;causalPerformancePair=$false}
    requirementMatrix='evidence\requirement-coverage.json'
    sourceAndContractAudit='evidence\contract-edge-audit.json'
    failedAttempts='evidence\failed-attempts-and-boundaries.json'
    nativeHostEvidence='evidence\native-host-resolution-audit.json'
    terminalPidAcknowledgement='evidence\native-process-terminal-audit.json'
    allObservedNativePidsTerminal=$true
    instructionsObserved=[ordered]@{noNestedAgents=$true;noBenchmarkOrPerformanceCounters=$true;noCandidateBuild=$true;noSDKOrRuntimeInstall=$true;noProfilePowerAffinityPriorityCertificateFirewallAclChanges=$true;noProtectedConfigEdits=$true;noOfficialVerdictLedgerPolicyGitHubWrite=$true;noBrowserOrPublicReportInteraction=$true}
    frozenPayloadBoundary='All selected source/project/probe/command/raw result/consumer-image entries are listed by frozen-files.json. Entire scratch source clones, build/obj/temp/CLI-home graphs are deliberately excluded; external pinned SDK/runtime prerequisites are separately hashed in evidence\external-pinned-prerequisites.json.'
    limitations=@('Five direct-constructor null guards audited but not separately executed','Actual new fixtures use hand-authored Razor assembly metadata and real compiled page types, not Razor SDK-generated .cshtml projects','No complete compiler-input attestation','No new dynamic runtime compilation, invalidation, browser or hosted HTTP characterization','A preserved incorrect probe assertion failed at each role; supplemental exact real-producer case corrects that edge contract without changing old bytes','No optimization equivalence or performance conclusion')
    manifest='frozen-files.json';manifestSha256File='frozen-files.sha256'
}
Save-Json (Join-Path $Root 'handoff.json') $handoff
@"
F137 UNTImed producer/contract handoff
====================================
Original: $Original
Fresh entry main built: $Default
Fresh end main observed: $endMain

Per role: native unchanged source test graph built; 10 existing TRX rows passed
(all 3 case and 4 path-separator theory rows parsed individually).
Real compiled-assembly metadata/application-part/compiler/view chain:
17 main producer rows passed. One extra wrong probe expectation
EmptyCompilePath_NormalizerRejects failed and remains preserved (exit1).
Additive EmptyCompilePath_RealProjectFileSystemRejectsEmptyPath passed with
5 checks, establishing actual ArgumentException(path) from Razor project FS.
102 assertion checks executed per role: 101 valid checks, 1 known bad probe.
Four loaded source-owner PE/PDB GUID/stamp/document associations per role.
Canonical runtime62 Original; existing read-only private runtime268 Default;
roll-forward Disable throughout. No runtime268 claimed installed in R.

The first incomplete consumer failed service registration; those images and
raw outcomes are preserved. Missing already-built source dependencies were
added to new image graphs with an identical additional-deps overlay.
All common main/fixture/edge DLL/PDB/deps/runtimeconfig/apphost bytes were
compiled once per consumer and reused, not independently rebuilt by role.

Full image audit: six actual images hashed, unchanged after execution.
Strict future owner-only structural gate rejects 367 non-owner differences
and differing actual runtimes. Eleven gate self-tests passed, including
our own main/fixture/edge/deps/runtimeconfig exclusion-regression controls.
These are separate functional characterizations, not a causal perf pair.

Read handoff.json and evidence\requirement-coverage.json for exact per-row
requirements, source/load identity, commands/results, failures and limits.
All observed owned native PIDs are terminal. No benchmark/counter, candidate
patch/build, official disposition, ledger/policy/GitHub write or browser use.
frozen-files.json covers selected evidence, not scratch clones/build/obj.
"@ | Set-Content (Join-Path $Root 'HANDOFF.txt') -Encoding utf8
Write-Host "Evidence finished. Native commands=$($nativeReceipts.Count); end main=$endMain"
