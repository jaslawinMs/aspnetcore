$ErrorActionPreference = 'Stop'
$directory = $PSScriptRoot
$parallel = Split-Path -Parent $directory
$owner = 'a4e76420-cb81-4c3e-9008-491e049270d2'
$utf8 = [System.Text.UTF8Encoding]::new($false)

function Read-Json([string]$File)
{
    return [System.IO.File]::ReadAllText($File, $utf8) | ConvertFrom-Json -Depth 100
}

function Require([bool]$Condition, [string]$Message)
{
    if (-not $Condition)
    {
        throw $Message
    }
}

function Write-NewJson([string]$Name, $Value)
{
    $bytes = $utf8.GetBytes(($Value | ConvertTo-Json -Depth 100) + "`n")
    $stream = [System.IO.File]::Open((Join-Path $directory $Name), [System.IO.FileMode]::CreateNew)
    try
    {
        $stream.Write($bytes, 0, $bytes.Length)
    }
    finally
    {
        $stream.Dispose()
    }
}

function Hash([string]$File)
{
    return (Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash
}

$acceptance = Read-Json (Join-Path $directory 'PARENT-ACCEPTANCE.json')
$policyPath = Join-Path $parallel 'policy.json'
$policyBytes = [System.IO.File]::ReadAllBytes($policyPath)
$policy = $utf8.GetString($policyBytes) | ConvertFrom-Json -Depth 100
$campaignPath = Join-Path (Split-Path -Parent $parallel) 'autoperf-campaign.json'
$campaign = Read-Json $campaignPath
Require ($acceptance.actualOwner -ceq $owner) 'Actual owner no longer matches.'
Require ($acceptance.phase -eq 299) 'Wrong phase.'
Require ($policy.independentFindingPreparationWorkers.F258 -ceq $owner) 'Registered actual owner changed.'
Require ($policy.activeWorkerPreparationScopes.F258 -ceq $acceptance.scope) 'Exact299 scope changed.'
Require ($policy.actualWorkerBuildHoldActive -eq $false) 'Active HOLD blocks this seal.'
Require ($policy.buildAndTestWorkQuiesced -eq $false) 'Work is quiesced.'
Require (-not [System.IO.File]::Exists((Join-Path $parallel 'benchmark-exclusive.lease.json'))) 'Global lease present.'
foreach ($id in @('F258', 'F259'))
{
    $matches = @($campaign.candidates | Where-Object { $_.id -ceq $id })
    Require ($matches.Count -eq 1) "Canonical $id identity is not unique."
    Require ($matches[0].status -ceq 'pending') "Canonical $id no longer pending."
}

$commands = @(Get-ChildItem -LiteralPath $directory -File -Force |
    Where-Object { $_.Name -match '^\d{2}-.*\.command\.json$' } |
    Sort-Object Name)
Require ($commands.Count -eq 15) 'Unexpected Git/gh root inventory.'
Require ($commands.Count -le 32) 'Root cap exceeded.'
$rootIndex = @()
foreach ($commandFile in $commands)
{
    $command = Read-Json $commandFile.FullName
    Require ($command.executable -in @('git', 'gh')) 'Unexpected executable in direct root inventory.'
    $terminalName = $commandFile.Name.Replace('.command.json', '.terminal.json')
    $terminal = Read-Json (Join-Path $directory $terminalName)
    Require ($terminal.close.code -eq 0) "Direct root did not finish zero: $terminalName"
    Require ($null -eq $terminal.launchError) "Launch failure: $terminalName"
    Require ($terminal.allDirectRootsAwaited -eq $true) "Unawaited root: $terminalName"
    foreach ($streamName in @('stdin', 'stdout', 'stderr'))
    {
        $stream = $terminal.$streamName
        $file = Join-Path $directory $stream.file
        Require ((Get-Item -LiteralPath $file).Length -eq $stream.bytes) "Stream length mismatch: $file"
        Require ((Hash $file) -ceq $stream.sha256) "Stream hash mismatch: $file"
    }
    $rootIndex += @{
        number = $command.number
        command = $commandFile.Name
        terminal = $terminalName
        pid = $terminal.rootPid
        actualExitCode = $terminal.close.code
        exitEvent = $terminal.exitEvent
        closeEvent = $terminal.close
        streamsVerified = $true
        descendantCensusComplete = $false
    }
}

$helpers = @(Get-ChildItem -LiteralPath $directory -File -Force |
    Where-Object { $_.Name -match '^helper\d{2}-.*\.start\.json$' } |
    Sort-Object Name)
Require ($helpers.Count -eq 11) 'Unexpected completed helper inventory.'
$helperIndex = @()
foreach ($helperFile in $helpers)
{
    $prefix = $helperFile.Name.Replace('.start.json', '')
    $terminalName = "$prefix.terminal.json"
    $terminal = Read-Json (Join-Path $directory $terminalName)
    Require ($terminal.helperHasExited -eq $true) "Helper exit not observed: $prefix"
    Require ($terminal.helperExitCode -eq 0) "Helper did not finish zero: $prefix"
    Require ($terminal.helperStreamsFullyDrained -eq $true) "Helper streams not complete: $prefix"
    foreach ($streamName in @('stdin', 'stdout', 'stderr'))
    {
        $file = Join-Path $directory "$prefix.$streamName.bin"
        $expectedHash = $terminal."${streamName}Sha256"
        Require ((Hash $file) -ceq $expectedHash) "Helper stream hash mismatch: $file"
    }
    $helperIndex += @{
        start = $helperFile.Name
        terminal = $terminalName
        helperPid = $terminal.helperPid
        wrapperPid = $terminal.wrapperPid
        actualHelperExitCode = $terminal.helperExitCode
        rawStreamsVerified = $true
        wrapperExitWasNotPredicted = ($null -eq $terminal.prospectiveWrapperExitCode)
        descendantCensusComplete = $false
    }
}

$sourceIndex = @()
foreach ($role in @('Original', 'Default'))
{
    $bodyManifests = @(Get-ChildItem -LiteralPath $directory -File -Force |
        Where-Object { $_.Name -match "^bodies-$role-.*\.json$" } |
        Sort-Object Name)
    $entries = @($bodyManifests | ForEach-Object { (Read-Json $_.FullName).entries })
    Require ($entries.Count -eq 15) "Wrong whole-body count: $role"
    Require (@($entries.path | Sort-Object -Unique).Count -eq 15) "Repeated repository input: $role"
    foreach ($entry in $entries)
    {
        $file = Join-Path $directory $entry.file
        Require ((Get-Item -LiteralPath $file).Length -eq $entry.bytes) "Source length mismatch: $file"
        Require ((Hash $file) -ceq $entry.sha256) "Source hash mismatch: $file"
        Require ($entry.wholeBody -eq $true -and $entry.normalized -eq $false) "Not a whole unnormalized source body: $file"
        Require ($entry.gitObjectIdVerified -eq $true) "Git object identity was not checked: $file"
        $sourceIndex += @{
            role = $role
            commit = $entry.commit
            expression = $entry.expression
            repositoryPath = $entry.path
            mode = $entry.mode
            blob = $entry.blob
            bytes = $entry.bytes
            sha256 = $entry.sha256
            payload = $entry.file
            raw = $entry.raw
            framing = $entry.framing
        }
    }
}
$derived = Read-Json (Join-Path $directory 'derived-source-data-299.json')
$pins = Read-Json (Join-Path $directory 'pins.json')
$upstreamRepository = Read-Json (Join-Path $directory '01-github-repository.stdout.bin')
$upstreamCommit = Read-Json (Join-Path $directory '02-github-observed-default.stdout.bin')
Require ($upstreamRepository.full_name -ceq 'dotnet/aspnetcore') 'Unexpected observed upstream repository.'
Require ($upstreamRepository.html_url -ceq 'https://github.com/dotnet/aspnetcore') 'Unexpected upstream host.'
Require ($upstreamRepository.default_branch -ceq $pins.default.branch) 'Observed default branch pin mismatch.'
Require ($upstreamCommit.sha -ceq $pins.default.commit) 'Observed default commit pin mismatch.'
Require ($pins.default.commit -cne '24875ef5dabb55567870b39f6eb0002170435e2f') 'Reserved worktree was incorrectly treated as Default.'
Require ($derived.roles.Original.inclusiveLogicalInputs -eq 17) 'Original inclusive input cap/accounting mismatch.'
Require ($derived.roles.Default.inclusiveLogicalInputs -eq 17) 'Default inclusive input cap/accounting mismatch.'
Require ($derived.pairwiseSourceEquivalence.Count -eq 15) 'Missing role comparisons.'
Require (@($derived.pairwiseSourceEquivalence | Where-Object { $_.byteIdentical -ne $true }).Count -eq 0) 'Role body mismatch.'
$failureArtifacts = @(Get-ChildItem -LiteralPath $directory -File -Force |
    Where-Object { $_.Name -match 'failure|stdin-error' } |
    Select-Object -ExpandProperty Name)
Write-NewJson 'ACTUAL-ROOT-HELPER-SOURCE-INDEX-299.json' @{
    phase = 299
    actualOwner = $owner
    directRootCountIncludingFailures = $commands.Count
    completedHelperCount = $helpers.Count
    roots = $rootIndex
    helpers = $helperIndex
    sourceBodies = $sourceIndex
    failureArtifactsPreserved = $failureArtifacts
    processObservationLimit = 'Direct roots and owned Node helper identities/exit events/stream drains only. No universal descendant or unrelated-process absence claim.'
    actualFinalEnclosingToolExitCode = $null
}
$policyCopy = Join-Path $directory 'seal-observed-policy.bin'
$policyStream = [System.IO.File]::Open($policyCopy, [System.IO.FileMode]::CreateNew)
try
{
    $policyStream.Write($policyBytes, 0, $policyBytes.Length)
}
finally
{
    $policyStream.Dispose()
}
Write-NewJson 'seal-guard-299.json' @{
    observedUtc = [DateTime]::UtcNow.ToString('O')
    actualOwner = $owner
    scopeExact = $true
    noLease = $true
    noHold = $true
    nonquiesced = $true
    pending = @('F258', 'F259')
    policyBytes = $policyBytes.Length
    policySha256 = Hash $policyCopy
    canonicalCampaignSha256 = Hash $campaignPath
    sourceBodiesPerRole = 15
    inclusiveLogicalInputsPerRole = 17
    noAdditionalRepositorySourceReads = $true
    sourceOnly = $true
    claimBoundary = 'Fresh finite file guards, not an acquired lease, global census or assertion that other work is idle.'
}

$inventoryName = 'PAYLOAD-INVENTORY-299.json'
$sealName = 'SOURCE-SEAL-299.json'
Require (-not [System.IO.File]::Exists((Join-Path $directory $inventoryName))) 'Inventory already exists; no overwrite.'
Require (-not [System.IO.File]::Exists((Join-Path $directory $sealName))) 'Seal already exists; no overwrite.'
$payloads = @(Get-ChildItem -LiteralPath $directory -File -Force -Recurse | Sort-Object FullName | ForEach-Object {
    Require (-not ($_.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) 'Unexpected reparse-point payload.'
    @{
        path = [System.IO.Path]::GetRelativePath($directory, $_.FullName)
        bytes = $_.Length
        sha256 = Hash $_.FullName
    }
})
$subdirectories = @(Get-ChildItem -LiteralPath $directory -Directory -Force -Recurse |
    ForEach-Object { [System.IO.Path]::GetRelativePath($directory, $_.FullName) })
Write-NewJson $inventoryName @{
    phase = 299
    actualOwner = $owner
    observedUtc = [DateTime]::UtcNow.ToString('O')
    payloadCount = $payloads.Count
    payloadBytes = ($payloads | Measure-Object -Property bytes -Sum).Sum
    files = $payloads
    directories = $subdirectories
    completePayloadInventory = $true
    payloadsExcludedForConvenience = @()
    sealMetadataNotSelfHashed = @(
        @{ path = $inventoryName; binding = "Whole-file SHA256 in $sealName" },
        @{ path = $sealName; binding = 'Parent must record whole-file SHA256 and actual enclosing tool exit after return; no recursive self-hash is fabricated.' }
    )
    externalTranscriptBoundary = 'Final enclosing PowerShell tool owns this sealer stdout/stderr/stdin and actual exit. No file claims to contain a prospective complete stream of its own still-running sealer.'
}
$inventoryPath = Join-Path $directory $inventoryName
$reportPath = Join-Path $directory 'SOURCE-REPORT-299.json'
$sealer = Get-Process -Id $PID
Write-NewJson $sealName @{
    phase = 299
    actualOwner = $owner
    status = 'SEALED_SOURCE_ONLY_PAYLOADS_AWAIT_PARENT_ACCEPTANCE'
    observedUtc = [DateTime]::UtcNow.ToString('O')
    payloadInventory = @{
        path = $inventoryName
        bytes = (Get-Item -LiteralPath $inventoryPath).Length
        sha256 = Hash $inventoryPath
        payloadCount = $payloads.Count
        payloadBytes = ($payloads | Measure-Object -Property bytes -Sum).Sum
    }
    report = @{
        path = 'SOURCE-REPORT-299.json'
        bytes = (Get-Item -LiteralPath $reportPath).Length
        sha256 = Hash $reportPath
    }
    allActualPayloadFilesIncluded = $true
    declaredCompleteDirectoryFileCountAfterSeal = $payloads.Count + 2
    sealMetadataSelfReferenceExclusionsAreExplicit = $true
    actualGitGhRoots = 15
    actualCompletedNodeHelpers = 11
    repositoryBodiesPerRole = 15
    inclusiveLogicalInputsPerRole = 17
    nativeProductRoots = 0
    canonicalStatusesObserved = @('F258:pending', 'F259:pending')
    currentSealer = @{
        pid = $PID
        startTimeUtc = $sealer.StartTime.ToUniversalTime().ToString('O')
        exitCode = $null
        hasExited = $null
        actualFinalOuterReceiptRequiredAfterReturn = $true
    }
    processBoundary = 'All recorded direct roots and owned Node helpers were awaited with raw streams drained. Unobserved descendants and unrelated processes are outside the observation; no kill, timeout, global census or idleness claim.'
    parentOwnsAcceptanceRawQualificationRetirementAndFinalization = $true
}
$actualFilesAfterSeal = @(Get-ChildItem -LiteralPath $directory -File -Force -Recurse)
Require ($actualFilesAfterSeal.Count -eq $payloads.Count + 2) 'Actual directory inventory changed during sealing.'
[Console]::WriteLine((@{
    seal = $sealName
    sealSha256 = Hash (Join-Path $directory $sealName)
    inventory = $inventoryName
    inventorySha256 = Hash $inventoryPath
    payloads = $payloads.Count
    actualDirectoryFiles = $actualFilesAfterSeal.Count
    directGitGhRoots = 15
    sourceBodiesPerRole = 15
    prospectiveSealerExitCode = $null
    parentMustRecordActualOuterResultAfterReturn = $true
} | ConvertTo-Json -Compress))
