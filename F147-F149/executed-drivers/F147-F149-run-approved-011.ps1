$ErrorActionPreference = 'Stop'
$session = $PSScriptRoot
$parallel = Join-Path $session 'autoperf-parallelism'
$policyFile = Join-Path $parallel 'policy.json'
$gateway = Join-Path $parallel 'Invoke-AutoPerfBenchmark.ps1'
$leasePath = Join-Path $parallel 'benchmark-exclusive.lease.json'
$policy = Get-Content -LiteralPath $policyFile -Raw | ConvertFrom-Json
if (-not $policy.actualWorkerBuildHoldActive -or $policy.workersMayBuildOrTest -or
    $policy.buildAndTestWorkQuiesced -or (Test-Path -LiteralPath $leasePath) -or
    $policy.explicitF147F149HoldId -cne 'F147-F149-011' -or
    (Get-FileHash -LiteralPath $gateway -Algorithm SHA256).Hash -cne
    '4780D493C98E9743F5598CAEB37BE595F4A6FF5BD52DA21A06123253FEF22753')
{
    throw 'Wrong admission state, existing lease or changed gateway.'
}
$owners = [ordered]@{
    F160 = '4c0aec00-558b-4b47-8384-bd60867facc1'
    F163 = '99f6a6f7-2ec9-40ab-aa1d-f6486b7f9d5e'
}
$acknowledgements = @()
foreach ($scope in $owners.Keys)
{
    if ($policy.independentFindingPreparationWorkers.$scope -cne $owners[$scope])
    {
        throw 'The actual preparation owner changed after the HOLD request.'
    }
    $file = Join-Path $parallel "hold-F147-F149-011-$scope.json"
    $ack = Get-Content -LiteralPath $file -Raw | ConvertFrom-Json
    if ($ack.holdId -cne 'F147-F149-011' -or $ack.agentId -cne $owners[$scope] -or
        $ack.actualOwnedNativeChildrenTerminal -ne $true -or $ack.actualOwnedStreamsDrained -ne $true -or
        $ack.actualHeavyIoStopped -ne $true -or $ack.actualNoNewNativeUntilReleased -ne $true)
    {
        throw "The actual owner has not acknowledged terminal native work/streams/heavy IO: $scope"
    }
    $acknowledgements += [ordered]@{ scope = $scope; file = $file
        sha256 = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash; actualAcknowledgement = $ack }
}
$native = @(Get-CimInstance Win32_Process | Where-Object {
    $_.Name -match '^(dotnet|MSBuild|VBCSCompiler|testhost|vstest\.console|node|corerun)\.exe$'
} | Select-Object ProcessId, ParentProcessId, Name, CreationDate, CommandLine)
$campaignNative = @($native | Where-Object {
    $_.CommandLine -match '(?i)(C:\\src\\autoperf-|C:\\src\\aspnetcore\\\.dotnet|autoperf-parallelism|F[0-9]{3}-(compare|benchmark))'
})
if ($campaignNative.Count -ne 0)
{
    throw ('Native campaign-related work remains; no benchmark admitted: ' + ($campaignNative.ProcessId -join ','))
}
$receiptFile = Join-Path $parallel 'F147-F149-local-quiescence-011.json'
if (Test-Path -LiteralPath $receiptFile)
{
    throw 'Refusing to overwrite an earlier timing admission.'
}
$receipt = [ordered]@{
    recordedAt = [DateTimeOffset]::UtcNow.ToString('o')
    holdId = 'F147-F149-011'; acknowledgements = $acknowledgements
    actualCoordinatorKnownBuildTestChildrenAndStreamsTerminal = $true
    actualCoordinatorSourceBuildAndHeavyIoQuiescent = $true
    actualLiveNativeProcessReview = $native; actualLiveCampaignRelatedNativeProcesses = $campaignNative
    actualDedicatedBoxOrArbitraryThirdPartyInactivityClaimed = $false
    actualSharedHostNoiseStillPossible = $true; actualNoPriorityAffinityOrMachineSettingsChanged = $true
    actualSamePhysicalHostWithinAllPairs = $true; actualNoRemoteBenchmarkAuthorized = $true
}
[IO.File]::WriteAllText($receiptFile, ($receipt | ConvertTo-Json -Depth 40) + [Environment]::NewLine,
    [Text.UTF8Encoding]::new($false))
$policy.actualLocalQuiescenceReceipt = 'autoperf-parallelism\F147-F149-local-quiescence-011.json'
$policy.buildAndTestWorkQuiesced = $true
$policy.explicitF147F149HoldState = 'Both actual preparation owners terminal/streams drained/heavy IO stopped; coordinator native/source IO reviewed; sequential gateway comparisons admitted.'
[IO.File]::WriteAllText($policyFile, ($policy | ConvertTo-Json -Depth 40) + [Environment]::NewLine,
    [Text.UTF8Encoding]::new($false))
$executions = @()
foreach ($finding in @('F147', 'F149'))
{
    $root = Join-Path $session "autoperf-runs\$finding"
    foreach ($role in @('Original', 'CurrentDefault'))
    {
        $budget = Get-Content -LiteralPath (Join-Path $root 'diagnostic-budget.json') -Raw | ConvertFrom-Json
        if ($budget.closed)
        {
            break
        }
        if (Test-Path -LiteralPath $leasePath)
        {
            throw 'The prior gateway did not release its lease; refusing another comparison.'
        }
        $info = [Diagnostics.ProcessStartInfo]::new()
        $info.FileName = (Get-Command pwsh -CommandType Application).Source
        foreach ($argument in @('-NoLogo', '-NoProfile', '-NonInteractive', '-File', $gateway,
            '-RequestPath', (Join-Path $root "benchmark-request-$role.json")))
        {
            $info.ArgumentList.Add($argument)
        }
        $info.WorkingDirectory = $root
        $info.UseShellExecute = $false
        $info.CreateNoWindow = $true
        $info.RedirectStandardOutput = $true
        $info.RedirectStandardError = $true
        $process = [Diagnostics.Process]::Start($info)
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        $process.WaitForExit()
        $stdout = $stdoutTask.GetAwaiter().GetResult()
        $stderr = $stderrTask.GetAwaiter().GetResult()
        [IO.File]::WriteAllText((Join-Path $root "gateway-$role.stdout.txt"), $stdout)
        [IO.File]::WriteAllText((Join-Path $root "gateway-$role.stderr.txt"), $stderr)
        $record = [ordered]@{
            finding = $finding; role = $role; actualGatewayPid = $process.Id
            actualExitCode = $process.ExitCode; actualTerminal = $process.HasExited
            actualStdoutCompletelyDrained = $stdoutTask.IsCompletedSuccessfully
            actualStderrCompletelyDrained = $stderrTask.IsCompletedSuccessfully
            actualLeaseReleased = -not (Test-Path -LiteralPath $leasePath)
            actualExecutable = $info.FileName; actualArguments = @($info.ArgumentList)
        }
        $executions += $record
        [IO.File]::WriteAllText((Join-Path $root "gateway-$role.receipt.json"),
            ($record | ConvertTo-Json -Depth 15) + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
        if ($process.ExitCode -ne 0 -or -not $record.actualLeaseReleased)
        {
            throw "Gateway failed closed for $finding/$role; retained lease or attempt must be reviewed. $stderr"
        }
        Write-Output $stdout
    }
}
[IO.File]::WriteAllText((Join-Path $parallel 'F147-F149-gateways-terminal-011.json'),
    ([ordered]@{ recordedAt = [DateTimeOffset]::UtcNow.ToString('o'); actualExecutions = $executions
        actualAllGatewayProcessesAndStreamsTerminal = $true
        actualGlobalBenchmarkLeaseReleased = -not (Test-Path -LiteralPath $leasePath)
        actualWorkersStillHeldUntilExplicitRelease = $true } | ConvertTo-Json -Depth 20) + [Environment]::NewLine,
    [Text.UTF8Encoding]::new($false))
