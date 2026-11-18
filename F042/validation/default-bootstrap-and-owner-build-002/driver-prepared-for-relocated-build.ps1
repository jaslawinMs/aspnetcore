$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F042'
$worktree = Get-Content -LiteralPath (Join-Path $run 'current-default-worktree.json') -Raw | ConvertFrom-Json
$root = $worktree.actualVerificationRoot
$output = Join-Path $run 'validation\default-bootstrap-and-owner-build-003'
if (Test-Path -LiteralPath $output)
{
    throw 'Do not overwrite a recorded bootstrap attempt.'
}
[System.IO.Directory]::CreateDirectory($output) | Out-Null
Set-Location -LiteralPath $root
. (Join-Path $root 'activate.ps1')
$project = Join-Path $root 'src\Features\JsonPatch.SystemTextJson\src\Microsoft.AspNetCore.JsonPatch.SystemTextJson.csproj'
$commandLine = 'call "' + (Join-Path $root 'eng\build.cmd') + '" -Restore -Projects "' + $project +
    '" -Configuration Release -NoBuildNative -NoBuildNodeJS -NoBuildJava -NoBuildInstallers -msbuildMultiThreaded:$false /m:2 /nr:false /p:UseSharedCompilation=false'
$record = [ordered]@{
    executable = $env:ComSpec
    arguments = @('/d', '/c', $commandLine)
    workingDirectory = $root
    actualPrerequisiteFailure = 'default-owner-build-002: missing generated artifacts\bin\GenerateFiles\Directory.Build.props'
    actualCapturedDefault = $worktree.actualCapturedDefault
    actualNativeNodeJavaInstallersExcluded = $true
    actualMaximumMsbuildWorkers = 2
    actualProcessOnlyGitLongPaths = $true
    actualTimingAuthorized = $false
    actualSourceComparison = $false
    startedUtc = [DateTimeOffset]::UtcNow.ToString('o')
}
$recordPath = Join-Path $output 'command.json'
$record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $recordPath -Encoding utf8
$configCount = if ($env:GIT_CONFIG_COUNT) { [int]$env:GIT_CONFIG_COUNT } else { 0 }
[Environment]::SetEnvironmentVariable('GIT_CONFIG_COUNT', ($configCount + 1).ToString([Globalization.CultureInfo]::InvariantCulture), 'Process')
[Environment]::SetEnvironmentVariable("GIT_CONFIG_KEY_$configCount", 'core.longpaths', 'Process')
[Environment]::SetEnvironmentVariable("GIT_CONFIG_VALUE_$configCount", 'true', 'Process')
& $env:ComSpec /d /c $commandLine 2>&1 | Tee-Object -FilePath (Join-Path $output 'combined-output.txt') | Select-Object -Last 45
$record.actualExitCode = $LASTEXITCODE
$record.completedUtc = [DateTimeOffset]::UtcNow.ToString('o')
$record.actualOwnerDllExists = Test-Path -LiteralPath (Join-Path $root 'artifacts\bin\Microsoft.AspNetCore.JsonPatch.SystemTextJson\Release\net12.0\Microsoft.AspNetCore.JsonPatch.SystemTextJson.dll')
$record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $recordPath -Encoding utf8
Write-Output "Recorded exit $($record.actualExitCode): $recordPath"
exit $record.actualExitCode
