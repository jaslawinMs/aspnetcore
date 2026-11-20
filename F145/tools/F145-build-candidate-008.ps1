param([Parameter(Mandatory)][ValidateSet('original', 'default')][string]$Role)

$ErrorActionPreference = 'Stop'
$session = Split-Path $PSCommandPath -Parent
$root = Join-Path $session 'autoperf-runs\F145'
$plan = Get-Content -LiteralPath (Join-Path $root 'plan.json') -Raw | ConvertFrom-Json
$inputRole = $plan.sourceRoles.$Role
$source = Join-Path $inputRole.checkout $inputRole.sourcePath
$policy = Get-Content -LiteralPath (Join-Path $session 'autoperf-parallelism\policy.json') -Raw | ConvertFrom-Json
if ($policy.actualWorkerBuildHoldActive -or -not $policy.workersMayBuildOrTest -or
    (Test-Path -LiteralPath (Join-Path $session 'autoperf-parallelism\benchmark-exclusive.lease.json')))
{
    throw 'Native build is not permitted during an explicit hold or benchmark lease.'
}
if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash -ne
    (Get-FileHash -LiteralPath (Join-Path $root 'inputs\Startup.candidate.cs') -Algorithm SHA256).Hash)
{
    throw 'The previously selected source changed.'
}
$directories = @('scripts', 'logs', 'inputs', "scratch\$Role", "cli\$Role")
foreach ($directory in $directories)
{
    New-Item -ItemType Directory -Path (Join-Path $root $directory) -Force | Out-Null
}
$capture = Join-Path $root 'scripts\Invoke-Capture.ps1'
if (-not (Test-Path -LiteralPath $capture))
{
    Copy-Item -LiteralPath (Join-Path $session 'autoperf-parallelism\finding-F145-005\executable-preparation-001\scripts\Invoke-Capture.ps1') -Destination $capture
}
Set-Location -LiteralPath $inputRole.checkout
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_CLI_HOME = Join-Path $root "cli\$Role"
$env:TEMP = Join-Path $root "scratch\$Role"
$env:TMP = $env:TEMP
. .\activate.ps1
$dotnet = Join-Path $env:DOTNET_ROOT 'dotnet.exe'
$arguments = @(
    'msbuild', 'src\Servers\IIS\IIS\test\testassets\InProcessWebSite\InProcessWebSite.csproj',
    '-t:Rebuild', '-p:Configuration=Release', '-p:BuildProjectReferences=false',
    '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false',
    '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '-v:minimal', '-nologo',
    "-bl:$(Join-Path $root "logs\candidate-$Role-002.binlog")"
)
& $capture -Label "candidate-$Role-build-002" -WorkingDirectory $inputRole.checkout -FilePath $dotnet -Arguments $arguments -Environment @{
    DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
    DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
    MSBUILDDISABLENODEREUSE = '1'
    DOTNET_CLI_HOME = $env:DOTNET_CLI_HOME
    TEMP = $env:TEMP
    TMP = $env:TMP
}
if ($LASTEXITCODE -ne 0)
{
    throw "Candidate source-owner rebuild failed for $Role; no measurement was started."
}
foreach ($file in @('InProcessWebSite.deps.json', 'InProcessWebSite.runtimeconfig.json'))
{
    $baseline = (Get-FileHash -LiteralPath (Join-Path $inputRole.baselineImage $file) -Algorithm SHA256).Hash
    $built = (Get-FileHash -LiteralPath (Join-Path $inputRole.site $file) -Algorithm SHA256).Hash
    if ($built -ne $baseline)
    {
        throw "Unintended candidate dependency/runtime configuration difference: $Role $file"
    }
}
$candidate = Join-Path $root "images\$Role\candidate"
if (Test-Path -LiteralPath $candidate)
{
    throw 'Refusing to overwrite an existing candidate image.'
}
Copy-Item -LiteralPath $inputRole.baselineImage -Destination $candidate -Recurse
foreach ($file in @('InProcessWebSite.dll', 'InProcessWebSite.pdb'))
{
    Copy-Item -LiteralPath (Join-Path $inputRole.site $file) -Destination (Join-Path $candidate $file)
}
$nativeGitPath = $inputRole.sourcePath.Replace('\', '/')
$unrelatedNow = @(& git --no-pager status --porcelain | Where-Object { $_.Substring(3) -ne $nativeGitPath }) -join "`n"
if ($unrelatedNow.Trim() -ne $inputRole.actualUnrelatedWorkingDiffBefore.Trim())
{
    throw 'The prepared source worktree changed unexpectedly; no measurement admitted.'
}
[ordered]@{
    role = $Role
    actualOwnerRebuilt = $true
    actualNormalProjectCompilerInputsWithoutSubstitution = $true
    selectedSource = $source
    selectedSourceSha256 = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
    actualNoCustomTargetImportOrWarningSuppression = $true
    actualPreparedSourceWorktreeTargetTemporarilyPatched = $true
    actualNoUnrelatedWorkingDiffChanged = $true
    actualCommonHostAndClientCopiedByteExactly = $true
    actualNoCandidateTimingStarted = $true
    candidateImage = $candidate
    candidateOwnerSha256 = (Get-FileHash -LiteralPath (Join-Path $candidate 'InProcessWebSite.dll') -Algorithm SHA256).Hash
    candidatePdbSha256 = (Get-FileHash -LiteralPath (Join-Path $candidate 'InProcessWebSite.pdb') -Algorithm SHA256).Hash
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $root "inputs\candidate-$Role-build.json") -Encoding utf8
