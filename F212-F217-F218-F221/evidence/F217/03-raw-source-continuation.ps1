. (Join-Path $PSScriptRoot 'evidence-tools.ps1')
Set-Location $PSScriptRoot
$roles = Get-Content -LiteralPath 'source-roles.json' -Raw | ConvertFrom-Json

function Get-TreeRows {
    param([string]$Role)
    $treePath = Join-Path $PSScriptRoot "native\$($Role.ToLowerInvariant())-tree\stdout.bin"
    return @([System.IO.File]::ReadAllText($treePath).Split([char]0, [System.StringSplitOptions]::RemoveEmptyEntries) | ForEach-Object {
        if ($_ -notmatch '^(?<mode>\d+) (?<type>\w+) (?<object>[0-9a-f]{40})\t(?<path>.+)$') {
            throw "Unexpected git tree record in $Role"
        }
        [pscustomobject]@{ mode = $Matches.mode; type = $Matches.type; object = $Matches.object; path = $Matches.path }
    })
}

function Get-GitBlobHash {
    param([byte[]]$Bytes)
    $header = $script:Utf8.GetBytes("blob $($Bytes.Length)`0")
    $blob = [byte[]]::new($header.Length + $Bytes.Length)
    [Buffer]::BlockCopy($header, 0, $blob, 0, $header.Length)
    [Buffer]::BlockCopy($Bytes, 0, $blob, $header.Length, $Bytes.Length)
    return [Convert]::ToHexString([System.Security.Cryptography.SHA1]::HashData($blob)).ToLowerInvariant()
}

$originalRows = Get-TreeRows 'Original'
$diagnostic = Invoke-F217ReadOnly 'original-props-raw-diagnostic' git @('--no-pager', 'show', "$($roles.Original.commit):Directory.Build.props")
$raw = [System.IO.File]::ReadAllBytes($diagnostic.stdout)
$archivedPath = Join-Path $PSScriptRoot 'sources\Original\Directory.Build.props'
$archived = [System.IO.File]::ReadAllBytes($archivedPath)
$expectedBlob = ($originalRows | Where-Object { $_.path -eq 'Directory.Build.props' }).object
$rawBlob = Get-GitBlobHash $raw
$autocrlf = Invoke-F217ReadOnly 'archive-conversion-config-observation' git @('--no-pager', 'config', '--show-origin', '--get', 'core.autocrlf') @(0,1)
$attributes = Invoke-F217ReadOnly 'original-archive-attributes' git @('--no-pager', 'show', "$($roles.Original.commit):.gitattributes")
Write-EvidenceJson 'failures\source-provenance-001.json' @{
    helper = '02-pinned-discovery.ps1'
    shellId = 'F217-237-discovery'
    exitCode = 1
    expectedFailure = $false
    message = 'Line85: Source bytes do not match pinned tree: Original Directory.Build.props'
    boundary = 'git archive native exited0 with both streams terminal; subsequent source-byte validation failed. No Default queries, build, test, source edit or performance work ran in that helper.'
    expectedGitBlob = $expectedBlob
    archiveGitBlob = Get-GitBlobHash $archived
    archiveLength = $archived.Length
    rawGitBlob = $rawBlob
    rawLength = $raw.Length
    rawMatchesPinnedTree = $rawBlob -eq $expectedBlob
    textEqualAfterCrLfNormalization = $script:Utf8.GetString($raw).Replace("`r`n", "`n") -eq $script:Utf8.GetString($archived).Replace("`r`n", "`n")
    configObservation = 'native\archive-conversion-config-observation'
    attributes = 'native\original-archive-attributes'
    preservation = 'Failed archive/extraction/helper/query/native receipts unchanged. No helper edit or failed-work replay. Fresh raw git show reads below qualify bytes independently.'
}
if ($rawBlob -ne $expectedBlob) {
    throw 'Fresh raw diagnostic also fails pinned-tree validation; stop source qualification'
}

$summaries = @()
foreach ($role in @('Original', 'Default')) {
    $commit = $roles.$role.commit
    $prefix = $role.ToLowerInvariant()
    $treeRows = Get-TreeRows $role
    if ($role -eq 'Original') {
        $referencePath = Join-Path $PSScriptRoot 'native\original-exact-names\stdout.bin'
        $originalArchiveInvocation = Get-Content -LiteralPath 'native\original-selected-source-archive\invocation.json' -Raw | ConvertFrom-Json
        $selected = @($originalArchiveInvocation.argv | Select-Object -Skip 5)
        $selected += '.gitattributes'
    } else {
        $references = Invoke-F217ReadOnly 'default-exact-names' git @(
            '--no-pager', 'grep', '-n', '-I', '-e', 'NamedPipeEndPoint', '-e', 'ListenNamedPipe',
            $commit, '--', 'src', 'docs', '.github'
        ) @(0,1)
        $referencePath = $references.stdout
        $collections = Invoke-F217ReadOnly 'default-endpoint-collection-leads' git @(
            '--no-pager', 'grep', '-n', '-I', '-E',
            '(Dictionary|HashSet|IEqualityComparer|EqualityComparer|ToLookup|GroupBy|Distinct)[^;]*(EndPoint|Endpoint)',
            $commit, '--', ':(glob)src/**/*.cs'
        ) @(0,1)
        $frameworks = Invoke-F217ReadOnly 'default-framework-properties' git @(
            '--no-pager', 'grep', '-n', '-I', '-e', 'DefaultNetFxTargetFramework',
            '-e', 'DefaultNetCoreTargetFramework', '-e', 'CurrentLtsTargetFramework',
            $commit, '--', 'Directory.Build.props', 'eng/Versions.props', 'eng/Common.props',
            'src/Servers/Connections.Abstractions/src/Microsoft.AspNetCore.Connections.Abstractions.csproj'
        ) @(0,1)
        $history = Invoke-F217ReadOnly 'default-endpoint-history' git @(
            '--no-pager', 'log', '--follow', '--format=fuller', '-p', '-n', '8', $commit, '--',
            'src/Servers/Connections.Abstractions/src/NamedPipeEndPoint.cs'
        )
        $projectHistory = Invoke-F217ReadOnly 'default-framework-history' git @(
            '--no-pager', 'log', '--format=fuller', '-p', '-n', '4', $commit, '--',
            'src/Servers/Connections.Abstractions/src/Microsoft.AspNetCore.Connections.Abstractions.csproj'
        )
        $directPaths = @([System.IO.File]::ReadAllLines($referencePath) | ForEach-Object {
            if ($_ -match '^[0-9a-f]{40}:(?<path>[^:]+):\d+:') { $Matches.path } else { throw "Unexpected exact-name output: $_" }
        } | Sort-Object -Unique)
        $selected = @($directPaths | Where-Object { $_ -like '*.cs' -or $_ -like '*.md' })
        $supplementPatterns = @(
            '^\.gitattributes$',
            '^src/Servers/Connections\.Abstractions/src/Microsoft\.AspNetCore\.Connections\.Abstractions\.csproj$',
            '^src/Servers/Connections\.Abstractions/src/PublicAPI/(net462|netstandard2\.0|netstandard2\.1|net12\.0|net10\.0)/PublicAPI\.(Shipped|Unshipped)\.txt$',
            '^eng/Versions\.props$', '^eng/Common\.props$', '^Directory\.Build\.props$',
            '^src/Servers/(build\.cmd|Kestrel/build\.cmd)$',
            '^src/Servers/Kestrel/Transport\.NamedPipes/(README\.md|src/NamedPipeTransportOptions\.cs|src/Microsoft\.AspNetCore\.Server\.Kestrel\.Transport\.NamedPipes\.csproj|test/Microsoft\.AspNetCore\.Server\.Kestrel\.Transport\.NamedPipes\.Tests\.csproj)$',
            '^src/Servers/Kestrel/Core/src/KestrelConfigurationLoader\.cs$',
            '^src/Servers/Kestrel/Core/src/Internal/ConfigurationReader\.cs$',
            '^src/Servers/Kestrel/Core/src/Internal/Infrastructure/(ConnectionManager|TransportConnectionManager)\.cs$'
        )
        foreach ($pattern in $supplementPatterns) {
            $selected += @($treeRows | Where-Object { $_.path -match $pattern } | ForEach-Object { $_.path })
        }
    }
    $directPaths = @([System.IO.File]::ReadAllLines($referencePath) | ForEach-Object {
        if ($_ -match '^[0-9a-f]{40}:(?<path>[^:]+):\d+:') { $Matches.path } else { throw "Unexpected exact-name output: $_" }
    } | Sort-Object -Unique)
    $selected = @($selected | Sort-Object -Unique)
    if ($selected.Count -gt 56) {
        throw "Selected-file bound exceeded: $role $($selected.Count)"
    }
    $members = @()
    $ordinal = 0
    foreach ($path in $selected) {
        $ordinal++
        $treeEntry = @($treeRows | Where-Object { $_.path -eq $path -and $_.type -eq 'blob' })
        if ($treeEntry.Count -ne 1) {
            throw "Selected source not exactly a blob in pinned tree: $role $path"
        }
        if ($role -eq 'Original' -and $path -eq 'Directory.Build.props') {
            $result = $diagnostic
            $nativeLabel = 'original-props-raw-diagnostic'
        } elseif ($role -eq 'Original' -and $path -eq '.gitattributes') {
            $result = $attributes
            $nativeLabel = 'original-archive-attributes'
        } else {
            $nativeLabel = "$prefix-raw-$('{0:d3}' -f $ordinal)"
            $result = Invoke-F217ReadOnly $nativeLabel git @('--no-pager', 'show', "${commit}:$path")
        }
        $destination = Join-Path $PSScriptRoot "pinned-raw\$role\$($path.Replace('/', '\'))"
        [System.IO.Directory]::CreateDirectory((Split-Path $destination)) | Out-Null
        [System.IO.File]::Copy($result.stdout, $destination, $false)
        $bytes = [System.IO.File]::ReadAllBytes($destination)
        $actualBlob = Get-GitBlobHash $bytes
        if ($actualBlob -ne $treeEntry[0].object) {
            throw "Raw source bytes do not match pinned tree: $role $path"
        }
        $members += @{
            role = $role
            commit = $commit
            path = $path
            gitBlob = $treeEntry[0].object
            actualGitBlob = $actualBlob
            length = $bytes.Length
            sha256 = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($bytes))
            evidencePath = [System.IO.Path]::GetRelativePath($PSScriptRoot, $destination)
            provenance = "native\$nativeLabel"
        }
    }
    Write-EvidenceJson "raw-discovery\$role.json" @{
        role = $role
        commit = $commit
        treeEntryCount = $treeRows.Count
        selectedCount = $selected.Count
        exactNamePaths = $directPaths
        sourceMembers = $members
        queryBoundary = 'Exact names in tracked src/docs/.github; collection regex in tracked C# src files, and at most eight endpoint/four project history entries. Lexical leads are not a complete resolved consumer graph or a universal absence claim.'
        provenanceFailurePreserved = 'failures\source-provenance-001.json'
        authoritativeSourceDirectory = "pinned-raw\$role"
        archiveDirectoryNotUsedAsRawProof = 'sources\Original'
    }
    $summaries += @{ role = $role; commit = $commit; selectedCount = $selected.Count; exactNamePathCount = $directPaths.Count }
}
$comparison = Invoke-F217ReadOnly 'original-default-selected-diff' git @(
    '--no-pager', 'diff', '--no-ext-diff', $roles.Original.commit, $roles.Default.commit, '--',
    'src/Servers/Connections.Abstractions/src/NamedPipeEndPoint.cs',
    'src/Servers/Connections.Abstractions/src/Microsoft.AspNetCore.Connections.Abstractions.csproj',
    'src/Servers/Kestrel/Transport.NamedPipes',
    'src/Servers/Kestrel/Core/src/KestrelServerOptions.cs',
    'src/Servers/Kestrel/Core/src/ListenOptions.cs',
    'src/Servers/Kestrel/Core/src/Internal/AddressBinder.cs',
    'src/Servers/Kestrel/Core/src/Internal/Infrastructure/TransportManager.cs',
    'src/Shared/ConnectionEndpointTags.cs'
)
Write-EvidenceJson 'raw-discovery\summary.json' @{ roles = $summaries; comparison = 'native\original-default-selected-diff'; failedHelperUnchangedAndNotReplayed = $true }
$summaries | ConvertTo-Json
