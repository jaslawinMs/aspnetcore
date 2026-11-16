$ErrorActionPreference='Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F105'
$path = Join-Path $run 'measurement-budget.json'
$budget = Get-Content $path -Raw | ConvertFrom-Json
if ($budget.closed -or $budget.startedSourceComparisons -ne 0 -or $budget.completedSourceComparisons -ne 0 -or
    $budget.originalProfilesStarted -ne 1 -or $budget.originalProfilesCompleted -ne 1)
{
    throw 'An open,completed original-only profile/zero source comparisons are required.'
}
$execution = Get-Content (Join-Path $run 'execution-original.json') -Raw | ConvertFrom-Json
if ($execution.exitCode -ne 0 -or $execution.expectedCases -ne 24 -or $execution.sourceComparison)
{
    throw 'The actual original pressure profile is incomplete.'
}
$budget.closed=$true
$budget.note='Closed after one original-only24-case public-owner pressure profile. Zero source comparisons/three intentionally unused:changing the shipped public GetEnumerator return to a value type is incompatible. No compatible implementation selected;the measured original pressure is real,not a compatible fix or universal redesign disproof. No modified public-signature binary was built or executed.'
$budget | ConvertTo-Json -Depth 6 | Set-Content $path -Encoding utf8
[ordered]@{
    candidate='F105';disposition='rejected'
    qualification='Measured original enumeration pressure;struct-returning replacement rejected as incompatible. No compatible optimization selected,no gain claimed.'
    publicApiBaselineAndReflectionAgree=$true;publicReturnType='IEnumerator<KeyValuePair<object, ValidationStateEntry>>'
    concreteStructReturnRejected=$true;modifiedShippingBinaryBuilt=$false;modifiedBinaryCompatibilityFailureExecuted=$false
    actualPublicResetConsumerExecutedOnOriginal=$true;formalApiReviewApprovalClaimed=$false
    compatibleImplementationSelected=$false;sourceChanged=$false;sourceComparisons=0
    originalProfiles=1;originalProfileCases=24;maximumSourceComparisons=3;comparisonBudgetClosed=$true
    owningValidationPathUsesLookupInInspectedSource=$true;repositoryWideEnumerationAbsenceOrProductionFrequencyClaimed=$false
    scope='Actual complete public enumeration/factory-created state/public-DI Required-model validation. BDN and precise independent process-wide allocation;no HTTP/model-binding throughput/native/AOT claim.'
    decidedAt=[DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'final-disposition.json') -Encoding utf8
Write-Output 'F105 closed original-only characterization:rejected incompatible public-struct replacement,0/3 source comparisons,no shipping change or optimization claim.'
