$ErrorActionPreference = 'Stop'
$parent = [IO.Directory]::GetParent((Get-Location).Path).FullName
$sessionFiles = [IO.Directory]::GetParent($parent).FullName
$artifactRoot = Join-Path $sessionFiles 'aspnetcore-autoperf-handoff-20261113-141834\artifacts'
$campaignPath = Join-Path $sessionFiles 'autoperf-campaign.json'
$campaignBytes = [IO.File]::ReadAllBytes($campaignPath)
[IO.File]::WriteAllBytes((Join-Path (Get-Location) 'campaign-guard-initial.raw.json'), $campaignBytes)
$campaign = [Text.Encoding]::UTF8.GetString($campaignBytes) | ConvertFrom-Json -Depth 100
$result = [ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    operation = 'Nonrecursive gateway filename discovery and campaign top-level schema only'
    sessionGatewayNames = @([IO.Directory]::EnumerateFiles($sessionFiles) | ForEach-Object { [IO.Path]::GetFileName($_) } | Where-Object { $_ -match '(?i)gate|benchmark|lease|mutex|campaign' } | Sort-Object)
    artifactGatewayNames = @([IO.Directory]::EnumerateFiles($artifactRoot) | ForEach-Object { [IO.Path]::GetFileName($_) } | Where-Object { $_ -match '(?i)gate|benchmark|lease|mutex|campaign|lock' } | Sort-Object)
    campaignKeys = @($campaign.PSObject.Properties.Name)
    campaignBytes = $campaignBytes.Length
    campaignSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($campaignBytes))
}
$text = $result | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText((Join-Path (Get-Location) 'governance-filenames-004.output.json'), $text, [Text.UTF8Encoding]::new($false))
[Console]::WriteLine($text)