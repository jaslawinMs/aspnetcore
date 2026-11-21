$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot
[Environment]::CurrentDirectory = $PSScriptRoot

$owner = '2acd453e-18ab-4dd5-b36b-753c5e5a0a21'
$base = Split-Path -Parent $PSScriptRoot
$repo = 'C:\src\aspnetcore'
$original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$target = 'src\Components\test\E2ETest\Tests\WebAssemblyICUShardingTest.cs'
$targetGit = $target.Replace('\', '/')
$utf8 = [Text.UTF8Encoding]::new($false)
$resultPath = '.\collection-initial-v1.json'
if (Test-Path -LiteralPath $resultPath)
{
    throw 'Single-use collector v1 has already left a result; do not replay.'
}
New-Item -ItemType Directory -Path '.\commands-initial-v1' -ErrorAction Stop | Out-Null
New-Item -ItemType Directory -Path '.\source' -ErrorAction Stop | Out-Null
New-Item -ItemType Directory -Path '.\source\Original' -ErrorAction Stop | Out-Null
New-Item -ItemType Directory -Path '.\source\Default' -ErrorAction Stop | Out-Null
New-Item -ItemType Directory -Path '.\source\NavigationContracts' -ErrorAction Stop | Out-Null
$result = [ordered]@{
    findingId = 'F206'
    ownerId = $owner
    phase = 'initial-source-v1'
    startedUtc = [DateTime]::UtcNow.ToString('o')
    collectorPid = $PID
    collectorIdentity = $null
    outerToolPid = $null
    outerToolIdentityBoundary = 'The tools own the outer shell; only this PowerShell source collector PID and separately observed native child identities are asserted.'
    scriptSha256 = (Get-FileHash -LiteralPath '.\collect-initial-source-v1.ps1' -Algorithm SHA256).Hash
    originalCommit = $original
    defaultCommit = $null
    commands = @()
    copiedFiles = @()
    failure = $null
    state = 'running'
}

function Save-Result
{
    [IO.File]::WriteAllText($resultPath, ($result | ConvertTo-Json -Depth 20) + "`n", $utf8)
}

function Get-Identity([int] $ProcessId)
{
    try
    {
        $p = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction Stop
        if ($null -eq $p)
        {
            return @{ processId = $ProcessId; observed = $false; boundary = 'Process exited before CIM identity observation.' }
        }
        return @{
            processId = [int]$p.ProcessId
            parentProcessId = [int]$p.ParentProcessId
            creationDateUtc = $p.CreationDate.ToUniversalTime().ToString('o')
            executablePath = $p.ExecutablePath
            commandLine = $p.CommandLine
            observed = $true
        }
    }
    catch
    {
        return @{ processId = $ProcessId; observed = $false; identityError = $_.Exception.ToString() }
    }
}

function Assert-CurrentGuard([string] $Label)
{
    $policyPath = Join-Path $base 'policy.json'
    $registrationPath = Join-Path $base 'owner-registration-background-247.json'
    $policyBytes = [IO.File]::ReadAllBytes($policyPath)
    $policy = $utf8.GetString($policyBytes) | ConvertFrom-Json
    $leasePath = Join-Path $base 'benchmark-exclusive.lease.json'
    $guard = [ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('o')
        policyPath = $policyPath
        policySha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($policyBytes))
        registrationSha256 = (Get-FileHash -LiteralPath $registrationPath -Algorithm SHA256).Hash
        actualF206Owner = $policy.independentFindingPreparationWorkers.F206
        actualOwnerCount = @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count
        actualScope = $policy.activeWorkerPreparationScopes.F206
        leasePath = $leasePath
        leaseExists = Test-Path -LiteralPath $leasePath
        hold = $policy.actualWorkerBuildHoldActive
        quiesced = $policy.buildAndTestWorkQuiesced
    }
    [IO.File]::WriteAllBytes(".\commands-initial-v1\$Label.policy.json", $policyBytes)
    [IO.File]::WriteAllBytes(".\commands-initial-v1\$Label.registration.json", [IO.File]::ReadAllBytes($registrationPath))
    $guard.passed = $guard.actualF206Owner -eq $owner -and $guard.actualOwnerCount -le 4 -and
        $guard.hold -eq $false -and $guard.quiesced -eq $false -and
        -not $guard.leaseExists -and $guard.actualScope.StartsWith('245 ')
    [IO.File]::WriteAllText(".\commands-initial-v1\$Label.guard.json", ($guard | ConvertTo-Json -Depth 8) + "`n", $utf8)
    if (-not $guard.passed)
    {
        throw "Fresh F206 guard denied before $Label."
    }
}

function Invoke-CapturedRead([string] $Label, [string] $Executable, [string[]] $Argv)
{
    Assert-CurrentGuard $Label
    $path = (Get-Command $Executable -CommandType Application -ErrorAction Stop).Source
    $record = [ordered]@{
        label = $Label
        executable = $path
        argv = $Argv
        workingDirectory = $repo
        processEnvironmentOverrides = @{
            GIT_OPTIONAL_LOCKS = '0'
            GIT_TERMINAL_PROMPT = '0'
            GIT_PAGER = ''
            GH_PAGER = ''
            GH_PROMPT_DISABLED = '1'
        }
        startedUtc = [DateTime]::UtcNow.ToString('o')
        nativeRootPid = $null
        nativeRootIdentity = $null
        observedDescendants = @()
        observedDescendantBoundary = 'Direct children observed in one bounded CIM query while the native root was owned; no universal descendant-closure claim.'
        waitForExitTimeoutMilliseconds = 90000
        waitForExitReturned = $null
        stdoutPath = ".\commands-initial-v1\$Label.stdout.bin"
        stderrPath = ".\commands-initial-v1\$Label.stderr.bin"
        stdoutDrainCompleted = $false
        stderrDrainCompleted = $false
        exitCode = $null
        failure = $null
    }
    $result.commands += $record
    Save-Result
    $process = [Diagnostics.Process]::new()
    $out = $null
    $err = $null
    try
    {
        $process.StartInfo.FileName = $path
        $process.StartInfo.WorkingDirectory = $repo
        $process.StartInfo.UseShellExecute = $false
        $process.StartInfo.RedirectStandardOutput = $true
        $process.StartInfo.RedirectStandardError = $true
        $process.StartInfo.CreateNoWindow = $true
        foreach ($arg in $Argv)
        {
            $process.StartInfo.ArgumentList.Add($arg)
        }
        foreach ($name in $record.processEnvironmentOverrides.Keys)
        {
            $process.StartInfo.Environment[$name] = $record.processEnvironmentOverrides[$name]
        }
        $out = [IO.File]::Open($record.stdoutPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
        $err = [IO.File]::Open($record.stderrPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
        if (-not $process.Start())
        {
            throw 'Process.Start returned false.'
        }
        $record.nativeRootPid = $process.Id
        $outTask = $process.StandardOutput.BaseStream.CopyToAsync($out)
        $errTask = $process.StandardError.BaseStream.CopyToAsync($err)
        $record.nativeRootIdentity = Get-Identity $process.Id
        $record.observedDescendants = @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$($process.Id)" |
            ForEach-Object { Get-Identity ([int]$_.ProcessId) })
        $record.waitForExitReturned = $process.WaitForExit($record.waitForExitTimeoutMilliseconds)
        if (-not $record.waitForExitReturned)
        {
            $process.Kill()
            $process.WaitForExit()
        }
        $outTask.GetAwaiter().GetResult()
        $record.stdoutDrainCompleted = $true
        $errTask.GetAwaiter().GetResult()
        $record.stderrDrainCompleted = $true
        $record.exitCode = $process.ExitCode
        if (-not $record.waitForExitReturned)
        {
            throw "Read-only native command $Label exceeded its finite wait and its owned root was killed."
        }
    }
    catch
    {
        $record.failure = $_.Exception.ToString()
        throw
    }
    finally
    {
        if ($null -ne $out) { $out.Dispose() }
        if ($null -ne $err) { $err.Dispose() }
        $process.Dispose()
        $record.finishedUtc = [DateTime]::UtcNow.ToString('o')
        foreach ($stream in @('stdout', 'stderr'))
        {
            $streamPath = $record["${stream}Path"]
            if (Test-Path -LiteralPath $streamPath)
            {
                $record["${stream}Bytes"] = (Get-Item -LiteralPath $streamPath).Length
                $record["${stream}Sha256"] = (Get-FileHash -LiteralPath $streamPath -Algorithm SHA256).Hash
            }
        }
        Save-Result
    }
    if ($record.exitCode -ne 0)
    {
        throw "Native read $Label exited $($record.exitCode); inspect preserved stderr."
    }
    Write-Output "$Label exit=$($record.exitCode) nativeRootPid=$($record.nativeRootPid) stdoutBytes=$($record.stdoutBytes)"
    return $record.stdoutPath
}

function Copy-WholeEvidence([string] $Source, [string] $Destination, [string] $Role, [string] $LogicalPath)
{
    $parent = Split-Path -Parent $Destination
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    [IO.File]::WriteAllBytes($Destination, [IO.File]::ReadAllBytes($Source))
    $result.copiedFiles += @{
        path = $Destination
        logicalPath = $LogicalPath
        role = $Role
        bytes = (Get-Item -LiteralPath $Destination).Length
        sha256 = (Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash
    }
    Save-Result
}

try
{
    $result.collectorIdentity = Get-Identity $PID
    Save-Result
    $null = Invoke-CapturedRead '01-navigation-head' 'git' @('--no-pager', 'rev-parse', 'HEAD')
    $null = Invoke-CapturedRead '02-navigation-status' 'git' @('--no-pager', 'status', '--porcelain=v1', '--untracked-files=all')
    $repoResponse = @(Invoke-CapturedRead '03-upstream-repository' 'gh' @('api', '--method', 'GET', 'repos/dotnet/aspnetcore'))[-1]
    $repoMetadata = [IO.File]::ReadAllText($repoResponse) | ConvertFrom-Json
    if ($repoMetadata.default_branch -ne 'main') { throw 'Observed upstream default branch is not main.' }
    $refResponse = @(Invoke-CapturedRead '04-fresh-upstream-main' 'gh' @('api', '--method', 'GET', 'repos/dotnet/aspnetcore/git/ref/heads/main'))[-1]
    $ref = [IO.File]::ReadAllText($refResponse) | ConvertFrom-Json
    $default = $ref.object.sha
    if ($default -notmatch '^[0-9a-f]{40}$') { throw 'Fresh main did not return an exact commit SHA.' }
    $result.defaultCommit = $default
    Save-Result
    $null = Invoke-CapturedRead '05-original-commit' 'git' @('--no-pager', 'show', '-s', '--format=fuller', $original)
    $originalSource = @(Invoke-CapturedRead '06-original-target' 'git' @('--no-pager', 'cat-file', 'blob', "${original}:$targetGit"))[-1]
    Copy-WholeEvidence $originalSource ".\source\Original\$target" 'Original' $target
    $defaultSource = @(Invoke-CapturedRead '07-default-target' 'gh' @('api', '--method', 'GET', '-H', 'Accept: application/vnd.github.raw+json', "repos/dotnet/aspnetcore/contents/${targetGit}?ref=$default"))[-1]
    Copy-WholeEvidence $defaultSource ".\source\Default\$target" 'Default' $target
    $null = Invoke-CapturedRead '08-original-target-history' 'git' @('--no-pager', 'log', '--follow', '-n', '8', '--format=fuller', '--name-status', $original, '--', $targetGit)
    $null = Invoke-CapturedRead '09-default-target-history' 'gh' @('api', '--method', 'GET', 'repos/dotnet/aspnetcore/commits', '-f', "sha=$default", '-f', "path=$targetGit", '-f', 'per_page=6')
    foreach ($contract in @(
        'src\Components\AGENTS.md',
        '.github\instructions\components.instructions.md',
        '.github\instructions\cross-cutting-guidance.instructions.md',
        '.github\instructions\build.instructions.md',
        'docs\BuildFromSource.md',
        'docs\BlazorComponentsGuidance.md',
        'docs\CrossCuttingGuidance.md'
    ))
    {
        Copy-WholeEvidence (Join-Path $repo $contract) ".\source\NavigationContracts\$contract" 'NavigationContracts-not-Default' $contract
    }
    $result.state = 'completed'
}
catch
{
    $result.state = 'failed'
    $result.failure = $_.Exception.ToString()
    [Console]::Error.WriteLine($result.failure)
}
finally
{
    $result.finishedUtc = [DateTime]::UtcNow.ToString('o')
    Save-Result
}

if ($result.state -ne 'completed')
{
    exit 1
}
[Console]::WriteLine("INITIAL_SOURCE_COMPLETED original=$original default=$($result.defaultCommit) collectorPid=$PID")
exit 0
