$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F100'
$baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
if ((git -C $repo rev-parse HEAD).Trim() -cne $baseline -or @(git -C $repo status --porcelain --untracked-files=no).Count)
{
    throw 'F100 requires the actual independent unchanged baseline.'
}
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
    'src/Components/JSInterop/test/Microsoft.JSInterop.Tests.csproj')
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
            throw "Current default/baseline/working source bytes differ:$path"
        }
        $relative = "producer-source\$($path.Replace('/','\'))"
        $destination = Join-Path $run $relative
        if (Test-Path -LiteralPath $destination)
        {
            if ((Get-FileHash $local).Hash -cne (Get-FileHash $destination).Hash) { throw 'Existing F100 source evidence changed;do not overwrite.' }
        }
        else
        {
            New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
            Copy-Item -LiteralPath $local -Destination $destination
        }
        [ordered]@{path=$path;snapshot=$relative;currentDefaultRevision=$head;currentDefaultGitBlob=$remote.sha;
            baselineGitBlob=$baseBlob;workingGitBlob=$workingBlob;sha256=(Get-FileHash $destination).Hash;
            bytes=(Get-Item $destination).Length;equalityVerified=$true;canonicalRemoteBytesVerified=$true;utf8BomPreserved=$true;
            executableBodyPdbExpected=($path -like '*/src/*.cs' -and $path -notlike '*/IJSVoidResult.cs')}
    }
)
$rows | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'producer-source-copies.json')
$head | Set-Content (Join-Path $run 'current-default-head.txt') -Encoding ascii
[ordered]@{candidate='F100';sourceRevision=$baseline;currentDefaultRevision=$head;verifiedScopedSources=$rows.Count;
    sourceTrackedUnchanged=$true;wholeCurrentDefaultBuildOrRuntimeEquivalenceClaimed=$false;
    tryResetDocumentationUrl='https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtokensource.tryreset?view=net-10.0';
    tryResetDocumentationSha256=(Get-FileHash (Join-Path $run 'public-TryReset-documentation.html')).Hash;
    note='Exact17 current/baseline/working owner,constructor converter/worker,reference,interface/project/test/resolver source blobs and canonical remote bytes verified,BOM preserved. Pure void marker source/type evidence distinct from executable PDB proof;earlier public document/inventory provenance preserved.'} |
    ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run 'current-source-investigation.json')
Write-Output "F100:$($rows.Count) actual current-default/baseline/working source blobs and remote canonical bytes match."
