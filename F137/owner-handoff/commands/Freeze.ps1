$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$manifestPath = Join-Path $Root 'frozen-files.json'
$shaPath = Join-Path $Root 'frozen-files.sha256'
if((Test-Path $manifestPath) -or (Test-Path $shaPath)) {throw 'Capsule already sealed; never overwrite it'}
$payloadNames = @('acceptance.json','handoff.json','HANDOFF.txt','commands','evidence','source','probe','images','results')
$unexpected = @(Get-ChildItem -LiteralPath $Root -Force | Where-Object Name -NotIn ($payloadNames + @('scratch')))
if($unexpected.Count -ne 0) {throw "Unclassified artifact entries: $($unexpected.Name -join ',')"}
$files = @()
foreach($name in $payloadNames)
{
    $item = Get-Item -LiteralPath (Join-Path $Root $name)
    if($item.PSIsContainer) {$files += @(Get-ChildItem -LiteralPath $item.FullName -Recurse -File -Force)}
    else {$files += $item}
}
$rows = @($files | Sort-Object FullName | ForEach-Object {
    [ordered]@{
        path=[IO.Path]::GetRelativePath($Root,$_.FullName)
        length=$_.Length
        sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
})
$rowsByPath = @{}
foreach($row in $rows)
{
    if($rowsByPath.ContainsKey($row.path)) {throw "Duplicate payload path: $($row.path)"}
    $rowsByPath.Add($row.path,$row)
}
$imageAudit = Get-Content (Join-Path $Root 'evidence\complete-image-audit.json') -Raw | ConvertFrom-Json -AsHashtable
$imageCount = 0
foreach($image in $imageAudit.imageInventories.GetEnumerator())
{
    foreach($entry in $image.Value.GetEnumerator())
    {
        $relative = "images\$($image.Key)\$($entry.Key.Replace('/','\'))"
        $frozen = $rowsByPath[$relative]
        if($null -eq $frozen -or $frozen.sha256 -ne $entry.Value.sha256 -or $frozen.length -ne $entry.Value.length)
        {
            throw "Actual consumer-image entry is absent/changed before freeze: $relative"
        }
        $imageCount++
    }
}
if($imageCount -ne 3592 -or @($rows | Where-Object path -Like 'images\*').Count -ne $imageCount) {throw 'Actual consumer-image file count changed'}
if($imageAudit.commonCompiledConsumerByteIdentity.Count -ne 28) {throw 'Common-once file count changed'}
foreach($common in $imageAudit.commonCompiledConsumerByteIdentity)
{
    foreach($image in $common.images)
    {
        $relative = "images\$image\$($common.file.Replace('/','\'))"
        if($rowsByPath[$relative].sha256 -ne $common.sha256) {throw "Compiled-once identity changed: $relative"}
    }
}
$selectedSources = @()
foreach($role in @('original','default'))
{
    $producer = Get-Content (Join-Path $Root "results\$role-complete\producer.json") -Raw | ConvertFrom-Json
    if($producer.ownerIdentities.Count -ne 4) {throw "Selected owner association count changed: $role"}
    foreach($owner in $producer.ownerIdentities)
    {
        $relative = [IO.Path]::GetRelativePath((Join-Path $Root "scratch\$role"),$owner.selectedDocument.physical)
        $frozenSource = Join-Path $Root "source\$role\$relative"
        if((Get-FileHash -LiteralPath $frozenSource -Algorithm SHA256).Hash.ToLowerInvariant() -ne $owner.selectedDocument.physicalSha256)
        {
            throw "Selected associated physical source not preserved: $frozenSource"
        }
        foreach($identityFile in @(@{path=$owner.location;hash=$owner.sha256},@{path=$owner.pdbPath;hash=$owner.pdbSha256}))
        {
            $identityRelative = [IO.Path]::GetRelativePath($Root,$identityFile.path)
            if($rowsByPath[$identityRelative].sha256 -ne $identityFile.hash) {throw "Loaded owner identity changed: $identityRelative"}
        }
        if(-not $owner.selectedDocument.checksumMatches -or
            $owner.peCodeView.Guid -ne $owner.pdbId.guid -or
            $owner.peCodeView.Stamp -ne $owner.pdbId.stamp)
        {
            throw "Selected loaded PE/PDB/document association was not established: $role"
        }
        $selectedSources += [ordered]@{role=$role;source=[IO.Path]::GetRelativePath($Root,$frozenSource);sha256=$owner.selectedDocument.physicalSha256}
    }
}
$manifest = [ordered]@{
    schema='F137 selected immutable evidence manifest v1'
    sealedUtc=[DateTime]::UtcNow.ToString('o')
    payloadFileCount=$rows.Count
    payloadBytes=($rows | Measure-Object length -Sum).Sum
    everyActualConsumerImageEntryIncluded=$true
    selectedPhysicalSourcesIndependentlyMatchedToLoadedOwnerPdb=$selectedSources
    excludedRoot='scratch'
    envelopeFilesExcludedFromPayload=@('frozen-files.json','frozen-files.sha256','seal-verification.json')
    independentVerificationCommand='& .\commands\Verify-Frozen.ps1'
    exclusionReason='Owned source clones/native SDK build/obj/temp/CLI-home graphs are not frozen or recursively hashed. Selected source/project/commands/results and every actual consumer-image file are frozen; external pinned prerequisites are recorded separately.'
    immutabilityBoundary='SHA256 manifest plus read-only payload attributes; cryptographic tamper detection, not a protected filesystem/WORM claim. Do not edit; prepare additive follow-ups under a new root.'
    files=$rows
}
$manifest | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $manifestPath -Encoding utf8
$manifestSha = (Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
"$manifestSha  frozen-files.json" | Set-Content -LiteralPath $shaPath -Encoding utf8
foreach($row in $rows)
{
    $physical = Join-Path $Root $row.path
    (Get-Item -LiteralPath $physical).IsReadOnly = $true
}
(Get-Item -LiteralPath $manifestPath).IsReadOnly = $true
(Get-Item -LiteralPath $shaPath).IsReadOnly = $true
if((Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $manifestSha) {throw 'Manifest changed during freeze'}
[ordered]@{
    handoff=(Join-Path $Root 'handoff.json')
    frozenPayloadFiles=$rows.Count
    frozenFilesIncludingManifestAndSelfHash=$rows.Count+2
    actualConsumerImageFiles=@($rows | Where-Object path -Like 'images\*').Count
    manifestSha256=$manifestSha
    allPayloadHashesRecorded=$true
    independentVerificationStillRequired='commands\Verify-Frozen.ps1'
} | ConvertTo-Json
