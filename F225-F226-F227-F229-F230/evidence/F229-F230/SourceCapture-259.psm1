$ErrorActionPreference = 'Stop'
$script:Root = $PSScriptRoot
$script:Repository = 'C:\src\aspnetcore'
$script:ParallelRoot = Split-Path $PSScriptRoot -Parent
$script:Acceptance = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'ACCEPTANCE-259.json')) | ConvertFrom-Json

function Write-EvidenceJson {
    param([string]$Path, $Value)
    [IO.Directory]::CreateDirectory((Split-Path $Path -Parent)) | Out-Null
    [IO.File]::WriteAllText($Path, ($Value | ConvertTo-Json -Depth 50), [Text.UTF8Encoding]::new($false))
}

function Get-BytesSha256 {
    param([byte[]]$Bytes)
    [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($Bytes))
}

function Get-ObserverIdentity {
    $current = [Diagnostics.Process]::GetCurrentProcess()
    $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $PID"
    [ordered]@{
        pid = $PID
        startUtc = $current.StartTime.ToUniversalTime().ToString('o')
        executable = $current.MainModule.FileName
        commandLine = $cim.CommandLine
        parentPid = $cim.ParentProcessId
        observedUtc = [DateTime]::UtcNow.ToString('o')
    }
}

function Start-OneShotStage {
    param([string]$Name, [string]$Entrypoint)
    $path = Join-Path $script:Root "$Name.started.json"
    if ([IO.File]::Exists($path)) {
        throw "One-shot stage already started: $Name"
    }
    Write-EvidenceJson $path ([ordered]@{
        stage = $Name
        observer = Get-ObserverIdentity
        entrypoint = $Entrypoint
        entrypointSha256 = Get-BytesSha256 ([IO.File]::ReadAllBytes($Entrypoint))
        librarySha256 = Get-BytesSha256 ([IO.File]::ReadAllBytes((Join-Path $script:Root 'SourceCapture-259.psm1')))
        replayAllowed = $false
        nativeUtilitiesStarted = 0
    })
}

function Assert-FreshSourceGuard {
    param([string]$Directory)
    [IO.Directory]::CreateDirectory($Directory) | Out-Null
    $policyPath = Join-Path $script:ParallelRoot 'policy.json'
    $bytes = [IO.File]::ReadAllBytes($policyPath)
    $policy = [Text.Encoding]::UTF8.GetString($bytes) | ConvertFrom-Json
    [IO.File]::WriteAllBytes((Join-Path $Directory 'policy-before-start.json'), $bytes)
    $leasePath = Join-Path $script:ParallelRoot 'benchmark-exclusive.lease.json'
    $owners = @($policy.independentFindingPreparationWorkers.PSObject.Properties)
    $guard = [ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('o')
        ownerId = $policy.independentFindingPreparationWorkers.F229
        expectedOwnerId = $script:Acceptance.ownerId
        exactScope = $policy.activeWorkerPreparationScopes.F229
        expectedExactScope = $script:Acceptance.requiredFreshGuardBeforeEveryNativeSourceUtility.'activeWorkerPreparationScopes.F229'
        registeredOwnerCount = $owners.Count
        maximumOwners = 4
        leaseExists = ([IO.File]::Exists($leasePath) -or [IO.Directory]::Exists($leasePath))
        actualWorkerBuildHoldActive = $policy.actualWorkerBuildHoldActive
        buildAndTestWorkQuiesced = $policy.buildAndTestWorkQuiesced
        policySha256 = Get-BytesSha256 $bytes
        observer = Get-ObserverIdentity
    }
    $passed = $guard.ownerId -ceq $guard.expectedOwnerId -and
        $guard.exactScope -ceq $guard.expectedExactScope -and
        $guard.registeredOwnerCount -le 4 -and
        -not $guard.leaseExists -and
        $guard.actualWorkerBuildHoldActive -is [bool] -and
        $guard.actualWorkerBuildHoldActive -eq $false -and
        $guard.buildAndTestWorkQuiesced -is [bool] -and
        $guard.buildAndTestWorkQuiesced -eq $false
    $guard['passed'] = $passed
    Write-EvidenceJson (Join-Path $Directory 'guard-before-start.json') $guard
    if (-not $passed) {
        throw 'Fresh source guard closed. No native utility may start.'
    }
    $guard
}

function Observe-DirectChildren {
    param([int]$ParentId, [hashtable]$Observed, [Collections.Generic.List[object]]$Snapshots)
    $now = [DateTime]::UtcNow.ToString('o')
    $rows = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $ParentId")
    $Snapshots.Add([ordered]@{ utc = $now; parentPid = $ParentId; observedChildPids = @($rows | ForEach-Object { $_.ProcessId }) })
    foreach ($row in $rows) {
        $key = "$($row.ProcessId)|$($row.CreationDate)"
        if (-not $Observed.ContainsKey($key)) {
            $Observed[$key] = [ordered]@{
                pid = [int]$row.ProcessId
                parentPid = [int]$row.ParentProcessId
                creationUtc = $row.CreationDate.ToUniversalTime().ToString('o')
                executable = $row.ExecutablePath
                commandLine = $row.CommandLine
                firstObservedUtc = $now
                terminalObserved = $false
            }
        }
    }
}

function Invoke-GuardedSourceUtility {
    param(
        [string]$Label,
        [ValidateSet('git', 'gh')][string]$Program,
        [string[]]$Arguments,
        [byte[]]$InputBytes = @(),
        [int[]]$AcceptedExitCodes = @(0)
    )
    $utilityRoot = Join-Path $script:Root 'utilities'
    [IO.Directory]::CreateDirectory($utilityRoot) | Out-Null
    $existing = @(Get-ChildItem -LiteralPath $utilityRoot -Directory)
    if ($existing.Count -ge 32) {
        throw 'Direct Git/gh source-utility root budget exhausted. Submit a finite proposal.'
    }
    $ordinal = $existing.Count + 1
    $directory = Join-Path $utilityRoot ('{0:d2}-{1}' -f $ordinal, $Label)
    if ([IO.Directory]::Exists($directory)) {
        throw "Utility directory already exists: $directory"
    }
    [IO.Directory]::CreateDirectory($directory) | Out-Null
    [IO.File]::WriteAllBytes((Join-Path $directory 'stdin.bin'), $InputBytes)
    $fileName = (Get-Command $Program -CommandType Application | Select-Object -First 1).Source
    $info = [Diagnostics.ProcessStartInfo]::new()
    $info.FileName = $fileName
    $info.WorkingDirectory = $script:Repository
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardInput = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    foreach ($argument in $Arguments) {
        $info.ArgumentList.Add($argument)
    }
    $info.Environment['GIT_OPTIONAL_LOCKS'] = '0'
    $info.Environment['GIT_TERMINAL_PROMPT'] = '0'
    $info.Environment['GIT_PAGER'] = ''
    $info.Environment['GH_PAGER'] = ''
    $info.Environment['GH_PROMPT_DISABLED'] = '1'
    $info.Environment['GH_NO_UPDATE_NOTIFIER'] = '1'
    $info.Environment['GH_NO_EXTENSION_UPDATE_NOTIFIER'] = '1'
    $stdoutPath = Join-Path $directory 'stdout.bin'
    $stderrPath = Join-Path $directory 'stderr.bin'
    $stdout = [IO.File]::Create($stdoutPath)
    $stderr = [IO.File]::Create($stderrPath)
    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $info
    $children = @{}
    $snapshots = [Collections.Generic.List[object]]::new()
    $waits = [Collections.Generic.List[object]]::new()
    $receipt = [ordered]@{
        label = $Label
        ordinal = $ordinal
        mode = 'read-only-source'
        executable = $fileName
        argv = $Arguments
        workingDirectory = $script:Repository
        stdinPath = Join-Path $directory 'stdin.bin'
        stdinSha256 = Get-BytesSha256 $InputBytes
        stdoutPath = $stdoutPath
        stderrPath = $stderrPath
        observer = Get-ObserverIdentity
        descendantObservationBoundary = 'Bounded CIM snapshots of direct roots and observed descendants; unobserved short-lived children are not proven absent.'
        enclosingToolCompletion = 'Not observable from inside this helper; the agent must observe the enclosing tool return.'
    }
    Write-EvidenceJson (Join-Path $directory 'launch-intent.json') $receipt
    try {
        $receipt['guard'] = Assert-FreshSourceGuard $directory
        $receipt['startRequestedUtc'] = [DateTime]::UtcNow.ToString('o')
        if (-not $process.Start()) {
            throw 'Process.Start returned false.'
        }
        $receipt['rootPid'] = $process.Id
        $receipt['rootStartUtc'] = $process.StartTime.ToUniversalTime().ToString('o')
        $receipt['rootExecutableRequested'] = $process.StartInfo.FileName
        $receipt['observerAndRootDistinct'] = $process.Id -ne $PID
        $outTask = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
        $errTask = $process.StandardError.BaseStream.CopyToAsync($stderr)
        $rootCim = @(Get-CimInstance Win32_Process -Filter "ProcessId = $($process.Id)")
        $receipt['rootCimAtFirstObservation'] = @($rootCim | ForEach-Object {
            [ordered]@{ pid = $_.ProcessId; parentPid = $_.ParentProcessId; creationUtc = $_.CreationDate.ToUniversalTime().ToString('o'); executable = $_.ExecutablePath; commandLine = $_.CommandLine }
        })
        Observe-DirectChildren $process.Id $children $snapshots
        if ($InputBytes.Length -gt 0) {
            $process.StandardInput.BaseStream.Write($InputBytes, 0, $InputBytes.Length)
            $process.StandardInput.BaseStream.Flush()
        }
        $process.StandardInput.Close()
        $deadline = [DateTime]::UtcNow.AddSeconds(180)
        do {
            $exited = $process.WaitForExit(100)
            $waits.Add([ordered]@{ operation = 'root.WaitForExit(100)'; returned = $exited; observedUtc = [DateTime]::UtcNow.ToString('o') })
            if (-not $exited) {
                Observe-DirectChildren $process.Id $children $snapshots
                foreach ($entry in @($children.Values)) {
                    Observe-DirectChildren $entry.pid $children $snapshots
                }
            }
            if (-not $exited -and [DateTime]::UtcNow -gt $deadline) {
                throw 'Bounded source-utility wait expired; no retry authorized.'
            }
        } while (-not $exited)
        $process.WaitForExit()
        $waits.Add([ordered]@{ operation = 'root.WaitForExit()'; returned = $true; observedUtc = [DateTime]::UtcNow.ToString('o') })
        Observe-DirectChildren $process.Id $children $snapshots
        foreach ($child in @($children.Values)) {
            $live = @(Get-CimInstance Win32_Process -Filter "ProcessId = $($child.pid)")
            if ($live.Count -eq 1 -and $live[0].CreationDate.ToUniversalTime().ToString('o') -ceq $child.creationUtc) {
                $childProcess = [Diagnostics.Process]::GetProcessById($child.pid)
                $childExited = $childProcess.WaitForExit(30000)
                $waits.Add([ordered]@{ operation = 'observedChild.WaitForExit(30000)'; pid = $child.pid; returned = $childExited; observedUtc = [DateTime]::UtcNow.ToString('o') })
                if (-not $childExited) {
                    throw "Observed child remains active: $($child.pid)"
                }
                $child['exitCodeIfObserved'] = $childProcess.ExitCode
                $childProcess.Dispose()
            }
            $after = @(Get-CimInstance Win32_Process -Filter "ProcessId = $($child.pid)")
            $child.terminalObserved = $after.Count -eq 0 -or $after[0].CreationDate.ToUniversalTime().ToString('o') -cne $child.creationUtc
            $child['terminalObservedUtc'] = [DateTime]::UtcNow.ToString('o')
            if (-not $child.terminalObserved) {
                throw "Observed child terminal identity not established: $($child.pid)"
            }
        }
        $outTask.GetAwaiter().GetResult()
        $receipt['stdoutCopyTaskCompleted'] = $outTask.IsCompletedSuccessfully
        $errTask.GetAwaiter().GetResult()
        $receipt['stderrCopyTaskCompleted'] = $errTask.IsCompletedSuccessfully
        $stdout.Flush()
        $stderr.Flush()
        $stdout.Dispose()
        $stderr.Dispose()
        $receipt['exitCode'] = $process.ExitCode
        $receipt['rootHasExitedObserved'] = $process.HasExited
        $receipt['rootExitUtc'] = $process.ExitTime.ToUniversalTime().ToString('o')
        $receipt['observedChildren'] = @($children.Values)
        $receipt['childSnapshots'] = $snapshots.ToArray()
        $receipt['waits'] = $waits.ToArray()
        $receipt['stdoutLength'] = [IO.FileInfo]::new($stdoutPath).Length
        $receipt['stderrLength'] = [IO.FileInfo]::new($stderrPath).Length
        $receipt['stdoutSha256'] = Get-BytesSha256 ([IO.File]::ReadAllBytes($stdoutPath))
        $receipt['stderrSha256'] = Get-BytesSha256 ([IO.File]::ReadAllBytes($stderrPath))
        $receipt['completedUtc'] = [DateTime]::UtcNow.ToString('o')
        $receipt['acceptedExitCode'] = $AcceptedExitCodes -contains $receipt.exitCode
        Write-EvidenceJson (Join-Path $directory 'receipt.json') $receipt
        if (-not $receipt.acceptedExitCode) {
            throw "Source utility failed with exit $($receipt.exitCode): $Label"
        }
        [pscustomobject]@{ Directory = $directory; StdoutPath = $stdoutPath; StderrPath = $stderrPath; ExitCode = $receipt.exitCode; RootPid = $receipt.rootPid }
    }
    catch {
        $receipt['failure'] = $_.ToString()
        $receipt['failureObservedUtc'] = [DateTime]::UtcNow.ToString('o')
        $receipt['observedChildrenAtFailure'] = @($children.Values)
        $receipt['childSnapshotsAtFailure'] = $snapshots.ToArray()
        $receipt['waitsAtFailure'] = $waits.ToArray()
        Write-EvidenceJson (Join-Path $directory 'failure.json') $receipt
        throw
    }
    finally {
        $stdout.Dispose()
        $stderr.Dispose()
        if ($receipt.Contains('rootHasExitedObserved') -and $receipt.rootHasExitedObserved) {
            $process.Dispose()
        }
    }
}

function Capture-WholeSources {
    param([string]$Label, [object[]]$Requests)
    $manifestPath = Join-Path $script:Root 'SOURCE-MANIFEST.json'
    $manifest = @()
    if ([IO.File]::Exists($manifestPath)) {
        $manifest = @([IO.File]::ReadAllText($manifestPath) | ConvertFrom-Json)
    }
    foreach ($role in @($Requests | Where-Object { $_.Kind -eq 'blob' } | Group-Object Role)) {
        $prior = @($manifest | Where-Object { $_.role -ceq $role.Name -and $_.kind -ceq 'blob' -and $_.status -ceq 'captured' } | ForEach-Object { $_.repositoryPath })
        $new = @($role.Group | ForEach-Object { $_.Path })
        $count = @(@($prior) + @($new) | Sort-Object -Unique).Count
        if ($count -gt 15) {
            throw "Whole-file budget would exceed 15 for $($role.Name): $count. Submit a finite proposal."
        }
    }
    $expressions = @($Requests | ForEach-Object {
        if ($_.Kind -eq 'commit') { $_.Commit } else { $_.Commit + ':' + $_.Path.Replace('\', [string][char]47) }
    })
    $input = [Text.Encoding]::UTF8.GetBytes(($expressions -join "`n") + "`n")
    $run = Invoke-GuardedSourceUtility $Label git @('--no-pager', '-C', $script:Repository, 'cat-file', '--batch') $input
    $bytes = [IO.File]::ReadAllBytes($run.StdoutPath)
    $offset = 0
    $records = [Collections.Generic.List[object]]::new()
    $missing = $false
    for ($i = 0; $i -lt $Requests.Count; $i++) {
        $begin = $offset
        while ($offset -lt $bytes.Length -and $bytes[$offset] -ne 10) { $offset++ }
        if ($offset -ge $bytes.Length) { throw 'Truncated cat-file header.' }
        $header = [Text.Encoding]::ASCII.GetString($bytes, $begin, $offset - $begin)
        $offset++
        $request = $Requests[$i]
        $record = [ordered]@{ role = $request.Role; kind = $request.Kind; commit = $request.Commit; repositoryPath = $request.Path; objectExpression = $expressions[$i]; catFileHeader = $header; utilityDirectory = $run.Directory }
        if ($header.EndsWith(' missing')) {
            $record['status'] = 'missing'
            $missing = $true
        }
        else {
            $fields = $header.Split(' ')
            if ($fields.Length -ne 3) { throw "Unexpected cat-file header: $header" }
            $size = [int]$fields[2]
            if ($offset + $size -ge $bytes.Length -or $bytes[$offset + $size] -ne 10) { throw 'Truncated cat-file payload.' }
            $payload = [byte[]]::new($size)
            [Array]::Copy($bytes, $offset, $payload, 0, $size)
            $offset += $size + 1
            if ($request.Kind -eq 'commit') {
                $target = Join-Path $script:Root ('objects\' + $request.Role + '\' + $fields[0] + '.commit.bin')
            }
            else {
                $target = Join-Path $script:Root ('sources\' + $request.Role + '\' + $request.Path)
            }
            [IO.Directory]::CreateDirectory((Split-Path $target -Parent)) | Out-Null
            if ([IO.File]::Exists($target)) { throw "Refusing to overwrite whole-source evidence: $target" }
            [IO.File]::WriteAllBytes($target, $payload)
            $gitHeader = [Text.Encoding]::ASCII.GetBytes($fields[1] + ' ' + $size + [char]0)
            $hashBytes = [byte[]]::new($gitHeader.Length + $payload.Length)
            [Array]::Copy($gitHeader, 0, $hashBytes, 0, $gitHeader.Length)
            [Array]::Copy($payload, 0, $hashBytes, $gitHeader.Length, $payload.Length)
            $computedObjectId = [Convert]::ToHexString([Security.Cryptography.SHA1]::HashData($hashBytes)).ToLowerInvariant()
            if ($computedObjectId -cne $fields[0]) { throw 'Git object identity mismatch.' }
            $record['status'] = 'captured'
            $record['objectId'] = $fields[0]
            $record['objectType'] = $fields[1]
            $record['byteLength'] = $size
            $record['sha256'] = Get-BytesSha256 $payload
            $record['computedGitObjectId'] = $computedObjectId
            $record['evidencePath'] = $target
        }
        $records.Add($record)
    }
    if ($offset -ne $bytes.Length) { throw 'Unexpected trailing cat-file bytes.' }
    $manifest = @($manifest) + $records.ToArray()
    Write-EvidenceJson $manifestPath $manifest
    Write-EvidenceJson (Join-Path $run.Directory 'decoded-objects.json') $records.ToArray()
    if ($missing) { throw 'One or more immutable objects are missing. No fetch or silent fallback authorized.' }
    $records.ToArray()
}

Export-ModuleMember -Function Write-EvidenceJson, Get-BytesSha256, Get-ObserverIdentity, Start-OneShotStage, Assert-FreshSourceGuard, Invoke-GuardedSourceUtility, Capture-WholeSources
