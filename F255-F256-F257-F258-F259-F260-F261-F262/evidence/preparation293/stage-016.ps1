$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'capture-library-009.ps1')
. (Join-Path $PSScriptRoot 'capture-bodies-015.ps1')
$paths = @(
    'src/ProjectTemplates/TestInfrastructure/PrepareForTest.targets'
    'src/ProjectTemplates/Web.ProjectTemplates/Microsoft.DotNet.Web.ProjectTemplates.csproj'
    'src/ProjectTemplates/Shared/AssemblyInfo.AssemblyFixtures.cs'
    'docs/CrossCuttingGuidance.md'
)
Invoke-WholeBodyBatch 'r010-final-four-whole-inputs' $paths
