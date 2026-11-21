param(
    [Parameter(Mandatory = $true)][string]$Invocation,
    [Parameter(Mandatory = $true)][ValidateSet('discovery', 'capture', 'commands')][string]$Action,
    [string]$Specification = ''
)
$ErrorActionPreference = 'Stop'
$out = $PSScriptRoot
$par = Split-Path -Parent $out
$repo = 'C:\src\aspnetcore'
$original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$reservedHead = '24875ef5dabb55567870b39f6eb0002170435e2f'
$owner = 'ed471f5e-c998-47a0-a617-4b6bcd83121b'
$scope = '267 SOURCE ONLY after GO267 and fresh actual-own-registration/exact-scope/no-lease/no-HOLD/nonquiesced guards. One owner also qualifies F232/F233 at same Identity.Test UserClaimsPrincipalFactoryTest source: actual claims/roles producer/cardinality/test frequency/equality/type/value/order/duplicates/exception contracts/current Default/history/materiality. Initial max15whole logical product/doc/test/config files per role/max32direct Git-gh source roots includingfailures, batch exact raw cat-file bindings. finding-F231-F232-F233-267 only; no fabricated claims/repetition/isolated Contains or duplicate-by-file inference. No SDKactivation/dotnet/build/test/restore/runtime/host/browser/server/scenario/candidate/source edits/timing/warmup/allocation/profiler/counters/remote/subagent/shared/policy/lease/ledger/publication/API/default/cache/assertion/message/manifest/IVT/UnsafeAccessor/cleanup authority. Source-only no material candidate valid, stop finite proposal before broadening; seal actual whole source/failures/terminal evidence.'
$roots = Join-Path $out 'roots'
$observer = [ordered]@{
    pid = $PID
    startUtc = (Get-Process -Id $PID).StartTime.ToUniversalTime().ToString('o')
    creationFileTimeUtc = (Get-Process -Id $PID).StartTime.ToFileTimeUtc()
    processPath = (Get-Process -Id $PID).Path
    role = 'Actual owning PowerShell source utility and in-process CIM observer'
}

function Write-NewJson([string]$Path, $Value)
{
    if (Test-Path -LiteralPath $Path)
    {
        throw "Refusing overwrite: $Path"
    }
    $parentPath = Split-Path -Parent $Path
    $null = [IO.Directory]::CreateDirectory($parentPath)
    [IO.File]::WriteAllText($Path, (($Value | ConvertTo-Json -Depth 60) + "`n"), [Text.UTF8Encoding]::new($false))
}

function Get-BytesMetadata([string]$Path)
{
    $data = [IO.File]::ReadAllBytes($Path)
    return [ordered]@{
        path = [IO.Path]::GetRelativePath($out, $Path)
        bytes = $data.Length
        sha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($data))
    }
}

function Assert-FreshGuard([string]$Label)
{
    $data = [IO.File]::ReadAllBytes((Join-Path $par 'policy.json'))
    $policy = [Text.Encoding]::UTF8.GetString($data) | ConvertFrom-Json
    if ($policy.independentFindingPreparationWorkers.F231 -cne $owner -or
        $policy.activeWorkerPreparationScopes.F231 -cne $scope -or
        $policy.maximumRegisteredPreparationOwners -ne 4 -or
        @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count -gt 4 -or
        $policy.actualWorkerBuildHoldActive -cne $false -or
        $policy.buildAndTestWorkQuiesced -cne $false -or
        (Test-Path -LiteralPath (Join-Path $par 'benchmark-exclusive.lease.json')))
    {
        throw 'Fresh exact F231/267 owner/scope/lease/HOLD/nonquiescence guard failed.'
    }
    $guardFolder = Join-Path $out 'guards'
    $null = [IO.Directory]::CreateDirectory($guardFolder)
    $policyCopy = Join-Path $guardFolder "$Label-policy.json"
    if (Test-Path -LiteralPath $policyCopy)
    {
        throw "Guard already exists: $Label"
    }
    [IO.File]::WriteAllBytes($policyCopy, $data)
    $result = [ordered]@{
        observedAt = [DateTime]::UtcNow.ToString('o')
        ownerId = $owner
        scope = $scope
        policy = Get-BytesMetadata $policyCopy
        leaseAbsentAtObservation = $true
        actualWorkerBuildHoldActive = $false
        buildAndTestWorkQuiesced = $false
        registeredOwnerCount = @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count
        observer = $observer
        pointOnlyNotFutureAuthorization = $true
    }
    Write-NewJson (Join-Path $guardFolder "$Label.json") $result
    return $result
}

function Get-ProcessSnapshot
{
    return @(Get-CimInstance -ClassName Win32_Process -Property ProcessId, ParentProcessId, CreationDate, Name |
        ForEach-Object {
            [pscustomobject]@{
                pid = [int]$_.ProcessId
                parentPid = [int]$_.ParentProcessId
                executableName = $_.Name
                creationUtc = if ($null -ne $_.CreationDate) { $_.CreationDate.ToUniversalTime().ToString('o') } else { $null }
            }
        })
}

function Add-ObservedChildren($Snapshot, [int]$RootPid, $Observed)
{
    $parents = [Collections.Generic.HashSet[int]]::new()
    $null = $parents.Add($RootPid)
    foreach ($child in $Observed.Values)
    {
        if (@($Snapshot | Where-Object { $_.pid -eq $child.pid -and $_.creationUtc -ceq $child.creationUtc }).Count -eq 1)
        {
            $null = $parents.Add($child.pid)
        }
    }
    $added = $true
    while ($added)
    {
        $added = $false
        foreach ($entry in $Snapshot)
        {
            if ($parents.Contains($entry.pid) -or -not $parents.Contains($entry.parentPid))
            {
                continue
            }
            $key = "$($entry.pid)|$($entry.creationUtc)"
            if (-not $Observed.ContainsKey($key))
            {
                $Observed[$key] = [ordered]@{
                    pid = $entry.pid
                    parentPid = $entry.parentPid
                    creationUtc = $entry.creationUtc
                    executableName = $entry.executableName
                    firstObservedAt = [DateTime]::UtcNow.ToString('o')
                }
            }
            $null = $parents.Add($entry.pid)
            $added = $true
        }
    }
}

function Invoke-Source([string]$Label, [string]$Executable, [string[]]$Arguments, [byte[]]$InputBytes = @())
{
    $null = [IO.Directory]::CreateDirectory($roots)
    $sequence = @(Get-ChildItem -LiteralPath $roots -Filter '*.before.json' -File).Count +
        @(Get-ChildItem -LiteralPath $roots -Filter '*.prestart-failure.json' -File).Count + 1
    if ($sequence -gt 32)
    {
        throw 'Direct Git/gh source root budget exhausted.'
    }
    $name = '{0:D2}-{1}' -f $sequence, $Label
    $authorization = Assert-FreshGuard $name
    if ($Executable -cnotin @('git', 'gh'))
    {
        throw 'Only Git/gh source roots are authorized.'
    }
    $commandPath = (Get-Command -Name $Executable -CommandType Application -ErrorAction Stop).Source
    $argumentsFinal = if ($Executable -ceq 'git') { @('--no-pager', '-C', $repo) + $Arguments } else { $Arguments }
    $stdinPath = Join-Path $roots "$name.stdin.bin"
    [IO.File]::WriteAllBytes($stdinPath, $InputBytes)
    $before = [ordered]@{
        sequence = $sequence
        label = $Label
        argv = @($commandPath) + $argumentsFinal
        cwd = $repo
        stdin = Get-BytesMetadata $stdinPath
        startRequestedAt = [DateTime]::UtcNow.ToString('o')
        observer = $observer
        guardPolicySha256 = $authorization.policy.sha256
        rootBudgetIncludingThisAttempt = $sequence
        sourceOnly = $true
    }
    Write-NewJson (Join-Path $roots "$name.before.json") $before
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = $commandPath
    $start.WorkingDirectory = $repo
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $start.RedirectStandardInput = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    foreach ($argument in $argumentsFinal)
    {
        $start.ArgumentList.Add($argument)
    }
    $start.Environment['GIT_PAGER'] = 'cat'
    $start.Environment['PAGER'] = 'cat'
    $start.Environment['GIT_OPTIONAL_LOCKS'] = '0'
    $start.Environment['GIT_TERMINAL_PROMPT'] = '0'
    $start.Environment['GH_PROMPT_DISABLED'] = '1'
    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $start
    if (-not $process.Start())
    {
        throw "Source root failed to start: $name"
    }
    $root = [ordered]@{
        pid = $process.Id
        startUtc = $process.StartTime.ToUniversalTime().ToString('o')
        creationFileTimeUtc = $process.StartTime.ToFileTimeUtc()
        identityBoundByOwnedProcessHandle = $true
        executable = $commandPath
    }
    Write-NewJson (Join-Path $roots "$name.started.json") ([ordered]@{ observedAt = [DateTime]::UtcNow.ToString('o'); root = $root; observer = $observer })
    $stdoutPath = Join-Path $roots "$name.stdout.bin"
    $stderrPath = Join-Path $roots "$name.stderr.bin"
    $stdout = [IO.File]::Open($stdoutPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    $stderr = [IO.File]::Open($stderrPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    $stdoutTask = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
    $stderrTask = $process.StandardError.BaseStream.CopyToAsync($stderr)
    $process.StandardInput.BaseStream.Write($InputBytes, 0, $InputBytes.Length)
    $process.StandardInput.Close()
    $observed = @{}
    $snapshotCount = 0
    $deadline = [DateTime]::UtcNow.AddSeconds(120)
    do
    {
        $snapshot = Get-ProcessSnapshot
        $snapshotCount++
        Add-ObservedChildren $snapshot $root.pid $observed
        $rootExited = $process.WaitForExit(50)
    } while (-not $rootExited -and [DateTime]::UtcNow -lt $deadline)
    if (-not $rootExited)
    {
        Write-NewJson (Join-Path $roots "$name.INCOMPLETE.json") ([ordered]@{ root = $root; observer = $observer; rootExited = $false; outstanding = $true; noProcessTerminationAttempted = $true })
        throw "Source root exceeded deadline; terminal status unqualified: $name"
    }
    $process.WaitForExit()
    $stdoutCompleted = $stdoutTask.Wait(15000)
    $stderrCompleted = $stderrTask.Wait(15000)
    if (-not $stdoutCompleted -or -not $stderrCompleted)
    {
        Write-NewJson (Join-Path $roots "$name.STREAMS-INCOMPLETE.json") ([ordered]@{ root = $root; rootExited = $true; stdoutCompleted = $stdoutCompleted; stderrCompleted = $stderrCompleted; noSuccessClaim = $true })
        throw "Source streams did not both close: $name"
    }
    $null = $stdoutTask.GetAwaiter().GetResult()
    $null = $stderrTask.GetAwaiter().GetResult()
    $stdout.Dispose()
    $stderr.Dispose()
    $childDeadline = [DateTime]::UtcNow.AddSeconds(15)
    do
    {
        $finalSnapshot = Get-ProcessSnapshot
        $snapshotCount++
        $liveObserved = @($observed.Values | Where-Object {
            $child = $_
            @($finalSnapshot | Where-Object { $_.pid -eq $child.pid -and $_.creationUtc -ceq $child.creationUtc }).Count -gt 0
        })
        if ($liveObserved.Count -gt 0)
        {
            Start-Sleep -Milliseconds 50
        }
    } while ($liveObserved.Count -gt 0 -and [DateTime]::UtcNow -lt $childDeadline)
    $children = @($observed.Values | ForEach-Object {
        $child = $_
        [ordered]@{
            pid = $child.pid
            parentPid = $child.parentPid
            creationUtc = $child.creationUtc
            executableName = $child.executableName
            firstObservedAt = $child.firstObservedAt
            terminalEstablished = $null -ne $child.creationUtc -and @($finalSnapshot | Where-Object { $_.pid -eq $child.pid -and $_.creationUtc -ceq $child.creationUtc }).Count -eq 0
            terminalBasis = 'Same PID plus CIM creation identity absent in final successful process snapshot'
        }
    })
    $exitCode = $process.ExitCode
    $receipt = [ordered]@{
        sequence = $sequence
        label = $Label
        argv = $before.argv
        cwd = $repo
        stdin = $before.stdin
        startRequestedAt = $before.startRequestedAt
        completedObservationAt = [DateTime]::UtcNow.ToString('o')
        root = $root
        observer = $observer
        rootExited = $true
        rootWaitCalledAndReturned = $true
        exitCode = $exitCode
        rootExitUtc = $process.ExitTime.ToUniversalTime().ToString('o')
        stdoutDrainCompletedAndEof = $stdoutTask.IsCompletedSuccessfully
        stderrDrainCompletedAndEof = $stderrTask.IsCompletedSuccessfully
        stdout = Get-BytesMetadata $stdoutPath
        stderr = Get-BytesMetadata $stderrPath
        observedChildren = $children
        allObservedChildrenTerminal = @($children | Where-Object { -not $_.terminalEstablished }).Count -eq 0
        processSnapshotCount = $snapshotCount
        observationLimits = [ordered]@{
            rootDeadlineSeconds = 120
            rootPollWaitMilliseconds = 50
            cimSnapshotLatencyUnboundedWithinRootDeadlineCheck = $true
            perStreamWaitSeconds = 15
            observedChildClosureSeconds = 15
            jobObjectContainment = $false
            shortLivedOrUnobservedDescendantsExcluded = $false
            scope = 'Owned creation-bound Git/gh root; sampled creation-bound descendants only. Not a machine-wide quiescence proof.'
            noProcessWasTerminated = $true
        }
    }
    $receipt.terminalSuccess = $exitCode -eq 0 -and $receipt.stdoutDrainCompletedAndEof -and $receipt.stderrDrainCompletedAndEof -and $receipt.allObservedChildrenTerminal
    Write-NewJson (Join-Path $roots "$name.receipt.json") $receipt
    $process.Dispose()
    if (-not $receipt.terminalSuccess)
    {
        throw "Source root failed or had nonterminal observed children: $name"
    }
    return [pscustomobject]@{ Bytes = [IO.File]::ReadAllBytes($stdoutPath); Receipt = $receipt }
}

try
{
    $null = Assert-FreshGuard "utility-$Invocation"
    if ($Action -ceq 'discovery')
    {
        $repositoryResult = Invoke-Source 'upstream-default-branch' 'gh' @('api', 'repos/dotnet/aspnetcore', '--jq', '{full_name,default_branch}')
        $repository = [Text.Encoding]::UTF8.GetString($repositoryResult.Bytes) | ConvertFrom-Json
        if ($repository.full_name -cne 'dotnet/aspnetcore')
        {
            throw 'Unexpected upstream repository identity.'
        }
        $referenceResult = Invoke-Source 'upstream-default-commit' 'gh' @('api', "repos/dotnet/aspnetcore/git/ref/heads/$([Uri]::EscapeDataString($repository.default_branch))")
        $reference = [Text.Encoding]::UTF8.GetString($referenceResult.Bytes) | ConvertFrom-Json
        if ($reference.ref -cne "refs/heads/$($repository.default_branch)" -or $reference.object.type -cne 'commit' -or $reference.object.sha -cnotmatch '^[0-9a-f]{40}$')
        {
            throw 'Unexpected upstream default reference identity.'
        }
        $default = $reference.object.sha
        $identityResult = Invoke-Source 'reserved-and-original-identity' 'git' @('rev-parse', 'HEAD', "$original`^{commit}")
        $identities = [Text.Encoding]::ASCII.GetString($identityResult.Bytes).TrimEnd("`r", "`n") -split "`r?`n"
        if ($identities.Count -ne 2 -or $identities[0] -cne $reservedHead -or $identities[1] -cne $original)
        {
            throw 'Reserved navigation/objectstore or Original identity changed.'
        }
        $availabilityResult = Invoke-Source 'immutable-commit-availability' 'git' @('cat-file', '--batch-check') ([Text.Encoding]::ASCII.GetBytes("$original`n$default`n"))
        $availability = [Text.Encoding]::ASCII.GetString($availabilityResult.Bytes).TrimEnd("`r", "`n") -split "`r?`n"
        if ($availability.Count -ne 2 -or -not $availability[0].StartsWith("$original commit "))
        {
            throw 'Original immutable commit unavailable.'
        }
        $available = $availability[1].StartsWith("$default commit ")
        $selectors = @(
            'AGENTS.md', 'src/AGENTS.md', '.github/AGENTS.md',
            '.github/instructions/cross-cutting-guidance.instructions.md',
            'src/Identity/AGENTS.md', 'src/Identity/test/AGENTS.md',
            'src/Identity/test/Identity.Test', 'src/Identity/Extensions.Core'
        )
        $roleCommits = [ordered]@{ Original = $original }
        if ($available)
        {
            $roleCommits.Default = $default
        }
        foreach ($role in $roleCommits.Keys)
        {
            $inventory = Invoke-Source "$($role.ToLowerInvariant())-bounded-path-inventory" 'git' (@('ls-tree', '-r', '--name-only', $roleCommits[$role], '--') + $selectors)
            Write-Output "$role bounded inventory:"
            Write-Output ([Text.Encoding]::UTF8.GetString($inventory.Bytes))
        }
        Write-NewJson (Join-Path $out 'discovery-267.json') ([ordered]@{
            freshUpstream = [ordered]@{ repository = $repository.full_name; defaultBranch = $repository.default_branch; commit = $default; reference = $reference }
            Original = $original
            Default = $default
            reservedHead = $reservedHead
            reservedRepositoryUse = 'Read-only navigation/objectstore only; never a source role'
            localDefaultObjectAvailable = $available
            availabilityResponse = $availability
            selectors = $selectors
            observedAt = [DateTime]::UtcNow.ToString('o')
        })
        Write-Output "DISCOVERY267 defaultBranch=$($repository.default_branch) defaultCommit=$default localDefaultAvailable=$available"
    }
    elseif ($Action -ceq 'capture')
    {
        $spec = Get-Content -LiteralPath (Join-Path $out $Specification) -Raw | ConvertFrom-Json
        $discovery = Get-Content -LiteralPath (Join-Path $out 'discovery-267.json') -Raw | ConvertFrom-Json
        foreach ($role in $spec.roles)
        {
            if ($role -cnotin @('Original', 'Default'))
            {
                throw 'Unknown immutable source role.'
            }
            $commit = $discovery.$role
            $paths = @($spec.paths)
            $previous = @(Get-ChildItem -LiteralPath $out -Filter 'bindings-*.json' -File | ForEach-Object {
                (Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json).files | Where-Object { $_.role -ceq $role } | ForEach-Object { $_.repositoryPath }
            })
            if (@($paths | Select-Object -Unique).Count -ne $paths.Count -or
                @($previous + $paths | Select-Object -Unique).Count -gt 15 -or
                @($paths | Where-Object { $_ -cin $previous }).Count -gt 0)
            {
                throw "Whole logical source file budget or recapture check failed for $role."
            }
            $expressions = @($paths | ForEach-Object { "$commit`:$($_)" })
            $inputData = [Text.Encoding]::UTF8.GetBytes(($expressions -join "`n") + "`n")
            $captured = Invoke-Source "$($role.ToLowerInvariant())-raw-blobs-$($spec.label)" 'git' @('cat-file', '--batch') $inputData
            [byte[]]$raw = $captured.Bytes
            $cursor = 0
            $bindings = @()
            for ($i = 0; $i -lt $paths.Count; $i++)
            {
                $newline = [Array]::IndexOf($raw, [byte]10, $cursor)
                if ($newline -lt $cursor)
                {
                    throw "Missing batch header for $($expressions[$i])"
                }
                $header = [Text.Encoding]::ASCII.GetString($raw, $cursor, $newline - $cursor)
                if ($header -cnotmatch '^([0-9a-f]{40}) blob (0|[1-9][0-9]*)$')
                {
                    throw "Unexpected exact raw batch header: $header"
                }
                $blobSha1 = $Matches[1]
                $size = [int]::Parse($Matches[2], [Globalization.CultureInfo]::InvariantCulture)
                $startOffset = $newline + 1
                $endOffset = $startOffset + $size
                if ($endOffset -ge $raw.Length -or $raw[$endOffset] -ne 10)
                {
                    throw "Invalid raw batch payload boundary for $($expressions[$i])"
                }
                $payload = [byte[]]::new($size)
                [Array]::Copy($raw, $startOffset, $payload, 0, $size)
                $gitHeader = [Text.Encoding]::ASCII.GetBytes("blob $size`0")
                $gitBytes = [byte[]]::new($gitHeader.Length + $payload.Length)
                [Array]::Copy($gitHeader, 0, $gitBytes, 0, $gitHeader.Length)
                [Array]::Copy($payload, 0, $gitBytes, $gitHeader.Length, $payload.Length)
                $calculatedSha1 = [Convert]::ToHexString([Security.Cryptography.SHA1]::HashData($gitBytes)).ToLowerInvariant()
                if ($calculatedSha1 -cne $blobSha1)
                {
                    throw "Whole Git blob SHA-1 mismatch for $($expressions[$i])"
                }
                $destination = Join-Path (Join-Path (Join-Path $out 'sources') $role) ($paths[$i].Replace('/', '\'))
                if (Test-Path -LiteralPath $destination)
                {
                    throw "Source already exists: $destination"
                }
                $null = [IO.Directory]::CreateDirectory((Split-Path -Parent $destination))
                [IO.File]::WriteAllBytes($destination, $payload)
                $sourceMeta = Get-BytesMetadata $destination
                $payloadSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($payload))
                if ($sourceMeta.sha256 -cne $payloadSha256 -or $sourceMeta.bytes -ne $size)
                {
                    throw 'Whole source file write verification failed.'
                }
                $bindings += [ordered]@{
                    role = $role
                    commit = $commit
                    repositoryPath = $paths[$i]
                    commitPathExpression = $expressions[$i]
                    objectType = 'blob'
                    blobSha1 = $blobSha1
                    calculatedGitBlobSha1 = $calculatedSha1
                    sha256 = $payloadSha256
                    bytes = $size
                    wholeBlob = $true
                    rawHeaderOffset = $cursor
                    rawPayloadOffset = $startOffset
                    rawPayloadEndExclusive = $endOffset
                    rawHeaderAscii = $header
                    rawStdout = $captured.Receipt.stdout
                    sourceFile = $sourceMeta.path
                    binaryFramingValidated = $true
                }
                $cursor = $endOffset + 1
            }
            if ($cursor -ne $raw.Length)
            {
                throw 'Raw cat-file output has unconsumed bytes.'
            }
            Write-NewJson (Join-Path $out "bindings-$($spec.label)-$role.json") ([ordered]@{
                label = $spec.label
                role = $role
                commit = $commit
                files = $bindings
                requestOrderValidated = $true
                allRawStdoutBytesConsumed = $true
                sourceRootSequence = $captured.Receipt.sequence
            })
            Write-Output "CAPTURE267 role=$role wholeFiles=$($bindings.Count) totalRoleFiles=$(@($previous + $paths | Select-Object -Unique).Count)"
        }
    }
    elseif ($Action -ceq 'commands')
    {
        $spec = Get-Content -LiteralPath (Join-Path $out $Specification) -Raw | ConvertFrom-Json
        foreach ($command in $spec.commands)
        {
            $argv = @($command.argv)
            [byte[]]$inputData = [byte[]]::new(0)
            if ($null -ne $command.stdin)
            {
                $inputData = [Text.Encoding]::UTF8.GetBytes([string]$command.stdin)
            }
            $result = Invoke-Source $command.label $argv[0] @($argv | Select-Object -Skip 1) $inputData
            Write-Output "COMMAND267 label=$($command.label) sourceRoot=$($result.Receipt.sequence) stdoutBytes=$($result.Bytes.Length)"
            if ($command.display -ceq $true)
            {
                Write-Output ([Text.Encoding]::UTF8.GetString($result.Bytes))
            }
        }
    }
    Write-NewJson (Join-Path $out "utility-$Invocation-terminal.json") ([ordered]@{
        observedAt = [DateTime]::UtcNow.ToString('o')
        observer = $observer
        action = $Action
        specification = $Specification
        sourceActionReturnedNormally = $true
        directGitGhSourceRoots = @(Get-ChildItem -LiteralPath $roots -Filter '*.before.json' -File).Count
        outerToolReturnNotYetObserved = $true
    })
    Write-Output "SOURCE_UTILITY267 invocation=$Invocation action=$Action actionComplete=True outerToolReturnNotYetObserved=True"
}
catch
{
    Write-NewJson (Join-Path $out "failure-$Invocation.json") ([ordered]@{
        observedAt = [DateTime]::UtcNow.ToString('o')
        observer = $observer
        action = $Action
        specification = $Specification
        exception = $_.Exception.ToString()
        scriptStackTrace = $_.ScriptStackTrace
        failureRethrown = $true
        noSuccessSubstitution = $true
    })
    throw
}
