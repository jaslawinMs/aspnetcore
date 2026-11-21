$ErrorActionPreference = 'Stop'
$base = (Get-Location).Path
$parallel = [IO.Directory]::GetParent($base).FullName
$sessionFiles = [IO.Directory]::GetParent($parallel).FullName
$paths = [ordered]@{ policy = (Join-Path $parallel 'policy.json'); registration = (Join-Path $parallel 'template-owner-registration-293.json'); campaign = (Join-Path $sessionFiles 'autoperf-campaign.json') }
$values = @{}
$bindings = @()
foreach ($entry in $paths.GetEnumerator())
{
    $raw = [IO.File]::ReadAllBytes($entry.Value)
    [IO.File]::WriteAllBytes((Join-Path $base ('guard-initial-005.' + $entry.Key + '.raw.json')), $raw)
    $values[$entry.Key] = [Text.Encoding]::UTF8.GetString($raw).TrimStart([char]0xFEFF) | ConvertFrom-Json -Depth 100
    $bindings += [ordered]@{ role = $entry.Key; source = $entry.Value; bytes = $raw.Length; sha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($raw)) }
}
$policy = $values.policy
$registration = $values.registration
if ($registration.actualOwner -cne 'c4be5bf1-94ec-4920-96aa-1829191ac1e6') { throw 'Registration actual task ID mismatch' }
if ($registration.policyAfterSha256 -cne 'C03BA0E19F2586A4432DE6A7A20909EC597710DC87EEF3C5CA5E9493227B3B9D') { throw 'Registration point policy SHA mismatch' }
if ($policy.independentFindingPreparationWorkers.F255 -cne $registration.actualOwner) { throw 'Fresh actual owner mismatch' }
if ($policy.activeWorkerPreparationScopes.F255 -cne $registration.exactScope) { throw 'Fresh exact293 scope mismatch' }
if ($policy.actualWorkerBuildHoldActive -cne $false -or $policy.buildAndTestWorkQuiesced -cne $false) { throw 'HOLD or quiescence is active/unknown' }
$owners = @($policy.independentFindingPreparationWorkers.PSObject.Properties)
if ($owners.Count -gt 4 -or $policy.maximumRegisteredPreparationOwners -ne 4) { throw 'Owner ceiling mismatch' }
$lease = Join-Path $parallel 'benchmark-exclusive.lease.json'
if ([IO.File]::Exists($lease) -or [IO.Directory]::Exists($lease)) { throw 'Benchmark lease present' }
$selected = @($values.campaign.candidates | Where-Object { $_.id -in @('F255', 'F256') })
if ($selected.Count -ne 2) { throw 'Could not establish exactly two outer records' }
$pending = @($selected | ForEach-Object { [ordered]@{ id = $_.id; status = $_.status; disposition = $_.disposition; keys = @($_.PSObject.Properties.Name) } })
$scope = [ordered]@{ actualOwner = $registration.actualOwner; exactScope = $registration.exactScope; policyRegistrationSha256 = $registration.policyAfterSha256; findingIds = @('F255','F256'); maximumRepositoryInputsPerRole = 15; commonInjectedContextsPerRole = 2; maximumInclusiveInputsPerRole = 17; maximumGitGhRoots = 32 }
[IO.File]::WriteAllText((Join-Path $base 'scope-binding-005.json'), ($scope | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
$result = [ordered]@{ observedUtc = [DateTime]::UtcNow.ToString('o'); actualOwner = $registration.actualOwner; exactScopeMatches = $true; registeredOwners = $owners.Count; leaseAbsent = $true; HOLD = $false; quiesced = $false; selected = $pending; bindings = $bindings; sourceRootsStarted = 0 }
$text = $result | ConvertTo-Json -Depth 10
[IO.File]::WriteAllText((Join-Path $base 'guard-initial-005.output.json'), $text, [Text.UTF8Encoding]::new($false))
[Console]::WriteLine($text)