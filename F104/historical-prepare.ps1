$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F104'
$baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$branch = 'autoperf/F104-route-handler-operation-caches'
$current = (Get-Content (Join-Path $run 'current-default-commit.json') -Raw | ConvertFrom-Json).sha
if (Test-Path (Join-Path $run 'current-source-investigation.json'))
{
    throw 'F104 preparation already recorded; inspect rather than repeat.'
}
$area = 'src\Framework\AspNetCoreAnalyzers'
$sources = @(
    Get-ChildItem (Join-Path $repo "$area\src\Analyzers\RouteHandlers") -File -Filter '*.cs' |
        ForEach-Object {$_.FullName.Substring($repo.Length + 1)}
)
$sources += @(
    "$area\src\Analyzers\Infrastructure\RouteUsageCache.cs",
    "$area\src\Analyzers\Infrastructure\RouteUsageModel.cs",
    "$area\src\Analyzers\RouteEmbeddedLanguage\Infrastructure\RouteUsageDetector.cs",
    "$area\src\Analyzers\RouteEmbeddedLanguage\Infrastructure\RouteStringSyntaxDetector.cs",
    "$area\src\Analyzers\DiagnosticDescriptors.cs",
    "$area\src\Analyzers\Microsoft.AspNetCore.App.Analyzers.csproj",
    "$area\test\Microsoft.AspNetCore.App.Analyzers.Test.csproj",
    "$area\test\RouteHandlers\DetectAmbiguousMappedRoutesTest.cs",
    "$area\test\Verifiers\CSharpAnalyzerVerifier.cs",
    'src\Shared\RoslynUtils\WellKnownTypes.cs',
    'src\Shared\RoslynUtils\WellKnownTypeData.cs',
    'src\Shared\RoslynUtils\BoundedCacheWithFactory.cs'
)
$snapshots = [System.Collections.Generic.List[object]]::new()
foreach ($relative in $sources)
{
    $local = Join-Path $repo $relative
    $gitPath = $relative.Replace('\','/')
    $baselineBlob = git -C $repo rev-parse "${baseline}:$gitPath"
    if ($LASTEXITCODE) { throw "Baseline source unavailable: $relative" }
    $workingBlob = git -C $repo hash-object -- $local
    if ($LASTEXITCODE) { throw "Working source unavailable: $relative" }
    $arguments = @('api',"repos/dotnet/aspnetcore/contents/$gitPath`?ref=$current")
    $remoteText = gh @arguments
    if ($LASTEXITCODE) { throw "Current canonical source retrieval failed: $relative" }
    $remote = $remoteText | ConvertFrom-Json
    if ($remote.encoding -cne 'base64') { throw "Expected actual source bytes: $relative" }
    $canonical = [Convert]::FromBase64String($remote.content)
    $raw = [IO.File]::ReadAllBytes($local)
    $clean = [Text.Encoding]::UTF8.GetBytes([Text.Encoding]::UTF8.GetString($raw).Replace("`r`n","`n"))
    if ($baselineBlob -cne $remote.sha -or $workingBlob -cne $remote.sha -or
        -not [System.Linq.Enumerable]::SequenceEqual[byte]($clean,$canonical))
    {
        throw "Scoped current/baseline/working or canonical raw source differs: $relative"
    }
    $snapshot = Join-Path $run "producer-source\$relative"
    New-Item -ItemType Directory -Path (Split-Path $snapshot -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $local -Destination $snapshot
    $snapshots.Add([pscustomobject][ordered]@{
        path=$relative;currentDefaultGitBlob=$remote.sha;baselineGitBlob=$baselineBlob;workingGitBlob=$workingBlob
        equalityVerified=$true;canonicalRemoteBytesVerified=$true;rawBytes=$raw.Length
        rawSha256=(Get-FileHash -LiteralPath $snapshot -Algorithm SHA256).Hash
        rawSnapshot="producer-source\$relative";retrievalArguments=$arguments;retrievalExitCode=0
        canonicalCrLfCleanFilterSeparateFromRawSourceBytes=$true
    })
}
$snapshots | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'producer-source-copies.json') -Encoding utf8
$pending = @(git -C $repo status --porcelain --untracked-files=no)
if ($LASTEXITCODE -or $pending.Count) { throw 'Tracked source checkout must be clean before independent branching.' }
git -C $repo show-ref --verify --quiet "refs/heads/$branch"
if ($LASTEXITCODE -eq 0) { throw 'Independent F104 branch already exists; inspect rather than overwrite.' }
if ($LASTEXITCODE -ne 1) { throw 'Independent F104 branch lookup failed.' }
git -C $repo switch -c $branch $baseline
if ($LASTEXITCODE) { throw 'Independent F104 baseline branch creation failed.' }
Copy-Item (Join-Path $PSScriptRoot 'F104-acceptance.md') (Join-Path $run 'acceptance.md')
$project = [xml](Get-Content (Join-Path $repo "$area\src\Analyzers\Microsoft.AspNetCore.App.Analyzers.csproj") -Raw)
[ordered]@{
    candidate='F104';branch=$branch;sourceRevision=$baseline;currentDefaultRevision=$current
    verifiedScopedSources=$snapshots.Count;targetFramework=[string]$project.Project.PropertyGroup.TargetFramework
    existingAnalyzerRoslynPackageVersion='5.11.0-1.26420.103';sameAsComponentsAnalyzerRoslynVersion=$false
    ownerMainFileLatestRecordedChangeIn2023=$true
    ownerMainFileLatestRecordedCommit='46a3d2ba55e6f6d9accc3ede92f9231d27a4c10b'
    actualPoolingIntroductionCommit='f19d4a1c634793280e99e305a4bf860492292a6c'
    poolingIntroductionPullRequest='https://github.com/dotnet/aspnetcore/pull/45582'
    dictionariesClearedAndPooledPerCompilation=$true;dictionaryCreatedForEveryBlock=$false
    actualPerCacheWriterConcurrencyNotYetMeasured=$true;productionCardinalityFrequencyUnverified=$true
    boundedRelatedRouteHandlerMatches=@(Get-Content (Join-Path $run 'related-route-handler-pull-requests.json') -Raw | ConvertFrom-Json).Count
    related70024Head=(Get-Content (Join-Path $run 'related-70024-pr.json') -Raw | ConvertFrom-Json).head.sha
    related69260Head=(Get-Content (Join-Path $run 'related-69260-pr.json') -Raw | ConvertFrom-Json).head.sha
    relatedSearchIsNotExhaustiveAbsenceProof=$true;acceptanceRecordedBeforeImplementation=$true
    codeIntelligenceGitHubIndexUnavailableHttp404=$true;lspNamedHelperResolutionUnavailable=$true
    noShippingSourceChange=$true;cpuHeavyWorkSerialized=$true;maximumBuildNodes=2
    recordedAt=[DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'current-source-investigation.json') -Encoding utf8
& (Join-Path $PSScriptRoot 'autoperf-campaign.ps1') -Action Update -Id F104 -Status investigating -Branch $branch `
    -Note "Fresh current-default$current/baseline/working $($snapshots.Count) scoped source/Git/canonical-byte identities verified; actual2023 ambiguity introduction45582 alreadyclears-pools map dictionaries,not a fresh allocation per operationblock. Actual unrelated open70024/69260 heads/files captured,10 bounded RouteHandlerAnalyzer matches/not exhaustiveabsence; shipping netstandard2.0 usesRoslyn5.11latestVS,notComponents3.3.1. Independent unchanged baseline branch created,acceptance beforeimplementation; actual cardinality/percachewriter concurrency/full-driver resource reproduction still required." |
    Set-Content (Join-Path $PSScriptRoot 'F104-investigating.json') -Encoding utf8
Write-Output "F104: $($snapshots.Count) actual current/baseline/working source identities verified; independent unchanged baseline branch and acceptance recorded."
