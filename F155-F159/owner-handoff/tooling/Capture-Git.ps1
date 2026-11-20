$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$paths = @(
    'global.json',
    'Directory.Build.props',
    'Directory.Build.targets',
    'eng/Versions.props',
    'eng/Version.Details.props',
    'eng/Common.props',
    'eng/targets/ResolveReferences.targets',
    'eng/tools/GenerateFiles/GenerateFiles.csproj',
    'src/Mvc/Mvc.Formatters.Xml/test/ValidationProblemDetailsWrapperTest.cs',
    'src/Mvc/Mvc.Formatters.Xml/test/Microsoft.AspNetCore.Mvc.Formatters.Xml.Test.csproj',
    'src/Mvc/Mvc.Formatters.Xml/src/ValidationProblemDetailsWrapper.cs',
    'src/Mvc/Mvc.Formatters.Xml/src/ProblemDetailsWrapper.cs',
    'src/Mvc/Mvc.Formatters.Xml/src/Microsoft.AspNetCore.Mvc.Formatters.Xml.csproj',
    'src/Mvc/Mvc.Core/src/ValidationProblemDetails.cs',
    'src/Mvc/shared/Mvc.Core.TestCommon/Microsoft.AspNetCore.Mvc.Core.TestCommon.csproj',
    'src/Assets/Microsoft.AspNetCore.App.Internal.Assets.csproj',
    'src/Servers/IIS/IIS/src/Microsoft.AspNetCore.Server.IIS.csproj',
    'docs/BuildFromSource.md',
    'docs/SharedFramework.md'
)
$paths | ConvertTo-Json | Set-Content "$root\selected-source-paths.json" -Encoding utf8
foreach ($role in (Get-Content "$root\roles.json" -Raw | ConvertFrom-Json)) {
    & "$root\Invoke-Recorded.ps1" -Name "070-selected-git-blobs-$($role.name)" -Executable (Get-Command git).Source -WorkingDirectory $role.path -Arguments (@('ls-tree','-r','HEAD','--') + $paths)
    & "$root\Invoke-Recorded.ps1" -Name "071-tracked-source-status-$($role.name)" -Executable (Get-Command git).Source -WorkingDirectory $role.path -Arguments @('status','--porcelain','--untracked-files=no')
    & "$root\Invoke-Recorded.ps1" -Name "072-final-source-head-$($role.name)" -Executable (Get-Command git).Source -WorkingDirectory $role.path -Arguments @('rev-parse','HEAD')
}
