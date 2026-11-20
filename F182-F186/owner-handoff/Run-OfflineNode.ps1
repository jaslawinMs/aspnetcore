param(
    [Parameter(Mandatory)][ValidateSet('seal', 'audit')][string]$Kind,
    [Parameter(Mandatory)][ValidatePattern('^[0-9]{3}$')][string]$Attempt
)
$ErrorActionPreference = 'Stop'
$capsule = $PSScriptRoot
$ownerRoot = Split-Path $capsule
$policyPath = Join-Path (Split-Path $ownerRoot) 'policy.json'
$policy = Get-Content -Raw -LiteralPath $policyPath | ConvertFrom-Json
if ($policy.actualWorkerBuildHoldActive -or !$policy.workersMayBuildOrTest)
{
    throw 'Actual HOLD blocks a new source-heavy offline helper.'
}
$prefix = Join-Path $ownerRoot "$Kind-attempt-$Attempt"
foreach ($suffix in @('.stdout.txt', '.stderr.txt', '.receipt.json'))
{
    if (Test-Path -LiteralPath "$prefix$suffix")
    {
        throw "Attempt already exists: $prefix$suffix"
    }
}
$node = (Get-Command node -CommandType Application).Source
$script = if ($Kind -eq 'seal') { 'Seal-Manifest.cjs' } else { 'Audit.cjs' }
$arguments = [System.Collections.Generic.List[string]]::new()
$arguments.Add('--permission')
$arguments.Add("--allow-fs-read=$capsule")
if ($Kind -eq 'seal')
{
    $arguments.Add("--allow-fs-write=$capsule\MANIFEST.json")
    $arguments.Add("--allow-fs-write=$capsule\MANIFEST.sha256")
}
$arguments.Add('--no-addons')
$arguments.Add((Join-Path $capsule $script))
$before = if (Test-Path -LiteralPath "$capsule\MANIFEST.json") { (Get-FileHash -LiteralPath "$capsule\MANIFEST.json" -Algorithm SHA256).Hash } else { $null }
$start = [System.Diagnostics.ProcessStartInfo]::new()
$start.FileName = $node
$start.WorkingDirectory = $capsule
$start.UseShellExecute = $false
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
[void]$start.Environment.Remove('NODE_OPTIONS')
[void]$start.Environment.Remove('NODE_PATH')
foreach ($argument in $arguments)
{
    $start.ArgumentList.Add($argument)
}
$process = [System.Diagnostics.Process]::new()
$process.StartInfo = $start
[void]$process.Start()
$creationTimeUtc = $process.StartTime.ToUniversalTime().ToString('o')
$outTask = $process.StandardOutput.ReadToEndAsync()
$errTask = $process.StandardError.ReadToEndAsync()
$process.WaitForExit()
$stdout = $outTask.GetAwaiter().GetResult()
$stderr = $errTask.GetAwaiter().GetResult()
[System.IO.File]::WriteAllText("$prefix.stdout.txt", $stdout)
[System.IO.File]::WriteAllText("$prefix.stderr.txt", $stderr)
$after = if (Test-Path -LiteralPath "$capsule\MANIFEST.json") { (Get-FileHash -LiteralPath "$capsule\MANIFEST.json" -Algorithm SHA256).Hash } else { $null }
$record = [ordered]@{
    kind = $Kind
    attempt = $Attempt
    executable = $node
    nodeFileVersion = (Get-Item -LiteralPath $node).VersionInfo.FileVersion
    nodeSha256 = (Get-FileHash -LiteralPath $node -Algorithm SHA256).Hash
    arguments = $arguments.ToArray()
    workingDirectory = $capsule
    launcherSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    scriptSha256 = (Get-FileHash -LiteralPath (Join-Path $capsule $script) -Algorithm SHA256).Hash
    processId = $process.Id
    creationTimeUtc = $creationTimeUtc
    exitedAtUtc = [DateTime]::UtcNow.ToString('o')
    exitCode = $process.ExitCode
    exited = $process.HasExited
    bothStreamsDrained = $true
    nodeOptionsAndNodePathRemovedInChildOnly = $true
    filesystemReadPermission = $capsule
    filesystemWritePermission = if ($Kind -eq 'seal') { @("$capsule\MANIFEST.json", "$capsule\MANIFEST.sha256") } else { @() }
    noAddonOrChildProcessPermission = $true
    policyObservedHoldActive = $policy.actualWorkerBuildHoldActive
    manifestSha256Before = $before
    manifestSha256After = $after
    stdout = "$prefix.stdout.txt"
    stderr = "$prefix.stderr.txt"
    structuredResultValidated = $false
}
$record | ConvertTo-Json -Depth 15 | Set-Content -Encoding utf8NoBOM "$prefix.receipt.json.stage"
Move-Item -LiteralPath "$prefix.receipt.json.stage" -Destination "$prefix.receipt.json"
if ($process.ExitCode -ne 0)
{
    $process.Dispose()
    throw "Node $Kind failed; exact command, stdout and stderr retained at $prefix"
}
if ($Kind -eq 'audit')
{
    if (!$before -or $before -ne $after)
    {
        throw 'Read-only audit did not preserve the manifest.'
    }
    $offset = $stdout.LastIndexOf("`n{")
    $summary = $stdout.Substring($(if ($offset -ge 0) { $offset + 1 } else { 0 })).Trim() | ConvertFrom-Json
    if ($summary.result -ne 'PASS' -or $summary.scope -ne 'NEW F182-F186 preparation; findings remain PENDING' -or !$summary.readOnly -or $summary.manifestSha256 -ne $after -or $summary.newNativeRowExecutions -ne 18 -or $summary.newCommonConsumerCompilations -ne 1 -or $summary.rawPdbDocuments -ne 229)
    {
        throw 'Actual structured audit result does not meet the bounded acceptance.'
    }
    if (@($summary.supplemental).Count -ne 2 -or @($summary.supplemental | Where-Object { $_.nativeRows -ne 9 -or $_.supplementalRows -ne 9 -or $_.assertions -ne 185 }).Count -ne 0)
    {
        throw 'Actual per-role audit results differ.'
    }
}
else
{
    $summary = $stdout.Trim() | ConvertFrom-Json
    if ($summary.manifestSha256 -ne $after -or $summary.files -le 0 -or $summary.bytes -le 0)
    {
        throw 'Actual structured seal result differs.'
    }
}
$record.structuredResultValidated = $true
$record | ConvertTo-Json -Depth 15 | Set-Content -Encoding utf8NoBOM "$prefix.receipt.json.stage"
Move-Item -LiteralPath "$prefix.receipt.json.stage" -Destination "$prefix.receipt.json" -Force
$process.Dispose()
[ordered]@{ result = 'PASS'; kind = $Kind; attempt = $Attempt; manifestSha256 = $after; receipt = "$prefix.receipt.json"; summary = $summary } | ConvertTo-Json -Depth 16
