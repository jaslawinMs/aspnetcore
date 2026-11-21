$ErrorActionPreference = 'Stop'
$Out = $PSScriptRoot
$Par = Split-Path -Parent $Out
$S = Split-Path -Parent $Par
$Repo = 'C:\src\aspnetcore'
$Owner = 'cb6dfbf4-dd69-4c3e-b55f-d49f1820df2b'
$Bootstrap = [IO.File]::ReadAllText((Join-Path $Out 'control\bootstrap-279.json')) | ConvertFrom-Json

function Get-BytesHash279([byte[]] $Bytes)
{
    $algorithm = [Security.Cryptography.SHA256]::Create()
    try
    {
        return [BitConverter]::ToString($algorithm.ComputeHash($Bytes)).Replace('-', '')
    }
    finally
    {
        $algorithm.Dispose()
    }
}

function Write-FreshJson279([string] $Path, $Value)
{
    $bytes = [Text.UTF8Encoding]::new($false).GetBytes(($Value | ConvertTo-Json -Depth 90) + "`n")
    $stream = [IO.FileStream]::new($Path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    try
    {
        $stream.Write($bytes, 0, $bytes.Length)
    }
    finally
    {
        $stream.Dispose()
    }
}

function Get-ProcessIdentity279([Diagnostics.Process] $Process)
{
    return [ordered]@{
        pid = $Process.Id
        creationUtc = $Process.StartTime.ToUniversalTime().ToString('o')
        creationFileTime = $Process.StartTime.ToUniversalTime().ToFileTimeUtc()
    }
}

function Get-FreshGuard279([string] $Label)
{
    $policyBytes = [IO.File]::ReadAllBytes((Join-Path $Par 'policy.json'))
    $policy = [Text.Encoding]::UTF8.GetString($policyBytes) | ConvertFrom-Json
    $registrationBytes = [IO.File]::ReadAllBytes((Join-Path $Par 'F234-accepted-and-advanced-279.json'))
    $registration = [Text.Encoding]::UTF8.GetString($registrationBytes) | ConvertFrom-Json
    if ($policy.independentFindingPreparationWorkers.F234 -cne $Owner -or
        $registration.actualOwner -cne $Owner -or
        $registration.retainedOwners.F234 -cne $Owner -or
        $policy.activeWorkerPreparationScopes.F234 -cne $Bootstrap.scope -or
        $registration.newScope -cne $Bootstrap.scope -or
        -not $Bootstrap.scope.StartsWith('279 SOURCE ONLY ') -or
        (Get-BytesHash279 $registrationBytes) -cne $Bootstrap.parentAcceptanceSha256 -or
        @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count -gt 4 -or
        $policy.actualWorkerBuildHoldActive -cne $false -or
        $policy.buildAndTestWorkQuiesced -cne $false)
    {
        throw 'Fresh actual-owner/exact279scope/registration/HOLD/quiescence guard failed.'
    }

    foreach ($lease in $Bootstrap.leasePathsAbsent)
    {
        if (Test-Path -LiteralPath $lease)
        {
            throw "Fresh lease-absence guard failed: $lease"
        }
    }
    $campaignBytes = [IO.File]::ReadAllBytes((Join-Path $S 'autoperf-campaign.json'))
    $campaign = [Text.Encoding]::UTF8.GetString($campaignBytes) | ConvertFrom-Json
    $selected = @($campaign.candidates | Where-Object { $_.id -in @('F234', 'F235') })
    if ($selected.Count -ne 2 -or @($selected | Where-Object { $_.status -cne 'pending' }).Count -ne 0)
    {
        throw 'Both canonical outer findings must remain pending.'
    }

    return @{
        policyBytes = $policyBytes
        registrationBytes = $registrationBytes
        receipt = [ordered]@{
            observedUtc = [DateTime]::UtcNow.ToString('o')
            label = $Label
            actualOwner = $Owner
            scope = $Bootstrap.scope
            policySha256 = Get-BytesHash279 $policyBytes
            registrationSha256 = Get-BytesHash279 $registrationBytes
            campaignSha256 = Get-BytesHash279 $campaignBytes
            outerStatuses = @($selected | ForEach-Object { @{ id = $_.id; status = $_.status } })
            leasePathsAbsent = $Bootstrap.leasePathsAbsent
            actualWorkerBuildHoldActive = $false
            buildAndTestWorkQuiesced = $false
        }
    }
}
