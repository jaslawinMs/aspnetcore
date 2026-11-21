$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot

$owner = '0e68af4c-282e-499c-824b-253a9e5d389b'
$repository = 'C:\src\aspnetcore'
$original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$base = Split-Path $PSScriptRoot -Parent
$policyPath = Join-Path $base 'policy.json'
$leasePath = Join-Path $base 'benchmark-exclusive.lease.json'
$script:sequence = 0
$script:commands = [Collections.Generic.List[object]]::new()
$script:sources = [Collections.Generic.List[object]]::new()
$utf8 = [Text.UTF8Encoding]::new($false)

function Write-NewJson([string] $Path, [object] $Value)
{
    $stream = [IO.File]::Open($Path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    try
    {
        $bytes = $utf8.GetBytes(($Value | ConvertTo-Json -Depth 30) + [Environment]::NewLine)
        $stream.Write($bytes, 0, $bytes.Length)
    }
    finally
    {
        $stream.Dispose()
    }
}

function Assert-SourceGuards
{
    $policy = Get-Content -LiteralPath $policyPath -Raw | ConvertFrom-Json
    $leaseExists = Test-Path -LiteralPath $leasePath
    if ($policy.independentFindingPreparationWorkers.F150 -cne $owner -or
        @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count -gt 4 -or
        $leaseExists -or $policy.actualWorkerBuildHoldActive -ne $false -or
        $policy.buildAndTestWorkQuiesced -ne $false -or
        $policy.activeWorkerPreparationScopes.F150 -notmatch '^246 SOURCE ONLY')
    {
        throw 'F150 source-only registry/lease/HOLD/quiescence guard rejected.'
    }

    return [ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('o')
        policySha256 = (Get-FileHash -LiteralPath $policyPath -Algorithm SHA256).Hash
        actualOwner = $policy.independentFindingPreparationWorkers.F150
        registeredOwners = @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count
        leaseExists = $leaseExists
        actualHOLD = $policy.actualWorkerBuildHoldActive
        quiesced = $policy.buildAndTestWorkQuiesced
        sourceOnly = $true
    }
}

function Invoke-SourceRead([string] $Executable, [string[]] $Argv, [string] $Label, [bool] $AllowFailure = $false)
{
    $guard = Assert-SourceGuards
    $script:sequence++
    $stem = 'source-001\commands\{0:D3}-{1}' -f $script:sequence, $Label
    $stdoutPath = [IO.Path]::GetFullPath("$stem.stdout.bin")
    $stderrPath = [IO.Path]::GetFullPath("$stem.stderr.bin")
    $outStream = [IO.File]::Open($stdoutPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    $errStream = [IO.File]::Open($stderrPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    $process = [Diagnostics.Process]::new()
    $observedChildren = [Collections.Generic.List[object]]::new()
    $record = [ordered]@{
        label = $Label
        executable = $Executable
        argv = $Argv
        workingDirectory = $PSScriptRoot
        helperPowerShellPid = $PID
        helperPowerShellStartTimeUtc = (Get-Process -Id $PID).StartTime.ToUniversalTime().ToString('o')
        invokedUtc = [DateTime]::UtcNow.ToString('o')
        guard = $guard
        stdoutPath = $stdoutPath
        stderrPath = $stderrPath
        observedChildInstances = @()
        descendantObservationLimit = 'Immediate Win32_Process child observations while this source-read root is live; not universal descendant closure.'
    }
    Write-NewJson "$stem.invocation.json" $record
    try
    {
        $process.StartInfo.FileName = $Executable
        $process.StartInfo.WorkingDirectory = $PSScriptRoot
        $process.StartInfo.UseShellExecute = $false
        $process.StartInfo.RedirectStandardOutput = $true
        $process.StartInfo.RedirectStandardError = $true
        foreach ($argument in $Argv)
        {
            $process.StartInfo.ArgumentList.Add($argument)
        }
        $process.StartInfo.Environment['GIT_PAGER'] = ''
        $process.StartInfo.Environment['GH_PAGER'] = ''
        $process.StartInfo.Environment['GIT_OPTIONAL_LOCKS'] = '0'
        if (-not $process.Start())
        {
            throw "Could not start source reader $Executable"
        }
        $record['nativeRootPid'] = $process.Id
        $record['nativeRootStartTimeUtc'] = $process.StartTime.ToUniversalTime().ToString('o')
        $outTask = $process.StandardOutput.BaseStream.CopyToAsync($outStream)
        $errTask = $process.StandardError.BaseStream.CopyToAsync($errStream)
        do
        {
            $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $($process.Id)" -ErrorAction Stop)
            foreach ($child in $children)
            {
                $identity = '{0}|{1}' -f $child.ProcessId, $child.CreationDate.ToUniversalTime().ToString('o')
                if (-not @($observedChildren | Where-Object { $_.identity -ceq $identity }).Count)
                {
                    $observedChildren.Add([ordered]@{
                        identity = $identity
                        pid = [int]$child.ProcessId
                        parentPid = [int]$child.ParentProcessId
                        creationTimeUtc = $child.CreationDate.ToUniversalTime().ToString('o')
                        name = $child.Name
                        commandLine = $child.CommandLine
                    })
                }
            }
        }
        while (-not $process.WaitForExit(50))
        $process.WaitForExit()
        $outTask.GetAwaiter().GetResult()
        $errTask.GetAwaiter().GetResult()
        $record['nativeRootExitCode'] = $process.ExitCode
        $record['nativeRootExitTimeUtc'] = $process.ExitTime.ToUniversalTime().ToString('o')
        $record['nativeRootWaitReturned'] = $true
        $record['stdoutCopyAwaited'] = $true
        $record['stderrCopyAwaited'] = $true
        foreach ($child in $observedChildren)
        {
            $current = Get-CimInstance Win32_Process -Filter "ProcessId = $($child.pid)" -ErrorAction Stop
            $child['sameInstanceStillPresentAfterRootWait'] = $null -ne $current -and
                $current.CreationDate.ToUniversalTime().ToString('o') -ceq $child.creationTimeUtc
        }
        $record['observedChildInstances'] = @($observedChildren.ToArray())
    }
    catch
    {
        $record['failure'] = $_.ToString()
        throw
    }
    finally
    {
        $outStream.Dispose()
        $errStream.Dispose()
        $record['returnedUtc'] = [DateTime]::UtcNow.ToString('o')
        $record['stdoutSha256'] = (Get-FileHash -LiteralPath $stdoutPath -Algorithm SHA256).Hash
        $record['stderrSha256'] = (Get-FileHash -LiteralPath $stderrPath -Algorithm SHA256).Hash
        Write-NewJson "$stem.result.json" $record
        $script:commands.Add($record)
        $process.Dispose()
    }
    Write-Output ("SOURCE_READ_RETURNED {0} rootPid={1} exit={2}" -f $Label, $record.nativeRootPid, $record.nativeRootExitCode) | Out-Host
    if ($record.nativeRootExitCode -ne 0 -and -not $AllowFailure)
    {
        throw "Source reader $Label exited $($record.nativeRootExitCode). Raw streams preserved."
    }
    return [pscustomobject]@{
        record = $record
        stdoutPath = $stdoutPath
        stderrPath = $stderrPath
        text = [IO.File]::ReadAllText($stdoutPath)
        exitCode = $record.nativeRootExitCode
    }
}

function Read-Git([string[]] $Arguments, [string] $Label, [bool] $AllowFailure = $false)
{
    return Invoke-SourceRead $git (@('--no-pager', '--no-optional-locks', '-C', $repository) + $Arguments) $Label $AllowFailure
}

function Read-GitHub([string] $Endpoint, [string] $Label)
{
    return Invoke-SourceRead $gh @('api', '--include', '-H', 'Cache-Control: no-cache',
        '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28', $Endpoint) $Label
}

function Get-ResponseJson([object] $Response)
{
    $body = ([regex]::new('\r?\n\r?\n')).Split($Response.text, 2)[1]
    return $body | ConvertFrom-Json
}

function Save-Source([string] $Role, [string] $Commit, [string] $Path, [byte[]] $Bytes, [string] $BlobSha, [object] $Command)
{
    $destination = Join-Path "source-001\sources\$Role" ($Path.Replace('/', '\'))
    $parent = Split-Path $destination -Parent
    if (-not (Test-Path -LiteralPath $parent))
    {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    $stream = [IO.File]::Open($destination, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    try
    {
        $stream.Write($Bytes, 0, $Bytes.Length)
    }
    finally
    {
        $stream.Dispose()
    }
    $script:sources.Add([ordered]@{
        role = $Role
        commit = $Commit
        repositoryPath = $Path
        evidencePath = $destination
        bytes = $Bytes.Length
        sha256 = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
        gitBlobSha = $BlobSha
        sourceCommand = $Command.label
        wholeFile = $true
    })
}

$entryGuard = Assert-SourceGuards
New-Item -ItemType Directory -Path 'source-001\commands' | Out-Null
Write-NewJson 'source-001\helper-start.json' ([ordered]@{
    script = $PSCommandPath
    scriptSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    argv = @()
    workingDirectory = $PSScriptRoot
    helperPowerShellPid = $PID
    helperPowerShellStartTimeUtc = (Get-Process -Id $PID).StartTime.ToUniversalTime().ToString('o')
    guard = $entryGuard
    productNativeStartsAuthorized = $false
    sourceEditsAuthorized = $false
    permittedNativeReaders = @('git.exe', 'gh.exe')
})
$git = (Get-Command git.exe -CommandType Application).Source
$gh = (Get-Command gh.exe -CommandType Application).Source
$head = Read-Git @('rev-parse', 'HEAD') 'navigation-head'
$status = Read-Git @('status', '--porcelain=v1', '--untracked-files=normal') 'navigation-status'
$preserved = foreach ($line in ($status.text -split '\r?\n'))
{
    if ($line.StartsWith('?? '))
    {
        $path = $line.Substring(3)
        $fullPath = Join-Path $repository $path
        if (Test-Path -LiteralPath $fullPath -PathType Leaf)
        {
            [ordered]@{ path = $path; bytes = (Get-Item -LiteralPath $fullPath).Length; sha256 = (Get-FileHash -LiteralPath $fullPath -Algorithm SHA256).Hash }
        }
        else
        {
            [ordered]@{ path = $path; fileHashAvailable = $false; limitation = 'Not an individual unquoted file path; no traversal performed.' }
        }
    }
}
Write-NewJson 'source-001\navigation-untracked-preservation.json' @($preserved)
$originalMetadata = Read-Git @('show', '--no-patch', '--format=fuller', $original) 'original-metadata'
$tree = Read-Git @('ls-tree', '-r', $original, '--', 'src/Components/benchmarkapps/Wasm.Performance') 'original-wasm-tree'
$repositoryResponse = Read-GitHub 'repos/dotnet/aspnetcore' 'upstream-repository'
$repositoryInfo = Get-ResponseJson $repositoryResponse
$branchName = $repositoryInfo.default_branch
if ([string]::IsNullOrWhiteSpace($branchName))
{
    throw 'Authoritative default branch unavailable.'
}
$branchResponse = Read-GitHub ("repos/dotnet/aspnetcore/branches/{0}" -f [Uri]::EscapeDataString($branchName)) 'upstream-default-branch'
$branchInfo = Get-ResponseJson $branchResponse
$default = $branchInfo.commit.sha
if ($default -notmatch '^[a-f0-9]{40}$')
{
    throw 'Authoritative default SHA unavailable.'
}
$paths = @(
    'src/Components/benchmarkapps/Wasm.Performance/ConsoleHost/Scenarios/ComponentRenderingScenarioBase.cs',
    'src/Components/benchmarkapps/Wasm.Performance/ConsoleHost/Scenarios/GridScenario.cs',
    'src/Components/benchmarkapps/Wasm.Performance/ConsoleHost/Program.cs',
    'src/Components/benchmarkapps/Wasm.Performance/ConsoleHost/ConsoleHostRenderer.cs',
    'src/Components/benchmarkapps/Wasm.Performance/ConsoleHost/NullDispatcher.cs',
    'src/Components/benchmarkapps/Wasm.Performance/ConsoleHost/Wasm.Performance.ConsoleHost.csproj',
    'src/Components/benchmarkapps/Wasm.Performance/README.md',
    'src/Components/benchmarkapps/Wasm.Performance/benchmarks.compose.json'
)
$index = 0
foreach ($path in $paths)
{
    $index++
    $treeLine = @($tree.text -split '\r?\n' | Where-Object { $_.EndsWith("`t$path", [StringComparison]::Ordinal) })
    if ($treeLine.Count -ne 1)
    {
        throw "Original path must be resolved from ls-tree before reading: $path"
    }
    $blob = ($treeLine[0] -split '\s+')[2]
    $response = Read-Git @('show', "${original}:$path") ("original-source-{0:D2}" -f $index)
    Save-Source 'Original' $original $path ([IO.File]::ReadAllBytes($response.stdoutPath)) $blob $response.record
    $response = Read-GitHub ("repos/dotnet/aspnetcore/contents/{0}?ref={1}" -f $path, $default) ("default-source-{0:D2}" -f $index)
    $content = Get-ResponseJson $response
    if ($content.type -cne 'file' -or $content.path -cne $path -or $content.encoding -cne 'base64')
    {
        throw "Unexpected source payload: $path"
    }
    Save-Source 'Default' $default $path ([Convert]::FromBase64String($content.content)) $content.sha $response.record
}
$candidatePath = $paths[0]
$history = Read-Git @('log', '--follow', '--name-status', '--format=fuller', '-n', '12', $original, '--', $candidatePath) 'original-candidate-history'
$defaultHistory = Read-GitHub ("repos/dotnet/aspnetcore/commits?sha={0}&path={1}&per_page=20" -f $default, $candidatePath) 'default-candidate-history'
Write-NewJson 'source-001\source-manifest.json' ([ordered]@{
    findingId = 'F150'
    owner = $owner
    originalCommit = $original
    defaultBranch = $branchName
    defaultCommit = $default
    defaultObservationUtc = $branchResponse.record.returnedUtc
    defaultCommitAuthorDate = $branchInfo.commit.commit.author.date
    defaultCommitCommitterDate = $branchInfo.commit.commit.committer.date
    navigationHeadNotDefault = $head.text.Trim()
    sources = @($script:sources.ToArray())
    commands = @($script:commands | ForEach-Object { [ordered]@{label=$_.label; executable=$_.executable; argv=$_.argv; nativeRootPid=$_.nativeRootPid; nativeRootExitCode=$_.nativeRootExitCode} })
    nativeScope = 'Read-only git and GitHub CLI source operations only; no SDK, build, test, renderer or scenario execution.'
    behaviorVerified = $false
    measured = $false
    exitGuard = (Assert-SourceGuards)
})
Write-Output ("SOURCE_COLLECTION_SCRIPT_RETURNING Original={0} Default={1} sources={2} commands={3}; outer tool exit is separate" -f $original, $default, $script:sources.Count, $script:commands.Count)
