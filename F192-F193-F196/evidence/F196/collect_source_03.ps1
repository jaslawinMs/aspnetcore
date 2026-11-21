. (Join-Path $PSScriptRoot 'source_runner_03.ps1')
$script:Batch = '03'
$started = [DateTime]::UtcNow.ToString('o')
$observed = Get-Content (Join-Path $Out 'source_collection_02.json') -Raw | ConvertFrom-Json
$revisions = [ordered]@{ original = $observed.revisions.original; observedDefault = $observed.revisions.observedDefault }
foreach ($role in $revisions.Keys)
{
    $revision = $revisions[$role]
    Git "03-tree-$role" @('ls-tree', '-r', '--name-only', $revision, '--', 'src/Mvc/test/WebSites/TagHelpersWebSite', 'src/Mvc/test/Mvc.FunctionalTests') | Out-Null
    Git "03-producer-occurrences-$role" @('grep', '-n', '-E', 'TagsToShow|TagHelpersWebSite', $revision, '--', 'src/Mvc/test/WebSites/TagHelpersWebSite', 'src/Mvc/test/Mvc.FunctionalTests') | Out-Null
    Snapshot $revision $role 'src\Mvc\test\WebSites\TagHelpersWebSite\Views\Home\Index.cshtml'
    Snapshot $revision $role 'src\Mvc\test\WebSites\TagHelpersWebSite\Controllers\HomeController.cs'
    Snapshot $revision $role 'src\Mvc\test\WebSites\TagHelpersWebSite\Views\_ViewImports.cshtml'
    Git "03-class-reference-$role" @('grep', '-n', '-F', 'TagCloudViewComponentTagHelper', $revision, '--', 'src', 'docs') | Out-Null
}
$protected = @()
foreach ($name in @('autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html', 'autoperf-scan-report.md', 'performance-antipattern-findings.md'))
{
    $item = Get-Item -LiteralPath (Join-Path $Root $name)
    $protected += [ordered]@{ path = $name; bytes = $item.Length; lastWriteTimeUtc = $item.LastWriteTimeUtc.ToString('o'); sha256 = (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
}
WriteJson (Join-Path $Out 'reserved_reports_observation_03.json') ([ordered]@{ observedUtc = [DateTime]::UtcNow.ToString('o'); files = $protected; role = 'protected inherited reports; never an experiment baseline' })
$forkResult = RunSource '03-fork-repository' 'gh' @('api', '--method', 'GET', 'repos/jaslawinMs/aspnetcore')
$forkBranch = if ($forkResult.ExitCode -eq 0) { ([System.Text.Encoding]::UTF8.GetString($forkResult.Bytes) | ConvertFrom-Json).default_branch } else { $null }
if ($forkBranch)
{
    RunSource '03-fork-default-head' 'gh' @('api', '--method', 'GET', "repos/jaslawinMs/aspnetcore/commits/$forkBranch") | Out-Null
}
$queries = [ordered]@{
    'upstream-class' = 'repo:dotnet/aspnetcore "TagCloudViewComponentTagHelper"'
    'fork-class' = 'repo:jaslawinMs/aspnetcore "TagCloudViewComponentTagHelper"'
    'upstream-pr-tagcloud' = 'repo:dotnet/aspnetcore is:pr "tag-cloud"'
    'fork-pr-tagcloud' = 'repo:jaslawinMs/aspnetcore is:pr "tag-cloud"'
    'upstream-pr-site-perf' = 'repo:dotnet/aspnetcore is:pr "TagHelpersWebSite" performance'
    'fork-pr-site-perf' = 'repo:jaslawinMs/aspnetcore is:pr "TagHelpersWebSite" performance'
}
foreach ($name in $queries.Keys)
{
    RunSource "03-related-$name" 'gh' @('api', '--method', 'GET', 'search/issues', '-f', "q=$($queries[$name])", '-f', 'per_page=100') | Out-Null
}
FinishBatch $started ([ordered]@{ revisions = $revisions; forkDefaultBranch = $forkBranch; relatedQueries = $queries })
