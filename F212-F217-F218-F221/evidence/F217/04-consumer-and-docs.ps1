. (Join-Path $PSScriptRoot 'evidence-tools.ps1')
Set-Location $PSScriptRoot
$roles = Get-Content -LiteralPath 'source-roles.json' -Raw | ConvertFrom-Json
$paths = @(
    'src/Servers/Kestrel/perf/Microbenchmarks/InMemoryTransportBenchmark.cs',
    'src/Http/Http/src/BindingAddress.cs',
    'src/Servers/Kestrel/Core/src/Internal/AddressBindContext.cs',
    'src/Servers/Kestrel/Core/src/Internal/KestrelServerImpl.cs'
)
$members = @()
foreach ($role in @('Original', 'Default')) {
    $treeText = [System.IO.File]::ReadAllText((Join-Path $PSScriptRoot "native\$($role.ToLowerInvariant())-tree\stdout.bin"))
    $ordinal = 0
    foreach ($path in $paths) {
        $ordinal++
        $entry = @($treeText.Split([char]0) | Where-Object { $_ -match "\t$([regex]::Escape($path))$" })
        if ($entry.Count -ne 1 -or $entry[0] -notmatch '^\d+ blob (?<blob>[0-9a-f]{40})\t') {
            throw "Supplemental path is not a unique blob in pinned role: $role $path"
        }
        $expectedBlob = $Matches.blob
        $label = "$($role.ToLowerInvariant())-supplement-$ordinal"
        $result = Invoke-F217ReadOnly $label git @('--no-pager', 'show', "$($roles.$role.commit):$path")
        $destination = Join-Path $PSScriptRoot "pinned-raw\$role\$($path.Replace('/', '\'))"
        [System.IO.Directory]::CreateDirectory((Split-Path $destination)) | Out-Null
        [System.IO.File]::Copy($result.stdout, $destination, $false)
        $bytes = [System.IO.File]::ReadAllBytes($destination)
        $header = $script:Utf8.GetBytes("blob $($bytes.Length)`0")
        $blobBytes = [byte[]]::new($header.Length + $bytes.Length)
        [Buffer]::BlockCopy($header, 0, $blobBytes, 0, $header.Length)
        [Buffer]::BlockCopy($bytes, 0, $blobBytes, $header.Length, $bytes.Length)
        $actualBlob = [Convert]::ToHexString([System.Security.Cryptography.SHA1]::HashData($blobBytes)).ToLowerInvariant()
        if ($actualBlob -ne $expectedBlob) {
            throw "Supplemental raw blob mismatch: $role $path"
        }
        $members += @{
            role = $role
            commit = $roles.$role.commit
            path = $path
            gitBlob = $expectedBlob
            actualGitBlob = $actualBlob
            length = $bytes.Length
            sha256 = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($bytes))
            evidencePath = [System.IO.Path]::GetRelativePath($PSScriptRoot, $destination)
            provenance = "native\$label"
        }
    }
}
Write-EvidenceJson 'raw-discovery\supplement.json' @{ sourceMembers = $members; purpose = 'Trace the actual EndPoint dictionary lead, URI producer and binding storage; source-only, no benchmark execution.' }

$documents = @()
$docSpecs = @(
    @{
        repository = 'dotnet/AspNetCore.Docs'
        label = 'aspnet-docs'
        paths = @('aspnetcore/fundamentals/servers/kestrel/endpoints.md')
    },
    @{
        repository = 'dotnet/docs'
        label = 'dotnet-docs'
        paths = @(
            'docs/fundamentals/runtime-libraries/system-object-gethashcode.md',
            'docs/fundamentals/runtime-libraries/system-string-gethashcode.md',
            'docs/standard/base-types/best-practices-strings.md'
        )
    }
)
foreach ($spec in $docSpecs) {
    $commitResult = Invoke-F217ReadOnly "$($spec.label)-main-freeze" gh @('api', "repos/$($spec.repository)/commits/main")
    $commit = Get-Content -LiteralPath $commitResult.stdout -Raw | ConvertFrom-Json
    $ordinal = 0
    foreach ($path in $spec.paths) {
        $ordinal++
        $label = "$($spec.label)-source-$ordinal"
        $result = Invoke-F217ReadOnly $label gh @(
            'api', '-H', 'Accept: application/vnd.github.raw+json',
            "repos/$($spec.repository)/contents/${path}?ref=$($commit.sha)"
        )
        $destination = Join-Path $PSScriptRoot "documentation\$($spec.label)\$($path.Replace('/', '\'))"
        [System.IO.Directory]::CreateDirectory((Split-Path $destination)) | Out-Null
        [System.IO.File]::Copy($result.stdout, $destination, $false)
        $documents += @{
            repository = $spec.repository
            commit = $commit.sha
            path = $path
            provenance = "native\$label"
            evidencePath = [System.IO.Path]::GetRelativePath($PSScriptRoot, $destination)
            length = (Get-Item -LiteralPath $destination).Length
            sha256 = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
            role = 'Pinned documentation source, not ASP.NET product source or loaded-runtime proof'
        }
    }
}
Write-EvidenceJson 'documentation\index.json' @{ documents = $documents }
Write-Output ("Supplemental raw source members={0}; pinned documentation files={1}" -f $members.Count, $documents.Count)
