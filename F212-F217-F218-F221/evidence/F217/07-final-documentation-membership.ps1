. (Join-Path $PSScriptRoot 'evidence-tools.ps1')
Set-Location $PSScriptRoot
$apiCommit = (Get-Content -LiteralPath 'native\api-docs-main-freeze\stdout.bin' -Raw | ConvertFrom-Json).sha
$dotnetCommit = (Get-Content -LiteralPath 'native\dotnet-docs-main-freeze\stdout.bin' -Raw | ConvertFrom-Json).sha
$aspnetCommit = (Get-Content -LiteralPath 'native\aspnet-docs-main-freeze\stdout.bin' -Raw | ConvertFrom-Json).sha
Write-EvidenceJson 'failures\documentation-404-003.json' @{
    helper = '06-qualified-documentation.ps1'
    shellId = 'F217-237-qualified-docs'
    exitCode = 1
    nativeLabel = 'api-docs-object-hash-contract'
    nativeExitCode = 1
    stdout = 'native\api-docs-object-hash-contract\stdout.bin'
    stderr = 'native\api-docs-object-hash-contract\stderr.bin'
    requestedPath = 'supplementary-docs/runtime-libraries/system-object-gethashcode.md'
    repository = 'dotnet/dotnet-api-docs'
    pinnedDocsCommit = $apiCommit
    message = [System.IO.File]::ReadAllText((Join-Path $PSScriptRoot 'native\api-docs-object-hash-contract\stderr.bin'))
    boundary = 'First content request failed. Later string-contract/string-comparison/sample requests in this helper did not execute.'
    preservation = 'Failed helper/native receipt/streams preserved unchanged and not replayed; final finite directory membership read below avoids another guessed source path.'
}
$directory = Invoke-F217ReadOnly 'api-docs-supplement-directory' gh @(
    'api', "repos/dotnet/dotnet-api-docs/contents/supplementary-docs?ref=$apiCommit"
) @(0,1)
if ($directory.exitCode -eq 0) {
    $entries = @(Get-Content -LiteralPath $directory.stdout -Raw | ConvertFrom-Json)
    $leads = @($entries | Where-Object { $_.path -match 'Object|String|runtime' } | Select-Object name,path,sha,type)
    Write-EvidenceJson 'documentation\api-doc-membership-leads.json' @{
        repository = 'dotnet/dotnet-api-docs'
        commit = $apiCommit
        memberCount = $entries.Count
        leads = $leads
        provenance = 'native\api-docs-supplement-directory'
    }
    $leads | ConvertTo-Json
}
$specs = @(
    @{
        label = 'existing-string-comparison-doc'
        repository = 'dotnet/docs'
        commit = $dotnetCommit
        path = 'docs/standard/base-types/best-practices-strings.md'
    },
    @{
        label = 'existing-named-pipe-doc-sample'
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
    ) @(0,1)
    if ($result.exitCode -eq 0) {
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
}
Write-EvidenceJson 'documentation\final-known-sources.json' @{
    documents = $documents
    prior404s = @('failures\documentation-404-002.json','failures\documentation-404-003.json')
    sourceGuessingEnded = $true
}
Write-Output ("Known documentation source requests completed={0}; see exact native exits" -f $documents.Count)
