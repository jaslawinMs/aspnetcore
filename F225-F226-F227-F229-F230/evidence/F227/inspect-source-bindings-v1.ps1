$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot
[Environment]::CurrentDirectory = $PSScriptRoot
$utf8 = [Text.UTF8Encoding]::new($false)
$receiptPath = '.\inspection-source-bindings-v1.json'
if ([IO.File]::Exists($receiptPath)) { throw 'Single-use byte inspector cannot be replayed.' }
$acceptance = [IO.File]::ReadAllText('.\acceptance-v1.json') | ConvertFrom-Json
$par = Split-Path -Parent $PSScriptRoot
$policyBytes = [IO.File]::ReadAllBytes((Join-Path $par 'policy.json'))
$policy = $utf8.GetString($policyBytes) | ConvertFrom-Json
$guard = [ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    ownerId = $policy.independentFindingPreparationWorkers.F227
    ownerCount = @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count
    scope = $policy.activeWorkerPreparationScopes.F227
    hold = $policy.actualWorkerBuildHoldActive
    quiesced = $policy.buildAndTestWorkQuiesced
    leasePath = Join-Path $par 'benchmark-exclusive.lease.json'
    leaseExists = [IO.File]::Exists((Join-Path $par 'benchmark-exclusive.lease.json'))
    policySha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($policyBytes))
}
[IO.File]::WriteAllBytes('.\inspection-source-bindings-v1.policy.json', $policyBytes)
if ($guard.ownerId -cne $acceptance.ownerBackgroundId -or $guard.scope -cne $acceptance.registeredScopeExact -or $guard.ownerCount -gt 4 -or $guard.hold -ne $false -or $guard.quiesced -ne $false -or $guard.leaseExists) { throw 'Fresh exact-scope byte-inspection guard denied.' }
$initial = [IO.File]::ReadAllText('.\collection-source-v1.json') | ConvertFrom-Json
$closure = [IO.File]::ReadAllText('.\collection-contract-history-v1.json') | ConvertFrom-Json
$allCommands = @($initial.commands) + @($closure.commands)
$allSourceBindings = @($initial.files) + @($closure.files) + @($closure.referenceContracts)
$result = [ordered]@{
    processId = $PID
    processIdentity = Get-CimInstance Win32_Process -Filter "ProcessId=$PID" | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
    scriptSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    guard = $guard
    scope = 'Pure retained-byte inspection; no Git/gh child or product/runtime invocation.'
    originalCommit = $initial.originalCommit
    defaultBranch = $initial.defaultBranch
    defaultCommit = $initial.defaultCommit
    runtimeReferenceCommit = $closure.runtimeReferenceCommit
    runtimeReferenceBoundary = $closure.runtimeReferenceBoundary
    commandCount = $allCommands.Count
    commandKinds = @($allCommands | Group-Object executable | ForEach-Object { @{ executable = $_.Name; count = $_.Count } })
    sourceBindings = $allSourceBindings.Count
    rolePairs = $closure.rolePairs
    bounds = $closure.boundsObserved
    sourceFingerprints = @()
    navigationLspBindings = @()
    nativeTerminalSummary = @()
    historySummary = @()
    focusedSourceAnchors = @()
    sourceOnly = $true
    actualOuterToolExit = 'Bind the actual completed tool result after this helper returns; no self-attested future exit.'
}
foreach ($binding in $allSourceBindings)
{
    $bytes = [IO.File]::ReadAllBytes((Join-Path $PSScriptRoot $binding.path))
    $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
    if ($bytes.Length -ne $binding.bytes -or $hash -cne $binding.sha256) { throw "Whole source fingerprint mismatch: $($binding.path)" }
    $result.sourceFingerprints += @{ path = $binding.path; sha256 = $hash; bytes = $bytes.Length; commit = $binding.commit; role = $binding.role }
}
foreach ($record in $allCommands)
{
    if ($record.exitCode -ne 0 -or -not $record.waitForExitReturned -or -not $record.stdoutDrainCompleted -or -not $record.stderrDrainCompleted -or $null -ne $record.failure) { throw "Nonterminal or unsuccessful native receipt: $($record.label)" }
    foreach ($stream in @('stdout', 'stderr'))
    {
        $bytes = [IO.File]::ReadAllBytes((Join-Path $PSScriptRoot $record."${stream}Path"))
        if ($bytes.Length -ne $record."${stream}Bytes" -or [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)) -cne $record."${stream}Sha256") { throw "Native stream binding mismatch: $($record.label) $stream" }
    }
    $result.nativeTerminalSummary += @{ label = $record.label; rootPid = $record.nativeRootPid; rootCimIdentityObserved = ($null -ne $record.nativeRootIdentity); rootWait = $record.waitForExitReturned; exit = $record.exitCode; bothStreamsDrained = ($record.stdoutDrainCompleted -and $record.stderrDrainCompleted); observedDirectChildren = @($record.observedChildren).Count; childTerminalObservations = @($record.observedChildTerminals).Count }
}
foreach ($name in @('observer-source-v1.json', 'observer-contract-history-v1.json'))
{
    $observer = [IO.File]::ReadAllText((Join-Path $PSScriptRoot $name)) | ConvertFrom-Json
    if ($observer.rootExitCode -ne 0 -or -not $observer.rootWaitReturned -or -not $observer.stdoutDrainCompleted -or -not $observer.stderrDrainCompleted -or $observer.observerPid -eq $observer.rootPid) { throw "Collector outside-observer terminal binding is invalid: $name" }
}
foreach ($logical in @(
    'src\Components\WebAssembly\WebAssembly\src\Hosting\WebAssemblyCultureProvider.cs',
    'src\Components\Shared\src\CultureStateProvider.cs'
))
{
    $bytes = [IO.File]::ReadAllBytes((Join-Path 'C:\src\aspnetcore' $logical))
    $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
    $matches = @($allSourceBindings | Where-Object { $_.logicalPath -eq $logical -and $_.sha256 -ceq $hash } | ForEach-Object role)
    $result.navigationLspBindings += @{ logicalPath = $logical; sha256 = $hash; matchingImmutableRoles = $matches; boundary = 'Maps navigation/LSP bytes only; default identity comes from the fresh GitHub metadata/ref observations.' }
}
$defaultHistory = [IO.File]::ReadAllText('.\commands-contract-history-v1\16-default-provider-history-metadata.stdout.bin') | ConvertFrom-Json
$result.historySummary = @($defaultHistory | ForEach-Object { @{ sha = $_.sha; date = $_.commit.committer.date; subject = ($_.commit.message -split "`n")[0] } })
$anchorSpecs = @(
    @{ path = 'source\Original\src\Components\WebAssembly\WebAssembly\src\Hosting\WebAssemblyCultureProvider.cs'; pattern = 'GetCultures|GetCultureHierarchy|Contains\(|Append\(|ToArray\(|CurrentCultureResources|CurrentUICulture|LoadSatelliteAssemblies' },
    @{ path = 'source\Original\src\Components\WebAssembly\WebAssembly\src\Hosting\WebAssemblyHost.cs'; pattern = '_started|RestoreStateAsync|ApplyStoredCulture|LoadCurrentCultureResourcesAsync|StartAsync\(cancellationToken' },
    @{ path = 'source\Original\src\Components\Shared\src\CultureStateProvider.cs'; pattern = 'CaptureCurrentCulture|GetCultureInfo|CultureNotFoundException|ApplyStoredCulture|CurrentCulture =|CurrentUICulture =|DefaultThreadCurrent' },
    @{ path = 'source\Original\src\Components\WebAssembly\WebAssembly\test\Hosting\WebAssemblyCultureProviderTest.cs'; pattern = 'InlineData|GetCultures_Return|new CultureInfo|GetCultures\(' },
    @{ path = 'source\ReferenceContract\dotnet-runtime\src\libraries\System.Private.CoreLib\src\System\Globalization\CultureInfo.cs'; pattern = 'public static CultureInfo CurrentCulture|public static CultureInfo CurrentUICulture|public virtual CultureInfo Parent|public virtual string Name|public CultureInfo\(string name|public override bool Equals' },
    @{ path = 'source\ReferenceContract\dotnet-runtime\src\libraries\System.Private.CoreLib\src\System\String.Comparison.cs'; pattern = 'bool Equals\(string|bool EqualsHelper|bool operator ==' }
)
foreach ($spec in $anchorSpecs)
{
    $lines = [IO.File]::ReadAllLines((Join-Path $PSScriptRoot $spec.path))
    $anchors = @()
    for ($i = 0; $i -lt $lines.Length; $i++)
    {
        if ($lines[$i] -match $spec.pattern) { $anchors += @{ line = $i + 1; text = $lines[$i] } }
    }
    $result.focusedSourceAnchors += @{ path = $spec.path; totalLines = $lines.Length; anchors = $anchors }
}
$result.recordedUtc = [DateTime]::UtcNow.ToString('o')
[IO.File]::WriteAllText($receiptPath, ($result | ConvertTo-Json -Depth 20) + "`n", $utf8)
[ordered]@{
    inspectionPid = $PID; default = $result.defaultCommit; runtimeReference = $result.runtimeReferenceCommit
    sourceBindings = $result.sourceBindings; commandCount = $result.commandCount; commandKinds = $result.commandKinds
    rolePairs = @($result.rolePairs).Count; identicalRolePairs = @($result.rolePairs | Where-Object exactByteIdentical -eq $true).Count
    differentRoleFiles = @($result.rolePairs | Where-Object exactByteIdentical -eq $false | ForEach-Object logicalPath)
    bounds = $result.bounds; navigationLspBindings = $result.navigationLspBindings; sourceAnchors = $result.focusedSourceAnchors
} | ConvertTo-Json -Depth 8
