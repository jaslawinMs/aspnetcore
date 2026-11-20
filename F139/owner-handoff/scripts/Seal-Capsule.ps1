$ErrorActionPreference = 'Stop'
$capsule = Join-Path $PSScriptRoot 'capsule'
$files = @(Get-ChildItem $capsule -File -Recurse | Where-Object Name -NotIn 'MANIFEST.json', 'MANIFEST.sha256', 'HASHES.sha256' | Sort-Object FullName)
$hashLines = foreach ($file in $files) {
    (Get-FileHash $file.FullName -Algorithm SHA256).Hash + '  ' + [IO.Path]::GetRelativePath($capsule, $file.FullName)
}
[IO.File]::WriteAllLines("$capsule\HASHES.sha256", $hashLines, [Text.UTF8Encoding]::new($false))
$entries = @(Get-ChildItem $capsule -File -Recurse | Where-Object Name -NotIn 'MANIFEST.json', 'MANIFEST.sha256' | Sort-Object FullName | ForEach-Object {
    [ordered]@{ path = [IO.Path]::GetRelativePath($capsule, $_.FullName); bytes = $_.Length; sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash }
})
if ($entries.Count + 2 -gt 250) { throw "Capsule has $($entries.Count + 2) files, exceeding the essential file limit." }
$manifest = [ordered]@{
    finding = 'F139'; officialState = 'PENDING'; unmeasured = $true
    fileCountIncludingSeal = $entries.Count + 2
    files = $entries
}
$manifest | ConvertTo-Json -Depth 20 | Set-Content "$capsule\MANIFEST.json" -Encoding utf8NoBOM
$sha = (Get-FileHash "$capsule\MANIFEST.json" -Algorithm SHA256).Hash
[IO.File]::WriteAllText("$capsule\MANIFEST.sha256", "$sha  MANIFEST.json`n", [Text.UTF8Encoding]::new($false))
$all = @(Get-ChildItem $capsule -Recurse -File)
[ordered]@{ path = $capsule; files = $all.Count; bytes = ($all | Measure-Object Length -Sum).Sum; manifestSha256 = $sha } | ConvertTo-Json
