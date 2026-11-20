param(
    [string]$Label = 'closing-snapshot',
    [string]$Destination = 'research\closing-identity.json',
    [switch]$IncludeAudit
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$directories = @((Join-Path $root 'commands\raw'))
if ($IncludeAudit)
{
    $directories += Join-Path $root 'audit-commands'
}
$records = [System.Collections.Generic.List[object]]::new()
$identities = @{}
$self = $null
foreach ($directory in $directories)
{
    foreach ($file in Get-ChildItem -LiteralPath $directory -Filter '*.started.json' -File)
    {
        $started = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json -DateKind String
        if ($started.label -eq $Label)
        {
            $self = $started
            continue
        }
        $terminalPath = $file.FullName.Replace('.started.json', '.terminal.json')
        if (!(Test-Path -LiteralPath $terminalPath))
        {
            throw "A recorded invocation has no durable terminal receipt: $($started.label)"
        }
        $terminal = Get-Content -LiteralPath $terminalPath -Raw | ConvertFrom-Json -DateKind String
        if ($terminal.state -ne 'terminal' -or !$terminal.rootExited -or !$terminal.bothStreamsDrained -or !$terminal.observedDescendantsDrained)
        {
            throw "A recorded invocation did not establish its recorded root/stream/observed-descendant boundary: $($started.label)"
        }
        $records.Add([ordered]@{
            label = $started.label
            root = $started.root
            wrapper = $started.wrapper
            exitCode = $terminal.exitCode
            bothStreamsDrained = $terminal.bothStreamsDrained
            rootExited = $terminal.rootExited
            observedDescendantsDrained = $terminal.observedDescendantsDrained
            startedPath = $file.FullName.Substring($root.Length + 1)
            startedSha256 = (Get-FileHash $file.FullName -Algorithm SHA256).Hash
            terminalPath = $terminalPath.Substring($root.Length + 1)
            terminalSha256 = (Get-FileHash $terminalPath -Algorithm SHA256).Hash
        })
        foreach ($identity in @($started.root, $started.wrapper) + @($terminal.observedProcesses))
        {
            if ($identity -and $identity.processId -and $identity.creationUtc)
            {
                $identities["$($identity.processId)|$($identity.creationUtc)"] = $identity
            }
        }
    }
}
if (!$self -or $self.root.processId -ne $PID)
{
    throw 'Current snapshot helper must be explicitly identified as the sole in-progress external invocation.'
}
$checks = [System.Collections.Generic.List[object]]::new()
foreach ($identity in $identities.Values)
{
    $process = Get-Process -Id $identity.processId -ErrorAction SilentlyContinue
    $actual = if ($process -and $process.StartTime) { $process.StartTime.ToUniversalTime().ToString('o') } else { $null }
    $recorded = [DateTimeOffset]::Parse($identity.creationUtc).UtcDateTime
    $same = $actual -and $actual -eq $identity.creationUtc
    if ($identity.creationSource -eq 'CIM-creation-time' -and $process -and $process.StartTime)
    {
        $same = [Math]::Abs(($process.StartTime.ToUniversalTime() - $recorded).Ticks) -lt 10
    }
    $checks.Add([ordered]@{
        processId = $identity.processId
        recordedCreationUtc = $identity.creationUtc
        currentCreationUtc = $actual
        recordedCreationSource = $identity.creationSource
        exactRecordedCreationAlive = [bool]$same
        numericPidReused = [bool]($actual -and !$same)
    })
    if ($same)
    {
        throw "A prior owned creation remains alive; no seal is allowed: $($identity.processId)"
    }
}
$sdk = Get-Content -LiteralPath (Join-Path $root 'research\sdk-prerequisites.json') -Raw | ConvertFrom-Json -DateKind String
$sdkChecks = foreach ($link in $sdk.links)
{
    $files = @(
        @{ path = Join-Path $link.checkout '.dotnet\dotnet.exe'; expected = $link.dotnetExeSha256 }
        @{ path = Join-Path $link.checkout 'activate.ps1'; expected = $link.activationSha256 }
        @{ path = Join-Path $link.checkout '.dotnet\sdk\12.0.100-alpha.1.26557.102\Roslyn\bincore\csc.dll'; expected = $link.compilerSha256 }
    )
    foreach ($file in $files)
    {
        $actual = (Get-FileHash -LiteralPath $file.path -Algorithm SHA256).Hash
        if ($actual -ne $file.expected)
        {
            throw 'A selected read-only SDK/activation prerequisite changed.'
        }
        [ordered]@{ role = $link.role; path = $file.path; sha256 = $actual; expected = $file.expected; matched = $true }
    }
}
$tools = foreach ($name in @('node', 'git', 'gh', 'pwsh'))
{
    $path = (Get-Command $name -CommandType Application).Source
    $file = Get-Item -LiteralPath $path
    [ordered]@{ tool = $name; path = $path; bytes = $file.Length; sha256 = (Get-FileHash $path -Algorithm SHA256).Hash; fileVersion = $file.VersionInfo.FileVersion; productVersion = $file.VersionInfo.ProductVersion }
}
$recorderFiles = @(Get-Item (Join-Path $root 'commands\Invoke-Owned.ps1')) + @(Get-ChildItem (Join-Path $root 'commands\versions') -Filter '*.ps1' -File)
$versions = @($recorderFiles | ForEach-Object { [ordered]@{ path = $_.FullName.Substring($root.Length + 1); sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash } })
$receipt = [ordered]@{
    result = 'PASS'
    observedUtc = [DateTime]::UtcNow.ToString('o')
    currentHelperAndWrapperExplicitlyInProgress = @{ root = $self.root; wrapper = $self.wrapper; label = $Label; boundary = 'This snapshot cannot attest its own future terminal state. Its later recorder terminal receipt and subsequent outside-capsule audits/snapshot provide that boundary.' }
    recordedPriorInvocations = $records.ToArray()
    scopedCreationChecks = $checks.ToArray()
    scopedRecordedCreations = $checks.Count
    priorRecordedCreationsAlive = 0
    sdkPrerequisiteRehashes = @($sdkChecks)
    selectedToolHashes = @($tools)
    retainedRecorderVersions = $versions
    boundary = 'Only recorded direct roots/wrappers and bounded observed descendants are checked. PID reuse is not ownership. No process is stopped. This is not a complete historical OS process tree, nor an entire developer environment/toolchain/SDK/runtime attestation.'
}
$destinationPath = Join-Path $root $Destination
if (Test-Path -LiteralPath $destinationPath)
{
    throw 'Snapshot destination already exists; preserve the previous attempt.'
}
[System.IO.File]::WriteAllText("$destinationPath.partial", ($receipt | ConvertTo-Json -Depth 35))
Move-Item "$destinationPath.partial" $destinationPath
[ordered]@{ result = 'PASS'; priorInvocations = $records.Count; scopedRecordedCreations = $checks.Count; priorRecordedCreationsAlive = 0; destination = $destinationPath } | ConvertTo-Json
