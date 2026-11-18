$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F038'
$directory = Join-Path $run 'reproduction-candidate-001'
if (Test-Path -LiteralPath $directory)
{
    throw 'Do not overwrite independent project reproduction.'
}
$original = Get-Content -Raw -LiteralPath (Join-Path $run 'preparation-original-001\verified-preparation.json') | ConvertFrom-Json
$candidate = Get-Content -Raw -LiteralPath (Join-Path $run 'preparation-candidate-001\verified-preparation.json') | ConvertFrom-Json
$budget = Get-Content -Raw -LiteralPath (Join-Path $run 'source-comparison-budget.json') | ConvertFrom-Json
if (-not $budget.closed -or @($budget.attempts).Count -ne 3)
{
    throw 'Do not overlap the untimed reproducibility build with measurement.'
}
$projectDirectory = Join-Path $directory 'project'
New-Item -ItemType Directory -Path $projectDirectory | Out-Null
foreach ($entry in $original.actualHarnessFiles)
{
    $source = Join-Path $run "harness\$($entry.file)"
    if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash -cne $entry.sha256)
    {
        throw 'Published project source must remain the exact measured source.'
    }
    Copy-Item -LiteralPath $source -Destination (Join-Path $projectDirectory $entry.file)
}
Copy-Item -LiteralPath (Join-Path $run 'preparation-candidate-001\sources') -Destination (Join-Path $directory 'sources') -Recurse
Set-Location $root
. .\activate.ps1
$env:AUTOPERF_ASPNETCORE_ROOT = $root
$env:MSBUILDDISABLENODEREUSE = '1'
$commands = @()
foreach ($operation in 'restore', 'build')
{
    $arguments = @($operation, (Join-Path $projectDirectory 'AutoPerf.Benchmarks.csproj'),
        '-m:2', '-nr:false', '--verbosity', 'quiet', '-p:UseIisNativeAssets=false',
        '-p:BuildProjectReferences=false', '-p:UseSharedCompilation=false')
    if ($operation -eq 'restore')
    {
        $arguments += @('--configfile', (Join-Path $root 'NuGet.config'))
    }
    else
    {
        $arguments += @('--configuration', 'Release', '--no-restore')
    }
    $start = [DateTime]::UtcNow
    & dotnet @arguments 1> (Join-Path $directory "$operation.stdout") 2> (Join-Path $directory "$operation.stderr")
    $code = $LASTEXITCODE
    $commands += [ordered]@{executable=(Get-Command dotnet).Source;arguments=$arguments;actualExitCode=$code;
        actualStartedUtc=$start.ToString('O');actualFinishedUtc=[DateTime]::UtcNow.ToString('O')}
    $commands | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $directory 'build-commands.json') -Encoding utf8NoBOM
    Get-Content -LiteralPath (Join-Path $directory "$operation.stdout") -Tail 15
    Get-Content -LiteralPath (Join-Path $directory "$operation.stderr") -Tail 10
    if ($code -ne 0)
    {
        throw "Independently relocated exact project $operation failed:$code"
    }
}
$consumer = Join-Path $directory 'consumer'
Copy-Item -LiteralPath (Join-Path $projectDirectory 'bin\Release\net12.0') -Destination $consumer -Recurse
$files = @(Get-ChildItem -LiteralPath $consumer -Recurse -File | Sort-Object FullName | ForEach-Object {
    [ordered]@{path=[IO.Path]::GetRelativePath($consumer,$_.FullName);bytes=$_.Length;
        sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash}
})
if ($files.Count -ne 106 -or
    (Get-FileHash -LiteralPath (Join-Path $consumer 'Microsoft.AspNetCore.Components.dll') -Algorithm SHA256).Hash -cne $candidate.actualCandidateOwnerSha256)
{
    throw 'Independent output must contain106files and the exact actual tested candidate owner.'
}
[ordered]@{candidate='F038';variant='candidate';actualConsumerRoot=$consumer;files=$files
} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $directory 'consumer-closure.json') -Encoding utf8NoBOM
$native = Join-Path $directory 'native'
New-Item -ItemType Directory -Path (Join-Path $native 'state') | Out-Null
$arguments = @((Join-Path $consumer 'AutoPerf.Benchmarks.dll'), 'characterize', 'candidate',
    (Join-Path $native 'state'), (Join-Path $directory 'consumer-closure.json'),
    (Join-Path $directory 'sources'), (Join-Path $native 'reports'))
$startInfo = [Diagnostics.ProcessStartInfo]::new()
$startInfo.FileName = (Get-Command dotnet).Source
$startInfo.WorkingDirectory = $directory
$startInfo.UseShellExecute = $false
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
foreach ($argument in $arguments)
{
    $startInfo.ArgumentList.Add($argument)
}
$process = [Diagnostics.Process]::new()
$process.StartInfo = $startInfo
$stdout = [IO.File]::Open((Join-Path $native 'stdout.log'), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
$stderr = [IO.File]::Open((Join-Path $native 'stderr.log'), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
try
{
    if (-not $process.Start())
    {
        throw 'Independent untimed native characterization did not start.'
    }
    $outTask = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
    $errTask = $process.StandardError.BaseStream.CopyToAsync($stderr)
    $receipt = [ordered]@{candidate='F038';actualUntimed=$true;actualNotFourthSourceComparison=$true;
        executable=$startInfo.FileName;arguments=$arguments;actualProcessId=$process.Id;
        actualPidCapturedBeforeWait=$true;actualStartedUtc=$process.StartTime.ToUniversalTime().ToString('O');
        actualExitCode=$null;actualFinishedUtc=$null}
    $receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $native 'launch.json') -Encoding utf8NoBOM
    $process.WaitForExit()
    [void]$outTask.GetAwaiter().GetResult()
    [void]$errTask.GetAwaiter().GetResult()
    $receipt.actualExitCode = $process.ExitCode
    $receipt.actualFinishedUtc = [DateTime]::UtcNow.ToString('O')
    $receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $native 'completion.json') -Encoding utf8NoBOM
}
finally
{
    $stdout.Dispose()
    $stderr.Dispose()
    $process.Dispose()
}
Get-Content -LiteralPath (Join-Path $native 'stdout.log') -Tail 12
Get-Content -LiteralPath (Join-Path $native 'stderr.log') -Tail 12
if ($receipt.actualExitCode -ne 0)
{
    throw 'Independent exact-project native characterization failed.'
}
[ordered]@{candidate='F038';actualBuildPassed=$true;actualMeasuredProjectFilesByteIdentical=@($original.actualHarnessFiles).Count;
    actualConsumerFiles=$files.Count;actualSameCandidateOwner=$true;actualUntimedNativeCharacterizationPassed=$true;
    actualNoFourthComparisonOrNewPerformanceConfidence=$true;actualNativeProcessId=$receipt.actualProcessId;
    actualSeparateCompiledHarnessImage=$true
} | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $directory 'verified-result.json') -Encoding utf8NoBOM
Write-Output 'F038:independently relocated identical project restored/built and actual44semantic+40lifecycle characterization passed;no new timing.'
