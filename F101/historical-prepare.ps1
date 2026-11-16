$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
$baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$branch = 'autoperf/F101-js-runtime-property-read-timeouts'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F101'
if (Test-Path -LiteralPath $run) { throw 'F101 run exists;inspect its actual stage instead of overwriting.' }
if ((git -C $repo rev-parse HEAD).Trim() -cne $baseline -or @(git -C $repo status --porcelain --untracked-files=no).Count)
{
    throw 'F101 starts from the actual unchanged baseline;preserve unrelated untracked user reports.'
}
git -C $repo show-ref --verify --quiet "refs/heads/$branch"
if ($LASTEXITCODE -eq 0) { throw 'Independent F101 branch already exists;inspect instead of recreating.' }
if ($LASTEXITCODE -ne 1) { throw 'Independent branch lookup failed.' }
New-Item -ItemType Directory -Path (Join-Path $run 'harness') -Force | Out-Null
git -C $repo switch --create $branch $baseline *> (Join-Path $run 'source-branch-create.log')
if ($LASTEXITCODE) { throw 'F101 independent unchanged branch creation failed.' }
$head = gh api repos/dotnet/aspnetcore/commits/main --jq .sha
if ($LASTEXITCODE) { throw 'Actual current default unavailable.' }
$head = $head.Trim()
$paths = @('src/Components/JSInterop/src/JSRuntimeExtensions.cs','src/Components/JSInterop/src/IJSRuntime.cs',
    'src/Components/JSInterop/src/JSRuntime.cs','src/Components/JSInterop/src/IJSObjectReference.cs',
    'src/Components/JSInterop/src/Implementation/JSObjectReference.cs',
    'src/Components/JSInterop/src/Infrastructure/JSObjectReferenceJsonConverter.cs',
    'src/Components/JSInterop/src/Implementation/JSObjectReferenceJsonWorker.cs',
    'src/Components/JSInterop/src/Infrastructure/PendingAsyncCall.cs',
    'src/Components/JSInterop/src/Infrastructure/JSInvocationInfo.cs','src/Components/JSInterop/src/Infrastructure/DotNetDispatcher.cs',
    'src/Components/JSInterop/src/Infrastructure/IJSVoidResult.cs','src/Components/JSInterop/src/Infrastructure/JSInteropJsonTypeInfoResolver.cs',
    'src/Components/JSInterop/src/Microsoft.JSInterop.csproj','src/Components/JSInterop/test/JSRuntimeExtensionsTest.cs',
    'src/Components/JSInterop/test/JSRuntimeTest.cs','src/Components/JSInterop/test/JSObjectReferenceTest.cs',
    'src/Components/JSInterop/test/Microsoft.JSInterop.Tests.csproj',
    'src/Components/JSInterop/src/Infrastructure/JSCallType.cs','src/Shared/LinkerFlags.cs')
$rows = @(
    foreach ($path in $paths)
    {
        $local = Join-Path $repo $path.Replace('/','\')
        $raw = @(gh api "repos/dotnet/aspnetcore/contents/$($path)?ref=$head")
        if ($LASTEXITCODE) { throw "Actual current source unavailable:$path" }
        $remote = ($raw -join "`n") | ConvertFrom-Json
        $baseBlob = (git -C $repo rev-parse "${baseline}:$path").Trim()
        $workingBlob = (git -C $repo hash-object "--path=$path" $local).Trim()
        $canonical = [Text.Encoding]::UTF8.GetBytes([Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($local)).Replace("`r`n","`n"))
        if ($remote.sha -cne $baseBlob -or $workingBlob -cne $baseBlob -or
            -not [System.Linq.Enumerable]::SequenceEqual([byte[]]$canonical,[Convert]::FromBase64String($remote.content)))
        {
            throw "Current default/baseline/working source bytes differ:$path;do not assume current behavior."
        }
        $relative = "producer-source\$($path.Replace('/','\'))"
        $destination = Join-Path $run $relative
        New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
        Copy-Item -LiteralPath $local -Destination $destination
        [ordered]@{path=$path;snapshot=$relative;currentDefaultRevision=$head;currentDefaultGitBlob=$remote.sha;
            baselineGitBlob=$baseBlob;workingGitBlob=$workingBlob;sha256=(Get-FileHash $destination).Hash;
            bytes=(Get-Item $destination).Length;equalityVerified=$true;canonicalRemoteBytesVerified=$true;utf8BomPreserved=$true;
            executableBodyPdbExpected=($path -like 'src/Components/JSInterop/src/*.cs' -and
                $path -notlike '*/IJSVoidResult.cs' -and $path -notlike '*/JSCallType.cs')}
    }
)
$rows | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'producer-source-copies.json')
$head | Set-Content (Join-Path $run 'current-default-head.txt') -Encoding ascii
$sharedCopies = @(
    foreach ($name in 'public-TryReset-documentation.html','read-only-host-inventory.json')
    {
        $source = Join-Path $PSScriptRoot "autoperf-runs\F100\$name"
        $destination = Join-Path $run $name
        Copy-Item -LiteralPath $source -Destination $destination
        $sha = (Get-FileHash $source).Hash
        if ($sha -cne (Get-FileHash $destination).Hash) { throw 'Preserved earlier public docs/inventory bytes differ.' }
        [ordered]@{original="F100\$name";destination=$name;sha256=$sha;byteIdentical=$true;
            note='Earlier public document/read-only same-box inventory capture retained,not relabeled as freshly captured.'}
    }
)
$sharedCopies | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run 'earlier-document-inventory-copies.json')
git -C $repo --no-pager log --follow --format='%H %aI %s' -- src/Components/JSInterop/src/JSRuntimeExtensions.cs > (Join-Path $run 'property-read-history.txt')
if ($LASTEXITCODE) { throw 'Actual property owner history failed.' }
git -C $repo --no-pager log --follow --name-status --max-count=12 -- src/Components/JSInterop/src/JSRuntimeExtensions.cs > (Join-Path $run 'property-owner-relocated-path-history.txt')
if ($LASTEXITCODE) { throw 'Actual relocated path history failed.' }
foreach ($entry in @(
    @('8ddf53d847a8ce1cb0e0787f465ad1aa3ce3ecf1','2025-original-new-interop-api.diff'),
    @('01c00d2beab16e3455de430043a616e5e28682d3','2025-property-timeout-overload-introduction.diff')
))
{
    git -C $repo --no-pager show --format=fuller $entry[0] -- src/JSInterop/Microsoft.JSInterop/src/JSRuntimeExtensions.cs > (Join-Path $run $entry[1])
    if ($LASTEXITCODE) { throw 'Actual historical owner diff failed.' }
}
gh api repos/dotnet/aspnetcore/issues/62454 > (Join-Path $run 'original-interop-api-proposal.json')
if ($LASTEXITCODE) { throw 'Actual original approved proposal unavailable.' }
$query = 'repo:dotnet/aspnetcore GetValueAsync timeout'
gh api --method GET search/issues -f "q=$query" -f per_page=30 > (Join-Path $run 'bounded-existing-work-query.json')
if ($LASTEXITCODE) { throw 'Actual bounded property/timeout existing-work query failed.' }
[ordered]@{query=$query;perPage=30;capturedAt=[DateTimeOffset]::UtcNow.ToString('o');
    note='Bounded current body/title issue/PR query,not exhaustive related-work absence proof.'} |
    ConvertTo-Json | Set-Content (Join-Path $run 'existing-work-query-receipt.json')
gh pr view 70045 --repo dotnet/aspnetcore --json number,title,body,state,headRefOid,files,url > (Join-Path $run 'existing-abortlink-pr.json')
if ($LASTEXITCODE) { throw 'Actual related active AbortLink proposal unavailable.' }
[ordered]@{candidate='F101';sourceRevision=$baseline;branch=$branch;currentDefaultRevision=$head;
    verifiedScopedSources=$rows.Count;sourceTrackedUnchanged=$true;wholeCurrentDefaultBuildOrRuntimeEquivalenceClaimed=$false;
    tryResetDocumentationUrl='https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtokensource.tryreset?view=net-10.0';
    tryResetDocumentationSha256=(Get-FileHash (Join-Path $run 'public-TryReset-documentation.html')).Hash;
    excludedPropertyArgumentSerialization=$true;
    note='Actual19 source/Git/canonical remote-byte identities verified,BOM preserved. Timed GetValue has no input args;actual property/default/pending/token/transport/reply boundaries remain to be reproduced. No shipping change or API approval claim.'} |
    ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run 'current-source-investigation.json')
& (Join-Path $PSScriptRoot 'autoperf-campaign.ps1') -Action Update -Id F101 -Status investigating -Branch $branch `
    -Note 'Fresh19 current-default/baseline/working source/Git/canonical-byte identities,actual relocated owner history/original API proposal/bounded current existing-work query captured. Acceptance defined before harness implementation;actual GetValue/Default/root0/[] typed731 and separate reference-property scope control. No input/value serialization in Get;test-host pre-return transport gate explicitly bounded. No shipping edits;original deadline/generic token compatibility require new actual probes.' > (Join-Path $PSScriptRoot 'F101-investigating.json')
Write-Output "F101 independent branch:$branch;actual current$head/baseline/working19 source identities verified;history/docs/related-work captured,no shipping or benchmark execution."
