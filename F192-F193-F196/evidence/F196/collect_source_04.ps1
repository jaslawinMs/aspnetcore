. (Join-Path $PSScriptRoot 'source_runner_03.ps1')
$script:Batch = '04'
$started = [DateTime]::UtcNow.ToString('o')
$observed = Get-Content (Join-Path $Out 'source_collection_02.json') -Raw | ConvertFrom-Json
$revisions = [ordered]@{ original = $observed.revisions.original; observedDefault = $observed.revisions.observedDefault }
$paths = @(
    'src\Mvc\test\WebSites\TagHelpersWebSite\Models\WebsiteContext.cs'
    'src\Mvc\test\WebSites\TagHelpersWebSite\readme.md'
    'src\Mvc\test\WebSites\TagHelpersWebSite\TagHelpers\SurroundTagHelper.cs'
    'src\Mvc\test\WebSites\TagHelpersWebSite\TagHelpers\ConditionTagHelper.cs'
    'src\Mvc\test\WebSites\TagHelpersWebSite\TagHelpers\BoldTagHelper.cs'
    'src\Mvc\test\WebSites\TagHelpersWebSite\Views\Shared\_Layout.cshtml'
    'src\Mvc\test\WebSites\TagHelpersWebSite\Views\_ViewStart.cshtml'
    'src\Mvc\test\Mvc.FunctionalTests\TagHelpersTest.cs'
    'src\Mvc\test\Mvc.FunctionalTests\Infrastructure\MvcTestFixture.cs'
    'src\Mvc\test\Mvc.FunctionalTests\Infrastructure\MvcEncodedTestFixtureOfT.cs'
    'src\Mvc\test\Mvc.FunctionalTests\Microsoft.AspNetCore.Mvc.FunctionalTests.csproj'
    'src\Mvc\test\Mvc.FunctionalTests\compiler\resources\TagHelpersWebSite.Home.Index.html'
    'src\Mvc\Mvc.ViewFeatures\src\ViewComponents\ContentViewComponentResult.cs'
    'src\Mvc\Mvc.ViewFeatures\src\DefaultTagHelperFactory.cs'
    'src\Mvc\Mvc.ViewFeatures\src\DefaultTagHelperActivator.cs'
    'src\Mvc\Mvc.ViewFeatures\src\ViewComponents\DefaultViewComponentFactory.cs'
    'src\Mvc\Mvc.ViewFeatures\src\ViewComponents\DefaultViewComponentActivator.cs'
    'src\Mvc\Mvc.ViewFeatures\src\ViewComponents\DefaultViewComponentHelper.cs'
    'src\Mvc\Mvc.ViewFeatures\src\ViewComponents\DefaultViewComponentInvoker.cs'
    'src\Mvc\Mvc.ViewFeatures\src\ViewComponents\DefaultViewComponentDescriptorProvider.cs'
    'src\Mvc\Mvc.Razor\src\RazorPageBase.cs'
    'src\Razor\Razor.Runtime\src\Runtime\TagHelpers\TagHelperRunner.cs'
    'src\Razor\Razor\src\TagHelpers\ITagHelper.cs'
    'src\Mvc\test\Directory.Build.props'
    'src\Mvc\test\WebSites\Directory.Build.props'
    'src\Mvc\test\WebSites\Directory.Build.targets'
)
foreach ($role in $revisions.Keys)
{
    $revision = $revisions[$role]
    foreach ($path in $paths)
    {
        Snapshot $revision $role $path
    }
    Git "04-entrypoint-occurrences-$role" @('grep', '-n', '-E', 'TagCloudViewComponentTagHelper|GetTagsAsync|<tag-cloud|InvokeAsync\("Tags"|<vc:tags', $revision, '--', 'src', 'docs') | Out-Null
    Git "04-tagcloud-content-history-$role" @('log', '--follow', '-p', '-G', 'GetTags|Take|Tags =|count', '--format=fuller', $revision, '--', 'src/Mvc/test/WebSites/TagHelpersWebSite/TagHelpers/TagCloudViewComponentTagHelper.cs') | Out-Null
}
Git '04-original-default-relevant-diff' @('diff', '--no-ext-diff', '--binary', $revisions.original, $revisions.observedDefault, '--',
    'src/Mvc/test/WebSites/TagHelpersWebSite',
    'src/Mvc/test/Mvc.FunctionalTests/TagHelpersTest.cs',
    'src/Mvc/test/Mvc.FunctionalTests/compiler/resources/TagHelpersWebSite.Home.Index.html') | Out-Null
Git '04-framework-tree' @('ls-tree', '-r', '--name-only', $revisions.observedDefault, '--', 'src/Mvc/Mvc.ViewFeatures/src', 'src/Razor/Razor/src/TagHelpers', 'src/Mvc/test/Directory.Build.props', 'src/Mvc/test/WebSites/Directory.Build.props', 'src/Mvc/test/WebSites/Directory.Build.targets') | Out-Null
$relatedSummary = @()
foreach ($file in (Get-ChildItem (Join-Path $Out 'commands') -Filter '03-related-*.stdout' | Sort-Object Name))
{
    $result = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
    $relatedSummary += [ordered]@{
        artifact = "commands\$($file.Name)"
        totalCount = $result.total_count
        incompleteResults = $result.incomplete_results
        returned = @($result.items).Count
        items = @($result.items | ForEach-Object { [ordered]@{ number = $_.number; title = $_.title; state = $_.state; htmlUrl = $_.html_url; updatedAt = $_.updated_at; pullRequest = $_.pull_request } })
    }
}
WriteJson (Join-Path $Out 'related_work_summary_04.json') $relatedSummary
$fork = Get-Content (Join-Path $Out 'commands\03-fork-default-head.stdout') -Raw | ConvertFrom-Json
Git '04-fork-default-object-membership' @('cat-file', '-e', "$($fork.sha)^{commit}") | Out-Null
FinishBatch $started ([ordered]@{ revisions = $revisions; forkObservedHead = $fork.sha })
