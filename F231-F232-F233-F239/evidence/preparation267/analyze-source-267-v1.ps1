$ErrorActionPreference = 'Stop'
$out = $PSScriptRoot
$par = Split-Path -Parent $out
$observerProcess = Get-Process -Id $PID
$observer = [ordered]@{ pid = $PID; startUtc = $observerProcess.StartTime.ToUniversalTime().ToString('o'); creationFileTimeUtc = $observerProcess.StartTime.ToFileTimeUtc(); processPath = $observerProcess.Path }

function Assert-True([bool]$Condition, [string]$Message)
{
    if (-not $Condition)
    {
        throw $Message
    }
}

function Write-NewJson([string]$Name, $Value)
{
    $path = Join-Path $out $Name
    Assert-True (-not (Test-Path -LiteralPath $path)) "Output already exists: $Name"
    [IO.File]::WriteAllText($path, (($Value | ConvertTo-Json -Depth 70) + "`n"), [Text.UTF8Encoding]::new($false))
}

function Hash256([byte[]]$Data)
{
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($Data))
}

try
{
    $policyBytes = [IO.File]::ReadAllBytes((Join-Path $par 'policy.json'))
    $policy = [Text.Encoding]::UTF8.GetString($policyBytes) | ConvertFrom-Json
    $initial = Get-Content -LiteralPath (Join-Path $out 'initial-guard-267.json') -Raw | ConvertFrom-Json
    Assert-True ($initial.ownerId -ceq 'ed471f5e-c998-47a0-a617-4b6bcd83121b') 'Unexpected initial owner'
    Assert-True ($policy.independentFindingPreparationWorkers.F231 -ceq $initial.ownerId) 'Actual owner registration changed'
    Assert-True ($policy.activeWorkerPreparationScopes.F231 -ceq $initial.scope) 'Exact 267 scope changed'
    Assert-True ($policy.actualWorkerBuildHoldActive -ceq $false -and $policy.buildAndTestWorkQuiesced -ceq $false) 'HOLD or quiescence active'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $par 'benchmark-exclusive.lease.json'))) 'Exclusive lease present'
    Assert-True (@($policy.independentFindingPreparationWorkers.PSObject.Properties).Count -le 4) 'Owner budget exceeded'
    [IO.File]::WriteAllBytes((Join-Path $out 'analysis-policy-267.json'), $policyBytes)
    Write-NewJson 'analysis-guard-267.json' ([ordered]@{
        observedAt = [DateTime]::UtcNow.ToString('o')
        ownerId = $initial.ownerId
        exactScopeMatched = $true
        policySha256 = Hash256 $policyBytes
        leaseAbsentAtObservation = $true
        actualWorkerBuildHoldActive = $false
        buildAndTestWorkQuiesced = $false
        observer = $observer
        pointOnly = $true
        sourceUtility = 'Data-only parsing and hashing of already bound source bytes; no product execution'
    })
    $discovery = Get-Content -LiteralPath (Join-Path $out 'discovery-267.json') -Raw | ConvertFrom-Json
    $branchRecheck = Get-Content -LiteralPath (Join-Path $out 'roots\21-qualification-upstream-default-branch-recheck.stdout.bin') -Raw | ConvertFrom-Json
    $commitRecheck = Get-Content -LiteralPath (Join-Path $out 'roots\22-qualification-upstream-default-commit-recheck.stdout.bin') -Raw | ConvertFrom-Json
    Assert-True ($branchRecheck.full_name -ceq 'dotnet/aspnetcore' -and $branchRecheck.default_branch -ceq $discovery.freshUpstream.defaultBranch) 'Default branch changed before qualification'
    Assert-True ($commitRecheck.ref -ceq ('refs/heads/' + $branchRecheck.default_branch) -and $commitRecheck.object.sha -ceq $discovery.Default -and $commitRecheck.object.type -ceq 'commit') 'Default commit changed before qualification'
    $allBindings = @()
    foreach ($bindingFile in (Get-ChildItem -LiteralPath $out -Filter 'bindings-*.json' -File | Sort-Object Name))
    {
        $document = Get-Content -LiteralPath $bindingFile.FullName -Raw | ConvertFrom-Json
        Assert-True ($document.commit -ceq $discovery.($document.role)) 'Role commit mismatch'
        $files = @($document.files)
        Assert-True ($files.Count -gt 0) 'Empty source binding document'
        $rawPath = Join-Path $out $files[0].rawStdout.path
        [byte[]]$raw = [IO.File]::ReadAllBytes($rawPath)
        Assert-True ((Hash256 $raw) -ceq $files[0].rawStdout.sha256 -and $raw.Length -eq $files[0].rawStdout.bytes) 'Raw stdout changed'
        $stdinPath = $rawPath.Replace('.stdout.bin', '.stdin.bin')
        $expectedStdin = [Text.Encoding]::UTF8.GetBytes(((@($files | ForEach-Object { $_.commitPathExpression })) -join "`n") + "`n")
        Assert-True ((Hash256 ([IO.File]::ReadAllBytes($stdinPath))) -ceq (Hash256 $expectedStdin)) 'Exact commit:path request order mismatch'
        $cursor = 0
        foreach ($binding in $files)
        {
            Assert-True ($binding.wholeBlob -ceq $true -and $binding.objectType -ceq 'blob' -and $binding.binaryFramingValidated -ceq $true) 'Non-whole/non-blob source binding'
            Assert-True ($binding.commitPathExpression -ceq ($binding.commit + ':' + $binding.repositoryPath)) 'Invalid commit:path expression'
            Assert-True ($binding.commit -ceq $document.commit -and $binding.role -ceq $document.role) 'Binding role mismatch'
            Assert-True ($binding.rawHeaderOffset -eq $cursor) 'Batch header is not contiguous'
            $newline = [Array]::IndexOf($raw, [byte]10, $cursor)
            Assert-True ($newline -ge $cursor) 'Missing raw header newline'
            $header = [Text.Encoding]::ASCII.GetString($raw, $cursor, $newline - $cursor)
            Assert-True ($header -ceq "$($binding.blobSha1) blob $($binding.bytes)" -and $header -ceq $binding.rawHeaderAscii) 'Raw blob type/size/header mismatch'
            $payloadStart = $newline + 1
            $payloadEnd = $payloadStart + $binding.bytes
            Assert-True ($payloadStart -eq $binding.rawPayloadOffset -and $payloadEnd -eq $binding.rawPayloadEndExclusive -and $payloadEnd -lt $raw.Length -and $raw[$payloadEnd] -eq 10) 'Binary framing mismatch'
            $payload = [byte[]]::new($binding.bytes)
            [Array]::Copy($raw, $payloadStart, $payload, 0, $binding.bytes)
            $gitHeader = [Text.Encoding]::ASCII.GetBytes("blob $($payload.Length)`0")
            $gitObject = [byte[]]::new($gitHeader.Length + $payload.Length)
            [Array]::Copy($gitHeader, 0, $gitObject, 0, $gitHeader.Length)
            [Array]::Copy($payload, 0, $gitObject, $gitHeader.Length, $payload.Length)
            $actualBlobSha1 = [Convert]::ToHexString([Security.Cryptography.SHA1]::HashData($gitObject)).ToLowerInvariant()
            $sourcePath = Join-Path $out $binding.sourceFile
            $sourceBytes = [IO.File]::ReadAllBytes($sourcePath)
            Assert-True ($actualBlobSha1 -ceq $binding.blobSha1 -and $actualBlobSha1 -ceq $binding.calculatedGitBlobSha1) 'Whole Git blob SHA-1 mismatch'
            Assert-True ((Hash256 $payload) -ceq $binding.sha256 -and (Hash256 $sourceBytes) -ceq $binding.sha256 -and $sourceBytes.Length -eq $binding.bytes) 'Whole source SHA-256/size mismatch'
            $allBindings += $binding
            $cursor = $payloadEnd + 1
        }
        Assert-True ($cursor -eq $raw.Length -and $document.allRawStdoutBytesConsumed -ceq $true) 'Unconsumed raw batch stdout'
    }
    $roleSummaries = @()
    foreach ($role in @('Original', 'Default'))
    {
        $roleFiles = @($allBindings | Where-Object role -CEQ $role)
        $logicalPaths = @($roleFiles.repositoryPath | Sort-Object -Unique)
        Assert-True ($roleFiles.Count -eq 13 -and $logicalPaths.Count -eq 13 -and $logicalPaths.Count -le 15) "Whole logical source file budget/multiplicity mismatch for $role"
        $roleSummaries += [ordered]@{ role = $role; commit = $discovery.$role; wholeLogicalFiles = $logicalPaths.Count; paths = $logicalPaths; wholePayloadBytes = ($roleFiles.bytes | Measure-Object -Sum).Sum }
    }
    $pairComparisons = @()
    foreach ($path in @($allBindings.repositoryPath | Sort-Object -Unique))
    {
        $originalBinding = @($allBindings | Where-Object { $_.role -ceq 'Original' -and $_.repositoryPath -ceq $path })[0]
        $defaultBinding = @($allBindings | Where-Object { $_.role -ceq 'Default' -and $_.repositoryPath -ceq $path })[0]
        $pairComparisons += [ordered]@{
            repositoryPath = $path
            exactWholeBytesIdenticalBySha1AndSha256 = $originalBinding.blobSha1 -ceq $defaultBinding.blobSha1 -and $originalBinding.sha256 -ceq $defaultBinding.sha256
            Original = [ordered]@{ bytes = $originalBinding.bytes; blobSha1 = $originalBinding.blobSha1; sha256 = $originalBinding.sha256 }
            Default = [ordered]@{ bytes = $defaultBinding.bytes; blobSha1 = $defaultBinding.blobSha1; sha256 = $defaultBinding.sha256 }
        }
    }
    Write-NewJson 'WHOLE-ROLE-BINDINGS-267.json' ([ordered]@{
        ownerId = $initial.ownerId
        scope = '267 SOURCE ONLY'
        roles = $roleSummaries
        files = $allBindings
        pairComparisons = $pairComparisons
        totalWholeSourceBindings = $allBindings.Count
        rawGitBatchRequestsHeadersTypesSizesWholePayloadsSha1Sha256AndFramingRevalidated = $true
        noArchiveOrTextNormalizedSource = $true
        defaultRecheckConfirmedSameBranchAndCommit = $true
    })
    $targetPath = 'src/Identity/test/Identity.Test/UserClaimsPrincipalFactoryTest.cs'
    $target = [Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes((Join-Path $out ('sources\Original\' + $targetPath.Replace('/', '\')))))
    $targetLines = $target -split "`n"
    $rowMatches = [regex]::Matches($target, '\[InlineData\((true|false), (true|false), (true|false), (true|false)\)\]')
    Assert-True ($rowMatches.Count -eq 12) 'Unexpected real theory row count'
    $claimArrays = [ordered]@{}
    foreach ($arrayName in @('userClaims', 'adminClaims', 'localClaims'))
    {
        $initializer = [regex]::Match($target, ('var ' + $arrayName + ' = new\[\] \{(?<body>[^;]+)\};'))
        Assert-True $initializer.Success "Missing literal claim fixture $arrayName"
        $literalClaims = [regex]::Matches($initializer.Groups['body'].Value, 'new Claim\("(?<type>[^"]+)", "(?<value>[^"]+)"\)')
        Assert-True ($literalClaims.Count -eq 2) "Unexpected literal cardinality $arrayName"
        $claimArrays[$arrayName] = @($literalClaims | ForEach-Object { [ordered]@{ type = $_.Groups['type'].Value; value = $_.Groups['value'].Value } })
    }
    $roleInitializer = [regex]::Match($target, 'var roleClaims = new\[\] \{ "Admin", "Local" \};')
    Assert-True $roleInitializer.Success 'Unexpected real role-name fixture'
    Assert-True ([regex]::Matches($target, 'await factory\.CreateAsync\(user\)').Count -eq 1) 'Unexpected factory invocation count in source'
    $helperText = [Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes((Join-Path $out 'sources\Original\src\Identity\test\Shared\MockHelpers.cs')))
    Assert-True ($helperText.Contains('var store = new Mock<IUserStore<TUser>>();') -and -not $helperText.Contains('CallBase')) 'Mock fixture assumptions changed'
    Assert-True (-not $target.Contains('Setup(m => m.SupportsUserSecurityStamp)')) 'Security-stamp fixture assumption changed'
    $rows = @()
    $rowNumber = 0
    foreach ($match in $rowMatches)
    {
        $rowNumber++
        $supportRoles = [bool]::Parse($match.Groups[1].Value)
        $supportClaims = [bool]::Parse($match.Groups[2].Value)
        $supportRoleClaims = [bool]::Parse($match.Groups[3].Value)
        $supportsUserEmail = [bool]::Parse($match.Groups[4].Value)
        Assert-True (-not $supportRoleClaims -or $supportRoles) 'Unmodeled role-claim support combination'
        $claimAdditions = 2
        if ($supportsUserEmail) { $claimAdditions++ }
        if ($supportClaims) { $claimAdditions += 2 }
        if ($supportRoles)
        {
            $claimAdditions += 2
            if ($supportRoleClaims) { $claimAdditions += 4 }
        }
        $rows += [ordered]@{
            row = $rowNumber
            supportRoles = $supportRoles
            supportClaims = $supportClaims
            supportRoleClaims = $supportRoleClaims
            supportsUserEmail = $supportsUserEmail
            declaredClaimAdditionCountUnderDocumentedFixtureAssumptions = $claimAdditions
            expectedArrayElementsPerRetainedLoop = 2
            membershipCallsPerRetainedLoopIfPriorAssertionsComplete = 2
            fullScanPredicateVisitUpperBoundPerRetainedLoop = 2 * $claimAdditions
            F231ExpectedMembership = $supportClaims
            F232ExpectedMembership = $supportRoleClaims
            F233ExpectedMembership = $supportRoleClaims
        }
    }
    $anchors = @()
    for ($i = 0; $i -lt $targetLines.Count; $i++)
    {
        if ($targetLines[$i] -match 'InlineData|EnsureClaimsIdentityHasExpectedClaims|var (roleClaims|userClaims|adminClaims|localClaims)|ReturnsAsync|factory.CreateAsync|identity.Claims.ToList|foreach \(var cl|Assert.Equal\(support|VerifyAll|CreateIdentityNullChecks|Throws')
        {
            $anchors += [ordered]@{ repositoryPath = $targetPath; line = $i + 1; text = $targetLines[$i].TrimEnd("`r") }
        }
    }
    $perFinding = @()
    foreach ($id in @('F231', 'F232', 'F233'))
    {
        $positiveRows = if ($id -ceq 'F231') { @($rows | Where-Object supportClaims -EQ $true).Count } else { @($rows | Where-Object supportRoleClaims -EQ $true).Count }
        $perFinding += [ordered]@{
            id = $id
            sourceDecision = 'bounded-source-only-no-material-candidate'
            sourcePatternRetained = $true
            wholeDeclaredTheoryRows = 12
            expectedItemsPerRow = 2
            declaredMembershipChecksPerSingleFullMatrixIfPriorAssertionsComplete = 24
            positiveMembershipRows = $positiveRows
            negativeMembershipRows = 12 - $positiveRows
            summedFullScanPredicateVisitUpperBoundAcrossSingleDeclaredMatrix = ($rows.fullScanPredicateVisitUpperBoundPerRetainedLoop | Measure-Object -Sum).Sum
            actualExecutedChecksObserved = $false
            actualPredicateVisitsObserved = $false
            materialCostObserved = $false
            benchmarkResult = $null
            candidateAuthored = $false
            canonicalStatusMustRemain = 'pending'
            notDuplicateOfOtherIds = $true
        }
    }
    Write-NewJson 'STATIC-SOURCE-ANALYSIS-267.json' ([ordered]@{
        method = 'Static parsing of literal existing fixture inputs plus arithmetic over real factory AddClaim/AddClaims branches. No Claims/Contains/Any workload or product code was executed.'
        wholeRoleBindings = 'WHOLE-ROLE-BINDINGS-267.json'
        targetPath = $targetPath
        targetBlobSha1 = 'e6ec5f79f5355005a74fdaad69acb697f1d04792'
        claimArrays = $claimArrays
        roleNames = @('Admin', 'Local')
        theoryRows = $rows
        fixtureAssumptionsAndLimits = @(
            'The existing fixture instantiates the real UserClaimsPrincipalFactory<PocoUser,PocoRole>; UserManager and RoleManager retrievals are explicitly mocked, not a backing-store/HTTP/app workload.',
            'Unconfigured virtual bool SupportsUserSecurityStamp on the ordinary Moq manager is false under the standard mock default contract. No CallBase or stamp setup appears in the bound helper/target. The underlying helper store is only IUserStore, whose base manager stamp-capability getter is also false.',
            'Count formula: 2 ID/name claims + E email + 2*C user claims + R*(2 role-name claims + 4*RC role claims). All fixture rows with RC=true also have R=true.',
            'Source-derived declared claim additions range from 2 through 11, not runtime-observed list counts. ClaimsIdentity/Claim/Moq/LINQ/xUnit implementation/runtime behavior was not executed or independently source-qualified.',
            'Each retained loop has two expected claims. Counts assume the producer and every preceding assertion complete; failure may stop later loops and VerifyAll.',
            'Full-scan visit bounds are arithmetic bounds, not observed comparisons, latency, allocation, savings, measurement or a performance result. Any can stop on the first match.',
            'The twelve declared rows are not all sixteen Boolean combinations. In particular there are no supportRoles=false/supportRoleClaims=true rows.',
            'No source-local repetition surrounds factory.CreateAsync(user), the ToList, or the three loops. CI reruns, assembly selection, test-runner discovery and aggregate suite frequency were not observed.'
        )
        perFinding = $perFinding
        sourceLineAnchors = $anchors
        noProductExecution = $true
        noRuntimeBehavioralCompilationOrPerformancePassClaimed = $true
        observer = $observer
    })
    Write-NewJson 'analysis-source-267-terminal.json' ([ordered]@{
        observedAt = [DateTime]::UtcNow.ToString('o')
        observer = $observer
        dataOnlyActionCompleted = $true
        roleWholeFileCounts = @($roleSummaries | ForEach-Object { [ordered]@{ role = $_.role; files = $_.wholeLogicalFiles } })
        outerToolReturnNotYetObserved = $true
    })
    Write-Output "ANALYSIS267 wholeBindings=$($allBindings.Count) filesPerRole=13 declaredRows=$($rows.Count) decisions=F231,F232,F233 noProductExecution=True"
    $rows | ForEach-Object { Write-Output "ROW267 row=$($_.row) R=$($_.supportRoles) C=$($_.supportClaims) RC=$($_.supportRoleClaims) E=$($_.supportsUserEmail) declaredAdditions=$($_.declaredClaimAdditionCountUnderDocumentedFixtureAssumptions)" }
    $anchors | ForEach-Object { Write-Output "ANCHOR267 $($_.line):$($_.text)" }
}
catch
{
    Write-NewJson 'failure-analysis-source-267-v1.json' ([ordered]@{
        observedAt = [DateTime]::UtcNow.ToString('o')
        observer = $observer
        exception = $_.Exception.ToString()
        scriptStackTrace = $_.ScriptStackTrace
        failureRethrown = $true
        noSuccessSubstitution = $true
    })
    throw
}
