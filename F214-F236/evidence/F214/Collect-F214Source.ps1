$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Write-Json([string] $Path, $Value)
{
    $Value | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $Path -Encoding utf8
}

$requests = [Collections.Generic.List[object]]::new()
function Save-Source([string] $Url, [string] $RelativePath)
{
    $parent = Split-Path -Parent $RelativePath
    if ($parent -and -not (Test-Path -LiteralPath $parent))
    {
        New-Item -ItemType Directory -Path $parent | Out-Null
    }

    $response = Invoke-WebRequest -Uri $Url -Headers @{ 'User-Agent' = 'F214-readonly-source-investigation' }
    [IO.File]::WriteAllText((Join-Path $PWD $RelativePath), $response.Content, [Text.UTF8Encoding]::new($false))
    $requests.Add([ordered]@{
        url = $Url
        path = $RelativePath
        observedAtUtc = [DateTime]::UtcNow.ToString('O')
        statusCode = [int]$response.StatusCode
        sha256 = (Get-FileHash -LiteralPath $RelativePath -Algorithm SHA256).Hash
    })
    return $response.Content
}

$policyPath = '..\policy.json'
$policy = Get-Content -LiteralPath $policyPath -Raw | ConvertFrom-Json
$registeredOwner = $policy.independentFindingPreparationWorkers.F214
$scope = $policy.activeWorkerPreparationScopes.F214
Write-Json 'initial-authorization-observation.json' ([ordered]@{
    recordedAtUtc = [DateTime]::UtcNow.ToString('O')
    policyPath = (Resolve-Path $policyPath).Path
    policySha256 = (Get-FileHash -LiteralPath $policyPath -Algorithm SHA256).Hash
    registeredOwner = $registeredOwner
    scope = $scope
    actualWorkerBuildHoldActive = $policy.actualWorkerBuildHoldActive
    buildAndTestWorkQuiesced = $policy.buildAndTestWorkQuiesced
    leasePath = (Join-Path (Split-Path $PSScriptRoot) 'benchmark-exclusive.lease.json')
    leasePresent = (Test-Path -LiteralPath '..\benchmark-exclusive.lease.json')
    ownedNativeStarts = 0
    action = 'Read-only source/network and artifact I/O only; no native executable.'
})

$repository = Save-Source 'https://api.github.com/repos/dotnet/aspnetcore' 'upstream\repository.json' | ConvertFrom-Json
$default = Save-Source ("https://api.github.com/repos/dotnet/aspnetcore/commits/" + $repository.default_branch) 'upstream\default-commit.json' | ConvertFrom-Json
$original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$paths = @(
    'src/Shared/Dictionary/AdaptiveCapacityDictionary.cs',
    'src/Shared/Dictionary/DictionaryDebugView.cs',
    'src/Shared/test/Shared.Tests/AdaptiveCapacityDictionaryTests.cs',
    'src/Shared/test/Shared.Tests/Microsoft.AspNetCore.Shared.Tests.csproj',
    'src/Http/Http/src/Features/QueryFeature.cs',
    'src/Http/Http/src/Internal/RequestCookieCollection.cs',
    'src/Http/Http/src/QueryCollectionInternal.cs',
    'src/Http/Http/src/Microsoft.AspNetCore.Http.csproj',
    'global.json'
)
$files = [Collections.Generic.List[object]]::new()
foreach ($role in @('original', 'default'))
{
    $pin = if ($role -eq 'original') { $original } else { $default.sha }
    foreach ($path in $paths)
    {
        $relative = Join-Path (Join-Path 'source' $role) ($path.Replace('/', '\'))
        try
        {
            $null = Save-Source ("https://raw.githubusercontent.com/dotnet/aspnetcore/" + $pin + '/' + $path) $relative
            $files.Add([ordered]@{
                role = $role
                pin = $pin
                repositoryPath = $path.Replace('/', '\')
                artifact = $relative
                sha256 = (Get-FileHash -LiteralPath $relative -Algorithm SHA256).Hash
            })
        }
        catch
        {
            $files.Add([ordered]@{
                role = $role
                pin = $pin
                repositoryPath = $path.Replace('/', '\')
                error = $_.Exception.Message
            })
        }
    }
}

$null = Save-Source ('https://api.github.com/repos/dotnet/aspnetcore/commits?sha=' + $default.sha + '&path=src%2FShared%2FDictionary%2FAdaptiveCapacityDictionary.cs&per_page=20') 'upstream\file-history.json'
$null = Save-Source 'https://api.github.com/search/issues?q=repo%3Adotnet%2Faspnetcore%20%22AdaptiveCapacityDictionary%22%20boxing&per_page=10' 'upstream\related-boxing-issues.json'
$null = Save-Source 'https://api.github.com/search/issues?q=repo%3Adotnet%2Faspnetcore%20%22AdaptiveCapacityDictionary%22&per_page=20' 'upstream\related-dictionary-issues.json'
$null = Save-Source 'https://raw.githubusercontent.com/dotnet/docs/2c76c7edad105d84e0c97be66f807e238fd49f6d/docs/csharp/programming-guide/generics/constraints-on-type-parameters.md' 'documentation\constraints-on-type-parameters.md'
$null = Save-Source 'https://raw.githubusercontent.com/dotnet/docs/156931bb4ec1e81b028c76ea983553f2e9778bdd/docs/csharp/language-reference/builtin-types/nullable-value-types.md' 'documentation\nullable-value-types.md'

$runtimeVersionPath = 'C:\src\aspnetcore\.dotnet\shared\Microsoft.NETCore.App\12.0.0-alpha.1.26557.102\.version'
$runtimeVersion = Get-Content -LiteralPath $runtimeVersionPath
$null = Save-Source ('https://raw.githubusercontent.com/dotnet/runtime/' + $runtimeVersion[0] + '/src/coreclr/jit/importer.cpp') 'runtime-source\importer.cpp'
$null = Save-Source ('https://raw.githubusercontent.com/dotnet/runtime/' + $runtimeVersion[0] + '/src/coreclr/jit/importer.h') 'runtime-source\importer.h'
Write-Json 'runtime-source\identity.json' ([ordered]@{
    observedVersionFile = $runtimeVersionPath
    runtimeCommit = $runtimeVersion[0]
    productVersion = $runtimeVersion[1]
    boundary = 'Installed file identity and upstream source only; not a runtime execution or JIT-code observation.'
})

Write-Json 'source-index.json' ([ordered]@{
    originalPin = $original
    upstreamRepository = $repository.full_name
    observedDefaultBranch = $repository.default_branch
    observedDefaultPin = $default.sha
    observedDefaultCommitDate = $default.commit.committer.date
    files = $files
})
Write-Json 'source-requests.json' $requests
$files | Select-Object role, repositoryPath, sha256, error | Format-Table -AutoSize
Write-Output ("ACTUAL_DEFAULT_PIN=" + $default.sha)
Write-Output 'Source collection completed without starting a native child.'
