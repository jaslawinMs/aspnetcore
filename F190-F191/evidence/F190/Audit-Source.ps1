$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location $PSScriptRoot
[Environment]::CurrentDirectory = (Get-Location).ProviderPath
$checks = [Collections.Generic.List[object]]::new()

function Require-Source([string] $Name, [bool] $Condition, $Evidence)
{
    $checks.Add([ordered]@{ name = $Name; passed = $Condition; evidence = $Evidence })
    if (-not $Condition)
    {
        throw "Source audit failed: $Name"
    }
}

$sourceBindings = @(Get-Content -Raw '.\source-bindings.json' | ConvertFrom-Json)
$linqBindings = @(Get-Content -Raw '.\linq-source-bindings.json' | ConvertFrom-Json)
foreach ($binding in ($sourceBindings + $linqBindings))
{
    $bytes = [IO.File]::ReadAllBytes($binding.artifact)
    $header = [Text.Encoding]::UTF8.GetBytes("blob $($bytes.Length)`0")
    $sha1 = [Security.Cryptography.IncrementalHash]::CreateHash([Security.Cryptography.HashAlgorithmName]::SHA1)
    $sha1.AppendData($header)
    $sha1.AppendData($bytes)
    $blob = [Convert]::ToHexString($sha1.GetHashAndReset()).ToLowerInvariant()
    $sha1.Dispose()
    $valid = $bytes.Length -eq $binding.bytes -and $blob -eq $binding.gitBlob -and (Get-FileHash $binding.artifact -Algorithm SHA256).Hash -eq $binding.sha256
    Require-Source "RawSourceHash:$($binding.role):$($binding.repositoryPath)" $valid $binding.artifact
}

$treePins = @(Get-Content '.\commands\identical-projecttemplates-tree-pins.stdout')
$treesEqual = $treePins.Count -eq 2 -and $treePins[0] -eq 'b29d825ba287dc360512f8da8e3e6a06e235c96a' -and $treePins[1] -eq $treePins[0] -and (Get-Item '.\commands\projecttemplates-default-diff.stdout').Length -eq 0
Require-Source 'OriginalAndActualDefaultProjectTemplatesSubtreesIdentical' $treesEqual '.\commands\identical-projecttemplates-tree-pins.stdout'
$base = '.\sources\original\src\ProjectTemplates'
$target = Get-Content -Raw "$base\Shared\AspNetProcess.cs"
Require-Source 'ExactRetainedGuardStillAtLine117' (($target -split "`n")[116].Trim() -eq 'if (page.Links?.Count() > 0)') "$base\Shared\AspNetProcess.cs:117"
$constants = @{}
foreach ($match in [regex]::Matches((Get-Content -Raw "$base\Shared\PageUrls.cs"), 'public const string (\w+) = "([^"]*)";'))
{
    $constants[$match.Groups[1].Value] = $match.Groups[2].Value
}

$producerRows = [Collections.Generic.List[object]]::new()
$assignment = '\bLinks\s*=\s*(?<expression>new\s*\[\s*\]\s*\{(?<array>[^}]*)\}|(?<pipeline>menuLinks[^,\r\n]*))'
foreach ($relative in @('test\Templates.Mvc.Tests\MvcTemplateTest.cs', 'test\Templates.Mvc.Tests\RazorPagesTemplateTest.cs'))
{
    $text = Get-Content -Raw "$base\$relative"
    $assignments = [regex]::Matches($text, $assignment)
    Require-Source "AllLinksAssignmentsParsed:$relative" ($assignments.Count -eq [regex]::Matches($text, '\bLinks\s*=').Count) $relative
    foreach ($match in $assignments)
    {
        $prefix = $text.Substring(0, $match.Index)
        $method = [regex]::Matches($prefix, '(?:public|private)\s+(?:async\s+)?Task(?:<[^>]+>)?\s+(\w+)\(')[-1].Groups[1].Value
        $urlName = [regex]::Matches($prefix, '\bUrl\s*=\s*PageUrls\.(\w+)')[-1].Groups[1].Value
        $line = ($prefix -split "`n").Count
        if ($match.Groups['array'].Success)
        {
            $names = @([regex]::Matches($match.Groups['array'].Value, 'PageUrls\.(\w+)') | ForEach-Object { $_.Groups[1].Value })
            $shape = [ordered]@{
                concreteTypeFromConstruction = 'System.String[]'
                declaredType = 'IEnumerable<string>'
                deferredElements = $false
                countPath = 'Enumerable.Count -> ICollection<string>.Count; no element traversal'
            }
        }
        else
        {
            $menu = [regex]::Matches($prefix, '\bmenuLinks\s*=\s*new[^{;]*\{([^}]*)\}')[-1]
            $footer = [regex]::Matches($prefix, '\bfooterLinks\s*=\s*new[^{;]*\{([^}]*)\}')[-1]
            $menuNames = @([regex]::Matches($menu.Groups[1].Value, 'PageUrls\.(\w+)') | ForEach-Object { $_.Groups[1].Value })
            $footerNames = @([regex]::Matches($footer.Groups[1].Value, 'PageUrls\.(\w+)') | ForEach-Object { $_.Groups[1].Value })
            Require-Source "RealPipelineInputSizes:${method}:$urlName" ($menuNames.Count -eq 3 -and $footerNames.Count -eq 1) @{ menu = $menu.Value; footer = $footer.Value }
            $appended = $match.Groups['pipeline'].Value.Contains('.Append(')
            $names = @($menuNames)
            if ($appended)
            {
                $names += 'DocsUrl'
            }
            $names += $footerNames
            $menuType = if ($menu.Value.Contains('List<string>')) { 'System.Collections.Generic.List<System.String>' } else { 'System.String[]' }
            $shape = [ordered]@{
                concreteTypeFromPinnedImplementation = 'System.Linq.Enumerable+Concat2Iterator<System.String>'
                nestedFirstType = if ($appended) { 'System.Linq.Enumerable+AppendPrepend1Iterator<System.String>' } else { $menuType }
                menuConcreteTypeFromConstruction = $menuType
                menuCount = $menuNames.Count
                footerConcreteTypeFromConstruction = 'System.String[]'
                footerCount = $footerNames.Count
                deferredElements = $true
                countPath = if ($appended) { 'Count -> Iterator.GetCount(false) -> Concat2Iterator.GetCount -> TryGetNonEnumeratedCount -> AppendPrepend1Iterator.GetCount(true) -> menu ICollection<string>.Count + 1; footer ICollection<string>.Count; checked sum; no element traversal' } else { 'Count -> Iterator.GetCount(false) -> Concat2Iterator.GetCount -> TryGetNonEnumeratedCount -> menu and footer ICollection<string>.Count; checked sum; no element traversal' }
            }
        }
        $producerRows.Add([pscustomobject][ordered]@{
            repositoryPath = "src\ProjectTemplates\$relative"
            method = $method
            line = $line
            urlConstant = "PageUrls.$urlName"
            url = $constants[$urlName]
            expression = $match.Groups['expression'].Value
            expectedLinksInOrder = @($names | ForEach-Object { "PageUrls.$_" })
            resolvedLinksInOrder = @($names | ForEach-Object { $constants[$_] })
            exactCountFromRealInitializer = $names.Count
            shape = $shape
            evidenceBoundary = 'Pinned in-tree constructor/initializer plus dependency-pinned LINQ source; no executing test host observed'
            sourceRoles = @('original', 'actualDefault')
        })
    }
}
$arrays = @($producerRows | Where-Object { -not $_.shape.deferredElements })
$pipelines = @($producerRows | Where-Object { $_.shape.deferredElements })
Require-Source 'ExactRealNonNullProducerInventory' ($producerRows.Count -eq 16 -and $arrays.Count -eq 12 -and $pipelines.Count -eq 4) @{ nonNullSites = $producerRows.Count; arrays = $arrays.Count; pipelines = $pipelines.Count }
$arraySizes = @($arrays | ForEach-Object { $_.exactCountFromRealInitializer } | Sort-Object)
$pipelineSizes = @($pipelines | ForEach-Object { $_.exactCountFromRealInitializer } | Sort-Object)
Require-Source 'ExactRealProducerSizes' (($arraySizes -join ',') -eq '4,5,6,6,6,6,7,7,7,7,10,10' -and ($pipelineSizes -join ',') -eq '4,4,5,5') 'Source initializer sites, not executed rows or a synthetic dataset.'

$blazor = Get-Content -Raw "$base\test\Templates.Mvc.Tests\BlazorTemplateTest.cs"
$start = $blazor.IndexOf('private static IEnumerable<Page> GetExpectedPages')
$end = $blazor.IndexOf('private static', $start + 10)
$expectedPages = $blazor.Substring($start, $end - $start)
$nullRows = @(
    foreach ($match in [regex]::Matches($expectedPages, 'yield return new\(([^)]+)\);'))
    {
        [ordered]@{
            pageConstant = $match.Groups[1].Value
            line = (($blazor.Substring(0, $start + $match.Index)) -split "`n").Count
            links = $null
            shape = 'Page.Links auto-property left unassigned; null, not an empty or deferred IEnumerable<string>'
        }
    }
)
Require-Source 'BlazorOuterIteratorDoesNotCreateALinksIterator' ($nullRows.Count -eq 7 -and -not $expectedPages.Contains('Links =') -and $target.Contains('public IEnumerable<string> Links { get; set; }')) 'GetExpectedPages yields Pages; each Page.Links is null.'

foreach ($role in @('original', 'default'))
{
    $linq = ".\sources\linq-$role"
    $count = [regex]::Match((Get-Content -Raw "$linq\Count.cs"), '(?s)public static int Count<TSource>.*?(?=public static int Count<TSource>)').Value
    Require-Source "CountHasUnconditionalCollectionAndIteratorSpecialization:$role" ($count.Contains('source is ICollection<TSource>') -and $count.Contains('source is Iterator<TSource>') -and $count.Contains('iterator.GetCount(onlyIfCheap: false)') -and -not $count.Contains('IsSizeOptimized')) "$linq\Count.cs"
    $concat = [regex]::Match((Get-Content -Raw "$linq\Concat.SpeedOpt.cs"), '(?s)public override int GetCount\(bool onlyIfCheap\).*?(?=public override TSource\[\] ToArray)').Value
    $append = Get-Content -Raw "$linq\AppendPrepend.SpeedOpt.cs"
    $cheap = $concat.Contains('_first.TryGetNonEnumeratedCount(out firstCount)') -and $concat.Contains('_second.TryGetNonEnumeratedCount(out secondCount)') -and $concat.Contains('return checked(firstCount + secondCount);') -and $append.Contains('return !onlyIfCheap || _source is ICollection<TSource> ? checked(_source.Count() + 1) : -1;')
    Require-Source "ActualConcatAppendInputsHaveCheapCounts:$role" $cheap @("$linq\Concat.SpeedOpt.cs", "$linq\AppendPrepend.SpeedOpt.cs")
    $any = Get-Content -Raw "$linq\AnyAll.cs"
    Require-Source "AnyUsuallyUsesTheSameCheapCountNotAnAvoidedTraversal:$role" ($any.Contains('if (!IsSizeOptimized && source is Iterator<TSource> iterator)') -and $any.Contains('iterator.GetCount(onlyIfCheap: true)') -and $any.Contains('return gc.Count != 0;')) "$linq\AnyAll.cs"
}

[ordered]@{
    classification = 'Source-derived real producer inventory, not native test output'
    nonNullProducerSites = $producerRows
    blazorNullConstructionSites = $nullRows
    summary = [ordered]@{
        nonNullSites = 16
        arraySites = 12
        arraySizes = [ordered]@{ '4' = 1; '5' = 1; '6' = 4; '7' = 4; '10' = 2 }
        concatSites = 4
        concatSizes = [ordered]@{ '4' = 2; '5' = 2 }
        blazorNullSites = 7
        nonNullMaximumCount = 10
        nativeObservedTypesOrSizes = $false
        inventedProducers = $false
    }
} | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath '.\producer-matrix.json' -Encoding utf8
[ordered]@{
    command = @('pwsh', '-NoLogo', '-NoProfile', '-File', '.\Audit-Source.ps1')
    classification = 'Offline finite source/hash audit; not a .NET build, test, runtime probe or benchmark'
    checks = $checks
    passed = @($checks | Where-Object { $_.passed }).Count
    failed = @($checks | Where-Object { -not $_.passed }).Count
    nativeTestRowsExecuted = 0
    comparisons = 0
} | ConvertTo-Json -Depth 9 | Set-Content -LiteralPath '.\source-audit-results.json' -Encoding utf8
[pscustomobject]@{ passed = $checks.Count; failed = 0; producerSites = $producerRows.Count; nativeRows = 0; comparisons = 0 } | ConvertTo-Json
