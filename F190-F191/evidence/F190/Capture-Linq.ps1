$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location $PSScriptRoot
[Environment]::CurrentDirectory = (Get-Location).ProviderPath
New-Item -ItemType Directory -Path '.\linq-commands', '.\sources\linq-original', '.\sources\linq-default' | Out-Null
$receipts = [System.Collections.Generic.List[object]]::new()
$bindings = [System.Collections.Generic.List[object]]::new()
$pins = Get-Content -Raw -LiteralPath '.\runtime-source-pins.json' | ConvertFrom-Json
$files = @('Count.cs', 'AnyAll.cs', 'Concat.cs', 'Concat.SpeedOpt.cs', 'AppendPrepend.cs', 'AppendPrepend.SpeedOpt.cs', 'Enumerable.cs')

foreach ($pin in $pins)
{
    foreach ($file in $files)
    {
        $role = $pin.role
        $gitPath = "src/runtime/src/libraries/System.Linq/src/System/Linq/$file"
        $argv = @('api', "repos/dotnet/dotnet/contents/${gitPath}?ref=$($pin.sha)")
        $info = [System.Diagnostics.ProcessStartInfo]::new()
        $info.FileName = (Get-Command gh -CommandType Application).Source
        $info.WorkingDirectory = $PSScriptRoot
        $info.UseShellExecute = $false
        $info.RedirectStandardOutput = $true
        $info.RedirectStandardError = $true
        $info.Environment['GH_PAGER'] = ''
        $info.Environment['GH_PROMPT_DISABLED'] = '1'
        foreach ($arg in $argv)
        {
            $info.ArgumentList.Add($arg)
        }
        $process = [System.Diagnostics.Process]::new()
        $process.StartInfo = $info
        $startedUtc = [DateTime]::UtcNow.ToString('o')
        try
        {
            if (-not $process.Start())
            {
                throw "Could not start read-only source request $role $file"
            }
            $rootPid = $process.Id
            $stdoutTask = $process.StandardOutput.ReadToEndAsync()
            $stderrTask = $process.StandardError.ReadToEndAsync()
            $process.WaitForExit()
            $stdout = $stdoutTask.GetAwaiter().GetResult()
            $stderr = $stderrTask.GetAwaiter().GetResult()
            $exitCode = $process.ExitCode
        }
        finally
        {
            $process.Dispose()
        }
        $stdoutPath = ".\linq-commands\$role-$file.stdout.json"
        $stderrPath = ".\linq-commands\$role-$file.stderr.txt"
        [System.IO.File]::WriteAllText($stdoutPath, $stdout)
        [System.IO.File]::WriteAllText($stderrPath, $stderr)
        $receipts.Add([ordered]@{
            executable = $info.FileName
            argv = $argv
            workingDirectory = $PSScriptRoot
            classification = 'read-only pinned runtime source retrieval; no runtime execution'
            startedUtc = $startedUtc
            completedUtc = [DateTime]::UtcNow.ToString('o')
            rootPid = $rootPid
            exitCode = $exitCode
            rootTerminal = $true
            stdoutTerminal = $stdoutTask.IsCompleted
            stderrTerminal = $stderrTask.IsCompleted
            stdout = $stdoutPath
            stderr = $stderrPath
        })
        $receipts | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath '.\linq-command-receipts.json' -Encoding utf8
        if ($exitCode -ne 0)
        {
            throw "Pinned source request failed ($exitCode); exact streams retained: $role $file"
        }
        $response = $stdout | ConvertFrom-Json
        if ($response.encoding -ne 'base64')
        {
            throw "Unexpected source content encoding: $($response.encoding)"
        }
        $bytes = [Convert]::FromBase64String($response.content)
        $header = [System.Text.Encoding]::UTF8.GetBytes("blob $($bytes.Length)`0")
        $sha1 = [System.Security.Cryptography.IncrementalHash]::CreateHash([System.Security.Cryptography.HashAlgorithmName]::SHA1)
        $sha1.AppendData($header)
        $sha1.AppendData($bytes)
        $computedBlob = [Convert]::ToHexString($sha1.GetHashAndReset()).ToLowerInvariant()
        $sha1.Dispose()
        if ($computedBlob -ne $response.sha)
        {
            throw "Git blob verification failed for $role $file"
        }
        $artifact = ".\sources\linq-$role\$file"
        [System.IO.File]::WriteAllBytes($artifact, $bytes)
        $bindings.Add([ordered]@{
            role = $role
            dependencyVersion = $pin.version
            repository = 'dotnet/dotnet'
            commit = $pin.sha
            repositoryPath = $gitPath
            gitBlob = $response.sha
            gitBlobVerified = $true
            artifact = $artifact
            bytes = $bytes.Length
            sha256 = (Get-FileHash -LiteralPath $artifact -Algorithm SHA256).Hash
            url = $response.html_url
            actualExecutingRuntimeObserved = $false
        })
        $bindings | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath '.\linq-source-bindings.json' -Encoding utf8
    }
}
[ordered]@{
    completedUtc = [DateTime]::UtcNow.ToString('o')
    sourceFiles = $bindings.Count
    sourceReadCommands = $receipts.Count
    allSourceReadRootsAndBothStreamsTerminal = @($receipts | Where-Object { -not $_.rootTerminal -or -not $_.stdoutTerminal -or -not $_.stderrTerminal }).Count -eq 0
    nativeBuildTestOrRuntimeStarts = 0
    comparisons = 0
} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath '.\linq-capture-completed.json' -Encoding utf8
Get-Content -Raw -LiteralPath '.\linq-capture-completed.json'
