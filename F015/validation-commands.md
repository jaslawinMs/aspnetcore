# F015 exact historical commands and observed outcomes

Every fresh dotnet shell activates `. .\activate.ps1` from the source checkout. All3 paired comparisons are permanently closed; historical drivers refuse overwrites. These command records are not authorization for a fourth run.

## analysis-execution\attempt-001\command.json: actual exit1
```powershell
& 'C:\Program Files\nodejs\node.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F015-analyze.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015'
```

## preparation-execution\original-BuildProduct\attempt-001\004-actual-product-metadata-netstandard2.0.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-nologo' '-m:2' '-v:q' '-p:TargetFramework=netstandard2.0' '-p:Configuration=Release' '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants'
```

## preparation-execution\original-BuildProduct\attempt-001\005-actual-product-metadata-net12.0.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-nologo' '-m:2' '-v:q' '-p:TargetFramework=net12.0' '-p:Configuration=Release' '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants'
```

## preparation-execution\original-Test\attempt-001\001-owning-tests-net12.0.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj' '-c' 'Release' '-f' 'net12.0' '--no-restore' '-m:2' '-v:minimal' '--filter' 'FullyQualifiedName~ManagedAuthenticatedEncryptorTests|FullyQualifiedName~ManagedAuthenticatedEncryptorFactoryTest' '--logger' 'trx;LogFileName=focused-net12.0.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\preparation-execution\original-Test\attempt-001\results-net12.0' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\preparation-execution\original-Test\attempt-001\tests-net12.0.binlog'
```

## preparation-execution\original-Test\attempt-001\002-actual-test-metadata-net12.0.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj' '-nologo' '-m:2' '-v:q' '-p:TargetFramework=net12.0' '-p:Configuration=Release' '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants'
```

## preparation-execution\original-Test\attempt-001\003-owning-tests-net472.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj' '-c' 'Release' '-f' 'net472' '--no-restore' '-m:2' '-v:minimal' '--filter' 'FullyQualifiedName~ManagedAuthenticatedEncryptorTests|FullyQualifiedName~ManagedAuthenticatedEncryptorFactoryTest' '--logger' 'trx;LogFileName=focused-net472.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\preparation-execution\original-Test\attempt-001\results-net472' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\preparation-execution\original-Test\attempt-001\tests-net472.binlog'
```

## preparation-execution\original-Test\attempt-001\004-actual-test-metadata-net472.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj' '-nologo' '-m:2' '-v:q' '-p:TargetFramework=net472' '-p:Configuration=Release' '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants'
```

## reproduction-preparation\commands.json: actual exit1
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F015-reproduction-probe\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-f' 'net472' '--no-restore' '-m:2' '-v:minimal' '-p:AspNetCoreRoot=C:\src\aspnetcore'
```

## reproduction-preparation\commands.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F015-reproduction-probe\harness\AutoPerf.Benchmarks.csproj' '-m:2' '-v:minimal' '-p:AspNetCoreRoot=C:\src\aspnetcore'
```

## reproduction-preparation\commands.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F015-reproduction-probe\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-f' 'net472' '--no-restore' '-m:2' '-v:minimal' '-p:AspNetCoreRoot=C:\src\aspnetcore'
```

## preparation-execution\original-BuildProduct\attempt-001\003-actual-product-metadata-net462.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-nologo' '-m:2' '-v:q' '-p:TargetFramework=net462' '-p:Configuration=Release' '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants'
```

## preparation-execution\original-BuildProduct\attempt-001\002-build-all-product-targets.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-c' 'Release' '--no-restore' '-m:2' '-v:minimal' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\preparation-execution\original-BuildProduct\attempt-001\product.binlog'
```

## preparation-execution\original-BuildProduct\attempt-001\001-sdk-info.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' '--info'
```

## preparation-execution\candidate-BuildHarness\attempt-001\001-build-standalone-harness.json: actual exit1
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-v:minimal' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\preparation-execution\candidate-BuildHarness\attempt-001\harness.binlog'
```

## preparation-execution\candidate-BuildHarness\attempt-002\001-build-standalone-harness.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-v:minimal' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\preparation-execution\candidate-BuildHarness\attempt-002\harness.binlog'
```

## preparation-execution\candidate-BuildHarness\attempt-003\001-build-standalone-harness.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-v:minimal' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\preparation-execution\candidate-BuildHarness\attempt-003\harness.binlog'
```

## preparation-execution\candidate-BuildProduct\attempt-001\001-sdk-info.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' '--info'
```

## preparation-execution\candidate-BuildProduct\attempt-001\002-build-all-product-targets.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-c' 'Release' '--no-restore' '-m:2' '-v:minimal' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\preparation-execution\candidate-BuildProduct\attempt-001\product.binlog'
```

## preparation-execution\candidate-BuildProduct\attempt-001\003-actual-product-metadata-net462.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-nologo' '-m:2' '-v:q' '-p:TargetFramework=net462' '-p:Configuration=Release' '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants'
```

## preparation-execution\candidate-BuildProduct\attempt-001\004-actual-product-metadata-netstandard2.0.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-nologo' '-m:2' '-v:q' '-p:TargetFramework=netstandard2.0' '-p:Configuration=Release' '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants'
```

## preparation-execution\candidate-BuildProduct\attempt-001\005-actual-product-metadata-net12.0.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-nologo' '-m:2' '-v:q' '-p:TargetFramework=net12.0' '-p:Configuration=Release' '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants'
```

## preparation-execution\candidate-Format\attempt-001\001-verify-changed-whitespace.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'src\DataProtection\DataProtection' '--folder' '--include' 'C:\src\aspnetcore\src\DataProtection\DataProtection\src\Managed\ManagedAuthenticatedEncryptor.cs' 'C:\src\aspnetcore\src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Managed\ManagedAuthenticatedEncryptorTests.cs' '--verify-no-changes' '--verbosity' 'diagnostic'
```

## preparation-execution\candidate-Pack\attempt-001\execution.json: actual exit0
```powershell
. .\activate.ps1
& 'dotnet' 'msbuild' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-nologo' '-m:2' '-v:q' '-p:Configuration=Release' '-getProperty:EnablePackageValidation,EnablePackageBaselineValidation,PackageValidationBaselineVersion,IsPackable,PackageVersion,PackageId'
```

## preparation-execution\candidate-Pack\attempt-001\execution.json: actual exit0
```powershell
. .\activate.ps1
& 'dotnet' 'pack' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-c' 'Release' '--no-build' '--no-restore' '-m:2' '-v:normal' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\preparation-execution\candidate-Pack\attempt-001\Pack.binlog;ProjectImports=None'
```

## preparation-execution\candidate-Test\attempt-001\001-owning-tests-net12.0.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj' '-c' 'Release' '-f' 'net12.0' '--no-restore' '-m:2' '-v:minimal' '--filter' 'FullyQualifiedName~ManagedAuthenticatedEncryptorTests|FullyQualifiedName~ManagedAuthenticatedEncryptorFactoryTest' '--logger' 'trx;LogFileName=focused-net12.0.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\preparation-execution\candidate-Test\attempt-001\results-net12.0' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\preparation-execution\candidate-Test\attempt-001\tests-net12.0.binlog'
```

## preparation-execution\candidate-Test\attempt-001\002-actual-test-metadata-net12.0.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj' '-nologo' '-m:2' '-v:q' '-p:TargetFramework=net12.0' '-p:Configuration=Release' '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants'
```

## preparation-execution\candidate-Test\attempt-001\003-owning-tests-net472.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj' '-c' 'Release' '-f' 'net472' '--no-restore' '-m:2' '-v:minimal' '--filter' 'FullyQualifiedName~ManagedAuthenticatedEncryptorTests|FullyQualifiedName~ManagedAuthenticatedEncryptorFactoryTest' '--logger' 'trx;LogFileName=focused-net472.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\preparation-execution\candidate-Test\attempt-001\results-net472' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\preparation-execution\candidate-Test\attempt-001\tests-net472.binlog'
```

## preparation-execution\candidate-Test\attempt-001\004-actual-test-metadata-net472.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'msbuild' 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj' '-nologo' '-m:2' '-v:q' '-p:TargetFramework=net472' '-p:Configuration=Release' '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants'
```

## preparation-execution\original-BuildHarness\attempt-001\001-build-standalone-harness.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-v:minimal' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\preparation-execution\original-BuildHarness\attempt-001\harness.binlog'
```

## contexts\original\characterization-command.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\contexts\original\image\AutoPerf.Benchmarks.dll' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\contexts\original\sources' '--context' 'original' '--mode' 'characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\contexts\original\characterization'
```

## framework-contexts\candidate\characterization-command.json: actual exit0
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\candidate\image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\candidate\sources' '--context' 'framework-candidate' '--mode' 'characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\candidate\characterization'
```

## analysis-execution\attempt-002\command.json: actual exit0
```powershell
& 'C:\Program Files\nodejs\node.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F015-analyze.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015'
```

## analysis-execution\attempt-003\command.json: actual exit0
```powershell
& 'C:\Program Files\nodejs\node.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F015-analyze.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015'
```

## audit-execution\attempt-001\command.json: actual exit0
```powershell
& 'C:\Program Files\nodejs\node.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F015-audit.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015' '--live'
```

## contexts\candidate\characterization-command.json: actual exit0
```powershell
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\contexts\candidate\image\AutoPerf.Benchmarks.dll' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\contexts\candidate\sources' '--context' 'candidate' '--mode' 'characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\contexts\candidate\characterization'
```

## measurement-execution\comparison-001\candidate-actual-command.json: actual exit0
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\candidate\image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\candidate\sources' '--context' 'framework-candidate-comparison-1' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\measurements\comparison-001\candidate' '--filter' '*'
```

## measurement-execution\comparison-001\candidate-launch.json: actual exit
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\candidate\image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\candidate\sources' '--context' 'framework-candidate-comparison-1' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\measurements\comparison-001\candidate' '--filter' '*'
```

## measurement-execution\comparison-001\original-actual-command.json: actual exit0
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\original\image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\original\sources' '--context' 'framework-original-comparison-1' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\measurements\comparison-001\original' '--filter' '*'
```

## measurement-execution\comparison-001\original-launch.json: actual exit
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\original\image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\original\sources' '--context' 'framework-original-comparison-1' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\measurements\comparison-001\original' '--filter' '*'
```

## measurement-execution\comparison-002\candidate-actual-command.json: actual exit0
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\candidate\image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\candidate\sources' '--context' 'framework-candidate-comparison-2' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\measurements\comparison-002\candidate' '--filter' '*'
```

## measurement-execution\comparison-002\candidate-launch.json: actual exit
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\candidate\image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\candidate\sources' '--context' 'framework-candidate-comparison-2' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\measurements\comparison-002\candidate' '--filter' '*'
```

## measurement-execution\comparison-002\original-actual-command.json: actual exit0
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\original\image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\original\sources' '--context' 'framework-original-comparison-2' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\measurements\comparison-002\original' '--filter' '*'
```

## measurement-execution\comparison-002\original-launch.json: actual exit
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\original\image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\original\sources' '--context' 'framework-original-comparison-2' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\measurements\comparison-002\original' '--filter' '*'
```

## measurement-execution\comparison-003\candidate-actual-command.json: actual exit0
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\candidate\image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\candidate\sources' '--context' 'framework-candidate-comparison-3' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\measurements\comparison-003\candidate' '--filter' '*'
```

## measurement-execution\comparison-003\candidate-launch.json: actual exit
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\candidate\image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\candidate\sources' '--context' 'framework-candidate-comparison-3' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\measurements\comparison-003\candidate' '--filter' '*'
```

## measurement-execution\comparison-003\original-actual-command.json: actual exit0
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\original\image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\original\sources' '--context' 'framework-original-comparison-3' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\measurements\comparison-003\original' '--filter' '*'
```

## measurement-execution\comparison-003\original-launch.json: actual exit
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\original\image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\original\sources' '--context' 'framework-original-comparison-3' '--mode' 'measure' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\measurements\comparison-003\original' '--filter' '*'
```

## framework-contexts\original\characterization-command.json: actual exit0
```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\original\image\AutoPerf.Benchmarks.exe' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\original\sources' '--context' 'framework-original' '--mode' 'characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F015\framework-contexts\original\characterization'
```

## investigation\preliminary-platform-observations.json: actual exit0
```powershell
. .\activate.ps1
& 'dotnet' 'msbuild' 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj' '-nologo' '-m:2' '-v:q' '-getProperty:TargetFrameworks,DefaultNetFxTargetFramework,DefaultNetCoreTargetFramework,MoqVersion' '-p:Configuration=Release'
```

## investigation\preliminary-platform-observations.json: actual exit0
```powershell
. .\activate.ps1
& 'dotnet' 'msbuild' 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj' '-nologo' '-m:2' '-v:q' '-getProperty:TargetFrameworks,DefaultNetFxTargetFramework,DefaultNetCoreTargetFramework' '-p:Configuration=Release'
```

## Observed results and limits
Original/candidate:39net12+23net472 passed each,0skips;all32 new preservation Theory executions individually checked. Original/candidate owner builds pass all3TFMs;formatter selects2files and changes0/2. Final dual-target harness build passes with0warnings/errors;earlier missing-reference failure and intermediate CA1416 warning remain. Enabled candidate package validation actually executes APICompat successfully;all3packed owners match frozen products;released baseline version remains unset.

Four real untimed contexts give168roundtrips/12contracts;6actual Framework profiles give168further roundtrips and84successful reports. All3comparison slots closed:672raw/615retained/57upper-filtered/252warmups/1519actual overheads. Shared VM,AppDomain-inclusive managed accounting,no modern-path/whole-app/production-frequency throughput claim. All432frozen files rehashed before omission;20PEPDB/110selected-source observations;124TRXrows,56copied sources checked. Earlier compatibility harness versions,failed legacy PowerShell observation and failed shortened-Parameters extractor remain. Scope-only metadata correction preserves earlier successful extraction and numeric output.

Relocated fresh helper: first build exits1/NETSDK1004 missing assets;restore exits0;second build exits0. Prepare mode creates91-file fresh image but executes no native profile or timing. Historical measured bytes precede later source commit and are not relabeled.

## Actual copied portable audit: exit0
```powershell
node .\F015-analyze.mjs . --verify
node .\F015-audit.mjs . --verify
```
All copied raw/sample/source/native/TRX/statistical consistency checks pass;omitted binaries/binlogs/packages are not reopened.
