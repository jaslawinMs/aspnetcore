$ErrorActionPreference = 'Stop'
$Root = 'C:\src\aspnetcore'
$Out = $PSScriptRoot
Set-Location $Out
$script:CommandLog = [System.Collections.Generic.List[object]]::new()
$script:Membership = [System.Collections.Generic.List[object]]::new()
$Utf8 = [System.Text.UTF8Encoding]::new($false)

function WriteJson($Path, $Value)
{
    [System.IO.File]::WriteAllText($Path, (($Value | ConvertTo-Json -Depth 50) + "`n"), $Utf8)
}

function HashBytes([byte[]] $Bytes)
{
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try
    {
        return [System.Convert]::ToHexString($sha.ComputeHash($Bytes)).ToLowerInvariant()
    }
    finally
    {
        $sha.Dispose()
    }
}

function RunSource([string] $Label, [string] $Executable, [string[]] $Arguments)
{
    $prefix = Join-Path (Join-Path $Out 'commands') $Label
    $stdoutPath = $prefix + '.stdout'
    $stderrPath = $prefix + '.stderr'
    $stdout = [System.IO.File]::Open($stdoutPath, [System.IO.FileMode]::CreateNew)
    $stderr = [System.IO.File]::Open($stderrPath, [System.IO.FileMode]::CreateNew)
    $start = [System.Diagnostics.ProcessStartInfo]::new()
    $start.FileName = (Get-Command $Executable -CommandType Application | Select-Object -First 1).Source
    $start.WorkingDirectory = $Root
    $start.UseShellExecute = $false
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    $start.Environment['GIT_OPTIONAL_LOCKS'] = '0'
    $start.Environment['GIT_TERMINAL_PROMPT'] = '0'
    $start.Environment['GIT_PAGER'] = 'cat'
    $start.Environment['GH_PAGER'] = 'cat'
    $start.Environment['GH_PROMPT_DISABLED'] = '1'
    foreach ($argument in $Arguments)
    {
        $start.ArgumentList.Add($argument)
    }
    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $start
    $before = [DateTime]::UtcNow.ToString('o')
    try
    {
        $process.Start() | Out-Null
        $childId = $process.Id
        $outCopy = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
        $errCopy = $process.StandardError.BaseStream.CopyToAsync($stderr)
        $process.WaitForExit()
        $outCopy.GetAwaiter().GetResult()
        $errCopy.GetAwaiter().GetResult()
        $code = $process.ExitCode
        $item = [ordered]@{
            label = $Label
            executable = $start.FileName
            argv = @($Arguments)
            cwd = $Root
            pid = $childId
            parentPid = $PID
            startedUtc = $before
            endedUtc = [DateTime]::UtcNow.ToString('o')
            exitCode = $code
            terminal = $process.HasExited
            redirectedStreamsDrained = $true
            stdout = "commands\$Label.stdout"
            stderr = "commands\$Label.stderr"
            classification = 'source-read-only'
        }
        $script:CommandLog.Add($item)
        WriteJson ($prefix + '.json') $item
        Write-Host "$Label PID=$childId exit=$code"
    }
    finally
    {
        $stdout.Dispose()
        $stderr.Dispose()
        $process.Dispose()
    }
    return [pscustomobject]@{ ExitCode = $code; Bytes = [System.IO.File]::ReadAllBytes($stdoutPath) }
}

function Git([string] $Label, [string[]] $GitArguments)
{
    return RunSource $Label 'git' (@('--no-pager', '-c', 'core.fsmonitor=false', '-C', $Root) + $GitArguments)
}

function Snapshot([string] $Revision, [string] $Role, [string] $Path)
{
    $gitPath = $Path.Replace('\', '/')
    $key = (HashBytes ([System.Text.Encoding]::UTF8.GetBytes($Path))).Substring(0, 12)
    $label = "$script:Batch-source-$Role-$key"
    $result = Git $label @('show', "${Revision}:$gitPath")
    $entry = [ordered]@{ role = $Role; revision = $Revision; path = $Path; gitPath = $gitPath; exitCode = $result.ExitCode; command = "commands\$label.json" }
    if ($result.ExitCode -eq 0)
    {
        $relative = "source\$Role\$Path"
        $target = Join-Path $Out $relative
        if ([System.IO.File]::Exists($target))
        {
            throw "Refusing to overwrite an existing pinned snapshot: $target"
        }
        [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($target)) | Out-Null
        [System.IO.File]::WriteAllBytes($target, $result.Bytes)
        $entry.artifact = $relative
        $entry.sha256 = HashBytes $result.Bytes
        $entry.bytes = $result.Bytes.Length
    }
    $script:Membership.Add($entry)
}

function FinishBatch([string] $Started, $Extra)
{
    WriteJson (Join-Path $Out "membership_$script:Batch.json") @($script:Membership)
    WriteJson (Join-Path $Out "source_collection_$script:Batch.json") ([ordered]@{
        startedUtc = $Started
        endedUtc = [DateTime]::UtcNow.ToString('o')
        collectorPid = $PID
        powerShellVersion = $PSVersionTable.PSVersion.ToString()
        commands = @($script:CommandLog)
        nativeCommandsStarted = 0
        extra = $Extra
    })
}
