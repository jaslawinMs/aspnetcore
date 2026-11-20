. (Join-Path $PSScriptRoot 'Common.ps1')
Save-Json (Join-Path $Root 'acceptance.json') ([ordered]@{
    finding = 'F137'; card = 'dictionary-containskey-before-indexer'
    scope = 'RuntimeViewCompiler constructor ordered precompiled descriptor insertion, startup/compiler creation rather than per-render insertion.'
    originalPin = $Original; observedLiveDefaultPin = $Default
    acceptance = @(
        'Use separately pinned source/output graphs and no candidate patch.'
        'Execute real registered application-part -> ViewsFeature -> RuntimeViewCompilerProvider -> RuntimeViewCompiler -> CompileAsync producer, including ordered cross-part duplicates, case-insensitive lookup, empty/nonempty and first retained view output.'
        'Distinguish same-part duplicate rejection by production feature provider from cross-part duplicates that reach constructor.'
        'Audit null/invalid/bad descriptor edges from source and existing tests; label direct constructor/extension-provider cases separately from standard producer.'
        'Run meaningful existing tests and parse each result/theory row.'
        'Capture exact loaded owner, PE/PDB association and selected physical-source checksums for both pins, runtime resolution and terminal observed PIDs.'
        'Freeze selected source/projects/probes/commands/raw outcomes and every consumer image file, excluding scratch clone/build/obj graph.'
    )
    forbidden = @('Candidate patch application/build', 'Performance timing/counters', 'Benchmarks', 'Official verdict', 'Ledger/policy/GitHub writes', 'Nested agents')
    exclusions = @('No performance conclusion', 'No claim of complete compiler-input attestation', 'No browser/native IIS requirement for this managed producer')
})
New-Item -ItemType Directory -Path (Join-Path $Root 'scratch') -Force | Out-Null
foreach ($role in @('original','default'))
{
    $checkout = Join-Path $Root "scratch\$role"
    $clone = Run-Native "$role-clone" 'git' @('-c','core.longpaths=true','clone','--shared','--no-checkout',$Repo,$checkout)
    if ($clone.exitCode -ne 0) { throw 'Clone failed' }
    if ($role -eq 'default')
    {
        $fetch = Run-Native 'default-fetch-fresh-pin' 'git' @('-C',$checkout,'fetch','--depth','1','https://github.com/dotnet/aspnetcore.git',$Default)
        if ($fetch.exitCode -ne 0) { throw 'Fresh source fetch failed' }
    }
    $pin = if ($role -eq 'original') { $Original } else { $Default }
    $checkoutResult = Run-Native "$role-checkout" 'git' @('-c','core.longpaths=true','-C',$checkout,'checkout','--detach',$pin)
    if ($checkoutResult.exitCode -ne 0) { throw 'Pinned source checkout failed' }
    New-Item -ItemType Junction -Path (Join-Path $checkout '.dotnet') -Target $SdkRoot | Out-Null
    [void](Run-Native "$role-initial-status" 'git' @('--no-pager','-C',$checkout,'status','--porcelain=v1'))
}
