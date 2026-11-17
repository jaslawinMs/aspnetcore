$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F013'
$record = Join-Path $run 'repository-restoration.json'
if (Test-Path $record)
{
    throw 'Preserve the actual repository restoration.'
}
$audit = Get-Content (Join-Path $run 'measurement-audit.json') -Raw | ConvertFrom-Json
$investigation = Get-Content (Join-Path $run 'current-source-investigation.json') -Raw | ConvertFrom-Json
if (-not $audit.actualLiveAuditPassed -or $audit.proposalDisposition -cne 'no-gain' -or
    -not $audit.budgetClosed -or @(git diff --name-only).Count -or @(git diff --cached --name-only).Count -or
    (git branch --show-current).Trim() -cne $investigation.branch -or (git rev-parse HEAD).Trim() -cne $investigation.baseline)
{
    throw 'Only our manually unwound, independently audited no-gain proposal may be restored.'
}
$sources = foreach ($source in $investigation.sources)
{
    $actual = (Get-FileHash $source.file).Hash
    if ($actual -cne $source.workingSha256)
    {
        throw "Source is not the exact original pre-proposal bytes: $($source.file)"
    }
    [ordered]@{ path = $source.file; restoredSha256 = $actual; originalSha256 = $source.workingSha256; exactlyEqual = $true }
}
$old = Get-Content (Join-Path $run 'preparation-attempts\attempt-001\additional-tested-image-capture.json') -Raw | ConvertFrom-Json
$last = Get-Content (Join-Path $run 'tests\owning-comparison\native-specialization-002\actual-test-audit.json') -Raw | ConvertFrom-Json
$plans = foreach ($binary in $old.files)
{
    $name = $binary.name
    $assembly = [IO.Path]::GetFileNameWithoutExtension($name)
    $targets = @("artifacts\bin\$assembly\Release\net12.0\$name")
    if ($assembly -ceq 'Microsoft.AspNetCore.SignalR.Core')
    {
        $targets += "artifacts\bin\Microsoft.AspNetCore.SignalR.Tests\Release\net12.0\$name"
    }
    $source = Join-Path $run "tests\original\test-image\$name"
    if ((Get-FileHash $source).Hash -cne $binary.sha256)
    {
        throw 'Archived original tested bytes differ.'
    }
    $candidate = @($last.binaryHashes | Where-Object name -CEQ $name)
    if ($candidate.Count -ne 1)
    {
        throw 'Exact last-candidate byte identity required.'
    }
    foreach ($target in $targets)
    {
        $before = (Get-FileHash $target).Hash
        if ($before -cne $candidate[0].sha256 -and $before -cne $binary.sha256)
        {
            throw "Unexpected artifact change; do not overwrite another build: $target"
        }
        [pscustomobject]@{
            source = $source; target = $target; name = $name; beforeSha256 = $before
            originalSha256 = $binary.sha256; lastCandidateSha256 = $candidate[0].sha256
            changedByThisRestoration = ($before -cne $binary.sha256)
        }
    }
}
foreach ($plan in $plans)
{
    if ($plan.changedByThisRestoration)
    {
        Copy-Item -LiteralPath $plan.source -Destination $plan.target
    }
    if ((Get-FileHash $plan.target).Hash -cne $plan.originalSha256)
    {
        throw 'Actual restored output bytes differ.'
    }
}
[ordered]@{
    candidate = 'F013'; noGain = $true; branch = $investigation.branch; baseline = $investigation.baseline
    proposalAndNewTestManuallyUnwoundWithApplyPatch = $true; originalSourceBytes = $sources
    originalSourceFilesVerified = @($sources).Count; trackedChangesRemaining = 0
    originalTestedOutputPlans = $plans; actualOutputFilesRestored = @($plans | Where-Object changedByThisRestoration).Count
    outputIdentitiesVerified = @($plans).Count; newBuildOrTestClaimed = $false
    proposalSourcesRetained = @('sources\native-specialization-001', 'sources\native-specialization-002', 'sources\comparison-original')
    qualification = 'Only this experiment''s exact owner/test DLL-PDB replacements and copied test-directory owner pair are restored from the explicit archived original capture. All targets preflighted against last-candidate/original hashes before any copy; unrelated sources/artifacts untouched. Both candidate source trees, the new passing28-row preservation test and every measured image/result remain frozen in F013 evidence.'
    restoredUtc = [DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 10 | Set-Content $record
Write-Output "F013:20 original source files exact, no tracked source changes; $(@($plans | Where-Object changedByThisRestoration).Count) known output files restored/$(@($plans).Count) actual identities verified. Both measured proposals and preservation test retained in evidence."
