$ErrorActionPreference = 'Stop'
$Out = $PSScriptRoot
$Par = Split-Path -Parent $Out
$S = Split-Path -Parent $Par
$Repo = 'C:\src\aspnetcore'
$Original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$Owner = 'cb6dfbf4-dd69-4c3e-b55f-d49f1820df2b'
$Bootstrap = [IO.File]::ReadAllText((Join-Path $Out 'control\bootstrap.json')) | ConvertFrom-Json
$ExpectedScope = $Bootstrap.scope

function Get-BytesHash([byte[]] $Bytes)
{
    $algorithm = [Security.Cryptography.SHA256]::Create()
    try
    {
        return [BitConverter]::ToString($algorithm.ComputeHash($Bytes)).Replace('-', '')
    }
    finally
    {
        $algorithm.Dispose()
    }
}

function Write-FreshJson([string] $Path, $Value)
{
    $bytes = [Text.UTF8Encoding]::new($false).GetBytes(($Value | ConvertTo-Json -Depth 80) + "`n")
    $stream = [IO.FileStream]::new($Path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    try
    {
        $stream.Write($bytes, 0, $bytes.Length)
    }
    finally
    {
        $stream.Dispose()
    }
}

function Get-ProcessIdentity([Diagnostics.Process] $Process)
{
    return [ordered]@{
        pid = $Process.Id
        creationUtc = $Process.StartTime.ToUniversalTime().ToString('o')
        creationFileTime = $Process.StartTime.ToUniversalTime().ToFileTimeUtc()
    }
}

function Get-FreshSourceGuard([string] $Label)
{
    $policyBytes = [IO.File]::ReadAllBytes((Join-Path $Par 'policy.json'))
    $policy = [Text.Encoding]::UTF8.GetString($policyBytes) | ConvertFrom-Json
    $registrationBytes = [IO.File]::ReadAllBytes((Join-Path $Par 'owner-registrations-267-268-269.json'))
    $registration = [Text.Encoding]::UTF8.GetString($registrationBytes) | ConvertFrom-Json
    if ($policy.independentFindingPreparationWorkers.F234 -cne $Owner -or
        $policy.activeWorkerPreparationScopes.F234 -cne $ExpectedScope -or
        $registration.actualOwners.F234 -cne $Owner -or
        $registration.scopes.F234 -cne $ExpectedScope -or
        -not $ExpectedScope.StartsWith('268 SOURCE ONLY ') -or
        @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count -gt 4 -or
        $policy.actualWorkerBuildHoldActive -cne $false -or
        $policy.buildAndTestWorkQuiesced -cne $false)
    {
        throw 'Fresh actual-owner/exact-scope/HOLD/quiescence guard failed.'
    }

    $leases = @(
        (Join-Path $Par 'benchmark-exclusive.lease.json'),
        (Join-Path $S 'benchmark-exclusive.lease.json'),
        (Join-Path $S 'autoperf-runs\benchmark-exclusive.lease.json')
    )
    foreach ($lease in $leases)
    {
        if (Test-Path -LiteralPath $lease)
        {
            throw "Fresh lease-absence guard failed: $lease"
        }
    }

    $campaignBytes = [IO.File]::ReadAllBytes((Join-Path $S 'autoperf-campaign.json'))
    $campaign = [Text.Encoding]::UTF8.GetString($campaignBytes) | ConvertFrom-Json
    $selected = @($campaign.candidates | Where-Object { $_.id -in @('F234', 'F235') })
    if ($selected.Count -ne 2 -or @($selected | Where-Object { $_.status -cne 'pending' }).Count -ne 0)
    {
        throw 'Both canonical outer findings must remain pending.'
    }

    return @{
        policyBytes = $policyBytes
        registrationBytes = $registrationBytes
        receipt = [ordered]@{
            observedUtc = [DateTime]::UtcNow.ToString('o')
            label = $Label
            actualOwner = $Owner
            scope = $ExpectedScope
            policySha256 = Get-BytesHash $policyBytes
            registrationSha256 = Get-BytesHash $registrationBytes
            campaignSha256 = Get-BytesHash $campaignBytes
            outerStatuses = @($selected | ForEach-Object { @{ id = $_.id; status = $_.status } })
            leasePathsAbsent = $leases
            actualWorkerBuildHoldActive = $false
            buildAndTestWorkQuiesced = $false
        }
    }
}

function ConvertTo-NativeArgument([string] $Argument)
{
    if ($Argument.Length -gt 0 -and $Argument -notmatch '[\s"]')
    {
        return $Argument
    }

    $quoted = [Regex]::Replace($Argument, '(\\*)"', '$1$1\"')
    $quoted = [Regex]::Replace($quoted, '(\\+)$', '$1$1')
    return '"' + $quoted + '"'
}

function Find-ObservedChildren($Known, $Errors)
{
    foreach ($parentId in @($Known.Keys))
    {
        $parent = $Known[$parentId]
        try
        {
            if ($parent.process.HasExited)
            {
                continue
            }

            $currentParent = Get-Process -Id $parentId -ErrorAction Stop
            if ($currentParent.StartTime.ToUniversalTime().ToFileTimeUtc() -ne $parent.identity.creationFileTime)
            {
                $Errors.Add("PID reuse at observed parent $parentId")
                continue
            }

            foreach ($child in @(Get-CimInstance -ClassName Win32_Process -Filter "ParentProcessId = $parentId" -ErrorAction Stop))
            {
                $childId = [int]$child.ProcessId
                if ($Known.ContainsKey($childId))
                {
                    continue
                }

                if ($Known.Count -gt 64)
                {
                    throw 'Observed descendant limit exceeded.'
                }

                try
                {
                    $childProcess = Get-Process -Id $childId -ErrorAction Stop
                    $null = $childProcess.Handle
                    $identity = Get-ProcessIdentity $childProcess
                    if ($identity.creationFileTime -lt $parent.identity.creationFileTime)
                    {
                        $childProcess.Dispose()
                        continue
                    }

                    $Known[$childId] = @{
                        process = $childProcess
                        identity = $identity
                        parentPid = $parentId
                        executableName = $child.Name
                        firstObservedUtc = [DateTime]::UtcNow.ToString('o')
                    }
                }
                catch
                {
                    $Errors.Add("Unresolved observed child ${childId}: $($_.Exception.Message)")
                }
            }
        }
        catch
        {
            $Errors.Add("Observation limitation at ${parentId}: $($_.Exception.Message)")
        }
    }
}

function Invoke-SourceRoot([string] $Label, [string] $Executable, [string[]] $Arguments, [byte[]] $InputBytes = @())
{
    $roots = Join-Path $Out 'roots'
    $null = [IO.Directory]::CreateDirectory($roots)
    $number = @(Get-ChildItem -LiteralPath $roots -Directory -Filter 'root-*').Count + 1
    if ($number -gt 32)
    {
        throw 'Direct Git/gh source-root budget exhausted.'
    }

    $root = Join-Path $roots ('root-{0:D3}' -f $number)
    if (Test-Path -LiteralPath $root)
    {
        throw "Root attempt already exists: $root"
    }

    $null = [IO.Directory]::CreateDirectory($root)
    $guard = Get-FreshSourceGuard $Label
    [IO.File]::WriteAllBytes((Join-Path $root 'policy.raw.json'), $guard.policyBytes)
    [IO.File]::WriteAllBytes((Join-Path $root 'registration.raw.json'), $guard.registrationBytes)
    Write-FreshJson (Join-Path $root 'guard.json') $guard.receipt
    [IO.File]::WriteAllBytes((Join-Path $root 'stdin.bin'), $InputBytes)
    $tool = (Get-Command -Name $Executable -CommandType Application -ErrorAction Stop).Source
    $observer = Get-ProcessIdentity (Get-Process -Id $PID)
    $environment = [ordered]@{
        GIT_OPTIONAL_LOCKS = '0'
        GIT_NO_REPLACE_OBJECTS = '1'
        GIT_NO_LAZY_FETCH = '1'
        GIT_TERMINAL_PROMPT = '0'
        GIT_PAGER = ''
        GH_PAGER = ''
        GH_PROMPT_DISABLED = '1'
        GH_HTTP_TIMEOUT = '60'
        NO_COLOR = '1'
    }
    $launch = [ordered]@{
        rootAttemptNumber = $number
        label = $Label
        argv = @($tool) + $Arguments
        windowsArgumentString = (($Arguments | ForEach-Object { ConvertTo-NativeArgument $_ }) -join ' ')
        cwd = $Repo
        requestedUtc = [DateTime]::UtcNow.ToString('o')
        observer = $observer
        helper = $script:PhasePath
        helperSha256 = (Get-FileHash -LiteralPath $script:PhasePath -Algorithm SHA256).Hash
        support = $PSCommandPath
        supportSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
        stdinBytes = $InputBytes.Length
        stdinSha256 = Get-BytesHash $InputBytes
        environmentOverrides = $environment
    }
    Write-FreshJson (Join-Path $root 'launch.json') $launch
    $startInfo = [Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $tool
    $startInfo.Arguments = $launch.windowsArgumentString
    $startInfo.WorkingDirectory = $Repo
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardInput = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    foreach ($key in $environment.Keys)
    {
        $startInfo.EnvironmentVariables[$key] = $environment[$key]
    }

    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    $stdoutPath = Join-Path $root 'stdout.bin'
    $stderrPath = Join-Path $root 'stderr.bin'
    $stdoutStream = [IO.FileStream]::new($stdoutPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    $stderrStream = [IO.FileStream]::new($stderrPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    $known = @{}
    $errors = [Collections.Generic.List[string]]::new()
    $snapshots = 0
    $started = [DateTime]::UtcNow.ToString('o')
    $null = $process.Start()
    $null = $process.Handle
    $rootIdentity = Get-ProcessIdentity $process
    $known[$process.Id] = @{ process = $process; identity = $rootIdentity }
    $stdoutTask = $process.StandardOutput.BaseStream.CopyToAsync($stdoutStream)
    $stderrTask = $process.StandardError.BaseStream.CopyToAsync($stderrStream)
    if ($InputBytes.Length -gt 0)
    {
        $process.StandardInput.BaseStream.Write($InputBytes, 0, $InputBytes.Length)
    }

    $process.StandardInput.Close()
    do
    {
        Find-ObservedChildren $known $errors
        $snapshots++
    }
    while (-not $process.WaitForExit(100))
    $process.WaitForExit()
    $stdoutTask.GetAwaiter().GetResult()
    $stderrTask.GetAwaiter().GetResult()
    $stdoutStream.Dispose()
    $stderrStream.Dispose()
    $childDeadline = [DateTime]::UtcNow.AddSeconds(10)
    $children = @(
        foreach ($childId in @($known.Keys))
        {
            if ($childId -eq $process.Id)
            {
                continue
            }

            $row = $known[$childId]
            $remaining = [Math]::Max(0, [int]($childDeadline - [DateTime]::UtcNow).TotalMilliseconds)
            $terminal = $row.process.WaitForExit($remaining)
            [ordered]@{
                identity = $row.identity
                parentPid = $row.parentPid
                executableName = $row.executableName
                firstObservedUtc = $row.firstObservedUtc
                observedIdentityWaitReturned = $terminal
                waitRecordedUtc = [DateTime]::UtcNow.ToString('o')
            }
            $row.process.Dispose()
        }
    )
    $stdoutBytes = [IO.File]::ReadAllBytes($stdoutPath)
    $stderrBytes = [IO.File]::ReadAllBytes($stderrPath)
    $receipt = [ordered]@{
        rootAttemptNumber = $number
        launch = $launch
        rootIdentity = $rootIdentity
        startedUtc = $started
        observedCompletedUtc = [DateTime]::UtcNow.ToString('o')
        exitCode = $process.ExitCode
        explicitRootWaitReturned = $true
        stdoutCopyAwaitedToEof = $stdoutTask.IsCompleted
        stderrCopyAwaitedToEof = $stderrTask.IsCompleted
        streamFilesClosed = $true
        stdoutBytes = $stdoutBytes.Length
        stdoutSha256 = Get-BytesHash $stdoutBytes
        stderrBytes = $stderrBytes.Length
        stderrSha256 = Get-BytesHash $stderrBytes
        snapshots = $snapshots
        observationErrors = @($errors)
        observedChildren = $children
        observedChildLimit = 'Creation-checked live-parent CIM census, nominal 100ms root wait; maximum64 observed descendants and10s total post-root observed-child waits. Short-lived/reparented/inaccessible/unobserved children are not proven absent. No universal closure claim.'
    }
    Write-FreshJson (Join-Path $root 'receipt.json') $receipt
    $exitCode = $process.ExitCode
    $process.Dispose()
    Write-Host ("ROOT={0} PID={1} OBSERVER={2} EXIT={3} STDOUT={4} STDERR={5} CHILDREN={6}" -f $number, $rootIdentity.pid, $PID, $exitCode, $stdoutBytes.Length, $stderrBytes.Length, $children.Count)
    if ($exitCode -ne 0 -or @($children | Where-Object { -not $_.observedIdentityWaitReturned }).Count -gt 0)
    {
        throw "Preserved failed or outstanding source root $number. $([Text.Encoding]::UTF8.GetString($stderrBytes))"
    }

    return @{ bytes = $stdoutBytes; directory = $root; receipt = $receipt }
}

function Invoke-GitSource([string] $Label, [string[]] $Arguments, [byte[]] $InputBytes = @())
{
    return Invoke-SourceRoot $Label 'git.exe' (@('--no-pager', '-C', $Repo) + $Arguments) $InputBytes
}
