. (Join-Path $PSScriptRoot 'source_runner_03.ps1')
$script:Batch = '05'
$started = [DateTime]::UtcNow.ToString('o')
$observed = Get-Content (Join-Path $Out 'source_collection_02.json') -Raw | ConvertFrom-Json
$revisions = [ordered]@{ original = $observed.revisions.original; observedDefault = $observed.revisions.observedDefault }
foreach ($role in $revisions.Keys)
{
    $revision = $revisions[$role]
    Snapshot $revision $role 'src\Mvc\Mvc.Razor\src\DefaultTagHelperFactory.cs'
    Snapshot $revision $role 'src\Mvc\Mvc.Razor\src\Infrastructure\DefaultTagHelperActivator.cs'
    Snapshot $revision $role 'src\Mvc\Mvc.Testing\src\WebApplicationFactory.cs'
}
$historic = 'c87de5a0fc3ef6bd356aeb16d83e406b1abab9ff'
Git '05-introduction-membership' @('ls-tree', '-r', '-l', $historic, '--', 'test/WebSites/TagHelpersWebSite/TagHelpers/TagCloudViewComponentTagHelper.cs') | Out-Null
Snapshot $historic 'introduction' 'test\WebSites\TagHelpersWebSite\TagHelpers\TagCloudViewComponentTagHelper.cs'
Git '05-introduction-patch' @('show', '--format=fuller', $historic, '--', 'test/WebSites/TagHelpersWebSite/TagHelpers/TagCloudViewComponentTagHelper.cs') | Out-Null
Git '05-origin-main-ref' @('rev-parse', '--verify', 'refs/remotes/origin/main') | Out-Null
$fork = Get-Content (Join-Path $Out 'commands\03-fork-default-head.stdout') -Raw | ConvertFrom-Json
Snapshot $fork.sha 'forkDefault' 'src\Mvc\test\WebSites\TagHelpersWebSite\TagHelpers\TagCloudViewComponentTagHelper.cs'
Git '05-fork-target-diff' @('diff', '--no-ext-diff', $revisions.observedDefault, $fork.sha, '--', 'src/Mvc/test/WebSites/TagHelpersWebSite/TagHelpers/TagCloudViewComponentTagHelper.cs') | Out-Null
foreach ($number in @(49394, 42079, 42215, 62703))
{
    RunSource "05-related-pr-$number-files" 'gh' @('api', '--method', 'GET', "repos/dotnet/aspnetcore/pulls/$number/files", '-f', 'per_page=100', '-f', 'page=1') | Out-Null
}
$sourcePath = 'source\observedDefault\src\Mvc\test\WebSites\TagHelpersWebSite\TagHelpers\TagCloudViewComponentTagHelper.cs'
$source = Get-Content (Join-Path $Out $sourcePath) -Raw
$producer = [regex]::Match($source, '(?s)private static readonly string\[\] Tags =(?<producer>.*?)\.Split').Groups['producer'].Value
$literals = @([regex]::Matches($producer, '"([^"]*)"') | ForEach-Object { $_.Groups[1].Value })
if ($literals.Count -ne 4 -or @($literals | Where-Object { $_.Contains('\') }).Count -ne 0)
{
    throw 'Static literal extraction assumptions do not match the pinned producer.'
}
$text = $literals -join ''
$tokens = @($text.Split([char[]]@(' '), [System.StringSplitOptions]::RemoveEmptyEntries))
$resourcePath = 'source\observedDefault\src\Mvc\test\Mvc.FunctionalTests\compiler\resources\TagHelpersWebSite.Home.Index.html'
$resource = Get-Content (Join-Path $Out $resourcePath) -Raw
$regions = @([regex]::Matches($resource, 'Lorem,[^<\r\n]+') | ForEach-Object { $_.Value })
$knownCounts = @(20, 15, 20)
if ($regions.Count -ne $knownCounts.Count)
{
    throw 'The archived response resource does not have the expected three real tag-cloud regions.'
}
$checks = @()
for ($index = 0; $index -lt $knownCounts.Count; $index++)
{
    $count = $knownCounts[$index]
    $expected = ($tokens | Select-Object -First $count) -join ','
    $checks += [ordered]@{
        region = $index + 1
        realViewCount = $count
        resourceTokenCount = $regions[$index].Split(',').Length
        expectedPrefix = $expected
        archivedResourceText = $regions[$index]
        ordinalEqual = [string]::Equals($expected, $regions[$index], [StringComparison]::Ordinal)
    }
}
if (@($checks | Where-Object { -not $_.ordinalEqual }).Count -ne 0)
{
    throw 'Source-derived token prefixes and the checked-in HTML resource differ.'
}
WriteJson (Join-Path $Out 'static_producer_check_05.json') ([ordered]@{
    classification = 'static source/resource consistency check only; not execution of C# producer, MVC, test or rendered HTTP response'
    sourceArtifact = $sourcePath
    resourceArtifact = $resourcePath
    literalFragments = $literals
    concatenatedText = $text
    tokenCount = $tokens.Count
    sourceTokensInOrder = $tokens
    observedSourceCounts = $knownCounts
    perIndexSourceInvocationCount = 3
    perIndexSourceSelectedStringReferences = ($knownCounts | Measure-Object -Sum).Sum
    resourceChecks = $checks
    correctedMissingSpaces = $false
    preservedLiteralBoundaryTokens = @('aliquaUt', 'cupidatatnon')
    noRuntimeOrNativeTestClaim = $true
})
$prSummary = @()
foreach ($number in @(49394, 42079, 42215, 62703))
{
    $files = @(Get-Content (Join-Path $Out "commands\05-related-pr-$number-files.stdout") -Raw | ConvertFrom-Json)
    $prSummary += [ordered]@{
        pullRequest = $number
        returnedFiles = $files.Count
        page = 1
        perPage = 100
        possiblyTruncatedAtPageBound = $files.Count -eq 100
        targetMatches = @($files | Where-Object { $_.filename -eq 'src/Mvc/test/WebSites/TagHelpersWebSite/TagHelpers/TagCloudViewComponentTagHelper.cs' } | Select-Object filename, status, patch)
        siteMatches = @($files | Where-Object { $_.filename -like 'src/Mvc/test/WebSites/TagHelpersWebSite/*' } | Select-Object filename, status, patch)
    }
}
WriteJson (Join-Path $Out 'related_pr_membership_05.json') $prSummary
FinishBatch $started ([ordered]@{ sourceOnly = $true; decisions = 'No candidate implementation or native validation started.' })
