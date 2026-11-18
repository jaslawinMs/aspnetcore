param(
    [Parameter(Mandatory)]
    [ValidateSet('original', 'candidate')]
    [string]$Variant
)

$ErrorActionPreference = 'Stop'
$directory = Join-Path $PSScriptRoot "autoperf-runs\F040\sample-$Variant"
$launch = Get-Content -Raw -LiteralPath (Join-Path $directory 'launch.json') | ConvertFrom-Json
$resultFile = Join-Path $directory 'startup-listener.json'
if (Test-Path -LiteralPath $resultFile)
{
    throw 'Do not overwrite owned-listener evidence.'
}
$wrapper = Get-Process -Id $launch.wrapperProcessId
if ($wrapper.StartTime.ToUniversalTime() -gt [DateTime]::Parse($launch.startedUtc).ToUniversalTime())
{
    throw 'The recorded wrapper PID has been reused.'
}
$deadline = [DateTime]::UtcNow.AddSeconds(60)
$observations = @()
while ([DateTime]::UtcNow -lt $deadline)
{
    $processes = @(Get-CimInstance Win32_Process)
    $ownedIds = @([int]$launch.wrapperProcessId)
    for ($depth = 0; $depth -lt 6; $depth++)
    {
        $expanded = @($processes | Where-Object { $_.ProcessId -in $ownedIds -or $_.ParentProcessId -in $ownedIds } |
            Select-Object -ExpandProperty ProcessId -Unique)
        if ($expanded.Count -eq $ownedIds.Count)
        {
            break
        }
        $ownedIds = $expanded
    }
    $listeners = @(Get-NetTCPConnection -State Listen | Where-Object {
        $_.OwningProcess -in $ownedIds -and $_.LocalAddress -eq '127.0.0.1'
    })
    foreach ($listener in $listeners)
    {
        $url = "http://127.0.0.1:$($listener.LocalPort)"
        $response = Invoke-WebRequest -Uri "$url/autoperf-f040-tempdata" -TimeoutSec 10 -SkipHttpErrorCheck
        $observations += [ordered]@{ url=$url;status=[int]$response.StatusCode;actualProcessId=$listener.OwningProcess }
        if ($response.StatusCode -eq 200 -and $response.Content.Contains('id="f040-owner"'))
        {
            $owned = @($processes | Where-Object { $_.ProcessId -in $ownedIds } | Select-Object ProcessId,ParentProcessId,ExecutablePath,CommandLine)
            [ordered]@{
                candidate = 'F040'
                variant = $Variant
                actualUrl = $url
                actualHttpStatus = [int]$response.StatusCode
                actualListenerOwnerId = $listener.OwningProcess
                actualRecordedWrapperId = $launch.wrapperProcessId
                actualOwnedProcessTree = $owned
                actualReadinessObservations = $observations
                actualVerifiedUtc = [DateTime]::UtcNow.ToString('O')
                actualSharedEnvironmentNotIsolated = $true
            } | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath $resultFile -Encoding utf8NoBOM
            Write-Output "F040:$Variant owned PID $($listener.OwningProcess) responds HTTP 200 at $url."

            return
        }
    }
    Start-Sleep -Milliseconds 250
}
$observations | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $directory 'failed-readiness-observations.json') -Encoding utf8NoBOM
throw 'The recorded owned sample did not become responsive within 60 seconds.'
