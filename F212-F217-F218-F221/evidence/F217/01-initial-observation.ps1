. (Join-Path $PSScriptRoot 'evidence-tools.ps1')
Set-Location $PSScriptRoot
Write-EvidenceJson 'acceptance.json' @{
    finding = 'F217'
    owner = $script:OwnerId
    go = 'GO237'
    target = 'src\Servers\Connections.Abstractions\src\NamedPipeEndPoint.cs:61-63'
    originalCommit = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
    criteria = @(
        'Read relevant cross-cutting/build/area guidance before any implementation.',
        'Qualify exact equality/hash fields, string comparer semantics, immutability and target frameworks.',
        'Use applicable LSP before bounded pinned lexical fallback; preserve local/external/unresolved limits.',
        'Observe upstream default independently through read-only gh; freeze its SHA and retain exact source and membership.',
        'Inspect real endpoint producers, legitimate value shapes/cardinality, consumers and relevant finite history/docs.',
        'Implement only if an actual material existing hash workload and a surgical compatible candidate survive.',
        'Otherwise seal source-only no-material-candidate, not measured-no-gain, false-positive or universal immateriality.',
        'No benchmark, timing, counters, workload fabrication, root edits, shared writes, publication or subagents.',
        'Capture fresh policy admission per native; await owned roots, observed children and both streams.',
        'Re-read JSON and hash every indexed artifact; seal terminal handoff with honest remaining boundaries.'
    )
}
Write-EvidenceJson 'tool-observations.json' @{
    preEvidenceToolCalls = @(
        @{
            tool = 'view'
            path = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\policy.json'
            result = 'File too large to read at once (30.7 KB). Consider using the rg tool to search within the file, or view with view_range to read specific sections.'
            continuation = 'Same policy read with explicit ranges 1-180 and 181-370; no content-exclusion denial.'
        },
        @{
            tool = 'view'
            path = 'C:\src\aspnetcore\AGENTS.md'
            result = 'Path C:\src\aspnetcore\AGENTS.md does not exist. Please provide a valid path.'
        },
        @{
            tool = 'powershell'
            shellId = '4598'
            exitCode = 0
            result = 'Built-in only source admission/tool-path/AGENTS-presence observation; no native children requested. Policy SHA256 3C33966D507D0018468C34203CE942A2862F2DAC34A64F212398160492051989, owner matches, scope237, lease absent, both hold/quiesced false. PowerShell7.6.10. Exact ancestor AGENTS files absent.'
        }
    )
    lsp = @{
        tool = 'lsp.findReferences'
        file = 'C:\src\aspnetcore\src\Servers\Connections.Abstractions\src\NamedPipeEndPoint.cs'
        line = 12
        character = 21
        includeDeclaration = $true
        resultCount = 32
        role = 'Reserved local source only, not pinned Original/Default graph evidence.'
        references = @(
            @{ path = 'src\Servers\Connections.Abstractions\src\NamedPipeEndPoint.cs'; locations = @('12:21','20:12','29:12','17:54','25:54','46:59','57:23','20:49') },
            @{ path = 'src\Servers\Kestrel\Transport.NamedPipes\src\CreateNamedPipeServerStreamContext.cs'; locations = @('17:21') },
            @{ path = 'src\Servers\Kestrel\Transport.NamedPipes\src\Internal\NamedPipeTransportFactory.cs'; locations = @('39:29','72:28') },
            @{ path = 'src\Servers\Kestrel\Transport.NamedPipes\src\Internal\NamedPipeConnectionListener.cs'; locations = @('35:9','21:22','194:26','198:48') },
            @{ path = 'src\Servers\Kestrel\Transport.NamedPipes\src\Internal\NamedPipeConnection.cs'; locations = @('37:9') },
            @{ path = 'src\Servers\Kestrel\Core\src\Internal\Infrastructure\TransportManager.cs'; locations = @('56:25') },
            @{ path = 'src\Servers\Kestrel\Core\src\Internal\AddressBinder.cs'; locations = @('126:45') },
            @{ path = 'src\Servers\Kestrel\Core\src\KestrelServerOptions.cs'; locations = @('647:51') },
            @{ path = 'src\Servers\Kestrel\Core\src\ListenOptions.cs'; locations = @('74:78','76:45','155:18') },
            @{ path = 'src\Shared\ConnectionEndpointTags.cs'; locations = @('88:35') },
            @{ path = 'src\Servers\Kestrel\Core\test\AddressBinderTests.cs'; locations = @('157:23','168:23','146:23') },
            @{ path = 'src\Servers\Kestrel\Transport.NamedPipes\test\NamedPipeConnectionListenerTests.cs'; locations = @('284:26','295:26') },
            @{ path = 'src\Servers\Kestrel\Transport.NamedPipes\test\NamedPipeTestHelpers.cs'; locations = @('49:34','41:28') },
            @{ path = 'src\Servers\Kestrel\Transport.NamedPipes\test\WebHostTests.cs'; locations = @('98:16','107:29') }
        )
        limitations = 'A reference list for the derived endpoint does not resolve every consumer through EndPoint/object/generics, external packages or unloaded projects. Azure code index defaults to unrelated msazure/One and is deliberately unused.'
    }
}
$admission = Read-F217Admission 'initial-source-admission'
[System.IO.File]::Copy((Join-Path $script:PolicyRoot 'owner-registration-237.json'), (Join-Path $PSScriptRoot 'owner-registration-237.json'), $false)
$guidance = @(
    '.github\instructions\cross-cutting-guidance.instructions.md',
    '.github\instructions\build.instructions.md',
    'docs\CrossCuttingGuidance.md',
    'docs\BuildFromSource.md',
    'docs\BuildErrors.md'
)
$guidanceIndex = @()
foreach ($path in $guidance) {
    $source = Join-Path $script:ReservedRoot $path
    $destination = Join-Path $PSScriptRoot "guidance\$path"
    [System.IO.Directory]::CreateDirectory((Split-Path $destination)) | Out-Null
    [System.IO.File]::Copy($source, $destination, $false)
    $guidanceIndex += @{ path = $path; sha256 = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash; role = 'Reserved local guidance snapshot' }
}
$areaPaths = @('AGENTS.md','src\AGENTS.md','src\Servers\AGENTS.md','src\Servers\Connections.Abstractions\AGENTS.md','src\Servers\Connections.Abstractions\src\AGENTS.md','src\Servers\Kestrel\AGENTS.md','src\Servers\Kestrel\Transport.NamedPipes\AGENTS.md','src\Servers\Kestrel\Core\AGENTS.md')
Write-EvidenceJson 'guidance\index.json' @{
    files = $guidanceIndex
    areaPresence = @($areaPaths | ForEach-Object { @{ path = $_; present = Test-Path -LiteralPath (Join-Path $script:ReservedRoot $_) } })
}
$before = Save-F217RootSnapshot 'before'
if ($before.head -ne '24875ef5dabb55567870b39f6eb0002170435e2f' -or $before.branch -ne 'autoperf/F145-hoist-large-response-utf8-encoding') {
    throw 'Reserved-root source role differs from assignment'
}
$repo = Invoke-F217ReadOnly 'upstream-repository' gh @('api', 'repos/dotnet/aspnetcore')
$repoData = Get-Content -LiteralPath $repo.stdout -Raw | ConvertFrom-Json
if ($repoData.default_branch -ne 'main') {
    throw 'Observed upstream default branch is not main'
}
$commit = Invoke-F217ReadOnly 'upstream-main-freeze' gh @('api', 'repos/dotnet/aspnetcore/commits/main')
$commitData = Get-Content -LiteralPath $commit.stdout -Raw | ConvertFrom-Json
Write-EvidenceJson 'source-roles.json' @{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    repository = 'dotnet/aspnetcore'
    Original = @{ commit = '37e809ead5824bc753a1c3d56f11615bdb1296c5'; provenance = 'Assigned campaign Original, local read-only git source to be retained' }
    Default = @{ branch = $repoData.default_branch; commit = $commitData.sha; tree = $commitData.commit.tree.sha; provenance = 'native\upstream-repository and native\upstream-main-freeze, independently observed with read-only gh' }
    Reserved = @{ root = $script:ReservedRoot; head = $before.head; branch = $before.branch; purpose = 'Read-only object store and local LSP source, never runtime/Default substitution' }
    host = $env:COMPUTERNAME
    loadedRuntimeEvidence = $false
    privateGraphsCreated = @()
}
$originalTree = Invoke-F217ReadOnly 'original-tree' git @('--no-pager', 'ls-tree', '-r', '-z', '37e809ead5824bc753a1c3d56f11615bdb1296c5')
$defaultExists = Invoke-F217ReadOnly 'default-local-availability' git @('--no-pager', 'cat-file', '-e', "$($commitData.sha)^{commit}") @(0,1,128)
if ($defaultExists.exitCode -eq 0) {
    $defaultTree = Invoke-F217ReadOnly 'default-tree' git @('--no-pager', 'ls-tree', '-r', '-z', $commitData.sha)
} else {
    $defaultTree = Invoke-F217ReadOnly 'default-tree-remote' gh @('api', "repos/dotnet/aspnetcore/git/trees/$($commitData.commit.tree.sha)?recursive=1")
}
Write-Output ("Initial source observation complete. Original={0}; Default={1}; tracked/untracked entries={2}; defaultLocal={3}" -f '37e809ead5824bc753a1c3d56f11615bdb1296c5', $commitData.sha, $before.fileCount, ($defaultExists.exitCode -eq 0))
