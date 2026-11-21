$ErrorActionPreference = 'Stop'
$base = $PSScriptRoot
$par = Split-Path -Parent $base
$owner = 'ec444276-1562-48a8-8655-bc9a7c90de94'
$commits = @{
    Original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
    Default = 'd3483989953ae3cccd773aea5ea04cb0c7198531'
}
function New-Bytes([string]$Path, [byte[]]$Bytes)
{
    $stream = [IO.File]::Open($Path, [IO.FileMode]::CreateNew)
    try { $stream.Write($Bytes) } finally { $stream.Dispose() }
}
function New-Json([string]$Path, $Value)
{
    New-Bytes $Path ([Text.Encoding]::UTF8.GetBytes(($Value | ConvertTo-Json -Depth 60) + "`n"))
}
function Hash([byte[]]$Bytes)
{
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($Bytes))
}
function Equal-Bytes([byte[]]$Left, [byte[]]$Right)
{
    return [Collections.StructuralComparisons]::StructuralEqualityComparer.Equals($Left, $Right)
}
function Identity([Diagnostics.Process]$Process)
{
    return @{
        pid = $Process.Id
        creationUtc = $Process.StartTime.ToUniversalTime().ToString('o')
        creationFileTime100ns = $Process.StartTime.ToUniversalTime().ToFileTimeUtc()
    }
}
$runDir = Join-Path $base 'analysis-v2-observation'
if (Test-Path -LiteralPath $runDir) { throw 'Fresh analysis output already exists' }
$null = New-Item -ItemType Directory -Path $runDir
$root = Identity ([Diagnostics.Process]::GetCurrentProcess())
$observerStart = [Diagnostics.ProcessStartInfo]::new((Get-Command pwsh).Source)
$observerStart.WorkingDirectory = $base
$observerStart.UseShellExecute = $false
$observerStart.RedirectStandardOutput = $true
$observerStart.RedirectStandardError = $true
$observerArgv = @('-NoLogo', '-NoProfile', '-File', (Join-Path $base 'observer_269_v2.ps1'), '-Directory', $runDir, '-RootPid', "$PID", '-RootCreationFileTime', "$($root.creationFileTime100ns)")
foreach ($arg in $observerArgv) { $observerStart.ArgumentList.Add($arg) }
$observer = [Diagnostics.Process]::new()
$observer.StartInfo = $observerStart
$null = $observer.Start()
$observerIdentity = Identity $observer
$observerOut = [IO.File]::Open((Join-Path $runDir 'observer.stdout.raw.bin'), [IO.FileMode]::CreateNew)
$observerErr = [IO.File]::Open((Join-Path $runDir 'observer.stderr.raw.bin'), [IO.FileMode]::CreateNew)
$observerOutTask = $observer.StandardOutput.BaseStream.CopyToAsync($observerOut)
$observerErrTask = $observer.StandardError.BaseStream.CopyToAsync($observerErr)
New-Json (Join-Path $runDir 'root-start.json') @{
    root = $root; observer = $observerIdentity; observerArgv = $observerArgv
    argv = [Environment]::GetCommandLineArgs(); cwd = (Get-Location).Path
    scope = 'Artifact-only source capture validation; no new external source, Git/gh, SDK, compiler or test execution.'
}
$deadline = [DateTime]::UtcNow.AddSeconds(15)
while (-not [IO.File]::Exists((Join-Path $runDir 'observer-ready.json')))
{
    if ($observer.HasExited -or [DateTime]::UtcNow -gt $deadline) { throw 'Analysis observer not ready' }
    Start-Sleep -Milliseconds 50
}
$failure = $null
$summary = $null
try
{
    $policyRaw = [IO.File]::ReadAllBytes((Join-Path $par 'policy.json'))
    $registrationRaw = [IO.File]::ReadAllBytes((Join-Path $par 'owner-registrations-267-268-269.json'))
    $policy = [Text.Encoding]::UTF8.GetString($policyRaw) | ConvertFrom-Json -AsHashtable
    $registration = [Text.Encoding]::UTF8.GetString($registrationRaw) | ConvertFrom-Json -AsHashtable
    $checks = @{
        actualOwnRegistration = $policy.independentFindingPreparationWorkers.F239 -ceq $owner -and $registration.actualOwners.F239 -ceq $owner
        exactScope = $policy.activeWorkerPreparationScopes.F239 -ceq $registration.scopes.F239 -and $registration.scopes.F239.StartsWith('269 SOURCE ONLY after GO269')
        ownerLimit = $policy.independentFindingPreparationWorkers.Count -le 4
        noLease = -not [IO.File]::Exists((Join-Path $par 'benchmark-exclusive.lease.json'))
        noHold = $policy.actualWorkerBuildHoldActive -ceq $false
        nonquiesced = $policy.buildAndTestWorkQuiesced -ceq $false
    }
    New-Bytes (Join-Path $runDir 'policy.raw.json') $policyRaw
    New-Bytes (Join-Path $runDir 'registration.raw.json') $registrationRaw
    New-Json (Join-Path $runDir 'guard.json') @{observedUtc = [DateTime]::UtcNow.ToString('o'); checks = $checks; policySha256 = Hash $policyRaw; registrationSha256 = Hash $registrationRaw; pointOnly = $true}
    if ($checks.Values -contains $false) { throw 'Fresh artifact-analysis guard failed' }
    $objects = [Collections.Generic.List[object]]::new()
    $sources = [Collections.Generic.List[object]]::new()
    $commands = [Collections.Generic.List[object]]::new()
    $runRows = [Collections.Generic.List[object]]::new()
    $guardCount = 0
    foreach ($directory in Get-ChildItem -LiteralPath (Join-Path $base 'runs') -Directory | Sort-Object Name)
    {
        $run = [IO.File]::ReadAllText((Join-Path $directory.FullName 'root-result.json')) | ConvertFrom-Json -AsHashtable
        $outer = [IO.File]::ReadAllText((Join-Path $base "$($directory.Name).outer-wait.json")) | ConvertFrom-Json -AsHashtable
        $observed = [IO.File]::ReadAllText((Join-Path $directory.FullName 'observer-result.json')) | ConvertFrom-Json -AsHashtable
        if ($run.failure -or $run.observerExitCode -ne 0 -or -not $run.observerWaitComplete -or
            $outer.childExitCode -ne 0 -or -not $outer.childWaitComplete -or
            $outer.childPid -ne $run.root.pid -or
            ([DateTime]$outer.childCreationUtc).ToUniversalTime().ToFileTimeUtc() -ne $run.root.creationFileTime100ns)
        {
            throw 'Source root/observer termination or creation identity was not established'
        }
        $runRows.Add(@{
            run = $directory.Name; root = $run.root; observer = $run.observer
            outerPid = $outer.outerPid; outerCreationUtc = $outer.outerCreationUtc
            rootWaitComplete = $outer.childWaitComplete; rootExitCode = $outer.childExitCode
            observerWaitComplete = $run.observerWaitComplete; observerExitCode = $run.observerExitCode
            observerSamples = $observed.samples
            maximumSampledSourceDescendantsExcludingObserver = $observed.maximumSampledSourceDescendantsExcludingObserver
            independentlyObservedProcesses = $observed.observedProcesses
            limits = $observed.limits
        })
        foreach ($resultFile in Get-ChildItem -LiteralPath $directory.FullName -Filter 'command-*.result.json' -File | Sort-Object Name)
        {
            $result = [IO.File]::ReadAllText($resultFile.FullName) | ConvertFrom-Json -AsHashtable
            $prefix = $resultFile.FullName.Replace('.result.json', '')
            $guard = [IO.File]::ReadAllText("$prefix.guard.json") | ConvertFrom-Json -AsHashtable
            if ($guard.checks.Values -contains $false) { throw 'A recorded utility guard failed' }
            $guardCount++
            if (-not $result.gitGhSourceRoot) { continue }
            if ($result.exitCode -ne 0 -or -not $result.waitComplete -or $result.failure -or
                $result.child.pid -ne $result.childAfterWait.pid -or
                $result.child.creationFileTime100ns -ne $result.childAfterWait.creationFileTime100ns)
            {
                throw 'Source utility direct wait failed'
            }
            $start = [IO.File]::ReadAllText((Join-Path $prefix 'start.json')) | ConvertFrom-Json -AsHashtable
            $stdin = [IO.File]::ReadAllBytes((Join-Path $prefix 'stdin.raw.bin'))
            $stdout = [IO.File]::ReadAllBytes((Join-Path $prefix 'stdout.raw.bin'))
            $stderr = [IO.File]::ReadAllBytes((Join-Path $prefix 'stderr.raw.bin'))
            if ((Hash $stdin) -cne $start.stdinSha256 -or $stdin.Length -ne $start.stdinSize -or
                (Hash $stdout) -cne $result.stdoutSha256 -or $stdout.Length -ne $result.stdoutSize -or
                (Hash $stderr) -cne $result.stderrSha256 -or $stderr.Length -ne $result.stderrSize -or
                $result.streamsTruncated -ne $false -or $start.cwd -cne 'C:\src\aspnetcore')
            {
                throw 'Source utility raw stream/argv/cwd integrity failed'
            }
            $commands.Add(@{
                result = [IO.Path]::GetRelativePath($base, $resultFile.FullName)
                argv = $result.argv; cwd = $result.cwd; child = $result.child
                exitCode = $result.exitCode; waitComplete = $result.waitComplete
                stdoutSize = $stdout.Length; stderrSize = $stderr.Length
                stdoutSha256 = Hash $stdout; stderrSha256 = Hash $stderr
                sourceRootPid = $run.root.pid; observerPid = $run.observer.pid
            })
            if ($result.kind -cne 'batch') { continue }
            $bindingsPath = Join-Path $prefix 'bindings.json'
            $bindings = [IO.File]::ReadAllText($bindingsPath) | ConvertFrom-Json -AsHashtable
            $specs = [Text.Encoding]::UTF8.GetString($stdin).TrimEnd("`n").Split("`n")
            if ($specs.Count -ne $bindings.Count) { throw 'Batch request/object count mismatch' }
            $offset = 0
            for ($i = 0; $i -lt $bindings.Count; $i++)
            {
                $binding = $bindings[$i]
                if ($binding.missing -or $binding.spec -cne $specs[$i] -or $binding.framingStart -ne $offset) { throw 'Batch selector/framing mismatch' }
                $header = [Text.Encoding]::ASCII.GetBytes("$($binding.objectSha1) $($binding.type) $($binding.size)`n")
                $observedHeader = [byte[]]::new($header.Length)
                [Array]::Copy($stdout, $offset, $observedHeader, 0, $header.Length)
                if (-not (Equal-Bytes $header $observedHeader) -or $binding.payloadStart -ne $offset + $header.Length) { throw 'Batch binary header mismatch' }
                $payload = [byte[]]::new([int]$binding.size)
                [Array]::Copy($stdout, [int]$binding.payloadStart, $payload, 0, $payload.Length)
                $saved = [IO.File]::ReadAllBytes((Join-Path $base $binding.output))
                if (-not (Equal-Bytes $payload $saved) -or $binding.payloadEnd -ne $binding.payloadStart + $payload.Length -or
                    $stdout[$binding.payloadEnd] -ne 10 -or $binding.framingEnd -ne $binding.payloadEnd + 1 -or
                    (Hash $payload) -cne $binding.contentSha256)
                {
                    throw 'Stored object differs from exact binary batch payload'
                }
                $preimage = [Text.Encoding]::ASCII.GetBytes("$($binding.type) $($binding.size)" + [char]0)
                $objectBytes = [byte[]]::new($preimage.Length + $payload.Length)
                [Array]::Copy($preimage, $objectBytes, $preimage.Length)
                [Array]::Copy($payload, 0, $objectBytes, $preimage.Length, $payload.Length)
                $objectId = [Convert]::ToHexString([Security.Cryptography.SHA1]::HashData($objectBytes)).ToLowerInvariant()
                if ($objectId -cne $binding.objectSha1) { throw 'Independent Git object preimage SHA-1 check failed' }
                $row = $binding.Clone()
                $row.rawStdout = [IO.Path]::GetRelativePath($base, (Join-Path $prefix 'stdout.raw.bin'))
                $row.rawStdin = [IO.Path]::GetRelativePath($base, (Join-Path $prefix 'stdin.raw.bin'))
                $row.commandResult = [IO.Path]::GetRelativePath($base, $resultFile.FullName)
                $row.sourceRootPid = $run.root.pid
                $row.observerPid = $run.observer.pid
                $row.directChildPid = $result.child.pid
                $objects.Add($row)
                if ($binding.ContainsKey('logicalPath'))
                {
                    $role = $binding.chargedRoles[0]
                    if ($binding.type -cne 'blob' -or $binding.spec -cne ($commits[$role] + ':' + $binding.logicalPath) -or $specs[0] -cne $commits[$role])
                    {
                        throw 'Role/commit:path binding mismatch'
                    }
                    $row.role = $role
                    $row.commit = $commits[$role]
                    $sources.Add($row)
                }
                elseif ($binding.type -cne 'commit' -or $binding.objectSha1 -cne $binding.spec)
                {
                    throw 'Commit object binding mismatch'
                }
                $offset = [int]$binding.framingEnd
            }
            if ($offset -ne $stdout.Length) { throw 'Unconsumed Git batch stdout bytes' }
        }
    }
    $byRole = @{Original = @{}; Default = @{}}
    foreach ($source in $sources)
    {
        if ($byRole[$source.role].ContainsKey($source.logicalPath)) { throw 'Duplicate role/path whole-source binding' }
        $byRole[$source.role][$source.logicalPath] = $source
    }
    if ($commands.Count -gt 32 -or $byRole.Original.Count -gt 15 -or $byRole.Default.Count -gt 15) { throw 'Source budgets exceeded' }
    $pairs = [Collections.Generic.List[object]]::new()
    foreach ($name in $byRole.Original.Keys | Sort-Object)
    {
        if (-not $byRole.Default.ContainsKey($name)) { throw 'Default counterpart missing' }
        $original = $byRole.Original[$name]
        $default = $byRole.Default[$name]
        $same = Equal-Bytes ([IO.File]::ReadAllBytes((Join-Path $base $original.output))) ([IO.File]::ReadAllBytes((Join-Path $base $default.output)))
        $pairs.Add(@{
            logicalPath = $name; exactOriginalBytesEqualDefaultBytes = $same
            original = $original.output; default = $default.output
            originalSize = $original.size; defaultSize = $default.size
            originalBlobSha1 = $original.objectSha1; defaultBlobSha1 = $default.objectSha1
            originalSha256 = $original.contentSha256; defaultSha256 = $default.contentSha256
            comparison = 'Direct structural equality of complete raw byte arrays, independently bound to Git binary batch frames; no archive/text/EOL normalization.'
        })
    }
    if (@($pairs | Where-Object { -not $_.exactOriginalBytesEqualDefaultBytes }).Count) { throw 'Expected source equality not established; reassessment required' }
    $checksum = $byRole.Original['src/Mvc/Mvc.Razor.RuntimeCompilation/test/ChecksumValidatorTest.cs']
    $checksumText = [Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes((Join-Path $base $checksum.output)))
    $methodMatches = [regex]::Matches($checksumText, '(?m)^\s*public void (?<name>\w+)\(\)')
    $checksumRows = [Collections.Generic.List[object]]::new()
    for ($i = 0; $i -lt $methodMatches.Count; $i++)
    {
        $method = $methodMatches[$i]
        $end = if ($i + 1 -lt $methodMatches.Count) { $methodMatches[$i + 1].Index } else { $checksumText.Length }
        $body = $checksumText.Substring($method.Index, $end - $method.Index)
        $adds = [regex]::Matches($body, 'ProjectFileSystem\.Add\(new TestRazorProjectItem\("([^"]+)"')
        $checksumRows.Add(@{
            name = $method.Groups['name'].Value
            literalAddPaths = @($adds | ForEach-Object { $_.Groups[1].Value })
            sourceAddCallsPerMethodInvocation = $adds.Count
            directIsItemValidCalls = [regex]::Matches($body, 'ChecksumValidator\.IsItemValid\(').Count
            directIsRecompilationSupportedCalls = [regex]::Matches($body, 'ChecksumValidator\.IsRecompilationSupported\(').Count
            executionStatus = 'Named/read only; never run.'
        })
    }
    $factory = $byRole.Original['src/Mvc/Mvc.Razor.RuntimeCompilation/test/CompilerFailedExceptionFactoryTest.cs']
    $factoryText = [Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes((Join-Path $base $factory.output)))
    $factoryMethods = @([regex]::Matches($factoryText, '(?m)^\s*public void (?<name>\w+)\(\)') | ForEach-Object { $_.Groups['name'].Value })
    $upstreamRepository = [IO.File]::ReadAllText((Join-Path $base 'runs\run-02\command-02\stdout.raw.bin')) | ConvertFrom-Json -AsHashtable
    $upstreamReference = [IO.File]::ReadAllText((Join-Path $base 'runs\run-03\command-02\stdout.raw.bin')) | ConvertFrom-Json -AsHashtable
    if ($upstreamRepository.full_name -cne 'dotnet/aspnetcore' -or $upstreamRepository.default_branch -cne 'main' -or
        $upstreamReference.object.sha -cne $commits.Default -or $upstreamReference.ref -cne 'refs/heads/main')
    {
        throw 'Fresh upstream Default identity mismatch'
    }
    New-Json (Join-Path $base 'whole-source-bindings-v2.json') $sources.ToArray()
    New-Json (Join-Path $base 'all-git-object-bindings-v2.json') $objects.ToArray()
    New-Json (Join-Path $base 'role-byte-comparison-v2.json') $pairs.ToArray()
    New-Json (Join-Path $base 'source-test-inventory-v2.json') @{
        methodExtraction = 'Bounded source-text bookkeeping, not compilation, test discovery, test execution or runtime proof.'
        checksumMethods = $checksumRows.ToArray()
        checksumFactMethodCount = $checksumRows.Count
        checksumSourceAddCallsAcrossOneInvocationEachMethod = ($checksumRows | Measure-Object sourceAddCallsPerMethodInvocation -Sum).Sum
        checksumMaximumLiteralAddsInAnyOneMethod = ($checksumRows | Measure-Object sourceAddCallsPerMethodInvocation -Maximum).Maximum
        compilerFactoryMethods = $factoryMethods
        compilerFactoryFactMethodCount = $factoryMethods.Count
        compilerFactoryDirectGetCodeDocumentCalls = [regex]::Matches($factoryText, 'var codeDocument = GetCodeDocument\(').Count
        compilerFactoryHelperNewFilesystemPerCall = $true
        compilerFactoryHelperMaximumFilesPerCall = 2
        compilerFactorySourceDerivedAddsForOneInvocationEachFact = 5
        compilerFactoryIndirectEngineQueriesQualified = $false
        allExistingTestsNamedReadNotRun = $true
    }
    New-Json (Join-Path $base 'source-process-summary-v2.json') @{
        sourceRuns = $runRows.ToArray(); gitGhCommands = $commands.ToArray()
        sourceRootCount = $commands.Count
        sourceUtilityGuardCount = $guardCount
        sourceRunCount = $runRows.Count
        maximumSampledDescendantsExcludingEachRootAndObserver = ($runRows | Measure-Object maximumSampledSourceDescendantsExcludingObserver -Maximum).Maximum
        directSourceCommandsSequentialWithinEachRoot = $true
        sourceStreamDeclaredLimitBytesPerStream = 33554432
        maximumActualStdoutBytes = ($commands | Measure-Object stdoutSize -Maximum).Maximum
        maximumActualStderrBytes = ($commands | Measure-Object stderrSize -Maximum).Maximum
        streamsTruncated = $false
        declaredLimitEnforcement = 'Complete streams retained; the 32MiB per-stream limit is checked after capture, not a byte-truncating cap.'
        sourceCommandWaitDeadlineSeconds = 120
        observerReadyDeadlineSeconds = 15
        observerClosureDeadlineSeconds = 15
        sourceWaitsAndObserverWaitsActuallyCompleted = $true
        observationalLimits = 'Sampled CIM descendants are not complete closure proof; direct process-handle waits establish only owned direct roots. No product, global-idleness or unobserved-child-absence claim.'
        failedInterpreterLaunch = 'launcher-failure-01.json; Python alias PID52916 actually waited exit9009, no source utility started.'
    }
    $target = $byRole.Original['src/Mvc/Mvc.Razor.RuntimeCompilation/test/TestInfrastructure/DirectoryNode.cs']
    $summary = @{
        sourceOnly = $true; actualOwnerId = $owner; upstreamRepository = 'dotnet/aspnetcore'
        upstreamDefaultBranch = 'main'; originalCommit = $commits.Original; defaultCommit = $commits.Default
        defaultReferenceEvidence = 'runs\run-03\command-02\stdout.raw.bin'
        wholeLogicalFileCounts = @{Original = $byRole.Original.Count; Default = $byRole.Default.Count}
        wholeBlobBindings = $sources.Count; gitObjectsVerified = $objects.Count
        identicalWholeOriginalDefaultPairs = $pairs.Count
        gitGhSourceRoots = $commands.Count; maximumGitGhSourceRoots = 32; maximumWholeLogicalFilesPerRole = 15
        targetBlobSha1 = $target.objectSha1; targetSize = $target.size; targetSha256 = $target.contentSha256
        immutableBinaryFramingAndPreimageChecksPassed = $true
        behavioralTestsRun = 0; benchmarksRun = 0; candidateEdits = 0
        root = $root; observer = $observerIdentity
        scopeStillCanonicalPendingParentAcceptance = $true
    }
    New-Json (Join-Path $base 'analysis-result-v2.json') $summary
}
catch
{
    $failure = @{error = $_.ToString(); scriptStackTrace = $_.ScriptStackTrace}
}
finally
{
    New-Json (Join-Path $runDir 'observer-stop.json') @{requestedUtc = [DateTime]::UtcNow.ToString('o'); root = $root}
    if (-not $observer.WaitForExit(15000)) { throw 'Analysis observer outstanding; not blindly killed' }
    $null = $observerOutTask.GetAwaiter().GetResult()
    $null = $observerErrTask.GetAwaiter().GetResult()
    $observerOut.Dispose()
    $observerErr.Dispose()
    New-Json (Join-Path $runDir 'root-result.json') @{
        root = $root; observer = $observerIdentity; observerWaitComplete = $true; observerExitCode = $observer.ExitCode
        observedUtc = [DateTime]::UtcNow.ToString('o'); failure = $failure
        rootExitIsNotSelfAttested = $true
    }
}
[Console]::WriteLine((@{summary = $summary; failure = $failure; observerExitCode = $observer.ExitCode} | ConvertTo-Json -Depth 20 -Compress))
if ($null -ne $failure -or $observer.ExitCode -ne 0) { exit 1 }
exit 0
