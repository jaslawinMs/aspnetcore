$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot

function Write-NewJson
{
    param([string] $Path, [object] $Value)

    $text = ($Value | ConvertTo-Json -Depth 100) + [Environment]::NewLine
    $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($text)
    $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::CreateNew)
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
    if ((Test-Path -LiteralPath '.\ARTIFACT-INDEX-001.json') -or (Test-Path -LiteralPath '.\SEAL-001.json'))
    {
        throw 'A final envelope already exists; this immutable sealer must not be replayed.'
    }
    $helperStarted = [DateTime]::UtcNow
    & node .\seal-handoff-001.mjs 1> .\launcher-seal-001.stdout.txt 2> .\launcher-seal-001.stderr.txt
    $helperExit = $LASTEXITCODE
    $helperCompleted = [DateTime]::UtcNow
    $environment = [ordered]@{}
    foreach ($key in @('PATH', 'PATHEXT', 'SYSTEMROOT', 'COMSPEC', 'DOTNET_ROOT', 'DOTNET_ROOT_X64', 'DOTNET_GENERATE_ASPNET_CERTIFICATE', 'DOTNET_ADD_GLOBAL_TOOLS_TO_PATH', 'MSBUILDDISABLENODEREUSE', 'NUGET_PACKAGES'))
    {
        $environment[$key] = [Environment]::GetEnvironmentVariable($key)
    }
    Write-NewJson -Path '.\launcher-seal-001.json' -Value ([ordered]@{
        argv = @('node', '.\seal-handoff-001.mjs')
        cwd = $PSScriptRoot
        startedUtc = $helperStarted.ToString('o')
        completedUtc = $helperCompleted.ToString('o')
        exitCode = $helperExit
        stdout = 'launcher-seal-001.stdout.txt'
        stderr = 'launcher-seal-001.stderr.txt'
        environment = $environment
        environmentScope = 'Execution-relevant allowlist, not authentication or unrelated ambient values.'
        childAndRedirectedStreamsTerminal = $true
        outerMechanicalWriterPid = $PID
        outerMechanicalWriter = $PSCommandPath
        outerMechanicalWriterSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
        nativeProductStarts = 0
    })
    if ($helperExit -ne 0)
    {
        throw "Immutable sealing helper failed with exit $helperExit; full streams retained."
    }

    $readback = [System.Collections.Generic.List[object]]::new()
    foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.json' -Recurse -File -Force | Sort-Object FullName)
    {
        $null = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
        $readback.Add((Get-ArtifactMetadata -File $file))
    }
    Write-NewJson -Path '.\json-readback-002.json' -Value ([ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('o')
        operation = 'Re-read all existing generated JSON, including HANDOFF and completed sealing-helper launcher.'
        count = $readback.Count
        files = $readback.ToArray()
        selfReferenceRule = 'This report and the subsequently created two envelopes are re-read in the final in-memory verification below.'
    })

    $entries = [System.Collections.Generic.List[object]]::new()
    foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File -Force | Sort-Object FullName)
    {
        $entries.Add((Get-ArtifactMetadata -File $file))
    }
    Write-NewJson -Path '.\ARTIFACT-INDEX-001.json' -Value ([ordered]@{
        schemaVersion = 1
        finding = 'F205'
        preparation = 222
        createdUtc = [DateTime]::UtcNow.ToString('o')
        root = $PSScriptRoot
        count = $entries.Count
        files = $entries.ToArray()
        excludedEnvelopeFiles = @('ARTIFACT-INDEX-001.json', 'SEAL-001.json')
        selfReferenceRule = 'The full byte/SHA256 index excludes only itself and the SEAL envelope. SEAL records the exact HANDOFF/index bytes and SHA256; final tool output supplies envelope digests.'
    })
    $handoffMetadata = Get-ArtifactMetadata -File (Get-Item -LiteralPath '.\HANDOFF.json')
    $indexMetadata = Get-ArtifactMetadata -File (Get-Item -LiteralPath '.\ARTIFACT-INDEX-001.json')
    Write-NewJson -Path '.\SEAL-001.json' -Value ([ordered]@{
        schemaVersion = 1
        finding = 'F205'
        preparation = 222
        createdUtc = [DateTime]::UtcNow.ToString('o')
        handoff = $handoffMetadata
        fullArtifactIndex = $indexMetadata
        indexedFiles = $entries.Count
        excludedEnvelopeFiles = @('ARTIFACT-INDEX-001.json', 'SEAL-001.json')
        innerSealerExitCode = $helperExit
        innerSealerAndStreamsTerminal = $true
        priorSourceRootSnapshotLiveMatches = 0
        nativeProductStarts = 0
        performanceExecutions = 0
        coordinatorDispositionPending = $true
        finalWriterBoundary = 'The outer writer performs the following complete in-memory JSON/index verification, then returns. Final handoff emission is contingent on its tool-reported terminal exit 0; this is not a universal unrelated-process closure claim.'
    })

    $parsedJsonCount = 0
    foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.json' -Recurse -File -Force)
    {
        $null = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
        $parsedJsonCount++
    }
    $index = Get-Content -LiteralPath '.\ARTIFACT-INDEX-001.json' -Raw | ConvertFrom-Json
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
        throw 'Final artifact membership differs from the full index plus its two explicit envelopes.'
    }
    $seal = Get-Content -LiteralPath '.\SEAL-001.json' -Raw | ConvertFrom-Json
    if ((Get-FileHash -LiteralPath '.\HANDOFF.json' -Algorithm SHA256).Hash -ne $seal.handoff.sha256 -or
        (Get-FileHash -LiteralPath '.\ARTIFACT-INDEX-001.json' -Algorithm SHA256).Hash -ne $seal.fullArtifactIndex.sha256)
    {
        throw 'Final envelope digest mismatch.'
    }

    [ordered]@{
        root = $PSScriptRoot
        handoffSha256 = $handoffMetadata.sha256
        artifactIndexSha256 = $indexMetadata.sha256
        sealSha256 = (Get-FileHash -LiteralPath '.\SEAL-001.json' -Algorithm SHA256).Hash
        indexedFiles = $entries.Count
        totalRetainedFiles = $retainedFiles.Count
        generatedJsonReRead = $parsedJsonCount
        sourceCommandReceipts = 42
        nativeProductStarts = 0
        observedPriorOwnedSourceRootsOrDescendantsStillLive = 0
        outcome = 'SOURCE_ONLY_NO_CANDIDATE'
        publicationOrCampaignFinalization = $false
    } | ConvertTo-Json -Depth 5
}
catch
{
    if (-not (Test-Path -LiteralPath '.\seal-outer-failure-001.json'))
    {
        Write-NewJson -Path '.\seal-outer-failure-001.json' -Value ([ordered]@{
            atUtc = [DateTime]::UtcNow.ToString('o')
            startedUtc = $started.ToString('o')
            message = $_.Exception.Message
            nativeProductStarts = 0
            sealedCompletionNotClaimed = $true
        })
    }
    throw
}
