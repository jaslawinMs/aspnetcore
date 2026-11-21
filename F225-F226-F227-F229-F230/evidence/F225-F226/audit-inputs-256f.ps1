$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'source-observer-256b.psm1') -Force
Assert-SourceGuard256 '024-offline-binding-audit'
$roles=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'roles.json') -Raw | ConvertFrom-Json
$bindings=@()
foreach ($manifest in @(Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.sources.json' -File))
{
    $parsed=Get-Content -LiteralPath $manifest.FullName -Raw | ConvertFrom-Json
    foreach ($item in $parsed) { $bindings += $item }
}
$validated=@()
foreach ($binding in $bindings)
{
    if ($binding.status -cne 'whole exact git blob' -or $binding.commit -cne $roles.($binding.role)) { throw 'Whole source role binding failed.' }
    $path=Join-Path $PSScriptRoot $binding.retainedPath
    $bytes=[System.IO.File]::ReadAllBytes($path)
    if ($bytes.Length -ne $binding.bytes -or (Get-Hash256 $bytes) -cne $binding.sha256) { throw 'Source byte hash mismatch.' }
    $header=[System.Text.Encoding]::ASCII.GetBytes("blob $($bytes.Length)`0")
    $objectBytes=[byte[]]::new($header.Length+$bytes.Length)
    [Array]::Copy($header,0,$objectBytes,0,$header.Length)
    [Array]::Copy($bytes,0,$objectBytes,$header.Length,$bytes.Length)
    $blob=[Convert]::ToHexString([System.Security.Cryptography.SHA1]::HashData($objectBytes)).ToLowerInvariant()
    if ($blob -cne $binding.blob) { throw 'Source Git object hash mismatch.' }
    $validated += [pscustomobject][ordered]@{
        role=$binding.role; commit=$binding.commit; repositoryPath=$binding.repositoryPath
        retainedPath=$binding.retainedPath; sha256=$binding.sha256; blob=$blob; bytes=$bytes.Length
        lines=[System.IO.File]::ReadAllLines($path).Count
    }
}
$roleCounts=@($validated | Group-Object role | ForEach-Object { [pscustomobject]@{role=$_.Name;wholeFiles=$_.Count} })
if ($validated.Count -ne 30 -or @($roleCounts | Where-Object wholeFiles -ne 15).Count -ne 0) { throw 'Unexpected whole-file role count.' }
$comparisons=@()
foreach ($group in @($validated | Group-Object repositoryPath))
{
    if ($group.Count -ne 2) { throw 'Missing independent role binding.' }
    $comparisons += [pscustomobject][ordered]@{
        repositoryPath=$group.Name; byteIdentical=(@($group.Group.sha256 | Sort-Object -Unique).Count -eq 1)
        roleBindings=$group.Group
    }
}
$native=@(Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.native.json' -File | Sort-Object Name | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json })
$started=@($native | Where-Object { $null -ne $_.rootPid })
$failedStarts=@($native | Where-Object { $null -eq $_.rootPid })
if ($started.Count -ne 13 -or $failedStarts.Count -ne 1 -or $native.Count -gt 32) { throw 'Unexpected source native attempt ledger.' }
$nativeSummary=@()
foreach ($row in $native)
{
    $policy=[System.IO.File]::ReadAllBytes((Join-Path $PSScriptRoot "$($row.label).policy.json"))
    $guard=Get-Content -LiteralPath (Join-Path $PSScriptRoot $row.guard) -Raw | ConvertFrom-Json
    if (-not $guard.allowed -or (Get-Hash256 $policy) -cne $guard.policySha256) { throw 'Native guard snapshot mismatch.' }
    foreach ($streamName in @('stdin','stdout','stderr'))
    {
        if ((Get-FileHash -LiteralPath (Join-Path $PSScriptRoot $row.$streamName)).Hash -cne $row.("${streamName}Sha256")) { throw 'Native stream hash mismatch.' }
    }
    if ($null -ne $row.rootPid)
    {
        if ($row.rootExitCode -ne 0 -or -not $row.rootHasExited -or -not $row.waitForExitReturned -or -not $row.stdoutCopyAwaited -or -not $row.stderrCopyAwaited -or $row.error) { throw 'Native root/stream terminal evidence incomplete.' }
        if (@($row.observedChildTerminal | Where-Object sameCreationIdentityStillPresent -eq $true).Count -ne 0) { throw 'Observed native child not terminal.' }
    }
    elseif ($row.label -cne '002-gh-default-branch' -or -not $row.error) { throw 'Unexpected pre-start failure.' }
    $nativeSummary += [pscustomobject][ordered]@{
        label=$row.label; observerPid=$row.observerPid; rootPid=$row.rootPid; rootStartUtc=$row.rootStartUtc
        rootExitCode=$row.rootExitCode; waitMilliseconds=$row.waitMilliseconds; waitForExitReturned=$row.waitForExitReturned
        stdoutCopyAwaited=$row.stdoutCopyAwaited; stderrCopyAwaited=$row.stderrCopyAwaited
        stdoutBytes=$row.stdoutBytes; stderrBytes=$row.stderrBytes
        observedChildTerminal=$row.observedChildTerminal
        state=if ($row.rootPid) { 'root wait and both streams terminal; observed child identities absent' } else { 'Process.Start failed before root PID; no root exit invented' }
    }
}
$registrationPath='sources\Default\src\Components\Endpoints\src\DependencyInjection\RazorComponentsServiceCollectionExtensions.cs'
$text=[System.IO.File]::ReadAllText((Join-Path $PSScriptRoot $registrationPath))
$requests=@()
foreach ($match in [regex]::Matches($text,'services\.TryAdd(?:Scoped|Singleton)<'))
{
    $position=$match.Index+$match.Length
    $start=$position
    $depth=1
    while ($position -lt $text.Length -and $depth -gt 0)
    {
        if ($text[$position] -eq '<') { $depth++ }
        elseif ($text[$position] -eq '>') { $depth-- }
        $position++
    }
    if ($depth -ne 0) { throw 'Unbalanced captured registration syntax.' }
    $genericArguments=$text.Substring($start,$position-$start-1)
    $nested=0
    $end=$genericArguments.Length
    for ($i=0; $i -lt $genericArguments.Length; $i++)
    {
        if ($genericArguments[$i] -eq '<') { $nested++ }
        elseif ($genericArguments[$i] -eq '>') { $nested-- }
        elseif ($genericArguments[$i] -eq ',' -and $nested -eq 0) { $end=$i; break }
    }
    $typeName=$genericArguments.Substring(0,$end).Trim()
    $requests += [pscustomobject][ordered]@{
        source=$registrationPath; line=([regex]::Matches($text.Substring(0,$match.Index),"`n").Count+1)
        request=$text.Substring($match.Index,$position-$match.Index)
        serviceTypeSyntax=$typeName; conditional=($typeName -ceq 'HotReloadService')
        status='actual source request; not runtime descriptor enumeration'
    }
}
foreach ($typeName in @('IPostConfigureOptions<RazorComponentsServiceOptions>','IHybridCacheSerializer<SerializedRenderFragment>'))
{
    $at=$text.IndexOf("ServiceDescriptor.Singleton<$typeName",[StringComparison]::Ordinal)
    if ($at -lt 0) { throw 'Expected TryAddEnumerable source request missing.' }
    $requests += [pscustomobject][ordered]@{
        source=$registrationPath; line=([regex]::Matches($text.Substring(0,$at),"`n").Count+1)
        request='TryAddEnumerable / ServiceDescriptor.Singleton'; serviceTypeSyntax=$typeName; conditional=$false
        status='actual source request; not runtime descriptor enumeration'
    }
}
$unconditional=@($requests | Where-Object conditional -eq $false)
if ($unconditional.Count -ne 30 -or @($unconditional.serviceTypeSyntax | Sort-Object -Unique).Count -ne 30) { throw 'Unexpected direct named request inventory.' }
Write-FreshJson256 (Join-Path $PSScriptRoot 'direct-registration-requests.json') $requests
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
    $lineNumber=0
    foreach ($line in [System.IO.File]::ReadAllLines((Join-Path $PSScriptRoot (Join-Path 'sources\Default' $relative))))
    {
        $lineNumber++
        if ($line -match 'Fact|public void AddRazor|SingleRegistrationServiceTypes|MultiRegistrationServiceTypes|foreach|Contains|Where|Select|Distinct|BuildServiceProvider|Assert|AddRazorComponents|TryAdd|AddLogging|AddAntiforgery|AddMetrics|AddComponents|AddPersistent|IsMeterFactory|configure !=|MakeGenericType')
        {
            $lineEvidence += [pscustomobject][ordered]@{role='Default';commit=$roles.Default;repositoryPath=$relative;line=$lineNumber;text=$line}
        }
    }
}
Write-FreshJson256 (Join-Path $PSScriptRoot 'source-evidence-lines.json') $lineEvidence
$audit=[ordered]@{
    scope='source byte/provenance and native-source-observation audit only'
    auditObserverPid=$PID; recordedAtUtc=[DateTime]::UtcNow.ToString('O'); scriptSha256=(Get-FileHash -LiteralPath $PSCommandPath).Hash
    validatedSourceBindings=$validated.Count; roleCounts=$roleCounts; roleComparisons=$comparisons
    byteDifferentRolePaths=@($comparisons | Where-Object byteIdentical -eq $false).Count
    directUnconditionalNamedServiceTypeRequests=$unconditional.Count
    directConditionalNamedServiceTypeRequests=@($requests | Where-Object conditional -eq $true).Count
    runtimeDescriptorCountsObserved=$false
    sourceUtilityStartAttempts=$native.Count; actualNativeSourceRoots=$started.Count; failedBeforeNativeStart=$failedStarts.Count
    distinctNativeRootPids=@($started.rootPid | Sort-Object -Unique)
    distinctNativeObserverPids=@($native.observerPid | Sort-Object -Unique)
    distinctObservedChildren=@($started | ForEach-Object { $_.observedChildTerminal } | Select-Object pid,creationDate | Sort-Object pid,creationDate -Unique)
    nativeTerminalSummary=$nativeSummary
    universalDescendantClosureClaimed=$false
    productExecutions=0; sourceCandidateEdits=0; timingsAllocationsProfilersWarmups=0
    priorOfflineAuditFailure='audit-d-tool-return.json; diagnosed Group-Object/OrderedDictionary aggregation; old helper not edited or replayed'
}
Write-FreshJson256 (Join-Path $PSScriptRoot 'input-audit.json') $audit
$audit | Select-Object scope,auditObserverPid,validatedSourceBindings,roleCounts,byteDifferentRolePaths,directUnconditionalNamedServiceTypeRequests,sourceUtilityStartAttempts,actualNativeSourceRoots,failedBeforeNativeStart,distinctNativeRootPids,distinctNativeObserverPids | ConvertTo-Json -Depth 10
