param(
    [Parameter(Mandatory)][string]$SourceRoot,
    [Parameter(Mandatory)][string]$InputDirectory,
    [Parameter(Mandatory)][string]$OriginalAttempt,
    [Parameter(Mandatory)][string]$CandidateAttempt,
    [Parameter(Mandatory)][string]$FreshOutputDirectory,
    [Parameter(Mandatory)][string]$ClosedBudgetFile,
    [string]$PlatformVersion = '12.0.0-alpha.1.26565.104'
)

$ErrorActionPreference = 'Stop'
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
$budgetHash = (Get-FileHash -LiteralPath $ClosedBudgetFile -Algorithm SHA256).Hash
if ((Get-Content -LiteralPath $ClosedBudgetFile -Raw | ConvertFrom-Json).closed -ne $true)
{
    throw 'This reconstruction is untimed and requires the historical timing budget to stay closed.'
}
if (Test-Path -LiteralPath $FreshOutputDirectory)
{
    throw 'Never reuse an earlier reconstruction.'
}
$null = New-Item -ItemType Directory -Path $FreshOutputDirectory
$projectRoot = Join-Path $FreshOutputDirectory 'project'
Copy-Item -LiteralPath (Join-Path $InputDirectory 'measurement') -Destination $projectRoot -Recurse
$commands = [System.Collections.Generic.List[object]]::new()
function Invoke-VerifiedChild([string]$Label, [string[]]$Arguments)
{
    if ($Arguments -ccontains 'measure')
    {
        throw 'Independent reconstruction cannot authorize another measurement.'
    }
    Set-Location -LiteralPath $SourceRoot
    . .\activate.ps1
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = Join-Path $SourceRoot '.dotnet\dotnet.exe'
    $start.WorkingDirectory = $SourceRoot
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    foreach ($argument in $Arguments) { $start.ArgumentList.Add($argument) }
    $process = [Diagnostics.Process]::Start($start)
    $ownedPid = $process.Id
    $stdout = $process.StandardOutput.ReadToEndAsync()
    $stderr = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    $code = $process.ExitCode
    [IO.File]::WriteAllText((Join-Path $FreshOutputDirectory "$Label.stdout.txt"), $stdout.GetAwaiter().GetResult())
    [IO.File]::WriteAllText((Join-Path $FreshOutputDirectory "$Label.stderr.txt"), $stderr.GetAwaiter().GetResult())
    $process.Dispose()
    $commands.Add([ordered]@{ label = $Label; executable = $start.FileName; arguments = $Arguments
        activation = '. .\activate.ps1'; actualOwnedChildPid = $ownedPid; actualChildAwaitedToExit = $true; actualExitCode = $code })
    $commands | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $FreshOutputDirectory 'commands.json')
    Write-Host "$Label exit=$code"
    if ($code -ne 0) { throw "Fresh untimed reconstruction failed at $Label; preserve exact logs." }
}
$properties = @(
    "-p:GeneratedOwnerAssembly=$OriginalAttempt\measurement-consumer\AutoPerf.F142.GeneratedOwner.dll",
    "-p:SourceBuiltAssemblies=$OriginalAttempt\dependencies", "-p:OutputPath=$FreshOutputDirectory\build\",
    "-p:BaseIntermediateOutputPath=$FreshOutputDirectory\obj\", "-p:MSBuildProjectExtensionsPath=$FreshOutputDirectory\obj\",
    '-p:AppendTargetFrameworkToOutputPath=false', '-p:ImportDirectoryBuildProps=false', '-p:ImportDirectoryBuildTargets=false',
    '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false'
)
$project = Join-Path $projectRoot 'AutoPerf.F142.Measurement.csproj'
Invoke-VerifiedChild 'Restore' (@('restore', $project, '--verbosity', 'minimal') + $properties)
Invoke-VerifiedChild 'Build' (@('build', $project, '-c', 'Release', '--no-restore', '--verbosity', 'minimal') + $properties)
$rebuilt = @(Get-ChildItem -LiteralPath (Join-Path $FreshOutputDirectory 'build') -File |
    Where-Object Name -like 'AutoPerf.F142.Measurement.*')
if ($rebuilt.Count -ne 4) { throw 'Expected only the four exact common measurement outputs.' }
$variants = [System.Collections.Generic.List[object]]::new()
foreach ($role in @('Original', 'Candidate'))
{
    $attempt = if ($role -eq 'Original') { $OriginalAttempt } else { $CandidateAttempt }
    $consumer = Join-Path $FreshOutputDirectory "$role-consumer"
    Copy-Item -LiteralPath (Join-Path $attempt 'measurement-consumer') -Destination $consumer -Recurse
    foreach ($file in $rebuilt) { Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $consumer $file.Name) -Force }
    $files = @(Get-ChildItem -LiteralPath $consumer -File -Recurse | Sort-Object FullName | ForEach-Object {
        [ordered]@{ File = [IO.Path]::GetRelativePath($consumer, $_.FullName); Bytes = $_.Length; Sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash }
    })
    $oldFiles = (Get-Content -LiteralPath (Join-Path $attempt 'measurement-consumer-inventory.json') -Raw | ConvertFrom-Json).Files
    if ($files.Count -ne $oldFiles.Count) { throw 'The reconstructed complete consumer file set changed.' }
    foreach ($file in $files | Where-Object { $_.File -notlike 'AutoPerf.F142.Measurement.*' })
    {
        $old = @($oldFiles | Where-Object File -ceq $file.File)
        if ($old.Count -ne 1 -or $old[0].Sha256 -cne $file.Sha256) { throw "A measured non-harness image changed: $($file.File)" }
    }
    $inventory = Join-Path $FreshOutputDirectory "$role-inventory.json"
    [ordered]@{ PlatformVersion = $PlatformVersion; Files = $files } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $inventory
    Invoke-VerifiedChild "$role-Verify" @('exec', '--fx-version', $PlatformVersion, '--roll-forward', 'Disable',
        (Join-Path $consumer 'AutoPerf.F142.Measurement.dll'), 'verify', $role, $inventory,
        (Join-Path $attempt 'observations'), (Join-Path $FreshOutputDirectory "$role-observations"))
    $rows = @(Get-Content -LiteralPath (Join-Path $FreshOutputDirectory "$role-Verify.stdout.txt") | ForEach-Object { $_ | ConvertFrom-Json })
    $before = @(Get-Content -LiteralPath (Join-Path $attempt 'measurement-verify-001.stdout.txt') | ForEach-Object { $_ | ConvertFrom-Json })
    if ($rows.Count -ne 7 -or $before.Count -ne 7) { throw 'All seven exact reconstructed rows must execute.' }
    for ($index = 0; $index -lt 7; $index++)
    {
        if ($rows[$index].profile -cne $before[$index].profile -or $rows[$index].passed -ne $true -or $rows[$index].measured -ne $false -or
            @($rows[$index].samples).Count -ne 0 -or $rows[$index].expectedOperation -cne $before[$index].expectedOperation -or
            $rows[$index].actualGeneratedOwnerSha256 -cne $before[$index].actualGeneratedOwnerSha256)
        {
            throw 'The fresh harness changed an actual producer/operation observation.'
        }
    }
    $variants.Add([ordered]@{ role = $role; actualFreshVerificationRowsPassed = 7; actualMeasuredOwnerAndOtherImagesUnchanged = $true })
}
if ((Get-FileHash -LiteralPath $ClosedBudgetFile -Algorithm SHA256).Hash -cne $budgetHash) { throw 'Historical closed budget changed.' }
[ordered]@{
    actualThreeExactMeasurementInputsCopiedRestoredAndRebuilt = $true
    actualSameFreshCommonHarnessUsedForBothMeasuredOwnerVariants = $true
    actualVariants = @($variants); actualAdditionalMeasurements = 0; actualClosedBudgetBytesUnchanged = $true
    boundary = 'Fresh common harness only; measured source-generated owners/dependency images reused, not fresh owner compilation or turnkey byte-identical fresh-clone reconstruction.'
} | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $FreshOutputDirectory 'verified-reproduction.json')
