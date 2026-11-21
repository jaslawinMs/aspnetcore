$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot

function Write-NewJson
{
    param([string] $Path, [object] $Value)

    $absolute = [System.IO.Path]::GetFullPath($Path, $PSScriptRoot)
    $prefix = $PSScriptRoot.TrimEnd('\') + '\'
    if (-not $absolute.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase))
    {
        throw 'Artifact output escapes the dedicated evidence root.'
    }
    $text = ($Value | ConvertTo-Json -Depth 100) + [Environment]::NewLine
    $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($text)
    $stream = [System.IO.File]::Open($absolute, [System.IO.FileMode]::CreateNew)
    try
    {
        $stream.Write($bytes, 0, $bytes.Length)
    }
    finally
    {
        $stream.Dispose()
    }
}

function Get-ArtifactMetadata
{
    param([System.IO.FileInfo] $File)

    return [ordered]@{
        path = [System.IO.Path]::GetRelativePath($PSScriptRoot, $File.FullName)
        bytes = $File.Length
        sha256 = (Get-FileHash -LiteralPath $File.FullName -Algorithm SHA256).Hash
    }
}

$started = [DateTime]::UtcNow
try
{
    foreach ($name in @('HANDOFF.json', 'ARTIFACT-INDEX-002.json', 'SEAL-002.json'))
    {
        if (Test-Path -LiteralPath (Join-Path $PSScriptRoot $name))
        {
            throw "Refusing to overwrite or replay a sealed artifact: $name"
        }
    }
    $stdoutPath = Join-Path $PSScriptRoot 'launcher-seal-002.stdout.txt'
    $stderrPath = Join-Path $PSScriptRoot 'launcher-seal-002.stderr.txt'
    $helperStarted = [DateTime]::UtcNow
    & node (Join-Path $PSScriptRoot 'seal-handoff-002.mjs') 1> $stdoutPath 2> $stderrPath
    $helperExit = $LASTEXITCODE
    $helperCompleted = [DateTime]::UtcNow
    $environment = [ordered]@{}
    foreach ($key in @('PATH', 'PATHEXT', 'SYSTEMROOT', 'COMSPEC', 'DOTNET_ROOT', 'DOTNET_ROOT_X64', 'DOTNET_GENERATE_ASPNET_CERTIFICATE', 'DOTNET_ADD_GLOBAL_TOOLS_TO_PATH', 'MSBUILDDISABLENODEREUSE', 'NUGET_PACKAGES'))
    {
        $environment[$key] = [Environment]::GetEnvironmentVariable($key)
    }
    Write-NewJson -Path 'launcher-seal-002.json' -Value ([ordered]@{
        argv = @('node', (Join-Path $PSScriptRoot 'seal-handoff-002.mjs'))
        cwd = $PSScriptRoot
        startedUtc = $helperStarted.ToString('o')
        completedUtc = $helperCompleted.ToString('o')
        exitCode = $helperExit
        stdout = 'launcher-seal-002.stdout.txt'
        stderr = 'launcher-seal-002.stderr.txt'
        environment = $environment
        environmentScope = 'Execution-relevant allowlist, not authentication or unrelated ambient values.'
        childAndRedirectedStreamsTerminal = $true
        outerMechanicalWriterPid = $PID
        outerMechanicalWriter = $PSCommandPath
        outerMechanicalWriterSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
        absoluteOutputPathChecksApplied = $true
        nativeProductStarts = 0
    })
    if ($helperExit -ne 0)
    {
        throw "Immutable replacement sealer failed with exit $helperExit; full streams retained."
    }

    $readback = [System.Collections.Generic.List[object]]::new()
    foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.json' -Recurse -File -Force | Sort-Object FullName)
    {
        $null = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
        $readback.Add((Get-ArtifactMetadata -File $file))
    }
    Write-NewJson -Path 'json-readback-004.json' -Value ([ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('o')
        operation = 'Re-read all generated JSON, including HANDOFF, recovered failures and actual replacement sealer completion.'
        count = $readback.Count
        files = $readback.ToArray()
        selfReferenceRule = 'This report and both subsequently created envelopes are re-read during final in-memory verification.'
    })
    $entries = [System.Collections.Generic.List[object]]::new()
    foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File -Force | Sort-Object FullName)
    {
        $entries.Add((Get-ArtifactMetadata -File $file))
    }
    Write-NewJson -Path 'ARTIFACT-INDEX-002.json' -Value ([ordered]@{
        schemaVersion = 1
        finding = 'F205'
        preparation = 222
        createdUtc = [DateTime]::UtcNow.ToString('o')
        root = $PSScriptRoot
        count = $entries.Count
        files = $entries.ToArray()
        excludedEnvelopeFiles = @('ARTIFACT-INDEX-002.json', 'SEAL-002.json')
        selfReferenceRule = 'Every retained file is indexed except these two envelopes. SEAL records exact HANDOFF/index bytes and SHA256; final tool output supplies envelope digests.'
    })
    $handoffMetadata = Get-ArtifactMetadata -File (Get-Item -LiteralPath (Join-Path $PSScriptRoot 'HANDOFF.json'))
    $indexMetadata = Get-ArtifactMetadata -File (Get-Item -LiteralPath (Join-Path $PSScriptRoot 'ARTIFACT-INDEX-002.json'))
    Write-NewJson -Path 'SEAL-002.json' -Value ([ordered]@{
        schemaVersion = 1
        finding = 'F205'
        preparation = 222
        createdUtc = [DateTime]::UtcNow.ToString('o')
        handoff = $handoffMetadata
        fullArtifactIndex = $indexMetadata
        indexedFiles = $entries.Count
        excludedEnvelopeFiles = @('ARTIFACT-INDEX-002.json', 'SEAL-002.json')
        innerSealerExitCode = $helperExit
        innerSealerAndBothStreamsTerminal = $true
        priorRecordedRootsOrObservedDescendantsStillLive = 0
        nativeProductStarts = 0
        performanceExecutions = 0
        finalReservedStateRestored = $true
        wholePreparationNoWriteCompliance = $false
        coordinatorDispositionPending = $true
        finalWriterBoundary = 'The outer writer performs complete in-memory JSON/index verification, then returns. Final response requires tool-reported terminal exit 0. No universal unrelated-process closure claim.'
    })
    $parsedJsonCount = 0
    foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.json' -Recurse -File -Force)
    {
        $null = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
        $parsedJsonCount++
    }
    $index = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'ARTIFACT-INDEX-002.json') -Raw | ConvertFrom-Json
    foreach ($entry in $index.files)
    {
        $file = Get-Item -LiteralPath (Join-Path $PSScriptRoot $entry.path)
        if ($file.Length -ne $entry.bytes -or (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash -ne $entry.sha256)
        {
            throw "Final artifact integrity mismatch: $($entry.path)"
        }
    }
    $retainedFiles = @(Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File -Force)
    if ($retainedFiles.Count -ne ($index.count + 2))
    {
        throw 'Final file membership differs from the index plus its two explicit envelopes.'
    }
    $sealPath = Join-Path $PSScriptRoot 'SEAL-002.json'
    $seal = Get-Content -LiteralPath $sealPath -Raw | ConvertFrom-Json
    if ((Get-FileHash -LiteralPath (Join-Path $PSScriptRoot 'HANDOFF.json') -Algorithm SHA256).Hash -ne $seal.handoff.sha256 -or
        (Get-FileHash -LiteralPath (Join-Path $PSScriptRoot 'ARTIFACT-INDEX-002.json') -Algorithm SHA256).Hash -ne $seal.fullArtifactIndex.sha256)
    {
        throw 'Final envelope digest mismatch.'
    }
    [ordered]@{
        root = $PSScriptRoot
        handoffSha256 = $handoffMetadata.sha256
        artifactIndexSha256 = $indexMetadata.sha256
        sealSha256 = (Get-FileHash -LiteralPath $sealPath -Algorithm SHA256).Hash
        indexedFiles = $entries.Count
        totalRetainedFiles = $retainedFiles.Count
        generatedJsonReRead = $parsedJsonCount
        readOnlyGitGithubReceipts = 48
        nativeProductStarts = 0
        priorRecordedRootsOrObservedDescendantsStillLive = 0
        finalReservedStateRestored = $true
        wholePreparationNoWriteCompliance = $false
        outcome = 'SOURCE_ONLY_NO_CANDIDATE'
        publicationOrCampaignFinalization = $false
    } | ConvertTo-Json -Depth 5
}
catch
{
    $failurePath = Join-Path $PSScriptRoot 'seal-outer-failure-002.json'
    if (-not (Test-Path -LiteralPath $failurePath))
    {
        Write-NewJson -Path 'seal-outer-failure-002.json' -Value ([ordered]@{
            atUtc = [DateTime]::UtcNow.ToString('o')
            startedUtc = $started.ToString('o')
            message = $_.Exception.Message
            nativeProductStarts = 0
            sealedCompletionNotClaimed = $true
        })
    }
    throw
}
