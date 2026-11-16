# F105 actual commands and outcomes

Every fresh dotnet shell starts in C:\src\aspnetcore and activates `. .\activate.ps1`. CPU-heavy work serialized/max2 build nodes. One original-only24-case profile,zero source comparisons/three intentionally unused. No compatible performance improvement or executed modified-binary failure claimed.

## evidence-tool-source-pdb-command.json/row1:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\evidence-tool-source\Program.cs'
```

## harness-build-final-formatted-command.json/row1:actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '-v:minimal' '--no-restore'
```

## harness-build-initial-command.json/row1:actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '-v:minimal'
```

## harness-build-nullable-guard-command.json/row1:actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '-v:minimal' '--no-restore'
```

## harness-format-commands.json/row1:actual exit0
```powershell
dotnet 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\harness\EnumerationBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\harness\Probe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\harness\Workload.cs' '--verify-no-changes'
```

## pdb-original-commands.json/row1:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\binaries\original\AutoPerf.Benchmarks.pdb' 'EnumerationBenchmark.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\harness\EnumerationBenchmark.cs'
```

## pdb-original-commands.json/row2:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\binaries\original\AutoPerf.Benchmarks.pdb' 'Probe.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\harness\Probe.cs'
```

## pdb-original-commands.json/row3:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\binaries\original\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\harness\Program.cs'
```

## pdb-original-commands.json/row4:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\binaries\original\AutoPerf.Benchmarks.pdb' 'Workload.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\harness\Workload.cs'
```

## pdb-original-commands.json/row5:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\binaries\original\Microsoft.AspNetCore.Mvc.Abstractions.pdb' 'ValidationStateDictionary.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\producer-source\src\Mvc\Mvc.Abstractions\src\ModelBinding\Validation\ValidationStateDictionary.cs'
```

## pdb-original-commands.json/row6:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\binaries\original\Microsoft.AspNetCore.Mvc.Abstractions.pdb' 'ValidationStateEntry.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\producer-source\src\Mvc\Mvc.Abstractions\src\ModelBinding\Validation\ValidationStateEntry.cs'
```

## pdb-original-commands.json/row7:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\binaries\original\Microsoft.AspNetCore.Mvc.Abstractions.pdb' 'ModelBindingContext.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\producer-source\src\Mvc\Mvc.Abstractions\src\ModelBinding\ModelBindingContext.cs'
```

## pdb-original-commands.json/row8:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\binaries\original\Microsoft.AspNetCore.Mvc.Core.pdb' 'ObjectModelValidator.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\producer-source\src\Mvc\Mvc.Core\src\ModelBinding\ObjectModelValidator.cs'
```

## pdb-original-commands.json/row9:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\binaries\original\Microsoft.AspNetCore.Mvc.Core.pdb' 'DefaultObjectValidator.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\producer-source\src\Mvc\Mvc.Core\src\ModelBinding\Validation\DefaultObjectValidator.cs'
```

## pdb-original-commands.json/row10:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\binaries\original\Microsoft.AspNetCore.Mvc.Core.pdb' 'ValidationVisitor.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\producer-source\src\Mvc\Mvc.Core\src\ModelBinding\Validation\ValidationVisitor.cs'
```

## pdb-original-commands.json/row11:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\binaries\original\Microsoft.AspNetCore.Mvc.Core.pdb' 'DefaultModelBindingContext.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\producer-source\src\Mvc\Mvc.Core\src\ModelBinding\DefaultModelBindingContext.cs'
```

## pdb-original-commands.json/row12:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\binaries\original\Microsoft.AspNetCore.Mvc.Core.pdb' 'MvcCoreServiceCollectionExtensions.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\producer-source\src\Mvc\Mvc.Core\src\DependencyInjection\MvcCoreServiceCollectionExtensions.cs'
```

## pdb-original-commands.json/row13:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\binaries\original\Microsoft.AspNetCore.Mvc.DataAnnotations.pdb' 'DataAnnotationsModelValidator.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\producer-source\src\Mvc\Mvc.DataAnnotations\src\DataAnnotationsModelValidator.cs'
```

## pdb-original-commands.json/row14:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\binaries\original\Microsoft.AspNetCore.Mvc.DataAnnotations.pdb' 'DataAnnotationsModelValidatorProvider.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\producer-source\src\Mvc\Mvc.DataAnnotations\src\DataAnnotationsModelValidatorProvider.cs'
```

## pdb-original-commands.json/row15:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\binaries\original\Microsoft.AspNetCore.Mvc.DataAnnotations.pdb' 'RequiredAttributeAdapter.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\producer-source\src\Mvc\Mvc.DataAnnotations\src\RequiredAttributeAdapter.cs'
```

## pdb-original-commands.json/row16:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\binaries\original\Microsoft.AspNetCore.Mvc.DataAnnotations.pdb' 'MvcDataAnnotationsMvcCoreBuilderExtensions.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\producer-source\src\Mvc\Mvc.DataAnnotations\src\DependencyInjection\MvcDataAnnotationsMvcCoreBuilderExtensions.cs'
```

## pdb-original-commands.json/row17:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\binaries\original\Microsoft.AspNetCore.Mvc.DataAnnotations.pdb' 'MvcDataAnnotationsMvcOptionsSetup.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\producer-source\src\Mvc\Mvc.DataAnnotations\src\DependencyInjection\MvcDataAnnotationsMvcOptionsSetup.cs'
```

## source-fetch-command.json/row1:actual exit0
```powershell
git fetch --quiet --no-tags --no-recurse-submodules origin main
```

## Actual retained original24-case BDN pressure profile:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\binaries\original\AutoPerf.Benchmarks.dll' '--filter' '*EnumerationBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\measurements\original' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## Actual development-nullable-guard public-owner24-case/120-caliper probe:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\verification\development-nullable-guard'
```

## Actual original public-owner24-case/120-caliper probe:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\binaries\original\AutoPerf.Benchmarks.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\verification\original'
```

## Actual post-original public-owner24-case/120-caliper probe:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\binaries\original\AutoPerf.Benchmarks.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\verification\post-original'
```

## Actual ten original owning Facts:actual exit0
```powershell
dotnet 'test' 'src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Mvc.ModelBinding.Validation.DefaultObjectValidatorTests.Validate_SimpleValueType_Valid_WithPrefix|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ModelBinding.Validation.DefaultObjectValidatorTests.Validate_SimpleReferenceType_Valid_WithPrefix|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ModelBinding.Validation.DefaultObjectValidatorTests.Validate_SimpleType_MaxErrorsReached|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ModelBinding.Validation.DefaultObjectValidatorTests.Validate_SimpleType_SuppressValidation|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ModelBinding.Validation.DefaultObjectValidatorTests.Validate_SimpleType_SuppressValidationWithNullKey|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ModelBinding.Validation.DefaultObjectValidatorTests.Validate_ComplexValueType_Valid|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ModelBinding.Validation.DefaultObjectValidatorTests.Validate_ComplexReferenceType_Valid|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ModelBinding.Validation.DefaultObjectValidatorTests.Validate_ComplexReferenceType_Invalid|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ModelBinding.Validation.DefaultObjectValidatorTests.Validate_ComplexType_SuppressValidation|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ModelBinding.Validation.DefaultObjectValidatorTests.Validate_DoesNotUseOverridden_GetHashCodeOrEquals' '--logger' 'trx;LogFileName=owning-original.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\tests\original' '-v:minimal'
```

## Actual selected test-source/PDB proof:actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Mvc.Core.Test\Release\net12.0\Microsoft.AspNetCore.Mvc.Core.Test.pdb' 'DefaultObjectValidatorTests.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105\producer-source\src\Mvc\Mvc.Core\test\ModelBinding\Validation\DefaultObjectValidatorTests.cs'
```

## Initial portable-auditor object/array failure,not a benchmark or test failure:actual exit1
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F105-reproduce-analysis.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105'
```

## Corrected actual portable arithmetic/source/test audit:actual exit0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F105-reproduce-analysis.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F105'
```

All ten exact source-defined owning Facts passed,0 failed/0 skipped,positive durations/exact TRX IDs/output-owner/deps/source-PDB identities. They are original preservation controls,not red-green performance tests or an in-test loaded-owner hash marker.
Initial full harness build passed with1 CS8602 warning/0errors;exact initial sources/identity retained. Nullable-guard and final builds passed0warnings/0errors. Scoped actual repo whitespace verification passed exit0 without formatter application. Actual development/frozen/pre/post producers and all public semantic controls passed.
The first portable auditor failed on a single successful command encoded as an object rather than an array;its exact source/observed failure are retained. The corrected reader passed without raw-data changes or any benchmark/test rerun.

## Independent source branch:actual push/ref retrieval passed
```powershell
git '-c' 'credential.helper=' '-c' 'credential.helper=!gh auth git-credential' 'push' 'autoperf' 'autoperf/F105-validation-state-enumeration'
gh 'api' 'repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf/F105-validation-state-enumeration'
```
Actual fork branch `autoperf/F105-validation-state-enumeration` remains at `37e809ead5824bc753a1c3d56f11615bdb1296c5`;source diff/whitespace exit0 and20 raw source hashes checked. No shipping source edit or build-output restoration was needed.

## Exact copied portable audit:actual exit0,passed
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-published-results\F105\reproduce-analysis.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-published-results\F105' --verify
```
24 outcomes/192 results/72 warmups/399 actual overhead samples/24 hash-PID setups/72 exact frozen input proofs/48 independent frozen contracts/240 precise warmed process-wide calipers/20 source identities/17 source-PDB associations per image/10 exact original Facts/305 copied application files/126 declared assets. All sample/R7/variance/SE/actual-overhead/GC rounding/recorded CI arithmetic checked;confidence critical values/omitted DLL-PDB-runtime bytes/method coverage not independently recomputed.
All96 present measured/probe input mappings,including24 additional development inputs,resolve exact content-addressed JSON bytes. Initial source/warning/auditor artifacts and hidden harness .editorconfig are preserved.
`node F105-closure.mjs <actual-local-run> --verify` passed in guarded actual pre/post probe/profile recipes. It requires the omitted local305-file image;this is not a portable rehash of omitted binaries.
