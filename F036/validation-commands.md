# F036 exact recorded commands and actual outcomes

Historical observations,not overwrite/replay instructions. One separate32-profile original-only diagnostic and three complete32-profile source-comparison pairs;both phase budgets permanently closed. Activate the repository SDK before every dotnet command. Original/candidate/restored-original19-row owning runs pass,zero skipped. Four successful characterizations each contain33semantic plus32actual benchmark lifecycle records.

## profiles\comparison-3-candidate\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-candidate\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-candidate\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-candidate\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\profiles\comparison-3-candidate' '--filter' '*'
```

## profiles\comparison-2-original\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-original\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-original\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-original\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\profiles\comparison-2-original' '--filter' '*'
```

## profiles\diagnostic-original-001\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\preparation-original-001\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\preparation-original-001\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\preparation-original-001\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\profiles\diagnostic-original-001' '--filter' '*'
```

## validation\original-existing-2\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj' '--no-restore' '-c' 'Release' '-f' 'net12.0' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildInParallel=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryTest.ConstructorWithOneParameterInitializesMembers|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryTest.ConstructorInitializesMembers|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryTest.CopyConstructorInitializesModelAndModelMetadataBasedOnSource|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryTest.CopyConstructor_CopiesModelMetadata|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryTest.CopyConstructor_CopiesModelMetadata_ForTypeObject|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryOfTModelTest.Constructor_InitializesMembers|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryOfTModelTest.CopyConstructors_InitializeModelAndModelMetadataBasedOnSource|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryOfTModelTest.CopyConstructors_InitializeModelAndModelMetadataBasedOnSource_NullModel|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryOfTModelTest.CopyConstructor_DoesNotChangeMetadata_WhenValueCompatibleWithSourceMetadata|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryOfTModelTest.CopyConstructor_InitializesModelAndModelMetadataBasedOnSource_ModelOfSubclass|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryOfTModelTest.CopyConstructor_InitializesModelBasedOnSource_ModelMetadataBasedOnTModel' '--logger' 'trx;LogFileName=owning.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\validation\original-existing-2' '-v' 'minimal'
```

## validation\original-existing-1\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj' '--no-restore' '-c' 'Release' '-f' 'net12.0' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildInParallel=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryTest.ConstructorWithOneParameterInitializesMembers|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryTest.ConstructorInitializesMembers|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryTest.CopyConstructorInitializesModelAndModelMetadataBasedOnSource|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryTest.CopyConstructor_CopiesModelMetadata|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryTest.CopyConstructor_CopiesModelMetadata_ForTypeObject|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryOfTModelTest.Constructor_InitializesMembers|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryOfTModelTest.CopyConstructors_InitializeModelAndModelMetadataBasedOnSource|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryOfTModelTest.CopyConstructors_InitializeModelAndModelMetadataBasedOnSource_NullModel|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryOfTModelTest.CopyConstructor_DoesNotChangeMetadata_WhenValueCompatibleWithSourceMetadata|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryOfTModelTest.CopyConstructor_InitializesModelAndModelMetadataBasedOnSource_ModelOfSubclass|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryOfTModelTest.CopyConstructor_InitializesModelBasedOnSource_ModelMetadataBasedOnTModel' '--logger' 'trx;LogFileName=owning.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\validation\original-existing-1' '-v' 'minimal'
```

## validation\candidate-existing-1\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'test' 'src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj' '--no-restore' '-c' 'Release' '-f' 'net12.0' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:BuildInParallel=false' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryTest.ConstructorWithOneParameterInitializesMembers|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryTest.ConstructorInitializesMembers|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryTest.CopyConstructorInitializesModelAndModelMetadataBasedOnSource|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryTest.CopyConstructor_CopiesModelMetadata|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryTest.CopyConstructor_CopiesModelMetadata_ForTypeObject|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryOfTModelTest.Constructor_InitializesMembers|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryOfTModelTest.CopyConstructors_InitializeModelAndModelMetadataBasedOnSource|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryOfTModelTest.CopyConstructors_InitializeModelAndModelMetadataBasedOnSource_NullModel|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryOfTModelTest.CopyConstructor_DoesNotChangeMetadata_WhenValueCompatibleWithSourceMetadata|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryOfTModelTest.CopyConstructor_InitializesModelAndModelMetadataBasedOnSource_ModelOfSubclass|FullyQualifiedName=Microsoft.AspNetCore.Mvc.ViewFeatures.ViewDataDictionaryOfTModelTest.CopyConstructor_InitializesModelBasedOnSource_ModelMetadataBasedOnTModel' '--logger' 'trx;LogFileName=owning.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\validation\candidate-existing-1' '-v' 'minimal'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'branch' '--show-current'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'rev-parse' 'HEAD'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'status' '--porcelain=v1' '--untracked-files=no'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' '--no-pager' 'diff' '--check'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'remote' 'get-url' 'autoperf'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'remote' 'get-url' 'origin'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/dotnet/aspnetcore/branches/main'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'fetch' '--no-tags' 'origin' 'f2484a6bf688bd1acb1af13802255c2c23a071dd'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionary.cs'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionaryOfT.cs'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Shared/CopyOnWriteDictionary/CopyOnWriteDictionary.cs'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionaryFactory.cs'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/src/Microsoft.AspNetCore.Mvc.ViewFeatures.csproj'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Shipped.txt'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Unshipped.txt'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/test/ViewDataDictionaryTest.cs'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/test/ViewDataDictionaryOfTModelTest.cs'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/test/Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/src/TemplateBuilder.cs'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/src/HtmlHelper.cs'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/src/TemplateInfo.cs'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/TemplateInfo.cs'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' '--no-pager' 'log' '--format=%H %ad %s' '--date=iso-strict' 'f2484a6bf688bd1acb1af13802255c2c23a071dd..f2484a6bf688bd1acb1af13802255c2c23a071dd' '--' 'src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionary.cs' 'src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionaryOfT.cs' 'src/Shared/CopyOnWriteDictionary/CopyOnWriteDictionary.cs' 'src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionaryFactory.cs' 'src/Mvc/Mvc.ViewFeatures/src/Microsoft.AspNetCore.Mvc.ViewFeatures.csproj' 'src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Shipped.txt' 'src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Unshipped.txt' 'src/Mvc/Mvc.ViewFeatures/test/ViewDataDictionaryTest.cs' 'src/Mvc/Mvc.ViewFeatures/test/ViewDataDictionaryOfTModelTest.cs' 'src/Mvc/Mvc.ViewFeatures/test/Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj' 'src/Mvc/Mvc.ViewFeatures/src/TemplateBuilder.cs' 'src/Mvc/Mvc.ViewFeatures/src/HtmlHelper.cs' 'src/Mvc/Mvc.ViewFeatures/src/TemplateInfo.cs'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' '-c' 'credential.helper=' '-c' 'credential.helper=!gh auth git-credential' 'push' 'autoperf' 'autoperf/F036-viewdata-enumeration:refs/heads/autoperf/F036-viewdata-enumeration'
```

## source-publication\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf/F036-viewdata-enumeration'
```

## profiles\comparison-3-original\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-original\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-original\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-original\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\profiles\comparison-3-original' '--filter' '*'
```

## profiles\characterize-original-001\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\preparation-original-001\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\preparation-original-001\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\preparation-original-001\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\profiles\characterize-original-001'
```

## profiles\characterize-reproduction-original\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\preparation-reproduction-original\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\preparation-reproduction-original\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\preparation-reproduction-original\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\profiles\characterize-reproduction-original'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'status' '--porcelain=v1' '--untracked-files=no'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'rev-parse' 'HEAD'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'branch' '--show-current'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'ls-files' '--others' '--exclude-standard'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/dotnet/aspnetcore/branches/main'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'cat-file' '-e' 'f2484a6bf688bd1acb1af13802255c2c23a071dd^{commit}'
```

## initial-actual-invocations.json:actual exit 1
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show-ref' '--verify' '--quiet' 'refs/heads/autoperf/F036-viewdata-enumeration'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'ls-remote' '--heads' 'autoperf' 'refs/heads/autoperf/F036-viewdata-enumeration'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'switch' '--create' 'autoperf/F036-viewdata-enumeration' '37e809ead5824bc753a1c3d56f11615bdb1296c5'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'rev-parse' 'HEAD'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionary.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionary.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionaryOfT.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionaryOfT.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Shared/CopyOnWriteDictionary/CopyOnWriteDictionary.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Shared/CopyOnWriteDictionary/CopyOnWriteDictionary.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionaryFactory.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionaryFactory.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/Microsoft.AspNetCore.Mvc.ViewFeatures.csproj'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/src/Microsoft.AspNetCore.Mvc.ViewFeatures.csproj'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Shipped.txt'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Shipped.txt'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Unshipped.txt'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Unshipped.txt'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/test/ViewDataDictionaryTest.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/test/ViewDataDictionaryTest.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/test/ViewDataDictionaryOfTModelTest.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/test/ViewDataDictionaryOfTModelTest.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/test/Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/test/Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/TemplateBuilder.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/src/TemplateBuilder.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/HtmlHelper.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/src/HtmlHelper.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:global.json'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:global.json'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:eng/Versions.props'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:eng/Versions.props'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.Abstractions/src/ModelBinding/ValueProviderResult.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.Abstractions/src/ModelBinding/ValueProviderResult.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' '--no-pager' 'log' '--format=%H %s' '37e809ead5824bc753a1c3d56f11615bdb1296c5..f2484a6bf688bd1acb1af13802255c2c23a071dd' '--' 'src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionary.cs' 'src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionaryOfT.cs' 'src/Shared/CopyOnWriteDictionary/CopyOnWriteDictionary.cs' 'src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionaryFactory.cs' 'src/Mvc/Mvc.ViewFeatures/src/Microsoft.AspNetCore.Mvc.ViewFeatures.csproj' 'src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Shipped.txt' 'src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Unshipped.txt' 'src/Mvc/Mvc.ViewFeatures/test/ViewDataDictionaryTest.cs' 'src/Mvc/Mvc.ViewFeatures/test/ViewDataDictionaryOfTModelTest.cs' 'src/Mvc/Mvc.ViewFeatures/test/Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj' 'src/Mvc/Mvc.ViewFeatures/src/TemplateBuilder.cs' 'src/Mvc/Mvc.ViewFeatures/src/HtmlHelper.cs'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/dotnet/aspnetcore/commits?path=src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionary.cs&per_page=8&sha=f2484a6bf688bd1acb1af13802255c2c23a071dd'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/dotnet/aspnetcore/commits?path=src/Shared/CopyOnWriteDictionary/CopyOnWriteDictionary.cs&per_page=8&sha=f2484a6bf688bd1acb1af13802255c2c23a071dd'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'search' 'prs' 'ViewDataDictionary' '--repo' 'dotnet/aspnetcore' '--limit' '15' '--json' 'number,title,url,state,updatedAt'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'search' 'issues' 'ViewDataDictionary GetEnumerator' '--repo' 'dotnet/aspnetcore' '--limit' '15' '--json' 'number,title,url,state,updatedAt'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'search' 'prs' 'ViewDataDictionary enumerator' '--repo' 'dotnet/aspnetcore' '--limit' '15' '--json' 'number,title,url,state,updatedAt'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' 'repos/dotnet/AspNetCore.Docs/branches/main'
```

## initial-actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'gh' 'api' '-H' 'Accept: application/vnd.github.raw+json' 'repos/dotnet/AspNetCore.Docs/contents/aspnetcore/mvc/views/overview.md?ref=33a0a8d8a51f4ac99b1aeb67ffaab69519d784dd'
```

## profiles\characterize-comparison-candidate\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-candidate\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-candidate\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-candidate\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\profiles\characterize-comparison-candidate'
```

## preparation-reproduction-original\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\independent-reproduction\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\independent-reproduction\harness\Contracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\independent-reproduction\harness\EnumerationBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\independent-reproduction\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\independent-reproduction\harness\Scenario.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\independent-reproduction\harness\SettingsPreservingEmitToolchain.cs'
```

## preparation-reproduction-original\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\independent-reproduction\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\independent-reproduction\harness\Contracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\independent-reproduction\harness\EnumerationBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\independent-reproduction\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\independent-reproduction\harness\Scenario.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\independent-reproduction\harness\SettingsPreservingEmitToolchain.cs' '--verify-no-changes'
```

## preparation-reproduction-original\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\independent-reproduction\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## preparation-original-001\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\harness\Contracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\harness\EnumerationBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\harness\Scenario.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\harness\SettingsPreservingEmitToolchain.cs'
```

## preparation-original-001\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\harness\Contracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\harness\EnumerationBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\harness\Scenario.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\harness\SettingsPreservingEmitToolchain.cs' '--verify-no-changes'
```

## preparation-original-001\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## constructor-dependency-review\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Mvc/Mvc.ViewFeatures/src/TemplateInfo.cs'
```

## constructor-dependency-review\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' 'show' 'f2484a6bf688bd1acb1af13802255c2c23a071dd:src/Mvc/Mvc.ViewFeatures/src/TemplateInfo.cs'
```

## constructor-dependency-review\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' '--no-pager' 'diff' '37e809ead5824bc753a1c3d56f11615bdb1296c5' 'f2484a6bf688bd1acb1af13802255c2c23a071dd' '--' 'src/Mvc/Mvc.ViewFeatures/src/TemplateInfo.cs'
```

## constructor-dependency-review\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
& 'git' '--no-pager' 'log' '--format=%H %cI %s' '37e809ead5824bc753a1c3d56f11615bdb1296c5..f2484a6bf688bd1acb1af13802255c2c23a071dd' '--' 'src/Mvc/Mvc.ViewFeatures/src/TemplateInfo.cs'
```

## comparison-preparation-original\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-harness\Contracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-harness\EnumerationBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-harness\Scenario.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-harness\SettingsPreservingEmitToolchain.cs'
```

## comparison-preparation-original\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'format' 'whitespace' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-harness' '--folder' '--verbosity' 'minimal' '--include' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-harness\Contracts.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-harness\EnumerationBenchmarks.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-harness\Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-harness\Scenario.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-harness\SettingsPreservingEmitToolchain.cs' '--verify-no-changes'
```

## comparison-preparation-original\actual-invocations.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-nr:false' '-p:UseSharedCompilation=false' '-p:UseIisNativeAssets=false' '-p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config' '-v' 'minimal'
```

## profiles\characterize-comparison-original\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-original\consumer\AutoPerf.Benchmarks.dll' '--mode' 'characterize' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-original\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-original\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\profiles\characterize-comparison-original'
```

## profiles\comparison-2-candidate\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-candidate\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-candidate\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-candidate\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\profiles\comparison-2-candidate' '--filter' '*'
```

## profiles\comparison-1-candidate\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-candidate\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-candidate\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-candidate\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\profiles\comparison-1-candidate' '--filter' '*'
```

## profiles\comparison-1-original\invocation.json:actual exit 0
```powershell
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-original\consumer\AutoPerf.Benchmarks.dll' '--mode' 'measure' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-original\prepared\sources' '--closure' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\comparison-preparation-original\prepared\closure.json' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F036\profiles\comparison-1-original' '--filter' '*'
```

## Interpretation and boundaries
All19XMLrows pass on original,candidate and restored original,including every8-row metadata and both null/23 integer theory cases;57executions,not57distinct cases. Preservation work,not a semantic bug-fix red/green claim.
Four33semantic/32lifecycle collections exactly match. Real public base/typed/copy producers,live source/first-write detachment,nested/stale cursors,unsuccessful Remove and derived-order materialization are exercised. No injected producer callbacks.
Original-only six-file relocation rebuilt0warnings/0errors and reproduced both entire record collections byte-for-byte,without retiming. Comparison harness not separately relocated;timed bodies unchanged across phases;measured original/candidate harness DLL/PDB identical.
Three source pairs192rows/1536samples plus separate32diagnostic rows/256samples:all1792stdout/JSONsamples matched;mean,sample variance,SD,SE recomputed. Primary takes1.93/7.54/10.66%more time;56B/opunchanged. All96paired allocation observations match. Favorable scaled rows and adverse controls retained. No fourth comparison.
Each measured289-file consumer differs in2owner files:287unchanged includes2harness,leaving285other files. Live audit:1156consumer checks,824loaded bindings,1255unique files;all11captured native runtime PIDs checked. Selected PE/PDB/source witnesses cover99document associations,not full provenance or coverage.
Twelve selected current-default files match;TemplateInfo constructor drift does not. Construction,detachment,writes excluded. Shared non-isolated Windows VM;no priority/affinity/power/OS-network changes. No full-current-main construction,Razor/HTTP,application throughput or native JIT-causation proof.
All standalone builds and native profiles pass. Non-timing authoring patch,statistics CLI-entry and combined-auditor path/schema corrections are retained separately;no raw timing,source-comparison budget or shipping source changed. Original shipping source/product restored;unchanged independent fork ref verified;no optimization commit or performance PR.

## Copied read-only audit:actual exit0,passed during packaging
```powershell
node .\F036-audit.mjs . --verify
```
