$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'source-observer-256b.psm1') -Force
Assert-SourceGuard256 '022-offline-input-audit'
$roles=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'roles.json') -Raw | ConvertFrom-Json
$bindings=@()
foreach ($manifest in @(Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.sources.json' -File))
{
    $bindings += @(Get-Content -LiteralPath $manifest.FullName -Raw | ConvertFrom-Json)
}
$validated=@()
foreach ($binding in $bindings)
{
    if ($binding.status -cne 'whole exact git blob') { throw 'A selected source was not retained whole.' }
    if ($binding.commit -cne $roles.($binding.role)) { throw 'Role/commit mismatch.' }
    $bytes=[System.IO.File]::ReadAllBytes((Join-Path $PSScriptRoot $binding.retainedPath))
    if ($bytes.Length -ne $binding.bytes -or (Get-Hash256 $bytes) -cne $binding.sha256) { throw 'Source byte binding mismatch.' }
    $header=[System.Text.Encoding]::ASCII.GetBytes("blob $($bytes.Length)`0")
    $gitBytes=[byte[]]::new($header.Length+$bytes.Length)
    [Array]::Copy($header,0,$gitBytes,0,$header.Length)
    [Array]::Copy($bytes,0,$gitBytes,$header.Length,$bytes.Length)
    $actualBlob=[Convert]::ToHexString([System.Security.Cryptography.SHA1]::HashData($gitBytes)).ToLowerInvariant()
    if ($actualBlob -cne $binding.blob) { throw 'Git blob identity mismatch.' }
    $validated += [ordered]@{
        role=$binding.role; commit=$binding.commit; repositoryPath=$binding.repositoryPath
        retainedPath=$binding.retainedPath; bytes=$bytes.Length; sha256=$binding.sha256; blob=$actualBlob
        lines=[System.IO.File]::ReadAllLines((Join-Path $PSScriptRoot $binding.retainedPath)).Count
    }
}
$roleCounts=@($validated | Group-Object role | ForEach-Object { [ordered]@{role=$_.Name;wholeFiles=$_.Count} })
foreach ($roleCount in $roleCounts) { if ($roleCount.wholeFiles -ne 15) { throw 'Expected final bounded 15 whole files per role.' } }
$comparisons=@()
foreach ($pathGroup in @($validated | Group-Object repositoryPath))
{
    if ($pathGroup.Count -ne 2) { throw 'Expected a separate complete binding for each role.' }
    $comparisons += [ordered]@{
        repositoryPath=$pathGroup.Name
        byteIdentical=(@($pathGroup.Group.sha256 | Sort-Object -Unique).Count -eq 1)
        roleBindings=$pathGroup.Group
    }
}
$native=@(Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.native.json' -File | Sort-Object Name | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json })
$started=@($native | Where-Object { $null -ne $_.rootPid })
$failedStarts=@($native | Where-Object { $null -eq $_.rootPid })
if ($started.Count -ne 13 -or $failedStarts.Count -ne 1 -or $native.Count -gt 32) { throw 'Unexpected source-utility attempt ledger.' }
$nativeSummary=@()
foreach ($row in $native)
{
    $policySnapshot=[System.IO.File]::ReadAllBytes((Join-Path $PSScriptRoot "$($row.label).policy.json"))
    $guard=Get-Content -LiteralPath (Join-Path $PSScriptRoot $row.guard) -Raw | ConvertFrom-Json
    if (-not $guard.allowed -or (Get-Hash256 $policySnapshot) -cne $guard.policySha256) { throw 'Native admission snapshot mismatch.' }
    foreach ($stream in @('stdin','stdout','stderr'))
    {
        $actual=(Get-FileHash -LiteralPath (Join-Path $PSScriptRoot $row.$stream)).Hash
        if ($actual -cne $row.("${stream}Sha256")) { throw 'Native stream fingerprint mismatch.' }
    }
    if ($null -ne $row.rootPid)
    {
        if ($row.rootExitCode -ne 0 -or -not $row.rootHasExited -or -not $row.waitForExitReturned -or -not $row.stdoutCopyAwaited -or -not $row.stderrCopyAwaited -or $row.error) { throw 'Nonterminal native source receipt.' }
        if (@($row.observedChildTerminal | Where-Object sameCreationIdentityStillPresent -eq $true).Count -ne 0) { throw 'An observed child remains.' }
    }
    elseif ($row.label -cne '002-gh-default-branch' -or -not $row.error) { throw 'Unexpected pre-start failure.' }
    $nativeSummary += [ordered]@{
        label=$row.label; observerPid=$row.observerPid; rootPid=$row.rootPid; rootStartUtc=$row.rootStartUtc
        rootExitCode=$row.rootExitCode; waitMilliseconds=$row.waitMilliseconds; waitForExitReturned=$row.waitForExitReturned
        stdoutCopyAwaited=$row.stdoutCopyAwaited; stderrCopyAwaited=$row.stderrCopyAwaited
        stdoutBytes=$row.stdoutBytes; stderrBytes=$row.stderrBytes
        observedChildTerminal=$row.observedChildTerminal
        state=if ($row.rootPid) { 'root wait and both streams terminal; all observed child identities absent' } else { 'Process.Start failed before root PID; no root exit invented' }
    }
}
$registrationPath='sources\Default\src\Components\Endpoints\src\DependencyInjection\RazorComponentsServiceCollectionExtensions.cs'
$registrationText=[System.IO.File]::ReadAllText((Join-Path $PSScriptRoot $registrationPath))
$explicitRequests=@()
foreach ($match in [regex]::Matches($registrationText,'services\.TryAdd(?:Scoped|Singleton)<'))
{
    $position=$match.Index+$match.Length
    $start=$position
    $depth=1
    while ($position -lt $registrationText.Length -and $depth -gt 0)
    {
        if ($registrationText[$position] -eq '<') { $depth++ }
        elseif ($registrationText[$position] -eq '>') { $depth-- }
        $position++
    }
    if ($depth -ne 0) { throw 'Unbalanced captured generic request.' }
    $argsText=$registrationText.Substring($start,$position-$start-1)
    $typeDepth=0
    $serviceEnd=$argsText.Length
    for ($i=0; $i -lt $argsText.Length; $i++)
    {
        if ($argsText[$i] -eq '<') { $typeDepth++ }
        elseif ($argsText[$i] -eq '>') { $typeDepth-- }
        elseif ($argsText[$i] -eq ',' -and $typeDepth -eq 0) { $serviceEnd=$i; break }
    }
    $typeName=$argsText.Substring(0,$serviceEnd).Trim()
    $explicitRequests += [ordered]@{
        source=$registrationPath; line=([regex]::Matches($registrationText.Substring(0,$match.Index),"`n").Count+1)
        request=$registrationText.Substring($match.Index,$position-$match.Index)
        serviceTypeSyntax=$typeName
        conditional=($typeName -ceq 'HotReloadService')
        status='actual source request, not runtime descriptor enumeration'
    }
}
foreach ($typeName in @('IPostConfigureOptions<RazorComponentsServiceOptions>','IHybridCacheSerializer<SerializedRenderFragment>'))
{
    $needle="ServiceDescriptor.Singleton<$typeName"
    $at=$registrationText.IndexOf($needle,[StringComparison]::Ordinal)
    if ($at -lt 0) { throw 'Expected explicitly named TryAddEnumerable request missing.' }
    $explicitRequests += [ordered]@{
        source=$registrationPath; line=([regex]::Matches($registrationText.Substring(0,$at),"`n").Count+1)
        request='TryAddEnumerable / ServiceDescriptor.Singleton'; serviceTypeSyntax=$typeName; conditional=$false
        status='actual source request, not runtime descriptor enumeration'
    }
}
$unconditional=@($explicitRequests | Where-Object conditional -eq $false)
if ($unconditional.Count -ne 30 -or @($unconditional.serviceTypeSyntax | Sort-Object -Unique).Count -ne 30) { throw 'Unexpected direct named request inventory; do not infer a runtime count.' }
Write-FreshJson256 (Join-Path $PSScriptRoot 'direct-registration-requests.json') $explicitRequests
$lineEvidence=@()
foreach ($relative in @(
    'src\Components\Endpoints\test\RazorComponentsServiceCollectionExtensionsTest.cs',
    'src\Components\Endpoints\src\DependencyInjection\RazorComponentsServiceCollectionExtensions.cs',
    'src\Components\Components\src\RegisterPersistentComponentStateServiceCollectionExtensions.cs',
    'src\Components\Components\src\RegisterRenderingMetricsServiceCollectionExtensions.cs',
    'src\Components\Components\src\SupplyParameterFromQueryProviderServiceCollectionExtensions.cs',
    'src\Components\Web\src\Forms\Mapping\SupplyParameterFromFormServiceCollectionExtensions.cs',
    'src\Antiforgery\src\AntiforgeryServiceCollectionExtensions.cs'
))
{
    $number=0
    foreach ($line in [System.IO.File]::ReadAllLines((Join-Path $PSScriptRoot (Join-Path 'sources\Default' $relative))))
    {
        $number++
        if ($line -match 'Fact|public void AddRazor|SingleRegistrationServiceTypes|MultiRegistrationServiceTypes|foreach|Contains|Where|Select|Distinct|BuildServiceProvider|Assert|AddRazorComponents|TryAdd|AddLogging|AddAntiforgery|AddMetrics|AddComponents|AddPersistent|IsMeterFactory|configure !=|GetGeneric|MakeGenericType')
        {
            $lineEvidence += [ordered]@{role='Default';commit=$roles.Default;repositoryPath=$relative;line=$number;text=$line}
        }
    }
}
Write-FreshJson256 (Join-Path $PSScriptRoot 'source-evidence-lines.json') $lineEvidence
$audit=[ordered]@{
    scope='source byte/provenance and native-source-observation audit only'
    auditObserverPid=$PID
    recordedAtUtc=[DateTime]::UtcNow.ToString('O')
    scriptSha256=(Get-FileHash -LiteralPath $PSCommandPath).Hash
    validatedSourceBindings=$validated.Count
    roleCounts=$roleCounts
    roleComparisons=$comparisons
    byteDifferentRolePaths=@($comparisons | Where-Object byteIdentical -eq $false).Count
    directUnconditionalNamedServiceTypeRequests=$unconditional.Count
    directConditionalNamedServiceTypeRequests=@($explicitRequests | Where-Object conditional -eq $true).Count
    runtimeDescriptorCountsObserved=$false
    sourceUtilityStartAttempts=$native.Count
    actualNativeSourceRoots=$started.Count
    failedBeforeNativeStart=$failedStarts.Count
    distinctNativeRootPids=@($started.rootPid | Sort-Object -Unique)
    distinctNativeObserverPids=@($native.observerPid | Sort-Object -Unique)
    distinctObservedChildren=@($started | ForEach-Object { $_.observedChildTerminal } | Select-Object pid,creationDate | Sort-Object pid,creationDate -Unique)
    nativeTerminalSummary=$nativeSummary
    universalDescendantClosureClaimed=$false
    productExecutions=0
    sourceCandidateEdits=0
    timingsAllocationsProfilersWarmups=0
}
Write-FreshJson256 (Join-Path $PSScriptRoot 'input-audit.json') $audit
$audit | Select-Object scope,auditObserverPid,validatedSourceBindings,roleCounts,byteDifferentRolePaths,directUnconditionalNamedServiceTypeRequests,sourceUtilityStartAttempts,actualNativeSourceRoots,failedBeforeNativeStart,distinctNativeRootPids,distinctNativeObserverPids | ConvertTo-Json -Depth 10
