$ErrorActionPreference = 'Stop'
$script:EvidenceRoot = $PSScriptRoot
$script:ReservedRoot = 'C:\src\aspnetcore'
$script:PolicyRoot = Split-Path $PSScriptRoot
$script:OwnerId = '80994088-1962-4607-83b1-093e3056f0ea'
$script:Utf8 = [System.Text.UTF8Encoding]::new($false)

function Write-EvidenceJson {
    param([string]$RelativePath, [object]$Value)
    $path = Join-Path $script:EvidenceRoot $RelativePath
    [System.IO.Directory]::CreateDirectory((Split-Path $path)) | Out-Null
    [System.IO.File]::WriteAllText($path, ($Value | ConvertTo-Json -Depth 40), $script:Utf8)
}

function Read-F217Admission {
    param([string]$Label)
    $policyPath = Join-Path $script:PolicyRoot 'policy.json'
    $raw = [System.IO.File]::ReadAllBytes($policyPath)
    $policy = $script:Utf8.GetString($raw) | ConvertFrom-Json
    $leasePath = Join-Path $script:PolicyRoot 'benchmark-exclusive.lease.json'
    $receipt = [ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('o')
        label = $Label
        owner = $policy.independentFindingPreparationWorkers.F217
        scope = $policy.activeWorkerPreparationScopes.F217
        policySha256 = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($raw))
        benchmarkLeasePresent = Test-Path -LiteralPath $leasePath
        actualWorkerBuildHoldActive = $policy.actualWorkerBuildHoldActive
        buildAndTestWorkQuiesced = $policy.buildAndTestWorkQuiesced
        allowed = $false
    }
    $receipt.allowed = $receipt.owner -eq $script:OwnerId -and
        $receipt.scope -like '237 NamedPipeEndPoint *' -and
        -not $receipt.benchmarkLeasePresent -and
        $receipt.actualWorkerBuildHoldActive -eq $false -and
        $receipt.buildAndTestWorkQuiesced -eq $false
    $guardDirectory = Join-Path $script:EvidenceRoot "guards\$Label"
    [System.IO.Directory]::CreateDirectory($guardDirectory) | Out-Null
    [System.IO.File]::WriteAllBytes((Join-Path $guardDirectory 'policy.json'), $raw)
    Write-EvidenceJson "guards\$Label\admission.json" $receipt
    if (-not $receipt.allowed) {
        throw "F217 admission failed closed for $Label"
    }
    return $receipt
}

function Invoke-F217ReadOnly {
    param(
        [string]$Label,
        [ValidateSet('git', 'gh')][string]$Tool,
        [string[]]$Arguments,
        [int[]]$AllowedExitCodes = @(0)
    )
    $directory = Join-Path $script:EvidenceRoot "native\$Label"
    if (Test-Path -LiteralPath $directory) {
        throw "Native label already used; replay forbidden: $Label"
    }
    [System.IO.Directory]::CreateDirectory($directory) | Out-Null
    $executable = if ($Tool -eq 'git') {
        'C:\Program Files\Git\cmd\git.exe'
    } else {
        'C:\Program Files\GitHub CLI\gh.exe'
    }
    $info = [System.Diagnostics.ProcessStartInfo]::new()
    $info.FileName = $executable
    $info.WorkingDirectory = $script:ReservedRoot
    $info.UseShellExecute = $false
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.CreateNoWindow = $true
    $info.Environment['GIT_OPTIONAL_LOCKS'] = '0'
    $info.Environment['GIT_PAGER'] = 'cat'
    $info.Environment['GH_PAGER'] = 'cat'
    $info.Environment['GH_PROMPT_DISABLED'] = '1'
    $info.Environment['GH_NO_UPDATE_NOTIFIER'] = '1'
    $info.Environment['GH_NO_EXTENSION_UPDATE_NOTIFIER'] = '1'
    foreach ($argument in $Arguments) {
        $info.ArgumentList.Add($argument)
    }
    $record = [ordered]@{
        label = $Label
        executable = $executable
        argv = $Arguments
        workingDirectory = $script:ReservedRoot
        rootPid = $null
        rootStartUtc = $null
        rootExited = $false
        waitForExitCompleted = $false
        stdoutCompleted = $false
        stderrCompleted = $false
        exitCode = $null
        observedChildren = @()
        childObservationBoundary = 'Direct git/gh roots only. No shell/compiler/test child intentionally requested. Process snapshots do not prove universal descendant absence.'
        postExitObservedChildren = @()
        failure = $null
    }
    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $info
    $outStream = [System.IO.File]::Open((Join-Path $directory 'stdout.bin'), [System.IO.FileMode]::CreateNew)
    $errStream = [System.IO.File]::Open((Join-Path $directory 'stderr.bin'), [System.IO.FileMode]::CreateNew)
    try {
        $guard = Read-F217Admission $Label
        Write-EvidenceJson "native\$Label\invocation.json" @{
            executable = $executable
            argv = $Arguments
            workingDirectory = $script:ReservedRoot
            guard = "guards\$Label\admission.json"
            environment = @{
                GIT_OPTIONAL_LOCKS = '0'
                GIT_PAGER = 'cat'
                GH_PAGER = 'cat'
                GH_PROMPT_DISABLED = '1'
                GH_NO_UPDATE_NOTIFIER = '1'
                GH_NO_EXTENSION_UPDATE_NOTIFIER = '1'
            }
        }
        if (-not $process.Start()) {
            throw 'Process.Start returned false'
        }
        $record.rootPid = $process.Id
        $record.rootStartUtc = $process.StartTime.ToUniversalTime().ToString('o')
        $stdoutTask = $process.StandardOutput.BaseStream.CopyToAsync($outStream)
        $stderrTask = $process.StandardError.BaseStream.CopyToAsync($errStream)
        $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$($process.Id)" |
            Select-Object ProcessId, ParentProcessId, CreationDate, ExecutablePath)
        $record.observedChildren = $children
        $process.WaitForExit()
        $record.waitForExitCompleted = $true
        $stdoutTask.GetAwaiter().GetResult()
        $record.stdoutCompleted = $true
        $stderrTask.GetAwaiter().GetResult()
        $record.stderrCompleted = $true
        $record.rootExited = $process.HasExited
        $record.exitCode = $process.ExitCode
        $postChildren = @()
        foreach ($child in $children) {
            $remaining = @(Get-CimInstance Win32_Process -Filter "ProcessId=$($child.ProcessId)" |
                Where-Object { $_.CreationDate -eq $child.CreationDate })
            if ($remaining.Count -gt 0) {
                $childProcess = [System.Diagnostics.Process]::GetProcessById([int]$child.ProcessId)
                $childProcess.WaitForExit()
                $postChildren += @{ processId = $child.ProcessId; waited = $true; exited = $childProcess.HasExited }
                $childProcess.Dispose()
            } else {
                $postChildren += @{ processId = $child.ProcessId; waited = $false; exitedAtObservation = $true }
            }
        }
        $record.postExitObservedChildren = $postChildren
    } catch {
        $record.failure = $_.ToString()
        throw
    } finally {
        $outStream.Dispose()
        $errStream.Dispose()
        Write-EvidenceJson "native\$Label\terminal.json" $record
        $process.Dispose()
    }
    if ($record.exitCode -notin $AllowedExitCodes) {
        throw "$Label exited $($record.exitCode); exact streams retained"
    }
    return @{
        stdout = Join-Path $directory 'stdout.bin'
        stderr = Join-Path $directory 'stderr.bin'
        exitCode = $record.exitCode
    }
}

function Save-F217RootSnapshot {
    param([ValidateSet('before', 'after')][string]$Role)
    $head = Invoke-F217ReadOnly "$Role-head" git @('--no-pager', 'rev-parse', 'HEAD')
    $branch = Invoke-F217ReadOnly "$Role-branch" git @('--no-pager', 'symbolic-ref', '--short', 'HEAD')
    $status = Invoke-F217ReadOnly "$Role-status" git @('--no-pager', 'status', '--porcelain=v1', '-z', '--untracked-files=all')
    $tracked = Invoke-F217ReadOnly "$Role-tracked" git @('--no-pager', 'ls-files', '--cached', '-z')
    $untracked = Invoke-F217ReadOnly "$Role-untracked" git @('--no-pager', 'ls-files', '--others', '--exclude-standard', '-z')
    $index = Invoke-F217ReadOnly "$Role-index-path" git @('--no-pager', 'rev-parse', '--git-path', 'index')
    $paths = @()
    foreach ($membership in @(@{ role = 'tracked'; path = $tracked.stdout }, @{ role = 'untracked'; path = $untracked.stdout })) {
        foreach ($name in [System.IO.File]::ReadAllText($membership.path).Split([char]0, [System.StringSplitOptions]::RemoveEmptyEntries)) {
            $fullPath = Join-Path $script:ReservedRoot $name.Replace('/', '\')
            if ([System.IO.File]::Exists($fullPath)) {
                $item = Get-Item -LiteralPath $fullPath -Force
                $paths += [ordered]@{
                    path = $name
                    membership = $membership.role
                    kind = 'file'
                    length = $item.Length
                    sha256 = (Get-FileHash -LiteralPath $fullPath -Algorithm SHA256).Hash
                }
            } elseif ([System.IO.Directory]::Exists($fullPath)) {
                $paths += [ordered]@{ path = $name; membership = $membership.role; kind = 'directory-or-submodule'; length = $null; sha256 = $null }
            } else {
                $paths += [ordered]@{ path = $name; membership = $membership.role; kind = 'absent'; length = $null; sha256 = $null }
            }
        }
    }
    $indexPath = [System.IO.File]::ReadAllText($index.stdout).Trim()
    if (-not [System.IO.Path]::IsPathRooted($indexPath)) {
        $indexPath = Join-Path $script:ReservedRoot $indexPath
    }
    $snapshot = [ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('o')
        root = $script:ReservedRoot
        head = [System.IO.File]::ReadAllText($head.stdout).Trim()
        branch = [System.IO.File]::ReadAllText($branch.stdout).Trim()
        indexPath = $indexPath
        indexSha256 = (Get-FileHash -LiteralPath $indexPath -Algorithm SHA256).Hash
        statusSha256 = (Get-FileHash -LiteralPath $status.stdout -Algorithm SHA256).Hash
        trackedMembershipSha256 = (Get-FileHash -LiteralPath $tracked.stdout -Algorithm SHA256).Hash
        untrackedMembershipSha256 = (Get-FileHash -LiteralPath $untracked.stdout -Algorithm SHA256).Hash
        fileCount = $paths.Count
        boundary = 'All git-enumerated tracked and nonignored untracked entries in reserved root; directory/submodule entries are recorded, not recursively hashed. Ignored build output is outside this manifest. No source or root writes are requested.'
        entries = $paths
    }
    Write-EvidenceJson "reserved-root\$Role.json" $snapshot
    return $snapshot
}

function Save-F217GitSource {
    param([string]$Role, [string]$Commit, [string]$Path, [string]$Label)
    $result = Invoke-F217ReadOnly $Label git @('--no-pager', 'show', "${Commit}:$Path")
    $destination = Join-Path $script:EvidenceRoot "sources\$Role\$($Path.Replace('/', '\'))"
    [System.IO.Directory]::CreateDirectory((Split-Path $destination)) | Out-Null
    [System.IO.File]::Copy($result.stdout, $destination, $false)
    return @{
        role = $Role
        commit = $Commit
        repositoryPath = $Path
        evidencePath = [System.IO.Path]::GetRelativePath($script:EvidenceRoot, $destination)
        sha256 = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
        provenance = "native\$Label\invocation.json"
    }
}
