$ErrorActionPreference = 'Stop'
$scope = $PSScriptRoot
$common = Join-Path $scope 'consumer\bin\Debug\net12.0'
$preserved = Join-Path $scope 'failed-attempts\unsupported-language-context'
New-Item -ItemType Directory -Force $preserved | Out-Null
$changes = @()
foreach ($name in @('F139.PortableContext', 'F139.NoPdbContext')) {
    $file = Join-Path $common "$name.deps.json"
    $before = (Get-FileHash $file -Algorithm SHA256).Hash
    Copy-Item $file -Destination $preserved
    $json = Get-Content $file -Raw | ConvertFrom-Json
    $oldLanguage = $json.compilationOptions.languageVersion
    $debugType = $json.compilationOptions.debugType
    $json.compilationOptions.languageVersion = '8.0'
    $json | ConvertTo-Json -Depth 100 | Set-Content $file -Encoding utf8NoBOM
    $changes += [ordered]@{
        name = $name
        beforeSha256 = $before
        afterSha256 = (Get-FileHash $file -Algorithm SHA256).Hash
        beforeRuntimeCompilationLanguage = $oldLanguage
        configuredRuntimeCompilationLanguage = '8.0'
        unchangedDebugType = $debugType
        reason = 'The actual package dependency is Roslyn 4.0.0, whose LanguageVersionFacts cannot parse C# 13. Configure the throwaway application dependency-context language explicitly to C# 8, the owning compiler fallback; do not suppress Debug assertions, override compiler internals, change dependency defaults, or recompile the C# 13 verifier/fixtures.'
        compilerExecutedAgain = $false
    }
}
$changes | ConvertTo-Json -Depth 8 | Set-Content "$scope\fixture-context-configuration.json" -Encoding utf8
$closure = foreach ($file in Get-ChildItem $common -File | Sort-Object Name) {
    [ordered]@{ name = $file.Name; bytes = $file.Length; sha256 = (Get-FileHash $file.FullName -Algorithm SHA256).Hash }
}
$closure | ConvertTo-Json -Depth 6 | Set-Content "$scope\common-closure.json" -Encoding utf8
