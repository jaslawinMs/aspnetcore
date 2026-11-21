$ErrorActionPreference = 'Stop'
$Out286 = $PSScriptRoot
$Par286 = Split-Path -Parent $Out286
$SessionFiles286 = Split-Path -Parent $Par286
$Repo286 = 'C:\src\aspnetcore'
$Owner286 = 'cb6dfbf4-dd69-4c3e-b55f-d49f1820df2b'

function Get-BytesHash286([byte[]] $Bytes)
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

function Write-FreshBytes286([string] $Path, [byte[]] $Bytes)
{
    $stream = [IO.FileStream]::new($Path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    try
    {
        $stream.Write($Bytes, 0, $Bytes.Length)
    }
    finally
    {
        $stream.Dispose()
    }
}

function Write-FreshJson286([string] $Path, $Value)
{
    Write-FreshBytes286 $Path ([Text.UTF8Encoding]::new($false).GetBytes(($Value | ConvertTo-Json -Depth 95) + "`n"))
}

function Get-ProcessIdentity286([Diagnostics.Process] $Process)
{
    return [ordered]@{
        pid = $Process.Id
        creationUtc = $Process.StartTime.ToUniversalTime().ToString('o')
        creationFileTime = $Process.StartTime.ToUniversalTime().ToFileTimeUtc()
    }
}

function Get-FreshGuard286([string] $Label, [switch] $Bootstrap)
{
    $policyBytes = [IO.File]::ReadAllBytes((Join-Path $Par286 'policy.json'))
    $policy = [Text.Encoding]::UTF8.GetString($policyBytes) | ConvertFrom-Json
    $registrationBytes = [IO.File]::ReadAllBytes((Join-Path $Par286 'F234-accepted-and-advanced-286.json'))
    $registration = [Text.Encoding]::UTF8.GetString($registrationBytes) | ConvertFrom-Json
    $scope = $registration.scope
    $leasePaths = @(
        (Join-Path $Par286 'benchmark-exclusive.lease.json'),
        (Join-Path $SessionFiles286 'benchmark-exclusive.lease.json'),
        (Join-Path $SessionFiles286 'autoperf-runs\benchmark-exclusive.lease.json')
    )
    if ($policy.independentFindingPreparationWorkers.F234 -cne $Owner286 -or
        $registration.actualOwner -cne $Owner286 -or
        $registration.actualOwners.F234 -cne $Owner286 -or
        $policy.activeWorkerPreparationScopes.F234 -cne $scope -or
        -not $scope.StartsWith('286 SOURCE ONLY ') -or
        @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count -gt 4 -or
        $registration.registrationBeforeSeparateGO286 -cne $true -or
        $registration.future286MaxRoots -ne 2 -or
        $registration.future286MaxNewWholeBodiesPerRole -ne 1 -or
        $policy.actualWorkerBuildHoldActive -cne $false -or
        $policy.buildAndTestWorkQuiesced -cne $false)
    {
        throw 'Fresh actual-owner/exact286scope/registration/limits/HOLD/quiescence guard failed.'
    }
    if (-not $Bootstrap)
    {
        $pins = [IO.File]::ReadAllText((Join-Path $Out286 'control\bootstrap-286.json')) | ConvertFrom-Json
        if ($pins.scope -cne $scope -or $pins.registrationSha256 -cne (Get-BytesHash286 $registrationBytes))
        {
            throw 'The frozen286 scope or parent registration changed.'
        }
    }
    foreach ($lease in $leasePaths)
    {
        if (Test-Path -LiteralPath $lease)
        {
            throw "Fresh lease-absence guard failed: $lease"
        }
    }
    $campaignBytes = [IO.File]::ReadAllBytes((Join-Path $SessionFiles286 'autoperf-campaign.json'))
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
            actualOwner = $Owner286
            scope = $scope
            policySha256 = Get-BytesHash286 $policyBytes
            registrationSha256 = Get-BytesHash286 $registrationBytes
            campaignSha256 = Get-BytesHash286 $campaignBytes
            outerStatuses = @($selected | ForEach-Object { @{ id = $_.id; status = $_.status } })
            registeredOwnerCount = @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count
            leasePathsAbsent = $leasePaths
            actualWorkerBuildHoldActive = $false
            buildAndTestWorkQuiesced = $false
        }
    }
}

function Save-Guard286([string] $Directory, [string] $Prefix, $Guard)
{
    Write-FreshBytes286 (Join-Path $Directory ($Prefix + 'policy.raw.json')) $Guard.policyBytes
    Write-FreshBytes286 (Join-Path $Directory ($Prefix + 'registration.raw.json')) $Guard.registrationBytes
    Write-FreshJson286 (Join-Path $Directory ($Prefix + 'guard.json')) $Guard.receipt
}
