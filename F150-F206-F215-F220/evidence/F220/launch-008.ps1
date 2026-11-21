$ErrorActionPreference = 'Stop'
$scope = $PSScriptRoot
$policyPath = Join-Path (Split-Path $scope -Parent) 'policy.json'
$policy = [IO.File]::ReadAllText($policyPath) | ConvertFrom-Json
$leasePath = Join-Path (Split-Path $scope -Parent) 'benchmark-exclusive.lease.json'
$registrationPath = Join-Path (Split-Path $scope -Parent) 'owner-registration-background-247.json'
$registration = [IO.File]::ReadAllText($registrationPath) | ConvertFrom-Json
if ($policy.independentFindingPreparationWorkers.F220 -ne '640fc34c-7345-4501-b6b9-52b0379fb55a' -or
    $registration.actualRegisteredOwners.F220 -ne '640fc34c-7345-4501-b6b9-52b0379fb55a' -or
    $policy.maximumRegisteredPreparationOwners -ne 4 -or
    $policy.activeWorkerPreparationScopes.F220 -notlike '243 only after GO243*' -or
    @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count -gt 4 -or
    @($policy.activeWorkerPreparationScopes.PSObject.Properties).Count -gt 4 -or
    (Test-Path -LiteralPath $leasePath) -or
    $policy.actualWorkerBuildHoldActive -ne $false -or
    $policy.buildAndTestWorkQuiesced -ne $false)
{
    throw 'Fresh F220 Node-launch guard rejected.'
}
$entry = Join-Path $scope 'audit-source-008.mjs'
$node = (Get-Command node -CommandType Application).Source
$before = [ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    launcherPath = $PSCommandPath
    launcherSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    launcherPidSelfObserved = $PID
    entry = $entry
    entrySha256 = (Get-FileHash -LiteralPath $entry -Algorithm SHA256).Hash
    executable = $node
    argumentList = @($entry)
    workingDirectory = 'C:\src\aspnetcore'
    policySha256 = (Get-FileHash -LiteralPath $policyPath -Algorithm SHA256).Hash
    registrationSha256 = (Get-FileHash -LiteralPath $registrationPath -Algorithm SHA256).Hash
    registrationOwner = $registration.actualRegisteredOwners.F220
    leaseExists = $false
    HOLD = $policy.actualWorkerBuildHoldActive
    quiesced = $policy.buildAndTestWorkQuiesced
    productBuildTestRuntimeStarts = 0
}
[IO.File]::WriteAllText((Join-Path $scope 'launch-008.request.json'), ($before | ConvertTo-Json -Depth 8) + "`n")
$start = [Diagnostics.ProcessStartInfo]::new()
$start.FileName = $node
$start.WorkingDirectory = 'C:\src\aspnetcore'
$start.ArgumentList.Add($entry)
$start.UseShellExecute = $false
$start.CreateNoWindow = $true
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
$stdout = [IO.File]::Open((Join-Path $scope 'launch-008.stdout.bin'), [IO.FileMode]::CreateNew)
$stderr = [IO.File]::Open((Join-Path $scope 'launch-008.stderr.bin'), [IO.FileMode]::CreateNew)
$child = [Diagnostics.Process]::Start($start)
$childPid = $child.Id
$childCreationUtc = $child.StartTime.ToUniversalTime().ToString('o')
$stdoutTask = $child.StandardOutput.BaseStream.CopyToAsync($stdout)
$stderrTask = $child.StandardError.BaseStream.CopyToAsync($stderr)
$child.WaitForExit()
$null = $stdoutTask.GetAwaiter().GetResult()
$null = $stderrTask.GetAwaiter().GetResult()
$exitCode = $child.ExitCode
$stdout.Dispose()
$stderr.Dispose()
$after = [ordered]@{
    observedAfterWaitUtc = [DateTime]::UtcNow.ToString('o')
    launcherPidSelfObserved = $PID
    childRootPidObservedByProcessObject = $childPid
    childCreationUtcObservedByProcessObject = $childCreationUtc
    childExitCodeAfterWait = $exitCode
    childRootWaitReturned = $true
    bothRawStreamCopiesReturned = $true
    stdoutSha256 = (Get-FileHash -LiteralPath (Join-Path $scope 'launch-008.stdout.bin') -Algorithm SHA256).Hash
    stderrSha256 = (Get-FileHash -LiteralPath (Join-Path $scope 'launch-008.stderr.bin') -Algorithm SHA256).Hash
    universalDescendantCensusClaimed = $false
    launcherOwnFutureExitNotAttested = $true
}
$child.Dispose()
[IO.File]::WriteAllText((Join-Path $scope 'launch-008.receipt.json'), ($after | ConvertTo-Json -Depth 8) + "`n")
$after | ConvertTo-Json -Depth 8
exit $exitCode
