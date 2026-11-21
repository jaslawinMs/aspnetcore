$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'capture-library-009.ps1')
. (Join-Path $PSScriptRoot 'capture-bodies-012.ps1')
$paths = @(
    '.github/instructions/cross-cutting-guidance.instructions.md'
    '.github/instructions/project-templates.instructions.md'
    'src/ProjectTemplates/AGENTS.md'
    'src/ProjectTemplates/Shared/TemplatePackageInstaller.cs'
    'src/ProjectTemplates/test/Templates.Tests/BaselineTest.cs'
)
Invoke-WholeBodyBatch 'r006-initial-whole-bodies' $paths
