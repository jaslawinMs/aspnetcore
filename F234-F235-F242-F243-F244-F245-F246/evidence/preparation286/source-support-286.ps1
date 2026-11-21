$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'control-support-286.ps1')

function Invoke-ReadOnlyGit286([int] $Ordinal, [string[]] $GitArguments, [byte[]] $InputBytes, [string] $Helper, [string] $Purpose)
{
    if ($Ordinal -notin @(11, 12))
    {
        throw 'Only aggregate roots011 and012 are authorized.'
    }
    $root = Join-Path $Out286 ('roots\root-' + $Ordinal.ToString('000'))
    if (Test-Path -LiteralPath $root)
    {
        throw 'A source-root attempt already exists; no replay.'
    }
    if ($Ordinal -eq 11 -and (Test-Path -LiteralPath (Join-Path $Out286 'roots')))
    {
        throw 'The discovery must be the first286 source attempt.'
    }
    if ($Ordinal -eq 12 -and -not (Test-Path -LiteralPath (Join-Path $Out286 'DISCOVERY-286-001.json')))
    {
        throw 'The sole raw batch requires successful unique discovery.'
    }
    $null = [IO.Directory]::CreateDirectory($root)
    $tool = (Get-Command -Name 'git.exe' -CommandType Application -ErrorAction Stop).Source
    $arguments = @('--no-pager', '-C', $Repo286) + @($GitArguments)
    $argumentString = ($arguments | ForEach-Object {
        if ($_ -match '[\s"]')
        {
            '"' + [Regex]::Replace([Regex]::Replace($_, '(\\*)"', '$1$1\"'), '(\\+)$', '$1$1') + '"'
        }
        else
        {
            $_
        }
    }) -join ' '
    $environment = [ordered]@{
        GIT_OPTIONAL_LOCKS = '0'
        GIT_NO_REPLACE_OBJECTS = '1'
        GIT_NO_LAZY_FETCH = '1'
        GIT_TERMINAL_PROMPT = '0'
        GIT_PAGER = ''
        GH_PAGER = ''
        GH_PROMPT_DISABLED = '1'
        NO_COLOR = '1'
    }
    $guard = Get-FreshGuard286 $Purpose
    Save-Guard286 $root '' $guard
    Write-FreshBytes286 (Join-Path $root 'stdin.bin') $InputBytes
    $launch = [ordered]@{
        aggregateRootAttempt = $Ordinal
        rootAttemptIn286 = $Ordinal - 10
        purpose = $Purpose
        argv = @($tool) + $arguments
        windowsArgumentString = $argumentString
        cwd = $Repo286
        requestedUtc = [DateTime]::UtcNow.ToString('o')
        observer = Get-ProcessIdentity286 (Get-Process -Id $PID)
        helper = $Helper
        helperSha256 = (Get-FileHash -LiteralPath $Helper -Algorithm SHA256).Hash
        support = (Join-Path $Out286 'source-support-286.ps1')
        supportSha256 = (Get-FileHash -LiteralPath (Join-Path $Out286 'source-support-286.ps1') -Algorithm SHA256).Hash
        controlSupport = (Join-Path $Out286 'control-support-286.ps1')
        controlSupportSha256 = (Get-FileHash -LiteralPath (Join-Path $Out286 'control-support-286.ps1') -Algorithm SHA256).Hash
        stdinBytes = $InputBytes.Length
        stdinSha256 = Get-BytesHash286 $InputBytes
        environmentOverrides = $environment
        rootDeadlineSeconds = 60
        rootStopAuthority = 'Only this newly created root, through its original retained Process handle; no observed-child termination.'
        outputEofWaitSecondsPerStreamAfterRoot = 10
    }
    Write-FreshJson286 (Join-Path $root 'launch.json') $launch
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = $tool
    $start.Arguments = $argumentString
    $start.WorkingDirectory = $Repo286
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $start.RedirectStandardInput = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    foreach ($key in $environment.Keys)
    {
        $start.EnvironmentVariables[$key] = $environment[$key]
    }
    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $start
    $stdoutStream = [IO.FileStream]::new((Join-Path $root 'stdout.bin'), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    $stderrStream = [IO.FileStream]::new((Join-Path $root 'stderr.bin'), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    $null = $process.Start()
    $null = $process.Handle
    $rootIdentity = Get-ProcessIdentity286 $process
    $known = @{}
    $known[$process.Id] = @{ process = $process; identity = $rootIdentity }
    $errors = [Collections.Generic.List[string]]::new()
    $snapshots = 0
    $stdoutTask = $process.StandardOutput.BaseStream.CopyToAsync($stdoutStream)
    $stderrTask = $process.StandardError.BaseStream.CopyToAsync($stderrStream)
    if ($InputBytes.Length -gt 0)
    {
        $process.StandardInput.BaseStream.Write($InputBytes, 0, $InputBytes.Length)
    }
    $process.StandardInput.Close()
    $deadline = [DateTime]::UtcNow.AddSeconds(60)
    $rootTimedOut = $false
    do
    {
        foreach ($parentId in @($known.Keys))
        {
            $parent = $known[$parentId]
            try
            {
                if ($parent.process.HasExited)
                {
                    continue
                }
                $currentParent = Get-Process -Id $parentId -ErrorAction Stop
                if ($currentParent.StartTime.ToUniversalTime().ToFileTimeUtc() -ne $parent.identity.creationFileTime)
                {
                    $errors.Add("PID reuse at observed parent $parentId")
                    continue
                }
                foreach ($child in @(Get-CimInstance -ClassName Win32_Process -Filter "ParentProcessId = $parentId" -ErrorAction Stop))
                {
                    $childId = [int]$child.ProcessId
                    if ($known.ContainsKey($childId))
                    {
                        continue
                    }
                    if ($known.Count -ge 65)
                    {
                        $errors.Add('Maximum64 observed descendants reached; additional observation remains unclosed.')
                        continue
                    }
                    try
                    {
                        $childProcess = Get-Process -Id $childId -ErrorAction Stop
                        $null = $childProcess.Handle
                        $childIdentity = Get-ProcessIdentity286 $childProcess
                        if ($childIdentity.creationFileTime -lt $parent.identity.creationFileTime)
                        {
                            $childProcess.Dispose()
                            continue
                        }
                        $known[$childId] = @{
                            process = $childProcess
                            identity = $childIdentity
                            parentPid = $parentId
                            executableName = $child.Name
                            firstObservedUtc = [DateTime]::UtcNow.ToString('o')
                        }
                    }
                    catch
                    {
                        $errors.Add("Unresolved observed child ${childId}: $($_.Exception.Message)")
                    }
                }
            }
            catch
            {
                $errors.Add("Observation limitation at ${parentId}: $($_.Exception.Message)")
            }
        }
        $snapshots++
        $rootWaitReturned = $process.WaitForExit(100)
        if (-not $rootWaitReturned -and [DateTime]::UtcNow -gt $deadline)
        {
            $rootTimedOut = $true
            $process.Kill()
            $rootWaitReturned = $process.WaitForExit(10000)
            break
        }
    }
    while (-not $rootWaitReturned)
    $stdoutEof = $stdoutTask.Wait(10000)
    $stderrEof = $stderrTask.Wait(10000)
    if ($stdoutEof)
    {
        $null = $stdoutTask.GetAwaiter().GetResult()
    }
    if ($stderrEof)
    {
        $null = $stderrTask.GetAwaiter().GetResult()
    }
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
    $raw = [IO.File]::ReadAllBytes((Join-Path $root 'stdout.bin'))
    $stderr = [IO.File]::ReadAllBytes((Join-Path $root 'stderr.bin'))
    $exitCode = if ($rootWaitReturned) { $process.ExitCode } else { $null }
    $receipt = [ordered]@{
        aggregateRootAttempt = $Ordinal
        rootAttemptIn286 = $Ordinal - 10
        launch = $launch
        rootIdentity = $rootIdentity
        observedCompletedUtc = [DateTime]::UtcNow.ToString('o')
        exitCode = $exitCode
        rootTimedOut = $rootTimedOut
        explicitRootWaitReturned = $rootWaitReturned
        stdoutCopyAwaitedToEof = $stdoutEof
        stderrCopyAwaitedToEof = $stderrEof
        streamFilesClosed = $true
        stdoutBytes = $raw.Length
        stdoutSha256 = Get-BytesHash286 $raw
        stderrBytes = $stderr.Length
        stderrSha256 = Get-BytesHash286 $stderr
        snapshots = $snapshots
        observationErrors = @($errors)
        observedChildren = $children
        observedChildLimit = 'Creation-checked live-parent CIM census; nominal100ms root waits; maximum64 observed descendants;10s total post-root observed-child waits. No universal closure for short-lived/reparented/inaccessible/unobserved children.'
    }
    Write-FreshJson286 (Join-Path $root 'receipt.json') $receipt
    $process.Dispose()
    Write-Host ("SOURCE286_ROOT={0};PID={1};OBSERVER={2};EXIT={3};STDOUT={4};STDERR={5};OBSERVED_CHILDREN={6}" -f $Ordinal, $rootIdentity.pid, $PID, $exitCode, $raw.Length, $stderr.Length, $children.Count)
    if (-not $rootWaitReturned -or -not $stdoutEof -or -not $stderrEof -or $rootTimedOut -or
        @($children | Where-Object { -not $_.observedIdentityWaitReturned }).Count -ne 0)
    {
        throw 'Source root/streams/observed children are not cleanly terminal; preserve and stop.'
    }
    return @{ root = $root; receipt = $receipt; stdoutBytes = $raw; stderrBytes = $stderr }
}
