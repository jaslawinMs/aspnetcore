$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'capture-library-009.ps1')
$pins = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'source-role-pins-007.json')) | ConvertFrom-Json
$historyPaths = [ordered]@{
    F255 = 'src/ProjectTemplates/Shared/TemplatePackageInstaller.cs'
    F256 = 'src/ProjectTemplates/test/Templates.Tests/BaselineTest.cs'
}
$number = 11
foreach ($finding in $historyPaths.GetEnumerator())
{
    foreach ($role in @('Original','ObservedDefault'))
    {
        $label = ('r{0:000}-{1}-{2}-history-metadata' -f $number,$finding.Key,$role)
        $number++
        $raw = Invoke-SourceRoot $label 'git' @('--no-pager','log','--follow','--max-count=8','--format=COMMIT%x00%H%x00%P%x00%aI%x00%an%x00%s%x00','--raw','--full-index','--no-abbrev',$pins.$role,'--',$finding.Value)
        Save-NewBytes ($label + '.metadata.txt') $raw
    }
}
$range = $pins.Original + '..' + $pins.ObservedDefault
$raw = Invoke-SourceRoot 'r015-role-range-finding-history' 'git' @('--no-pager','log','--max-count=16','--format=COMMIT%x00%H%x00%P%x00%aI%x00%an%x00%s%x00','--raw','--full-index','--no-abbrev',$range,'--',$historyPaths.F255,$historyPaths.F256)
Save-NewBytes 'r015-role-range-finding-history.metadata.txt' $raw
$index = @()
foreach ($file in [IO.Directory]::EnumerateFiles($PSScriptRoot,'capture-index-*.json'))
{
    $index += @([IO.File]::ReadAllText($file) | ConvertFrom-Json -Depth 30)
}
$equality = @()
foreach ($path in @($index | Select-Object -ExpandProperty path -Unique))
{
    $roles = @($index | Where-Object { $_.path -ceq $path })
    if ($roles.Count -ne 2) { throw 'Whole source role pair missing or duplicated' }
    $a = $roles | Where-Object { $_.role -ceq 'Original' }
    $b = $roles | Where-Object { $_.role -ceq 'ObservedDefault' }
    $equality += [ordered]@{ path = $path; originalBlob = $a.blob; observedDefaultBlob = $b.blob; bytes = $a.bytes; sha256 = $a.sha256; roleBytesEqual = ($a.sha256 -ceq $b.sha256 -and $a.bytes -eq $b.bytes -and $a.blob -ceq $b.blob -and $a.mode -ceq $b.mode) }
}
Save-NewJson 'source-role-equivalence-017.json' $equality
$installerPath = Join-Path $PSScriptRoot 'bodies\Original\src\ProjectTemplates\Shared\TemplatePackageInstaller.cs.raw'
$installer = [IO.File]::ReadAllText($installerPath)
$arrayStart = $installer.IndexOf('private static readonly string[] _templatePackages')
$arrayEnd = $installer.IndexOf('};',$arrayStart)
if ($arrayStart -lt 0 -or $arrayEnd -lt $arrayStart) { throw 'Selected retained prefix array not located' }
$arrayText = $installer.Substring($arrayStart,$arrayEnd-$arrayStart)
$prefixes = @([regex]::Matches($arrayText,'"([^"]+)"') | ForEach-Object { $_.Groups[1].Value })
$overlaps = @()
for ($i = 0; $i -lt $prefixes.Count; $i++)
{
    for ($j = 0; $j -lt $prefixes.Count; $j++)
    {
        if ($i -ne $j -and $prefixes[$i].StartsWith($prefixes[$j],[StringComparison]::OrdinalIgnoreCase))
        {
            $overlaps += [ordered]@{ earlierOrLaterSpecificOrdinal = $i+1; specificPrefix = $prefixes[$i]; coveringPrefixOrdinal = $j+1; coveringPrefix = $prefixes[$j] }
        }
    }
}
$prefixStats = [ordered]@{ role = 'Both byte-equal roles'; prefixCount = $prefixes.Count; prefixesInSourceOrder = $prefixes; prefixCoverageOverlaps = $overlaps; expectedRetainedPackagesIsAssertionNotObservedDirectoryCount = 4; wildcardCandidateFileCount = $null; wildcardCandidatesNotBoundedByRetainedCount = $true; boundary = 'Static extraction from the whole captured installer only; no package directory scan, installation or benchmark' }
Save-NewJson 'prefix-contract-017.json' $prefixStats
$baselineRows = @([IO.File]::ReadAllText((Join-Path $PSScriptRoot 'baseline-rows-015.json')) | ConvertFrom-Json -Depth 30)
$duplicateRows = @($baselineRows | Where-Object { $_.role -ceq 'Original' -and $_.duplicateExpectedFiles.Count -gt 0 })
Save-NewJson 'actual-duplicate-baseline-rows-017.json' $duplicateRows
$lineMap = @()
foreach ($member in $index | Where-Object { $_.role -ceq 'Original' })
{
    if ($member.path.EndsWith('.json',[StringComparison]::Ordinal)) { continue }
    $lines = [IO.File]::ReadAllLines((Join-Path $PSScriptRoot $member.bodyFile))
    for ($i = 0; $i -lt $lines.Length; $i++)
    {
        if ($lines[$i] -match '(_templatePackages|_haveReinstalledTemplatePackages|EnsureTemplatingEngineInitialized|Directory\.EnumerateFiles|\.Where\(p|Assert\.Equal\(4|VerifyCannotFindTemplateAsync\(output|VerifyCanFindTemplate\(output|foreach \(var packagePath|TemplateBaselines|MemberData|public async Task Template_|AssertFileExists\(Project|expectedFiles =|Assert\.Contains\(relativePath|RunDotNetNewRawAsync|CreateProject\(ITest|ProjectName =|TemplateOutputDir =|AssemblyFixture|DisableTestParallelization|EmbeddedResource|PrepareForTest\.targets|ProjectReference Include|CustomTemplateHivePath>|ArtifactsNonShippingPackagesDir|PackageId>|IsShippingPackage>|GeneratedContent Include|DotNetMuxer\.MuxerPathOrDefault|DoNotCleanUpTemplates|GetTemplateFolderBasePath)')
        {
            $lineMap += [ordered]@{ path = $member.path; line = $i+1; selectedWholeInputOrdinal = $member.inputOrdinal; text = $lines[$i] }
        }
    }
}
Save-NewJson 'selected-whole-input-line-map-017.json' $lineMap
$tree = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'all-tree-metadata-015.json')) | ConvertFrom-Json -Depth 30
$proposalNames = @(
    'src/ProjectTemplates/Web.Client.ItemTemplates/Microsoft.DotNet.Web.Client.ItemTemplates.csproj'
    'src/ProjectTemplates/Web.ItemTemplates/Microsoft.DotNet.Web.ItemTemplates.csproj'
    'src/ProjectTemplates/McpServer.ProjectTemplates/Microsoft.McpServer.ProjectTemplates.csproj'
    'src/ProjectTemplates/Web.ProjectTemplates/content/BlazorWeb-CSharp/.template.config/template.json'
)
$proposal = @()
foreach ($path in $proposalNames)
{
    $found = @($tree | Where-Object { $_.path -ceq $path })
    if ($found.Count -ne 2) { throw 'Finite proposal path not present in both prior metadata inventories' }
    $proposal += $found
}
Save-NewJson 'finite-unread-source-proposal-017.json' ([ordered]@{ authorizedNow = $false; repositoryBodyBudgetClosed = $true; purpose = 'Only if parent requires deeper producer closure: three uninspected package project bodies and the exact largest-row template manifest; no producer execution or performance inference'; additionalWholeBodiesPerExistingRoleWouldBe = 4; newCumulativeWholeBodiesPerRoleWouldBe = 19; commonInjectedContextsPerRoleRemain = 2; newInclusiveInputsPerRoleWouldBe = 21; members = $proposal; engineImplementationAndFull75ScenarioClosureStillNotClaimed = $true })
$identityText = [Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes((Join-Path $PSScriptRoot 'r002-reserved-repository-identity.stdout.bin')))
Save-NewJson 'reserved-identity-observation-017.json' ([ordered]@{ root = 'r002-reserved-repository-identity'; stdout = $identityText; rootExitCode = 0; childExitLimitationPreserved = $true; reservedExpectedHead = '24875ef5dabb55567870b39f6eb0002170435e2f'; expectedHeadAppears = $identityText.Contains('24875ef5dabb55567870b39f6eb0002170435e2f'); usedAsDefault = $false })
[Console]::WriteLine(([ordered]@{ repositoryInputsPerRole = 15; commonInjectedContextsPerRole = 2; inclusiveInputsPerRole = 17; sourcePairs = $equality.Count; byteEqualPairs = @($equality | Where-Object { $_.roleBytesEqual }).Count; prefixCount = $prefixes.Count; duplicateRows = $duplicateRows; reservedIdentityText = $identityText; cumulativeGitGhRoots = 15; noAdditionalWholeBodyAuthority = $true } | ConvertTo-Json -Depth 12))
