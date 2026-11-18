param(
    [Parameter(Mandatory)]
    [ValidateSet('characterize', 'measure')]
    [string]$Mode,
    [Parameter(Mandatory)]
    [ValidateSet('original', 'candidate')]
    [string]$Variant,
    [int]$Round = 1
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F038'
$preparation = Join-Path $run "preparation-$Variant-001"
$directory = Join-Path $run "$Mode-$Variant-$('{0:D3}' -f $Round)"
if (Test-Path -LiteralPath $directory)
{
    throw "Do not overwrite a native invocation: $directory"
}
Set-Location $root
. .\activate.ps1
$budgetFile = Join-Path $run 'source-comparison-budget.json'
$budget = $null
$attempt = $null
$member = $null
if ($Mode -eq 'measure')
{
    $sealFile = Join-Path $run 'measurement-seal.json'
    $seal = Get-Content -Raw -LiteralPath $sealFile | ConvertFrom-Json
    foreach ($entry in $seal.sealedFiles)
    {
        if ((Get-FileHash -LiteralPath $entry.path -Algorithm SHA256).Hash -cne $entry.sha256)
        {
            throw "Sealed premeasurement input changed: $($entry.path)"
        }
    }
    $budget = Get-Content -Raw -LiteralPath $budgetFile | ConvertFrom-Json
    if ($budget.closed -or $budget.maximumPairs -ne 3 -or @($budget.attempts).Count -gt 3 -or
        $budget.measurementSealSha256 -cne (Get-FileHash -LiteralPath $sealFile -Algorithm SHA256).Hash)
    {
        throw 'Invalid, closed or changed source-comparison authorization.'
    }
    $attempt = @($budget.attempts)[-1]
    if ($attempt.round -ne $Round -or $attempt.status -ne 'started' -or
        @($attempt.members).Count -ge 2 -or $attempt.order[@($attempt.members).Count] -cne $Variant)
    {
        throw 'Native source-comparison variant/order/round does not match the prestarted bounded pair.'
    }
    $member = [pscustomobject]@{variant=$Variant;status='starting';directory=$directory;
        authorizedUtc=[DateTime]::UtcNow.ToString('O');processId=$null;startedUtc=$null;finishedUtc=$null;exitCode=$null}
    $attempt.members = @($attempt.members) + @($member)
    $budget | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath $budgetFile -Encoding utf8NoBOM
}
New-Item -ItemType Directory -Path (Join-Path $directory 'state') | Out-Null
$arguments = @((Join-Path $preparation 'consumer\AutoPerf.Benchmarks.dll'), $Mode, $Variant,
    (Join-Path $directory 'state'), (Join-Path $preparation 'consumer-closure.json'),
    (Join-Path $preparation 'sources'), (Join-Path $directory 'reports'))
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
$stdout = [IO.File]::Open((Join-Path $directory 'stdout.log'), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
$stderr = [IO.File]::Open((Join-Path $directory 'stderr.log'), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
try
{
    if (-not $process.Start())
    {
        throw 'The actual owned native invocation did not start.'
    }
    $outTask = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
    $errTask = $process.StandardError.BaseStream.CopyToAsync($stderr)
    $receipt = [ordered]@{
        candidate='F038';mode=$Mode;variant=$Variant;round=$Round
        executable=$startInfo.FileName;arguments=$arguments
        actualProcessId=$process.Id;actualProcessStartedUtc=$process.StartTime.ToUniversalTime().ToString('O')
        actualPidCapturedBeforeWait=$true;actualPriorityAtLaunch=$process.PriorityClass.ToString()
        actualAffinityAtLaunch=$process.ProcessorAffinity.ToInt64()
        actualDriverSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
        actualExitCode=$null;finishedUtc=$null
    }
    $receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $directory 'launch.json') -Encoding utf8NoBOM
    if ($member)
    {
        $member.processId = $process.Id
        $member.startedUtc = $receipt.actualProcessStartedUtc
        $member.status = 'running'
        $budget | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath $budgetFile -Encoding utf8NoBOM
    }
    $process.WaitForExit()
    $outTask.GetAwaiter().GetResult()
    $errTask.GetAwaiter().GetResult()
    $receipt.actualExitCode = $process.ExitCode
    $receipt.finishedUtc = [DateTime]::UtcNow.ToString('O')
    $receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $directory 'completion.json') -Encoding utf8NoBOM
    if ($member)
    {
        $member.exitCode = $process.ExitCode
        $member.finishedUtc = $receipt.finishedUtc
        $member.status = if ($process.ExitCode -eq 0) { 'completed' } else { 'failed' }
        if ($process.ExitCode -ne 0)
        {
            $attempt.status = 'failed'
        }
        elseif (@($attempt.members).Count -eq 2)
        {
            $attempt.status = 'completed'
        }
        $budget | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath $budgetFile -Encoding utf8NoBOM
    }
}
finally
{
    $stdout.Dispose()
    $stderr.Dispose()
    $process.Dispose()
}
Get-Content -LiteralPath (Join-Path $directory 'stdout.log') -Tail 18
Get-Content -LiteralPath (Join-Path $directory 'stderr.log') -Tail 15
if ($receipt.actualExitCode -ne 0)
{
    throw "Actual native invocation failed:$($receipt.actualExitCode)"
}
Write-Output "F038:$Mode/$Variant/$Round succeeded;nativePID$($receipt.actualProcessId)captured before wait."
