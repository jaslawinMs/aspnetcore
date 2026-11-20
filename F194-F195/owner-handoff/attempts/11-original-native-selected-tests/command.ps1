$ErrorActionPreference = 'Stop'
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = '1'
$env:DOTNET_NOLOGO = '1'
Set-Location -LiteralPath 'C:\src\ap-F194-o042'
. .\activate.ps1
$env:DOTNET_CLI_HOME = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F194-F195-042\cli-home'
$env:F194_IDENTITY_ROOT = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F194-F195-042\native\original\identity'
$env:DOTNET_STARTUP_HOOKS = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F194-F195-042\consumer\bin\Release\net12.0\F194ContractConsumer.dll'
dotnet test .\src\FileProviders\Embedded\test\Microsoft.Extensions.FileProviders.Embedded.Tests.csproj --no-build --no-restore -f net12.0 -c Release --filter 'FullyQualifiedName=Microsoft.Extensions.FileProviders.Embedded.Manifest.ManifestParserTests.Parse_UsesDefaultManifestNameForManifest|FullyQualifiedName=Microsoft.Extensions.FileProviders.Embedded.Manifest.ManifestParserTests.Parse_FindsManifestWithCustomName|FullyQualifiedName=Microsoft.Extensions.FileProviders.Embedded.Manifest.ManifestParserTests.Parse_ThrowsForEntriesWithDifferentCasing|FullyQualifiedName=Microsoft.Extensions.FileProviders.ManifestEmbeddedFileProviderTests.GetFileInfo_CanResolveSimpleFiles|FullyQualifiedName=Microsoft.Extensions.FileProviders.ManifestEmbeddedFileProviderTests.GetFileInfo_CanResolveFilesInsideAFolder|FullyQualifiedName=Microsoft.Extensions.FileProviders.ManifestEmbeddedFileProviderTests.GetFileInfo_ResolvesFiles_WithDifferentCasing|FullyQualifiedName=Microsoft.Extensions.FileProviders.ManifestEmbeddedFileProviderTests.GetDirectoryContents_CanEnumerateExistingFolders|FullyQualifiedName=Microsoft.Extensions.FileProviders.ManifestEmbeddedFileProviderTests.GetDirectoryContents_EnumeratesOnlyAGivenLevel|FullyQualifiedName=Microsoft.Extensions.FileProviders.ManifestEmbeddedFileProviderTests.GetDirectoryContents_EnumeratesFilesAndDirectoriesOnAGivenPath|FullyQualifiedName=Microsoft.Extensions.FileProviders.ManifestEmbeddedFileProviderTests.GetDirectoryContents_ReturnsDirectoryInfoThatImplementsIDirectoryContents_ForDirectory' --logger 'trx;LogFileName=selected.trx' --logger 'console;verbosity=detailed' --results-directory 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F194-F195-042\native\original\results' -m:1 -nr:false
exit $LASTEXITCODE
