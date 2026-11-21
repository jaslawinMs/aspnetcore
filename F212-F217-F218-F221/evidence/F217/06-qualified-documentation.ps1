. (Join-Path $PSScriptRoot 'evidence-tools.ps1')
Set-Location $PSScriptRoot
$apiFreeze = Invoke-F217ReadOnly 'api-docs-main-freeze' gh @('api', 'repos/dotnet/dotnet-api-docs/commits/main')
$apiCommit = (Get-Content -LiteralPath $apiFreeze.stdout -Raw | ConvertFrom-Json).sha
$dotnetCommit = (Get-Content -LiteralPath 'native\dotnet-docs-main-freeze\stdout.bin' -Raw | ConvertFrom-Json).sha
$aspnetCommit = (Get-Content -LiteralPath 'native\aspnet-docs-main-freeze\stdout.bin' -Raw | ConvertFrom-Json).sha
$specs = @(
    @{
        label = 'api-docs-object-hash-contract'
        repository = 'dotnet/dotnet-api-docs'
        commit = $apiCommit
        path = 'supplementary-docs/runtime-libraries/system-object-gethashcode.md'
    },
    @{
        label = 'api-docs-string-hash-contract'
        repository = 'dotnet/dotnet-api-docs'
        commit = $apiCommit
        path = 'supplementary-docs/runtime-libraries/system-string-gethashcode.md'
    },
    @{
        label = 'dotnet-docs-string-comparison-contract'
        repository = 'dotnet/docs'
        commit = $dotnetCommit
        path = 'docs/standard/base-types/best-practices-strings.md'
    },
    @{
        label = 'aspnet-docs-existing-named-pipe-sample'
        repository = 'dotnet/AspNetCore.Docs'
        commit = $aspnetCommit
        path = 'aspnetcore/fundamentals/servers/kestrel/endpoints/samples/KestrelNamedEP/Program.cs'
    }
)
$documents = @()
foreach ($spec in $specs) {
    $result = Invoke-F217ReadOnly $spec.label gh @(
        'api', '-H', 'Accept: application/vnd.github.raw+json',
        "repos/$($spec.repository)/contents/$($spec.path)?ref=$($spec.commit)"
    )
    $destination = Join-Path $PSScriptRoot "documentation\$($spec.repository.Replace('/', '\'))\$($spec.path.Replace('/', '\'))"
    [System.IO.Directory]::CreateDirectory((Split-Path $destination)) | Out-Null
    [System.IO.File]::Copy($result.stdout, $destination, $false)
    $documents += @{
        repository = $spec.repository
        commit = $spec.commit
        path = $spec.path
        provenance = "native\$($spec.label)"
        evidencePath = [System.IO.Path]::GetRelativePath($PSScriptRoot, $destination)
        length = (Get-Item -LiteralPath $destination).Length
        sha256 = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
        role = 'Whole pinned documentation source, not ASP.NET product source or loaded-runtime proof'
    }
}
Write-EvidenceJson 'documentation\qualified-supplement.json' @{
    documents = $documents
    prior404 = 'failures\documentation-404-002.json'
    directoryDiscovery = 'documentation\runtime-doc-leads.json'
    sameFailedRequestOrHelperReplayed = $false
}
Write-Output ("Qualified documentation sources={0}; API docs commit={1}" -f $documents.Count, $apiCommit)
