$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
$baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$branch = 'autoperf/F103-statehaschanged-component-caches'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F103'
if (Test-Path -LiteralPath $run) { throw 'F103 run exists;inspect its actual stage rather than overwrite.' }
if ((git -C $repo rev-parse HEAD).Trim() -cne $baseline -or @(git -C $repo status --porcelain --untracked-files=no).Count)
{
    throw 'F103 requires the actual unchanged baseline;preserve unrelated untracked reports.'
}
git -C $repo show-ref --verify --quiet "refs/heads/$branch"
if ($LASTEXITCODE -eq 0) { throw 'Independent F103 branch already exists;inspect instead of recreate.' }
if ($LASTEXITCODE -ne 1) { throw 'Independent branch lookup failed.' }
New-Item -ItemType Directory -Path (Join-Path $run 'harness') -Force | Out-Null
git -C $repo switch --create $branch $baseline *> (Join-Path $run 'source-branch-create.log')
if ($LASTEXITCODE) { throw 'F103 independent branch creation failed.' }
$head = gh api repos/dotnet/aspnetcore/commits/main --jq .sha
if ($LASTEXITCODE) { throw 'Actual current default unavailable.' }
$head = $head.Trim()
$paths = @(
    'src/Components/Analyzers/src/StateHasChangedAnalyzer.cs',
    'src/Components/Analyzers/src/ComponentFacts.cs',
    'src/Components/Analyzers/src/ComponentSymbols.cs',
    'src/Components/Analyzers/src/ComponentsApi.cs',
    'src/Components/Analyzers/src/DiagnosticDescriptors.cs',
    'src/Components/Analyzers/src/Resources.resx',
    'src/Components/Analyzers/src/StateHasChangedCodeFixProvider.cs',
    'src/Components/Analyzers/src/Microsoft.AspNetCore.Components.Analyzers.csproj',
    'src/Components/Analyzers/test/StateHasChangedAnalyzerTest.cs',
    'src/Components/Analyzers/test/StateHasChangedCodeFixProviderTest.cs',
    'src/Components/Analyzers/test/Microsoft.AspNetCore.Components.Analyzers.Tests.csproj',
    'src/Analyzers/Microsoft.AspNetCore.Analyzer.Testing/src/Microsoft.AspNetCore.Analyzer.Testing.csproj',
    'src/Components/Components/src/ComponentBase.cs',
    'src/Components/Components/src/EventCallback.cs',
    'src/Components/Components/src/EventCallbackFactory.cs',
    'src/Components/Components/src/ParameterAttribute.cs',
    'src/Components/Components/src/CascadingParameterAttribute.cs',
    'src/Components/Components/src/IComponent.cs',
    'src/Components/Components/src/Microsoft.AspNetCore.Components.csproj',
    'eng/Versions.props')
$rows = @(
    foreach ($path in $paths)
    {
        $local = Join-Path $repo $path.Replace('/','\')
        $raw = @(gh api "repos/dotnet/aspnetcore/contents/$($path)?ref=$head")
        if ($LASTEXITCODE) { throw "Actual current source unavailable:$path" }
        $remote = ($raw -join "`n") | ConvertFrom-Json
        $baseBlob = (git -C $repo rev-parse "${baseline}:$path").Trim()
        $workingBlob = (git -C $repo hash-object "--path=$path" $local).Trim()
        $canonical = [Text.Encoding]::UTF8.GetBytes([Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($local)).Replace("`r`n","`n"))
        if ($remote.sha -cne $baseBlob -or $workingBlob -cne $baseBlob -or
            -not [System.Linq.Enumerable]::SequenceEqual([byte[]]$canonical,[Convert]::FromBase64String($remote.content)))
        {
            throw "Current default/baseline/working source differs:$path;do not assume current behavior."
        }
        $relative = "producer-source\$($path.Replace('/','\'))"
        $destination = Join-Path $run $relative
        New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
        Copy-Item -LiteralPath $local -Destination $destination
        [ordered]@{path=$path;snapshot=$relative;currentDefaultRevision=$head;currentDefaultGitBlob=$remote.sha;
            baselineGitBlob=$baseBlob;workingGitBlob=$workingBlob;sha256=(Get-FileHash $destination).Hash;
            bytes=(Get-Item $destination).Length;equalityVerified=$true;canonicalRemoteBytesVerified=$true;utf8BomPreserved=$true}
    }
)
$rows | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'producer-source-copies.json')
$head | Set-Content (Join-Path $run 'current-default-head.txt') -Encoding ascii
git -C $repo --no-pager log --follow --format='%H %aI %s' -- src/Components/Analyzers/src/StateHasChangedAnalyzer.cs > (Join-Path $run 'owner-history.txt')
if ($LASTEXITCODE) { throw 'Actual F103 history failed.' }
foreach ($entry in @(
    @('46c9fca81a020901e19f4aee4b3a275e9fad81e9','2026-analyzer-introduction.diff'),
    @('9cf09cfcb2ba03704490c934dec75e12c09a8e46','2026-async-suspension-correction.diff')
))
{
    git -C $repo --no-pager show --format=fuller $entry[0] -- src/Components/Analyzers/src/StateHasChangedAnalyzer.cs > (Join-Path $run $entry[1])
    if ($LASTEXITCODE) { throw 'Actual historical analyzer diff failed.' }
}
foreach ($id in 67176,68720)
{
    gh pr view $id --repo dotnet/aspnetcore --json number,title,body,state,headRefOid,files,url > (Join-Path $run "existing-pr-$id.json")
    if ($LASTEXITCODE) { throw 'Actual original/correction PR unavailable.' }
}
gh api repos/dotnet/aspnetcore/issues/65196 > (Join-Path $run 'originating-diagnostic-issue.json')
if ($LASTEXITCODE) { throw 'Actual originating analyzer issue unavailable.' }
$query = 'repo:dotnet/aspnetcore StateHasChangedAnalyzer'
gh api --method GET search/issues -f "q=$query" -f per_page=20 > (Join-Path $run 'bounded-existing-work-query.json')
if ($LASTEXITCODE) { throw 'Actual bounded analyzer query failed.' }
[ordered]@{query=$query;perPage=20;capturedAt=[DateTimeOffset]::UtcNow.ToString('o');
    note='Bounded current issue/PR body/title query,not exhaustive related-work absence proof.'} |
    ConvertTo-Json | Set-Content (Join-Path $run 'existing-work-query-receipt.json')
$documentation = 'https://learn.microsoft.com/en-us/dotnet/api/system.collections.concurrent.concurrentdictionary-2.-ctor?view=net-10.0'
Invoke-WebRequest -Uri $documentation -OutFile (Join-Path $run 'public-concurrentdictionary-constructor-documentation.html')
$inventory = Join-Path $PSScriptRoot 'autoperf-runs\F100\read-only-host-inventory.json'
Copy-Item -LiteralPath $inventory -Destination (Join-Path $run 'earlier-read-only-host-inventory.json')
if ((Get-FileHash $inventory).Hash -cne (Get-FileHash (Join-Path $run 'earlier-read-only-host-inventory.json')).Hash)
{
    throw 'Earlier read-only host inventory copy differs.'
}
[ordered]@{
    candidate='F103';sourceRevision=$baseline;branch=$branch;currentDefaultRevision=$head;verifiedScopedSources=$rows.Count
    sourceTrackedUnchanged=$true;wholeCurrentDefaultBuildOrRuntimeEquivalenceClaimed=$false
    targetFramework='netstandard2.0';existingAnalyzerRoslynPackageVersion='3.3.1'
    constructorDocumentationUrl=$documentation
    constructorDocumentationSha256=(Get-FileHash (Join-Path $run 'public-concurrentdictionary-constructor-documentation.html')).Hash
    earlierHostInventorySha256=(Get-FileHash $inventory).Hash;earlierInventoryNotClaimedFresh=$true
    priorArtBoundedAnalyzerSubtreeLazyMatches=0
    unavailableCodeIntelligence=@{githubSemanticQueryRepository='dotnet/aspnetcore';githubSemanticOutcome='HTTP404 repository resolution';lspTestSymbolMatches=0}
    note='Actual20 source/Git/canonical remote-byte identities/BOM verified;20 scoped identities are not whole-repo equivalence. Source creates2 maps per actual derived component and enables concurrent callbacks. Planned thread-safe lazy map allocation preserves actual default dictionary concurrency/capacity/comparer rather than silently reducing stripes. Real-reference original compiler workload and30 controls still require execution before shipping edits.'
} | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'current-source-investigation.json')
& (Join-Path $PSScriptRoot 'autoperf-campaign.ps1') -Action Update -Id F103 -Status investigating -Branch $branch `
    -Note 'Actual20 scoped current-default/baseline/working source/Git/canonical bytes and introduction/correction/origin issue/docs/bounded work captured. Acceptance before original real-reference Roslyn workload/30 controls and any shipping edit. First planned lazy per-component maps preserve SymbolEquality/default dictionary concurrency/capacity rather than assume production cardinality;controlled small/high/partial and serial/concurrent diagnostic cases required.' > (Join-Path $PSScriptRoot 'F103-investigating.json')
Write-Output "F103 independent$branch/current$head/baseline20 identities/history/docs verified;no shipping edit or benchmark execution."
