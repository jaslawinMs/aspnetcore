# F016 exact historical commands and observed outcomes

Every fresh dotnet shell activates `. .\activate.ps1` from the source checkout. All3 paired comparisons are permanently closed;historical drivers refuse overwrites. These records are not authorization for a fourth run. No optimization PR is recommended.

## analysis-execution\attempt-001\actual-command.json: actual exit0
```powershell
& 'C:\Program Files\nodejs\node.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F016-analyze.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016'
```

## preparation-execution\original-BuildHarness\attempt-001\001-build-standalone-harness.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-v:minimal' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\preparation-execution\original-BuildHarness\attempt-001\harness.binlog'
```

## preparation-execution\original-BuildProduct\attempt-001\001-sdk-info.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' '--info'
```

## preparation-execution\original-BuildProduct\attempt-001\002-actual-product-targets.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-nologo' '-m:2' '-v:q' '-p:Configuration=Release' '-getProperty:TargetFrameworks,EnablePackageValidation,PackageValidationBaselineVersion'
```

## preparation-execution\original-BuildProduct\attempt-001\003-actual-owning-test-targets.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj' '-nologo' '-m:2' '-v:q' '-p:Configuration=Release' '-getProperty:TargetFrameworks,IsTestProject'
```

## preparation-execution\original-BuildProduct\attempt-001\004-build-all-product-targets.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-c' 'Release' '--no-restore' '-m:2' '-v:minimal' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\preparation-execution\original-BuildProduct\attempt-001\product.binlog'
```

## preparation-execution\original-BuildProduct\attempt-001\005-actual-product-metadata-net462.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-nologo' '-m:2' '-v:q' '-p:TargetFramework=net462' '-p:Configuration=Release' '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants'
```

## preparation-execution\original-BuildProduct\attempt-001\006-actual-product-metadata-netstandard2.0.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-nologo' '-m:2' '-v:q' '-p:TargetFramework=netstandard2.0' '-p:Configuration=Release' '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants'
```

## preparation-execution\original-BuildProduct\attempt-001\007-actual-product-metadata-net12.0.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-nologo' '-m:2' '-v:q' '-p:TargetFramework=net12.0' '-p:Configuration=Release' '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants'
```

## preparation-execution\original-Test\attempt-001\001-owning-tests-net12.0.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj' '-c' 'Release' '-f' 'net12.0' '--no-restore' '-m:2' '-v:minimal' '--filter' 'FullyQualifiedName~ManagedAuthenticatedEncryptorTests|FullyQualifiedName~ManagedAuthenticatedEncryptorFactoryTest' '--logger' 'trx;LogFileName=focused-net12.0.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\preparation-execution\original-Test\attempt-001\results-net12.0' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\preparation-execution\original-Test\attempt-001\tests-net12.0.binlog'
```

## preparation-execution\original-Test\attempt-001\002-actual-test-metadata-net12.0.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj' '-nologo' '-m:2' '-v:q' '-p:TargetFramework=net12.0' '-p:Configuration=Release' '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants'
```

## preparation-execution\original-Test\attempt-001\003-owning-tests-net472.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj' '-c' 'Release' '-f' 'net472' '--no-restore' '-m:2' '-v:minimal' '--filter' 'FullyQualifiedName~ManagedAuthenticatedEncryptorTests|FullyQualifiedName~ManagedAuthenticatedEncryptorFactoryTest' '--logger' 'trx;LogFileName=focused-net472.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\preparation-execution\original-Test\attempt-001\results-net472' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\preparation-execution\original-Test\attempt-001\tests-net472.binlog'
```

## preparation-execution\original-Test\attempt-001\004-actual-test-metadata-net472.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj' '-nologo' '-m:2' '-v:q' '-p:TargetFramework=net472' '-p:Configuration=Release' '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants'
```

## reproduction-preparation\candidate\commands.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\reproduction-standalone\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-f' 'net472' '-m:2' '-v:minimal' '-p:AspNetCoreRoot=C:\src\aspnetcore'
```

## reproduction-preparation\original\commands.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\reproduction-standalone\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-f' 'net472' '-m:2' '-v:minimal' '-p:AspNetCoreRoot=C:\src\aspnetcore'
```

## bootstrap.json: actual exit0
```powershell
& 'git' 'switch' '-c' 'autoperf/F016-managed-decryption-capacity' '37e809ead5824bc753a1c3d56f11615bdb1296c5'
```

## preparation-execution\candidate-Test\attempt-001\004-actual-test-metadata-net472.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj' '-nologo' '-m:2' '-v:q' '-p:TargetFramework=net472' '-p:Configuration=Release' '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants'
```

## preparation-execution\candidate-Test\attempt-001\002-actual-test-metadata-net12.0.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj' '-nologo' '-m:2' '-v:q' '-p:TargetFramework=net12.0' '-p:Configuration=Release' '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants'
```

## preparation-execution\candidate-BuildProduct\attempt-001\001-sdk-info.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' '--info'
```

## preparation-execution\candidate-BuildProduct\attempt-001\002-actual-product-targets.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-nologo' '-m:2' '-v:q' '-p:Configuration=Release' '-getProperty:TargetFrameworks,EnablePackageValidation,PackageValidationBaselineVersion'
```

## preparation-execution\candidate-BuildProduct\attempt-001\003-actual-owning-test-targets.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj' '-nologo' '-m:2' '-v:q' '-p:Configuration=Release' '-getProperty:TargetFrameworks,IsTestProject'
```

## preparation-execution\candidate-BuildProduct\attempt-001\004-build-all-product-targets.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-c' 'Release' '--no-restore' '-m:2' '-v:minimal' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\preparation-execution\candidate-BuildProduct\attempt-001\product.binlog'
```

## preparation-execution\candidate-BuildProduct\attempt-001\005-actual-product-metadata-net462.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-nologo' '-m:2' '-v:q' '-p:TargetFramework=net462' '-p:Configuration=Release' '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants'
```

## preparation-execution\candidate-BuildProduct\attempt-001\006-actual-product-metadata-netstandard2.0.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-nologo' '-m:2' '-v:q' '-p:TargetFramework=netstandard2.0' '-p:Configuration=Release' '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants'
```

## preparation-execution\candidate-BuildProduct\attempt-001\007-actual-product-metadata-net12.0.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-nologo' '-m:2' '-v:q' '-p:TargetFramework=net12.0' '-p:Configuration=Release' '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants'
```

## preparation-execution\candidate-Format\attempt-001\001-verify-changed-whitespace.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'src\DataProtection\DataProtection' '--folder' '--include' 'C:\src\aspnetcore\src\DataProtection\DataProtection\src\Managed\ManagedAuthenticatedEncryptor.cs' 'C:\src\aspnetcore\src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Managed\ManagedAuthenticatedEncryptorTests.cs' '--verify-no-changes' '--verbosity' 'diagnostic'
```

## preparation-execution\candidate-Pack\attempt-001\001-evaluate-package-gate.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-nologo' '-m:2' '-v:q' '-p:Configuration=Release' '-getProperty:EnablePackageValidation,EnablePackageBaselineValidation,PackageValidationBaselineVersion,IsPackable,PackageVersion,PackageId'
```

## preparation-execution\candidate-Pack\attempt-001\002-existing-enabled-package-validation.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'pack' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-c' 'Release' '--no-build' '--no-restore' '-m:2' '-v:normal' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\preparation-execution\candidate-Pack\attempt-001\Pack.binlog;ProjectImports=None'
```

## preparation-execution\candidate-Test\attempt-001\001-owning-tests-net12.0.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj' '-c' 'Release' '-f' 'net12.0' '--no-restore' '-m:2' '-v:minimal' '--filter' 'FullyQualifiedName~ManagedAuthenticatedEncryptorTests|FullyQualifiedName~ManagedAuthenticatedEncryptorFactoryTest' '--logger' 'trx;LogFileName=focused-net12.0.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\preparation-execution\candidate-Test\attempt-001\results-net12.0' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\preparation-execution\candidate-Test\attempt-001\tests-net12.0.binlog'
```

## preparation-execution\candidate-Test\attempt-001\003-owning-tests-net472.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj' '-c' 'Release' '-f' 'net472' '--no-restore' '-m:2' '-v:minimal' '--filter' 'FullyQualifiedName~ManagedAuthenticatedEncryptorTests|FullyQualifiedName~ManagedAuthenticatedEncryptorFactoryTest' '--logger' 'trx;LogFileName=focused-net472.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\preparation-execution\candidate-Test\attempt-001\results-net472' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\preparation-execution\candidate-Test\attempt-001\tests-net472.binlog'
```

## contexts\candidate\characterization-framework-command.json: actual exit0
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\candidate\framework-image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\candidate\sources' '--context' 'candidate-framework' '--mode' 'characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\candidate\characterization-framework'
```

## contexts\candidate\characterization-standard-command.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\candidate\image\AutoPerf.Benchmarks.dll' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\candidate\sources' '--context' 'candidate-standard' '--mode' 'characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\candidate\characterization-standard'
```

## audit-execution\attempt-001\actual-command.json: actual exit0
```powershell
& 'C:\Program Files\nodejs\node.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F016-audit.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016' '--live'
```

## measurement-execution\comparison-003\candidate-actual-command.json: actual exit0
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\candidate\framework-image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\candidate\sources' '--context' 'framework-candidate-comparison-3' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\measurements\comparison-003\candidate' '--filter' '*'
```

## measurement-execution\comparison-003\candidate-launch.json: actual exit
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\candidate\framework-image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\candidate\sources' '--context' 'framework-candidate-comparison-3' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\measurements\comparison-003\candidate' '--filter' '*'
```

## measurement-execution\comparison-003\original-actual-command.json: actual exit0
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\original\framework-image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\original\sources' '--context' 'framework-original-comparison-3' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\measurements\comparison-003\original' '--filter' '*'
```

## measurement-execution\comparison-003\original-launch.json: actual exit
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\original\framework-image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\original\sources' '--context' 'framework-original-comparison-3' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\measurements\comparison-003\original' '--filter' '*'
```

## measurement-execution\comparison-002\original-actual-command.json: actual exit0
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\original\framework-image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\original\sources' '--context' 'framework-original-comparison-2' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\measurements\comparison-002\original' '--filter' '*'
```

## measurement-execution\comparison-001\candidate-actual-command.json: actual exit0
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\candidate\framework-image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\candidate\sources' '--context' 'framework-candidate-comparison-1' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\measurements\comparison-001\candidate' '--filter' '*'
```

## measurement-execution\comparison-001\candidate-launch.json: actual exit
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\candidate\framework-image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\candidate\sources' '--context' 'framework-candidate-comparison-1' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\measurements\comparison-001\candidate' '--filter' '*'
```

## measurement-execution\comparison-001\original-actual-command.json: actual exit0
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\original\framework-image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\original\sources' '--context' 'framework-original-comparison-1' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\measurements\comparison-001\original' '--filter' '*'
```

## measurement-execution\comparison-001\original-launch.json: actual exit
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\original\framework-image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\original\sources' '--context' 'framework-original-comparison-1' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\measurements\comparison-001\original' '--filter' '*'
```

## measurement-execution\comparison-002\candidate-actual-command.json: actual exit0
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\candidate\framework-image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\candidate\sources' '--context' 'framework-candidate-comparison-2' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\measurements\comparison-002\candidate' '--filter' '*'
```

## measurement-execution\comparison-002\candidate-launch.json: actual exit
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\candidate\framework-image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\candidate\sources' '--context' 'framework-candidate-comparison-2' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\measurements\comparison-002\candidate' '--filter' '*'
```

## measurement-execution\comparison-002\original-launch.json: actual exit
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\original\framework-image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\original\sources' '--context' 'framework-original-comparison-2' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\measurements\comparison-002\original' '--filter' '*'
```

## contexts\original\characterization-framework-command.json: actual exit0
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\original\framework-image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\original\sources' '--context' 'original-framework' '--mode' 'characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\original\characterization-framework'
```

## contexts\original\characterization-standard-command.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\original\image\AutoPerf.Benchmarks.dll' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\original\sources' '--context' 'original-standard' '--mode' 'characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F016\contexts\original\characterization-standard'
```

## Observed results and limits
Original/candidate:40net12+24net472 passed each,0skips/failures;all36new Decrypt_BlockAndStreamBoundaries_PreservesPayloadAndInputs Theory executions individually checked in actual XML-parsed TRX. Both roles build all3productTFMs;dual-target standalone harness builds cleanly;formatter0of2;enabled APICompat pack actually passes,all3packed owners match frozen products,released baseline version unset.

Four real untimed contexts give252roundtrips/12contracts;6actual Framework profiles add252roundtrips and126successful reports. All3slotsclosed:1008raw/952retained/56upper-filtered/378warmups/2256actual overheads. Shared VM,AppDomain-inclusive managed allocation,no modern-path/whole-app/production-frequency throughput claim.406frozen files rehashed,20PEPDB/110selected documents,128TRXrows,28copied sources,252unchanged settings records.

Large partial-block allocation benefits39.69-39.95% are retained,but SHA5121MiB+1 C3+57.11% time/aggregate+8.91% and small/aligned/empty costs prevent the combined gate passing. Conservative no-gain/inconclusive,not zero-allocation-benefit. Exact two-file +37/-1 candidate patch retained;source restored and unchanged remote baseline branch verified,no new source commit/PR. Relocated original and candidate Prepare builds pass,91-file images;no native execution or extra timing.

## Actual copied portable audit: exit0
```powershell
node .\F016-analyze.mjs . --verify
node .\F016-audit.mjs . --verify
```
Copied raw/sample/source/native/TRX/statistical checks pass;omitted binary/binlog/package images are not reopened.
