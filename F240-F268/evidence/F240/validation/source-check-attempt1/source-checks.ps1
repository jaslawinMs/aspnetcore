$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$original = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $PSScriptRoot 'source\original-raw-source.zip'))
$default = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $PSScriptRoot 'source\default-raw-source.zip'))
$checks = [System.Collections.Generic.List[object]]::new()

function Read-Entry($archive, [string] $path)
{
    $entry = $archive.GetEntry($path)
    if ($entry -isnot [System.IO.Compression.ZipArchiveEntry])
    {
        throw "Missing pinned source entry: $path"
    }

    $reader = [System.IO.StreamReader]::new($entry.Open())
    try
    {
        return $reader.ReadToEnd()
    }
    finally
    {
        $reader.Dispose()
    }
}

function Record-Check([string] $name, [bool] $passed, $observed)
{
    $checks.Add([ordered]@{ name = $name; passed = $passed; observed = $observed; boundary = 'pinned source only; not a native test or runtime observation' })
}

try
{
    $originalTree = Get-Content -Raw '.\source\original-raw-source-tree.txt'
    $defaultTree = Get-Content -Raw '.\source\default-raw-source-tree.txt'
    Record-Check 'SelectedOriginalAndDefaultSourceTreesAreIdentical' ($originalTree -ceq $defaultTree) @{
        original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
        default = 'd3483989953ae3cccd773aea5ea04cb0c7198531'
    }

    $provider = Read-Entry $default 'src/Mvc/Mvc.Razor/src/TagHelpers/TagHelperFeatureProvider.cs'
    Record-Check 'ContainsRunsOnlyAfterIncludeTypeAcceptsTheType' ($provider.Contains('IncludeType(typeInfo) && !feature.TagHelpers.Contains(typeInfo)')) @{
        contains = 'feature.TagHelpers.Contains(typeInfo)'
        order = 'IncludeType, live-list Contains, live-list Add'
    }

    $builtInDeclarations = foreach ($entry in $default.Entries)
    {
        if ($entry.FullName -like 'src/Mvc/Mvc.TagHelpers/src/*.cs')
        {
            $text = Read-Entry $default $entry.FullName
            foreach ($match in [regex]::Matches($text, '(?m)^public (?:sealed )?class ([A-Za-z0-9_]*TagHelper)\s*:\s*([A-Za-z0-9_]+)'))
            {
                [ordered]@{ name = $match.Groups[1].Value; base = $match.Groups[2].Value; source = $entry.FullName }
            }
        }
    }
    Record-Check 'RealMvcTagHelpersSourceDeclaresTwentyConcreteTagHelpers' (@($builtInDeclarations).Count -eq 20) @($builtInDeclarations)

    $razorDeclarations = foreach ($name in @('BodyTagHelper', 'HeadTagHelper', 'UrlResolutionTagHelper'))
    {
        $path = "src/Mvc/Mvc.Razor/src/TagHelpers/$name.cs"
        $text = Read-Entry $default $path
        [ordered]@{ name = $name; source = $path; concreteDeclarationPresent = $text.Contains("public class $name :") }
    }
    Record-Check 'RealMvcRazorSourceDeclaresThreeAdditionalConcreteTagHelpers' (@($razorDeclarations | Where-Object { -not $_.concreteDeclarationPresent }).Count -eq 0) @($razorDeclarations)

    $site = Read-Entry $default 'src/Mvc/test/WebSites/ControllersFromServicesWebSite/Startup.cs'
    $siteChecks = @(
        $site.Contains('manager.ApplicationParts.Clear()'),
        $site.Contains('.AddApplicationPart(typeof(TimeScheduleController).GetTypeInfo().Assembly)'),
        $site.Contains('typeof(AnotherController)'),
        $site.Contains('typeof(ComponentFromServicesViewComponent)'),
        $site.Contains('typeof(InServicesTagHelper)'),
        $site.Contains('CompiledRazorAssemblyApplicationPartFactory.GetDefaultApplicationParts(Assembly.GetExecutingAssembly())'),
        $site.Contains('.AddTagHelpersAsServices()')
    )
    Record-Check 'RealOptInSiteClearsDefaultPartsAndSuppliesOneHelperInItsThreeTypePart' (-not ($siteChecks -contains $false)) @{
        sourceConfiguredParts = 3
        assemblyPart = 'ControllersFromServicesClassLibrary'
        explicitTypePartTypes = @('AnotherController', 'ComponentFromServicesViewComponent', 'InServicesTagHelper')
        nonTypePart = 'CompiledRazorAssemblyPart for ControllersFromServicesWebSite'
        acceptedHelperSourceCount = 1
        actualAssemblyDefinedTypeCount = $null
        runtimeExecuted = $false
    }

    $classLibraryFiles = @($default.Entries | Where-Object { $_.FullName -like 'src/Mvc/test/WebSites/ControllersFromServicesClassLibrary/*.cs' })
    $classLibraryText = ($classLibraryFiles | ForEach-Object { Read-Entry $default $_.FullName }) -join "`n"
    $classLibraryClasses = @([regex]::Matches($classLibraryText, '(?m)^\s*public class ([A-Za-z0-9_]+)'))
    Record-Check 'OptInClassLibraryHasNineCSharpFilesTenDeclaredClassesAndNoTagHelperReference' (
        $classLibraryFiles.Count -eq 9 -and $classLibraryClasses.Count -eq 10 -and
        $classLibraryText -notmatch '\bITagHelper\b|\bTagHelper\b'
    ) @{
        sourceFiles = $classLibraryFiles.Count
        explicitlyDeclaredClasses = $classLibraryClasses.Count
        actualCompilerGeneratedTypeCount = $null
        classes = @($classLibraryClasses | ForEach-Object { $_.Groups[1].Value })
    }

    $normalSite = Read-Entry $default 'src/Mvc/test/WebSites/TagHelpersWebSite/Startup.cs'
    Record-Check 'RealTagHelpersWebSiteDoesNotOptIntoDiscoveryAsServices' (
        $normalSite.Contains('services.AddControllersWithViews();') -and
        -not $normalSite.Contains('AddTagHelpersAsServices')
    ) @{
        startup = 'services.AddControllersWithViews();'
        addTagHelpersAsServicesCallsInThisStartup = 0
    }

    $registration = Read-Entry $default 'src/Mvc/Mvc.Razor/src/DependencyInjection/TagHelpersAsServices.cs'
    Record-Check 'FrameworkConsumerCreatesANewFeatureForEachExplicitRegistrationCall' (
        $registration.Contains('var feature = new TagHelperFeature();') -and
        $registration.Contains('manager.PopulateFeature(feature);') -and
        $registration.Contains('services.TryAddTransient(type, type);')
    ) @{
        featureLifetime = 'local to this explicit service-registration call unless retained by custom feature providers'
        retainedConsumerState = 'service registrations, not a framework-retained TagHelperFeature'
    }
}
finally
{
    $original.Dispose()
    $default.Dispose()
    $checks | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8NoBOM '.\validation\source-check-results.json'
}

$failed = @($checks | Where-Object { -not $_.passed })
[ordered]@{
    command = "& '.\source-checks.ps1'"
    kind = 'finite pinned-source qualification; no application, test runner, timing, allocation or benchmark execution'
    checks = $checks.Count
    passed = $checks.Count - $failed.Count
    failed = $failed.Count
    sourceStreamsClosed = $true
    nativeTestRows = 0
} | ConvertTo-Json | Set-Content -Encoding utf8NoBOM '.\validation\source-check-summary.json'
Get-Content '.\validation\source-check-summary.json'
if ($failed.Count -ne 0)
{
    exit 1
}
