$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot
[Environment]::CurrentDirectory = $PSScriptRoot
$utf8 = [Text.UTF8Encoding]::new($false)
$repo = 'C:\src\aspnetcore'
$owner = '2acd453e-18ab-4dd5-b36b-753c5e5a0a21'
$initial = Get-Content -LiteralPath '.\collection-initial-v1.json' -Raw | ConvertFrom-Json
if ($initial.state -ne 'completed') { throw 'Initial source collection is not completed.' }
$original = $initial.originalCommit
$default = $initial.defaultCommit
$receiptPath = '.\collection-closure-v1.json'
if (Test-Path -LiteralPath $receiptPath) { throw 'Single-use closure collector cannot be replayed.' }
New-Item -ItemType Directory -Path '.\commands-closure-v1' | Out-Null
$result = [ordered]@{
    phase = 'closure-v1'
    ownerId = $owner
    startedUtc = [DateTime]::UtcNow.ToString('o')
    collectorPid = $PID
    collectorIdentity = Get-CimInstance Win32_Process -Filter "ProcessId=$PID" |
        Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
    outerToolPid = $null
    scriptSha256 = (Get-FileHash -LiteralPath '.\collect-closure-v1.ps1' -Algorithm SHA256).Hash
    originalCommit = $original
    defaultCommit = $default
    commands = @()
    files = @()
    preservedUntrackedReports = @()
    state = 'running'
    failure = $null
}
function Save-Receipt
{
    [IO.File]::WriteAllText($receiptPath, ($result | ConvertTo-Json -Depth 20) + "`n", $utf8)
}
function Get-Guard([string] $Label)
{
    $bytes = [IO.File]::ReadAllBytes('..\policy.json')
    $policy = $utf8.GetString($bytes) | ConvertFrom-Json
    $guard = [ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('o')
        policySha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
        ownerId = $policy.independentFindingPreparationWorkers.F206
        ownerCount = @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count
        scope = $policy.activeWorkerPreparationScopes.F206
        hold = $policy.actualWorkerBuildHoldActive
        quiesced = $policy.buildAndTestWorkQuiesced
        leaseExists = Test-Path -LiteralPath '..\benchmark-exclusive.lease.json'
    }
    [IO.File]::WriteAllBytes(".\commands-closure-v1\$Label.policy.json", $bytes)
    if ($guard.ownerId -ne $owner -or $guard.ownerCount -gt 4 -or
        $guard.hold -ne $false -or $guard.quiesced -ne $false -or $guard.leaseExists -or
        -not $guard.scope.StartsWith('245 '))
    {
        throw "Fresh F206 guard denied before $Label."
    }
    return $guard
}
function Read-Native([string] $Label, [string] $Executable, [string[]] $Argv)
{
    $guard = Get-Guard $Label
    $record = [ordered]@{
        label = $Label
        guard = $guard
        executable = (Get-Command $Executable -CommandType Application).Source
        argv = $Argv
        workingDirectory = $repo
        environmentOverrides = @{ GIT_OPTIONAL_LOCKS = '0'; GIT_TERMINAL_PROMPT = '0'; GIT_PAGER = ''; GH_PAGER = ''; GH_PROMPT_DISABLED = '1' }
        startedUtc = [DateTime]::UtcNow.ToString('o')
        nativeRootPid = $null
        nativeRootIdentity = $null
        observedChildren = @()
        identityBoundary = 'The native root PID comes from Process.Start. CIM identity and direct children are only a bounded observation, not a universal descendant claim.'
        waitForExitTimeoutMilliseconds = 90000
        waitForExitReturned = $null
        stdoutPath = ".\commands-closure-v1\$Label.stdout.bin"
        stderrPath = ".\commands-closure-v1\$Label.stderr.bin"
        stdoutDrainCompleted = $false
        stderrDrainCompleted = $false
        exitCode = $null
        failure = $null
    }
    $result.commands += $record
    Save-Receipt
    $p = [Diagnostics.Process]::new()
    $out = $null
    $err = $null
    try
    {
        $p.StartInfo.FileName = $record.executable
        $p.StartInfo.WorkingDirectory = $repo
        $p.StartInfo.UseShellExecute = $false
        $p.StartInfo.RedirectStandardOutput = $true
        $p.StartInfo.RedirectStandardError = $true
        $p.StartInfo.CreateNoWindow = $true
        foreach ($arg in $Argv) { $p.StartInfo.ArgumentList.Add($arg) }
        foreach ($key in $record.environmentOverrides.Keys) { $p.StartInfo.Environment[$key] = $record.environmentOverrides[$key] }
        $out = [IO.File]::Open($record.stdoutPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
        $err = [IO.File]::Open($record.stderrPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
        if (-not $p.Start()) { throw 'Read-only native command did not start.' }
        $record.nativeRootPid = $p.Id
        $outTask = $p.StandardOutput.BaseStream.CopyToAsync($out)
        $errTask = $p.StandardError.BaseStream.CopyToAsync($err)
        $identity = Get-CimInstance Win32_Process -Filter "ProcessId=$($p.Id)"
        $record.nativeRootIdentity = if ($null -ne $identity)
        {
            $identity | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
        }
        else
        {
            @{ processId = $p.Id; boundary = 'Exited before CIM query; executable/argv/Process.Start PID and observed exit remain recorded.' }
        }
        $record.observedChildren = @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$($p.Id)" |
            Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine)
        $record.waitForExitReturned = $p.WaitForExit($record.waitForExitTimeoutMilliseconds)
        if (-not $record.waitForExitReturned) { $p.Kill(); $p.WaitForExit() }
        $null = $outTask.GetAwaiter().GetResult()
        $record.stdoutDrainCompleted = $true
        $null = $errTask.GetAwaiter().GetResult()
        $record.stderrDrainCompleted = $true
        $record.exitCode = $p.ExitCode
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
        $p.Dispose()
        $record.finishedUtc = [DateTime]::UtcNow.ToString('o')
        foreach ($stream in @('stdout', 'stderr'))
        {
            if (Test-Path -LiteralPath $record["${stream}Path"])
            {
                $record["${stream}Bytes"] = (Get-Item -LiteralPath $record["${stream}Path"]).Length
                $record["${stream}Sha256"] = (Get-FileHash -LiteralPath $record["${stream}Path"] -Algorithm SHA256).Hash
            }
        }
        Save-Receipt
    }
    if ($record.exitCode -ne 0 -or -not $record.waitForExitReturned)
    {
        throw "Read-only command $Label failed; exact streams, argv, exit and wait retained."
    }
    return $record.stdoutPath
}
function Save-Source([string] $InputPath, [string] $Role, [string] $LogicalPath)
{
    $destination = ".\source\$Role\$LogicalPath"
    New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
    if (Test-Path -LiteralPath $destination) { throw "Refusing to overwrite $destination." }
    [IO.File]::WriteAllBytes($destination, [IO.File]::ReadAllBytes($InputPath))
    $result.files += @{
        path = $destination
        logicalPath = $LogicalPath
        role = $Role
        commit = if ($Role -eq 'Original') { $original } else { $default }
        bytes = (Get-Item -LiteralPath $destination).Length
        sha256 = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
    }
    Save-Receipt
}
try
{
    [IO.File]::WriteAllBytes('.\commands-closure-v1\registration-at-start.json', [IO.File]::ReadAllBytes('..\owner-registration-background-247.json'))
    $status = [IO.File]::ReadAllLines('.\commands-initial-v1\02-navigation-status.stdout.bin')
    foreach ($line in $status)
    {
        if (-not $line.StartsWith('?? ')) { throw 'Navigation checkout was not clean apart from the four untracked reports.' }
        $relative = $line.Substring(3)
        $full = Join-Path $repo $relative
        $result.preservedUntrackedReports += @{
            path = $relative
            bytes = (Get-Item -LiteralPath $full).Length
            sha256 = (Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash
        }
    }
    if ($result.preservedUntrackedReports.Count -ne 4) { throw 'Expected exactly four pre-existing untracked reports.' }
    Save-Receipt
    $paths = @(
        'src\Shared\E2ETesting\WebDriverExtensions.cs',
        'src\Shared\E2ETesting\WaitAssert.cs',
        'src\Shared\E2ETesting\BrowserFixture.cs',
        'src\Shared\E2ETesting\BrowserTestBase.cs',
        'src\Shared\E2ETesting\CaptureSeleniumLogsAttribute.cs',
        'src\Shared\E2ETesting\E2ETesting.props',
        'src\Shared\E2ETesting\E2ETesting.targets',
        'src\Components\test\E2ETest\Infrastructure\ServerTestBase.cs',
        'src\Components\test\E2ETest\Infrastructure\ServerFixtures\ToggleExecutionModeServerFixture.cs',
        'src\Components\test\E2ETest\Infrastructure\ServerFixtures\BlazorWasmTestAppFixture.cs',
        'src\Components\test\E2ETest\Infrastructure\ServerFixtures\ServerFixture.cs',
        'src\Components\test\E2ETest\Infrastructure\ServerFixtures\WebHostServerFixture.cs',
        'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj',
        'src\Components\test\E2ETest\xunit.runner.json',
        'src\Components\test\testassets\GlobalizationWasmApp\Program.cs',
        'src\Components\test\testassets\GlobalizationWasmApp\wwwroot\index.html',
        'src\Components\test\testassets\GlobalizationWasmApp\GlobalizationWasmApp.csproj',
        'src\Components\test\testassets\GlobalizationWasmApp\App.razor',
        'src\Components\WebAssembly\WebAssembly\src\Hosting\WebAssemblyCultureProvider.cs',
        'src\Components\WebAssembly\WebAssembly\src\Hosting\WebAssemblyHost.cs',
        'src\Components\WebAssembly\WebAssembly\src\Hosting\WebAssemblyHostBuilder.cs',
        'src\Components\Web.JS\src\Boot.WebAssembly.ts',
        'src\Components\Web.JS\src\Boot.WebAssembly.Common.ts',
        'src\Components\Web.JS\src\Platform\Mono\MonoPlatform.ts',
        'src\Components\Web.JS\src\BootErrors.ts',
        'eng\Versions.props',
        'Directory.Packages.props',
        'src\Components\build.cmd',
        'docs\BuildFromSource.md'
    )
    $index = 0
    foreach ($logicalPath in $paths)
    {
        $index++
        $gitPath = $logicalPath.Replace('\', '/')
        $label = '{0:D2}-original' -f $index
        $bytesPath = Read-Native $label 'git' @('--no-pager', 'cat-file', 'blob', "${original}:$gitPath")
        Save-Source $bytesPath 'Original' $logicalPath
        $label = '{0:D2}-default' -f $index
        $bytesPath = Read-Native $label 'gh' @('api', '--method', 'GET', '-H', 'Accept: application/vnd.github.raw+json', "repos/dotnet/aspnetcore/contents/${gitPath}?ref=$default")
        Save-Source $bytesPath 'Default' $logicalPath
    }
    $target = 'src/Components/test/E2ETest/Tests/WebAssemblyICUShardingTest.cs'
    $null = Read-Native '30-join-introduction-history' 'git' @('--no-pager', 'log', '--follow', '-p', '-n', '2', '-G', 'Expected to see globalization error|DynamicallySetLanguageThrows|dotNetCulture', $original, '--', $target)
    $provider = 'src/Components/WebAssembly/WebAssembly/src/Hosting/WebAssemblyCultureProvider.cs'
    $null = Read-Native '31-original-culture-history' 'git' @('--no-pager', 'log', '-n', '3', '--format=fuller', '-p', $original, '--', $provider)
    $null = Read-Native '32-default-culture-history' 'gh' @('api', '--method', 'GET', 'repos/dotnet/aspnetcore/commits', '-f', "sha=$default", '-f', "path=$provider", '-f', 'per_page=3')
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
    Save-Receipt
}
[Console]::WriteLine("CLOSURE_SOURCE_$($result.state.ToUpperInvariant()) files=$($result.files.Count) commands=$($result.commands.Count) collectorPid=$PID")
if ($result.state -ne 'completed') { exit 1 }
exit 0
