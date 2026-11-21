$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot
$owner = '0e68af4c-282e-499c-824b-253a9e5d389b'
$repository = 'C:\src\aspnetcore'
$original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$base = Split-Path $PSScriptRoot -Parent
$policyPath = Join-Path $base 'policy.json'
$leasePath = Join-Path $base 'benchmark-exclusive.lease.json'
$utf8 = [Text.UTF8Encoding]::new($false)
$script:sequence = 0
$script:records = [Collections.Generic.List[object]]::new()
$script:sources = [Collections.Generic.List[object]]::new()

function New-Json([string] $Path, [object] $Value)
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

function Guard
{
    $p = Get-Content -LiteralPath $policyPath -Raw | ConvertFrom-Json
    $leaseExists = Test-Path -LiteralPath $leasePath
    if ($p.independentFindingPreparationWorkers.F150 -cne $owner -or
        @($p.independentFindingPreparationWorkers.PSObject.Properties).Count -gt 4 -or
        $leaseExists -or $p.actualWorkerBuildHoldActive -ne $false -or
        $p.buildAndTestWorkQuiesced -ne $false -or
        $p.activeWorkerPreparationScopes.F150 -notmatch '^246 SOURCE ONLY')
    {
        throw 'F150 source-only live guard rejected.'
    }
    return [ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('o')
        policySha256 = (Get-FileHash -LiteralPath $policyPath -Algorithm SHA256).Hash
        actualOwner = $p.independentFindingPreparationWorkers.F150
        registeredOwnerCount = @($p.independentFindingPreparationWorkers.PSObject.Properties).Count
        leaseExists = $leaseExists
        actualHOLD = $p.actualWorkerBuildHoldActive
        quiesced = $p.buildAndTestWorkQuiesced
    }
}

function Read-Source([string] $Exe, [string[]] $Argv, [string] $Label, [bool] $AllowFailure = $false)
{
    $guard = Guard
    $script:sequence++
    $stem = 'source-002\commands\{0:D3}-{1}' -f $script:sequence, $Label
    $stdoutPath = [IO.Path]::GetFullPath("$stem.stdout.bin")
    $stderrPath = [IO.Path]::GetFullPath("$stem.stderr.bin")
    $record = [ordered]@{ label=$Label; executable=$Exe; argv=$Argv; workingDirectory=$PSScriptRoot; guard=$guard }
    New-Json "$stem.invocation.json" $record
    $outStream = [IO.File]::Open($stdoutPath, [IO.FileMode]::CreateNew)
    $errStream = [IO.File]::Open($stderrPath, [IO.FileMode]::CreateNew)
    $process = [Diagnostics.Process]::new()
    $children = [Collections.Generic.List[object]]::new()
    try
    {
        $process.StartInfo.FileName = $Exe
        $process.StartInfo.WorkingDirectory = $PSScriptRoot
        $process.StartInfo.UseShellExecute = $false
        $process.StartInfo.RedirectStandardOutput = $true
        $process.StartInfo.RedirectStandardError = $true
        $process.StartInfo.Environment['GIT_PAGER'] = ''
        $process.StartInfo.Environment['GH_PAGER'] = ''
        $process.StartInfo.Environment['GIT_OPTIONAL_LOCKS'] = '0'
        foreach ($a in $Argv)
        {
            $process.StartInfo.ArgumentList.Add($a)
        }
        if (-not $process.Start())
        {
            throw 'Source reader failed to start.'
        }
        $record['rootPid'] = $process.Id
        $record['rootStartTimeUtc'] = $process.StartTime.ToUniversalTime().ToString('o')
        $outTask = $process.StandardOutput.BaseStream.CopyToAsync($outStream)
        $errTask = $process.StandardError.BaseStream.CopyToAsync($errStream)
        do
        {
            foreach ($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $($process.Id)"))
            {
                $identity = '{0}|{1}' -f $child.ProcessId, $child.CreationDate.ToUniversalTime().ToString('o')
                if (-not @($children | Where-Object { $_.identity -ceq $identity }).Count)
                {
                    $children.Add([ordered]@{identity=$identity; pid=[int]$child.ProcessId; creationTimeUtc=$child.CreationDate.ToUniversalTime().ToString('o'); parentPid=[int]$child.ParentProcessId; name=$child.Name; commandLine=$child.CommandLine})
                }
            }
        }
        while (-not $process.WaitForExit(50))
        $process.WaitForExit()
        $outTask.GetAwaiter().GetResult() | Out-Null
        $errTask.GetAwaiter().GetResult() | Out-Null
        $record['rootExitCode'] = $process.ExitCode
        $record['rootExitTimeUtc'] = $process.ExitTime.ToUniversalTime().ToString('o')
        $record['rootWaitReturned'] = $true
        $record['stdoutCopyAwaited'] = $true
        $record['stderrCopyAwaited'] = $true
        foreach ($child in $children)
        {
            $current = Get-CimInstance Win32_Process -Filter "ProcessId = $($child.pid)"
            $child['sameInstancePresentAfterRootWait'] = $null -ne $current -and $current.CreationDate.ToUniversalTime().ToString('o') -ceq $child.creationTimeUtc
            if ($child.sameInstancePresentAfterRootWait)
            {
                throw 'Observed source-reader child remains live; no terminal claim.'
            }
        }
        $record['observedChildInstances'] = @($children.ToArray())
        $record['descendantObservationLimit'] = 'Immediate Win32_Process snapshots while source root is live; not universal process absence.'
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
        $record['stdoutPath'] = $stdoutPath
        $record['stderrPath'] = $stderrPath
        $record['stdoutSha256'] = (Get-FileHash -LiteralPath $stdoutPath -Algorithm SHA256).Hash
        $record['stderrSha256'] = (Get-FileHash -LiteralPath $stderrPath -Algorithm SHA256).Hash
        New-Json "$stem.result.json" $record
        $script:records.Add($record)
        $process.Dispose()
    }
    Write-Output ("SOURCE_READ_RETURNED {0} rootPid={1} exit={2}" -f $Label, $record.rootPid, $record.rootExitCode) | Out-Host
    if ($record.rootExitCode -ne 0 -and -not $AllowFailure)
    {
        throw "Source reader $Label exited $($record.rootExitCode)."
    }
    return [pscustomobject]@{ record=$record; stdoutPath=$stdoutPath; text=[IO.File]::ReadAllText($stdoutPath); exitCode=$record.rootExitCode }
}

function Git([string[]] $Argv, [string] $Label, [bool] $AllowFailure = $false)
{
    return Read-Source $git (@('--no-pager', '--no-optional-locks', '-C', $repository) + $Argv) $Label $AllowFailure
}

function GitHub([string] $Endpoint, [string] $Label)
{
    $r = Read-Source $gh @('api', '--include', '-H', 'Cache-Control: no-cache', '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28', $Endpoint) $Label
    $body = ([regex]::new('\r?\n\r?\n')).Split($r.text, 2)[1]
    return [pscustomobject]@{ record=$r.record; body=($body | ConvertFrom-Json) }
}

function Save([string] $Role, [string] $Commit, [string] $Path, [byte[]] $Bytes, [object] $Record)
{
    $destination = Join-Path "source-002\sources\$Role" ($Path.Replace('/', '\'))
    New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
    $stream = [IO.File]::Open($destination, [IO.FileMode]::CreateNew)
    try
    {
        $stream.Write($Bytes, 0, $Bytes.Length)
    }
    finally
    {
        $stream.Dispose()
    }
    $script:sources.Add([ordered]@{role=$Role; commit=$Commit; repositoryPath=$Path; evidencePath=$destination; bytes=$Bytes.Length; sha256=(Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash; sourceCommand=$Record.label; wholeFile=$true})
}

$entryGuard = Guard
New-Item -ItemType Directory -Path 'source-002\commands' | Out-Null
New-Json 'source-002\helper-start.json' ([ordered]@{script=$PSCommandPath; scriptSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash; argv=@(); rootPowerShellPid=$PID; rootPowerShellStartTimeUtc=(Get-Process -Id $PID).StartTime.ToUniversalTime().ToString('o'); guard=$entryGuard; priorFailedHelperPreserved='Collect-Source-001.ps1'; priorFailedHelperNotEditedOrReplayed=$true; correction='Suppress VoidTaskResult pipeline output from stream-copy awaits before returning source response.'})
$git = (Get-Command git.exe -CommandType Application).Source
$gh = (Get-Command gh.exe -CommandType Application).Source
$priorHead = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'source-001\commands\001-navigation-head.stdout.bin')).Trim()
$priorStatusPath = Join-Path $PSScriptRoot 'source-001\commands\002-navigation-status.stdout.bin'
$preserved = foreach ($line in ([IO.File]::ReadAllText($priorStatusPath) -split '\r?\n'))
{
    if ($line.StartsWith('?? '))
    {
        $path = $line.Substring(3)
        $item = Get-Item -LiteralPath (Join-Path $repository $path)
        [ordered]@{path=$path; bytes=$item.Length; sha256=(Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash}
    }
}
New-Json 'source-002\navigation-untracked-preservation.json' @($preserved)
$metadata = Git @('show', '--no-patch', '--format=fuller', $original) 'original-metadata'
$tree = Git @('ls-tree', '-r', $original, '--', 'src/Components/benchmarkapps/Wasm.Performance') 'original-wasm-tree'
$repositoryInfo = GitHub 'repos/dotnet/aspnetcore' 'upstream-repository'
$branchName = $repositoryInfo.body.default_branch
if ([string]::IsNullOrWhiteSpace($branchName))
{
    throw 'Authoritative default branch unavailable.'
}
$branch = GitHub ("repos/dotnet/aspnetcore/branches/{0}" -f [Uri]::EscapeDataString($branchName)) 'upstream-default-branch'
$default = $branch.body.commit.sha
if ($default -notmatch '^[a-f0-9]{40}$')
{
    throw 'Authoritative default commit unavailable.'
}
$defaultObject = Git @('cat-file', '-e', "${default}^{commit}") 'default-local-object-availability' $true
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
        throw "Resolve Original path from whole ls-tree before reading: $path"
    }
    $r = Git @('show', "${original}:$path") ("original-source-{0:D2}" -f $index)
    Save 'Original' $original $path ([IO.File]::ReadAllBytes($r.stdoutPath)) $r.record
    if ($defaultObject.exitCode -eq 0)
    {
        $r = Git @('show', "${default}:$path") ("default-source-{0:D2}" -f $index)
        Save 'Default' $default $path ([IO.File]::ReadAllBytes($r.stdoutPath)) $r.record
    }
    else
    {
        $r = GitHub ("repos/dotnet/aspnetcore/contents/{0}?ref={1}" -f $path, $default) ("default-source-{0:D2}" -f $index)
        if ($r.body.path -cne $path -or $r.body.type -cne 'file' -or $r.body.encoding -cne 'base64')
        {
            throw "Unexpected source payload: $path"
        }
        Save 'Default' $default $path ([Convert]::FromBase64String($r.body.content)) $r.record
    }
}
$history = Git @('log', '--follow', '--name-status', '--format=fuller', '-n', '12', $original, '--', $paths[0]) 'original-candidate-history'
$defaultHistory = GitHub ("repos/dotnet/aspnetcore/commits?sha={0}&path={1}&per_page=20" -f $default, $paths[0]) 'default-candidate-history'
New-Json 'source-002\source-manifest.json' ([ordered]@{findingId='F150'; owner=$owner; originalCommit=$original; defaultBranch=$branchName; defaultCommit=$default; defaultObservationUtc=$branch.record.guard.observedUtc; defaultLocalObjectAvailable=($defaultObject.exitCode -eq 0); navigationHeadNotDefault=$priorHead; navigationStatusReusedFromImmutableFailedHelper=$priorStatusPath; sources=@($script:sources.ToArray()); commandCount=$script:records.Count; nativeScope='Read-only git and GitHub CLI source operations only; no SDK, build, test, renderer or scenario execution.'; runtimeBehaviorVerified=$false; measured=$false; exitGuard=(Guard)})
Write-Output ("SOURCE002_SCRIPT_RETURNING Original={0} Default={1} sources={2} commands={3}; outer tool exit is separate" -f $original, $default, $script:sources.Count, $script:records.Count)
