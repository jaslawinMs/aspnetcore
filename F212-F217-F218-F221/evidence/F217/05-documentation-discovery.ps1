. (Join-Path $PSScriptRoot 'evidence-tools.ps1')
Set-Location $PSScriptRoot
$docCommit = (Get-Content -LiteralPath 'native\dotnet-docs-main-freeze\stdout.bin' -Raw | ConvertFrom-Json).sha
$docsDirectory = Invoke-F217ReadOnly 'dotnet-docs-runtime-directory' gh @(
    'api', "repos/dotnet/docs/contents/docs/fundamentals/runtime-libraries?ref=$docCommit"
)
$entries = @(Get-Content -LiteralPath $docsDirectory.stdout -Raw | ConvertFrom-Json)
$leads = @($entries | Where-Object { $_.name -match '(object|string|gethashcode)' } | Select-Object name, path, sha, type)
Write-EvidenceJson 'documentation\runtime-doc-leads.json' @{
    repository = 'dotnet/docs'
    commit = $docCommit
    directory = 'docs/fundamentals/runtime-libraries'
    leads = $leads
    purpose = 'Exact membership discovery after preserved404; no failed content request replay.'
}
Write-EvidenceJson 'failures\documentation-404-002.json' @{
    helper = '04-consumer-and-docs.ps1'
    shellId = 'F217-237-consumer-docs'
    exitCode = 1
    nativeLabel = 'dotnet-docs-source-1'
    nativeExitCode = 1
    stdout = 'native\dotnet-docs-source-1\stdout.bin'
    stderr = 'native\dotnet-docs-source-1\stderr.bin'
    message = 'gh: Not Found (HTTP404)'
    requestedPath = 'docs/fundamentals/runtime-libraries/system-object-gethashcode.md'
    pinnedDocsCommit = $docCommit
    sourceBoundary = 'Eight supplemental ASP.NET raw sources completed and pinned. ASP.NET endpoints documentation source completed. No subsequent dotnet/docs source2 or source3 request ran.'
    preservation = 'Failed helper/native receipt/streams unchanged and not replayed; finite directory membership discovery resolves the documentation path separately.'
}
$aspCommit = (Get-Content -LiteralPath 'native\aspnet-docs-main-freeze\stdout.bin' -Raw | ConvertFrom-Json).sha
$aspPath = 'documentation\aspnet-docs\aspnetcore\fundamentals\servers\kestrel\endpoints.md'
Write-EvidenceJson 'documentation\completed-aspnet-doc.json' @{
    repository = 'dotnet/AspNetCore.Docs'
    commit = $aspCommit
    path = 'aspnetcore/fundamentals/servers/kestrel/endpoints.md'
    provenance = 'native\aspnet-docs-source-1'
    evidencePath = $aspPath
    sha256 = (Get-FileHash -LiteralPath (Join-Path $PSScriptRoot $aspPath) -Algorithm SHA256).Hash
    role = 'Pinned documentation source, not ASP.NET product source or loaded-runtime proof'
}
$leads | ConvertTo-Json
