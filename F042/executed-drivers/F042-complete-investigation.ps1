$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F042'
$root = 'C:\src\aspnetcore'
$target = Join-Path $run 'source-inputs-investigation.json'
if (Test-Path -LiteralPath $target)
{
    throw 'Read the existing investigation snapshot rather than overwriting it.'
}
$worktree = Get-Content -LiteralPath (Join-Path $run 'current-default-worktree.json') -Raw | ConvertFrom-Json
$prefix = 'src\Features\JsonPatch.SystemTextJson\'
$paths = @(
    'src\Internal\DictionaryAdapterOfTU.cs',
    'src\Internal\ConversionResultProvider.cs',
    'src\Internal\ConversionResult.cs',
    'src\Adapters\AdapterFactory.cs',
    'src\Adapters\ObjectAdapter.cs',
    'src\Internal\IAdapter.cs',
    'src\JsonPatchDocument.cs',
    'src\Operations\Operation.cs',
    'src\Converters\JsonPatchDocumentConverter.cs',
    'src\Microsoft.AspNetCore.JsonPatch.SystemTextJson.csproj',
    'test\Internal\DictionaryAdapterTest.cs',
    'test\IntegrationTests\DictionaryIntegrationTest.cs',
    'test\Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.csproj'
)
$files = foreach ($suffix in $paths)
{
    $relative = $prefix + $suffix
    $live = Join-Path $root $relative
    $default = Join-Path $worktree.actualVerificationRoot $relative
    $destination = Join-Path $run "source-files\$relative"
    [System.IO.Directory]::CreateDirectory((Split-Path -Parent $destination)) | Out-Null
    Copy-Item -LiteralPath $live -Destination $destination
    $hash = (Get-FileHash -LiteralPath $live -Algorithm SHA256).Hash
    $defaultHash = (Get-FileHash -LiteralPath $default -Algorithm SHA256).Hash
    if ($hash -ne $defaultHash)
    {
        throw "Selected actual default source differs: $relative"
    }
    [pscustomobject]@{ path = $relative; bytes = (Get-Item -LiteralPath $live).Length; sha256 = $hash; actualDefaultSha256 = $defaultHash }
}
$historyPaths = @(
    'src/Features/JsonPatch.SystemTextJson/src/Internal/DictionaryAdapterOfTU.cs',
    'src/Features/JsonPatch.SystemTextJson/src/Internal/ConversionResultProvider.cs',
    'src/Features/JsonPatch.SystemTextJson/src/Adapters/AdapterFactory.cs'
)
$historyArguments = @('--no-pager', 'log', '-6', '--date=iso-strict', '--format=fuller', '-p', $worktree.actualCapturedDefault, '--') + $historyPaths
$history = & git -C $root @historyArguments | Out-String
if ($LASTEXITCODE -ne 0)
{
    throw 'Bounded source history retrieval failed.'
}
[System.IO.File]::WriteAllText((Join-Path $run 'scoped-history.txt'), $history, [System.Text.UTF8Encoding]::new($false))
$queries = @(
    'repo:dotnet/aspnetcore DictionaryAdapter TryReplace',
    'repo:dotnet/aspnetcore JsonPatch dictionary replace'
)
$searches = foreach ($query in $queries)
{
    $endpoint = "search/issues?q=$([Uri]::EscapeDataString($query))&per_page=10"
    $json = & gh api $endpoint | Out-String
    if ($LASTEXITCODE -ne 0)
    {
        throw 'Existing-work search failed.'
    }
    [pscustomobject]@{ actualEndpoint = $endpoint; query = $query; actualResponse = $json | ConvertFrom-Json }
}
$searches | ConvertTo-Json -Depth 35 | Set-Content -LiteralPath (Join-Path $run 'upstream-existing-work-search.json') -Encoding utf8
$snapshot = [pscustomobject]@{
    candidate = 'F042'
    actualPrimaryBaseline = $worktree.actualPrimaryBaseline
    actualPrimarySourceRoot = $root
    actualPrimaryCapturedBranch = $worktree.actualPrimaryBranchUnchanged
    actualCurrentDefault = $worktree.actualCapturedDefault
    actualCurrentDefaultVerificationRoot = $worktree.actualVerificationRoot
    actualEntireJsonPatchAreaTreeIdentical = $worktree.actualEntireJsonPatchAreaTree
    sourceFiles = @($files)
    actualProtectedPrimaryManifestChanged = $false
    actualSourceOptimizationEditPerformed = $false
    codeIntelligenceBoundary = [pscustomobject]@{
        bluebird = 'Configured msazure/One, not this GitHub repository.'
        githubSemantic = 'Requested dotnet/aspnetcore repository not resolved, HTTP404.'
        lsp = 'File symbols work; method references return only declaration; related definitions and workspace lookup do not resolve.'
        scope = 'Known-file source reads and bounded area globs; actual runtime producer validation remains required.'
    }
    documentation = @(
        [pscustomobject]@{ url = 'https://www.rfc-editor.org/rfc/rfc6902.html#section-4.3'; actualRead = $true; relevantQuote = 'The target location MUST exist for the operation to be successful.' },
        [pscustomobject]@{ path = 'docs\BuildFromSource.md'; actualRead = $true; relevantRule = 'Activate local environment; targeted dotnet build/test is permitted.' },
        [pscustomobject]@{ path = 'docs\CrossCuttingGuidance.md'; actualRead = $true; relevantRule = 'Preserve compatibility, producer/consumer invariants and focused measurement.' }
    )
    actualFeatureAgentsFilesFound = 0
    actualHistoryCommand = @('git', '-C', $root) + $historyArguments
    actualSourceComparisons = 0
}
$snapshot | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $target -Encoding utf8
[pscustomobject]@{
    actualSelectedSourcePairsIdentical = @($files).Count
    actualCompleteAreaTreeIdentical = $worktree.actualEntireJsonPatchAreaTree
    actualHistoryCommitHeaders = @($history -split '\r?\n' | Where-Object { $_ -match '^commit |^    [^ ]' } | Select-Object -First 18)
    actualExistingWork = @($searches | ForEach-Object {
        [pscustomobject]@{ query = $_.query; total = $_.actualResponse.total_count; items = @($_.actualResponse.items | Select-Object number, title, html_url) }
    })
} | ConvertTo-Json -Depth 8
