$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'capture-library-009.ps1')
. (Join-Path $PSScriptRoot 'capture-bodies-012.ps1')
$paths = @(
    'src/ProjectTemplates/README.md'
    'src/ProjectTemplates/README-BASELINES.md'
    'src/ProjectTemplates/Shared/ProjectFactoryFixture.cs'
    'src/ProjectTemplates/Shared/Project.cs'
    'src/ProjectTemplates/test/Templates.Tests/template-baselines.json'
    'src/ProjectTemplates/test/Templates.Tests/Templates.Tests.csproj'
)
Invoke-WholeBodyBatch 'r007-producers-baselines-docs' $paths
