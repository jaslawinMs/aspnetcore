. (Join-Path $PSScriptRoot 'evidence-tools.ps1')
Set-Location $PSScriptRoot
$roles = Get-Content -LiteralPath 'source-roles.json' -Raw | ConvertFrom-Json
$discoveries = @()
foreach ($role in @('Original', 'Default')) {
    $commit = $roles.$role.commit
    $prefix = $role.ToLowerInvariant()
    $references = Invoke-F217ReadOnly "$prefix-exact-names" git @(
        '--no-pager', 'grep', '-n', '-I', '-e', 'NamedPipeEndPoint', '-e', 'ListenNamedPipe',
        $commit, '--', 'src', 'docs', '.github'
    ) @(0,1)
    $collections = Invoke-F217ReadOnly "$prefix-endpoint-collection-leads" git @(
        '--no-pager', 'grep', '-n', '-I', '-E',
        '(Dictionary|HashSet|IEqualityComparer|EqualityComparer|ToLookup|GroupBy|Distinct)[^;]*(EndPoint|Endpoint)',
        $commit, '--', ':(glob)src/**/*.cs'
    ) @(0,1)
    $frameworks = Invoke-F217ReadOnly "$prefix-framework-properties" git @(
        '--no-pager', 'grep', '-n', '-I', '-e', 'DefaultNetFxTargetFramework',
        '-e', 'DefaultNetCoreTargetFramework', '-e', 'CurrentLtsTargetFramework',
        $commit, '--', 'Directory.Build.props', 'eng/Versions.props', 'eng/Common.props',
        'src/Servers/Connections.Abstractions/src/Microsoft.AspNetCore.Connections.Abstractions.csproj'
    ) @(0,1)
    $history = Invoke-F217ReadOnly "$prefix-endpoint-history" git @(
        '--no-pager', 'log', '--follow', '--format=fuller', '-p', '-n', '8', $commit, '--',
        'src/Servers/Connections.Abstractions/src/NamedPipeEndPoint.cs'
    )
    $projectHistory = Invoke-F217ReadOnly "$prefix-framework-history" git @(
        '--no-pager', 'log', '--format=fuller', '-p', '-n', '4', $commit, '--',
        'src/Servers/Connections.Abstractions/src/Microsoft.AspNetCore.Connections.Abstractions.csproj'
    )
    $treePath = Join-Path $PSScriptRoot "native\$prefix-tree\stdout.bin"
    $treeRows = @([System.IO.File]::ReadAllText($treePath).Split([char]0, [System.StringSplitOptions]::RemoveEmptyEntries) | ForEach-Object {
        if ($_ -notmatch '^(?<mode>\d+) (?<type>\w+) (?<object>[0-9a-f]{40})\t(?<path>.+)$') {
            throw "Unexpected git tree record in $role"
        }
        [pscustomobject]@{ mode = $Matches.mode; type = $Matches.type; object = $Matches.object; path = $Matches.path }
    })
    $directPaths = @([System.IO.File]::ReadAllLines($references.stdout) | ForEach-Object {
        if ($_ -match '^[0-9a-f]{40}:(?<path>[^:]+):\d+:') {
            $Matches.path
        } else {
            throw "Unexpected exact-name grep output: $_"
        }
    } | Sort-Object -Unique)
    $selected = @($directPaths | Where-Object { $_ -like '*.cs' -or $_ -like '*.md' })
    $supplementPatterns = @(
        '^src/Servers/Connections\.Abstractions/src/Microsoft\.AspNetCore\.Connections\.Abstractions\.csproj$',
        '^src/Servers/Connections\.Abstractions/src/PublicAPI/(net462|netstandard2\.0|netstandard2\.1|net12\.0|net10\.0)/PublicAPI\.(Shipped|Unshipped)\.txt$',
        '^eng/Versions\.props$',
        '^eng/Common\.props$',
        '^Directory\.Build\.props$',
        '^src/Servers/(build\.cmd|Kestrel/build\.cmd)$',
        '^src/Servers/Kestrel/Transport\.NamedPipes/(README\.md|src/NamedPipeTransportOptions\.cs|src/Microsoft\.AspNetCore\.Server\.Kestrel\.Transport\.NamedPipes\.csproj|test/Microsoft\.AspNetCore\.Server\.Kestrel\.Transport\.NamedPipes\.Tests\.csproj)$',
        '^src/Servers/Kestrel/Core/src/KestrelConfigurationLoader\.cs$',
        '^src/Servers/Kestrel/Core/src/Internal/ConfigurationReader\.cs$',
        '^src/Servers/Kestrel/Core/src/Internal/Infrastructure/(ConnectionManager|TransportConnectionManager)\.cs$'
    )
    foreach ($pattern in $supplementPatterns) {
        $selected += @($treeRows | Where-Object { $_.path -match $pattern } | ForEach-Object { $_.path })
    }
    $selected = @($selected | Sort-Object -Unique)
    if ($selected.Count -gt 55) {
        throw "Selected-file bound exceeded: $role $($selected.Count)"
    }
    foreach ($path in $selected) {
        if (@($treeRows | Where-Object { $_.path -eq $path -and $_.type -eq 'blob' }).Count -ne 1) {
            throw "Selected source not exactly a blob in pinned tree: $role $path"
        }
    }
    $archive = Invoke-F217ReadOnly "$prefix-selected-source-archive" git (@('--no-pager', 'archive', '--format=tar', $commit, '--') + $selected)
    $destination = Join-Path $PSScriptRoot "sources\$role"
    [System.IO.Directory]::CreateDirectory($destination) | Out-Null
    [System.Formats.Tar.TarFile]::ExtractToDirectory($archive.stdout, $destination, $false)
    $members = @()
    foreach ($path in $selected) {
        $source = Join-Path $destination $path.Replace('/', '\')
        $bytes = [System.IO.File]::ReadAllBytes($source)
        $header = $script:Utf8.GetBytes("blob $($bytes.Length)`0")
        $gitBlobBytes = [byte[]]::new($header.Length + $bytes.Length)
        [Buffer]::BlockCopy($header, 0, $gitBlobBytes, 0, $header.Length)
        [Buffer]::BlockCopy($bytes, 0, $gitBlobBytes, $header.Length, $bytes.Length)
        $actualBlob = [Convert]::ToHexString([System.Security.Cryptography.SHA1]::HashData($gitBlobBytes)).ToLowerInvariant()
        $expectedBlob = ($treeRows | Where-Object { $_.path -eq $path }).object
        if ($actualBlob -ne $expectedBlob) {
            throw "Source bytes do not match pinned tree: $role $path"
        }
        $members += @{
            role = $role
            commit = $commit
            path = $path
            gitBlob = $expectedBlob
            actualGitBlob = $actualBlob
            length = $bytes.Length
            sha256 = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($bytes))
            evidencePath = [System.IO.Path]::GetRelativePath($PSScriptRoot, $source)
        }
    }
    $discovery = @{
        role = $role
        commit = $commit
        treeEntryCount = $treeRows.Count
        selectedCount = $selected.Count
        exactNamePaths = $directPaths
        sourceMembers = $members
        queries = @{
            exactNames = "native\$prefix-exact-names"
            endpointCollectionLeads = "native\$prefix-endpoint-collection-leads"
            frameworkProperties = "native\$prefix-framework-properties"
            endpointHistory = "native\$prefix-endpoint-history"
            projectHistory = "native\$prefix-framework-history"
        }
        queryBoundary = 'Exact symbol names in src/docs/.github; collection-lead regex in tracked C# src files, and at most eight endpoint/four project history entries. Lexical leads are not a complete resolved consumer graph or a universal absence claim.'
    }
    Write-EvidenceJson "discovery\$role.json" $discovery
    $discoveries += @{ role = $role; commit = $commit; selectedCount = $selected.Count; exactNamePathCount = $directPaths.Count }
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
Write-EvidenceJson 'discovery\summary.json' @{ roles = $discoveries; comparison = 'native\original-default-selected-diff'; nativeReplay = $false }
$discoveries | ConvertTo-Json
