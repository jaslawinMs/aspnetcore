# F010 exact historical commands and observed outcomes

Every fresh dotnet shell activates `. .\activate.ps1` from `C:\src\aspnetcore`. Three original/candidate comparisons and their six profiles are permanently closed;these are guarded historical commands,not permission to rerun or overwrite evidence.

## analysis-attempts\independent-audit\attempt-001\execution.json: actual exit1
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F010-reproduce-analysis.mjs'
```

## analysis-attempts\independent-audit\attempt-002\execution.json: actual exit1
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F010-reproduce-analysis.mjs'
```

## analysis-attempts\independent-audit\attempt-003\execution.json: actual exit0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F010-reproduce-analysis.mjs'
```

## analysis-tools\binlog-reader-execution\execution.json:restore-new-sdk-reference-manifest actual exit0
```powershell
. .\activate.ps1
dotnet 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\analysis-tools\binlog-reader\AutoPerf.BinlogReader.csproj' '--configfile' 'C:\src\aspnetcore\NuGet.config' '-m:2' '-v:q'
```

## analysis-tools\binlog-reader-execution\execution.json:compile-reader actual exit0
```powershell
. .\activate.ps1
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\analysis-tools\binlog-reader\AutoPerf.BinlogReader.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q'
```

## analysis-tools\binlog-reader-execution\execution.json:read-actual-pack-binlog actual exit0
```powershell
. .\activate.ps1
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\analysis-tools\binlog-reader\bin\Release\net12.0\AutoPerf.BinlogReader.dll' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\builds\candidate\pack-with-existing-package-validation.binlog' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\package-validation-proof.json'
```

## builds\candidate\execution.json:owning-test-build actual exit0
```powershell
. .\activate.ps1
dotnet 'build' 'src\Security\Authorization\test\Microsoft.AspNetCore.Authorization.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\builds\candidate\owning-test-build.binlog'
```

## builds\candidate\execution.json:owning-tests actual exit0
```powershell
. .\activate.ps1
dotnet 'test' 'src\Security\Authorization\test\Microsoft.AspNetCore.Authorization.Test.csproj' '--no-build' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '--logger' 'trx;LogFileName=owning-candidate.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\tests\candidate'
```

## builds\candidate\execution.json:pack-with-existing-package-validation actual exit0
```powershell
. .\activate.ps1
dotnet 'pack' 'src\Security\Authorization\Core\src\Microsoft.AspNetCore.Authorization.csproj' '--no-restore' '--no-build' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '--output' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\packages\candidate' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\builds\candidate\pack-with-existing-package-validation.binlog'
```

## builds\candidate\execution.json:changed-source-whitespace-format-check actual exit0
```powershell
. .\activate.ps1
dotnet 'format' 'whitespace' 'src\Security\Authorization\test\Microsoft.AspNetCore.Authorization.Test.csproj' '--no-restore' '--verify-no-changes' '--include' 'src\Security\Authorization\Core\src\ClaimsAuthorizationRequirement.cs' 'src\Security\Authorization\test\DefaultAuthorizationServiceTests.cs' '--verbosity' 'quiet'
```

## builds\candidate\execution.json:legacy-characterization actual exit0
```powershell
C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\images\legacy-candidate\AutoPerf.Compatibility.exe 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\characterization\legacy-candidate' 'candidate-net462-on-actual-framework48' '.NETFramework,Version=v4.6.2' '6375C0C3822C7BCEBC2E06866948073636E0B5E3E261D9804CE6D49530BA6D6F'
```

## builds\candidate\execution.json:standard-characterization actual exit0
```powershell
. .\activate.ps1
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\images\standard-candidate\AutoPerf.Compatibility.dll' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\characterization\standard-candidate' 'candidate-netstandard2-on-net12' '.NETStandard,Version=v2.0' '32CC31BC2C7AFC440D4FE2DAD4C70317AAA7D618D2396BDC25BE4E6713E64B7E'
```

## builds\candidate\execution.json:primary-characterization-and-all-pdb-bindings actual exit0
```powershell
. .\activate.ps1
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\images\candidate\AutoPerf.Benchmarks.dll' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\sources\candidate' '--context' 'candidate' '--test-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\tests\candidate\test-image\Microsoft.AspNetCore.Authorization.Test.dll' '--legacy-image' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\images\legacy-candidate' '--standard-image' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\images\standard-candidate' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\characterization\candidate'
```

## builds\original\execution.json:restore-new-compatibility-manifest actual exit0
```powershell
. .\activate.ps1
dotnet 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\compatibility\AutoPerf.Compatibility.csproj' '--configfile' 'C:\src\aspnetcore\NuGet.config' '-m:2' '-v:q' '-p:UseIisNativeAssets=false'
```

## builds\original\execution.json:build-frozen-benchmark actual exit0
```powershell
. .\activate.ps1
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\builds\original\build-frozen-benchmark.binlog'
```

## builds\original\execution.json:build-frozen-compatibility-net462 actual exit0
```powershell
. .\activate.ps1
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\compatibility\AutoPerf.Compatibility.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-f' 'net462' '-t:Rebuild' '-m:2' '-v:q' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\builds\original\build-frozen-compatibility-net462.binlog'
```

## builds\original\execution.json:build-frozen-compatibility-net12.0 actual exit0
```powershell
. .\activate.ps1
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\compatibility\AutoPerf.Compatibility.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-f' 'net12.0' '-t:Rebuild' '-m:2' '-v:q' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\builds\original\build-frozen-compatibility-net12.0.binlog'
```

## builds\original\execution.json:legacy-characterization actual exit0
```powershell
C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\images\legacy-original\AutoPerf.Compatibility.exe 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\characterization\legacy-original' 'original-net462-on-actual-framework48' '.NETFramework,Version=v4.6.2' 'B5ABA48147AA454307342A677902690F314DB34B4DCE234953477D3874D9A8D3'
```

## builds\original\execution.json:standard-characterization actual exit0
```powershell
. .\activate.ps1
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\images\standard-original\AutoPerf.Compatibility.dll' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\characterization\standard-original' 'original-netstandard2-on-net12' '.NETStandard,Version=v2.0' '5C0AC5D6EBFDFB3F67307B0C8EF8B3C6E97250F01A113AB37744BCBEEAF83655'
```

## builds\original\execution.json:primary-characterization-and-all-pdb-bindings actual exit0
```powershell
. .\activate.ps1
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\images\original\AutoPerf.Benchmarks.dll' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\sources\original' '--context' 'original' '--test-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\tests\original\test-image\Microsoft.AspNetCore.Authorization.Test.dll' '--legacy-image' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\images\legacy-original' '--standard-image' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\images\standard-original' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\characterization\original'
```

## investigation\additional-canonical-proof\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Security/Authorization/Core/src/LoggingExtensions.cs'
```

## investigation\additional-canonical-proof\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Security/Authorization/Core/src/LoggingExtensions.cs'
```

## investigation\additional-canonical-proof\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Http/Metadata/src/Microsoft.AspNetCore.Metadata.csproj'
```

## investigation\additional-canonical-proof\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Http/Metadata/src/Microsoft.AspNetCore.Metadata.csproj'
```

## investigation\execution.json:transition-head actual exit0
```powershell
git 'rev-parse' 'HEAD'
```

## investigation\execution.json:transition-unstaged actual exit0
```powershell
git 'diff' '--name-only'
```

## investigation\execution.json:transition-staged actual exit0
```powershell
git 'diff' '--cached' '--name-only'
```

## investigation\execution.json:create-independent-branch actual exit0
```powershell
git 'switch' '-c' 'autoperf/F010-claims-allowed-values-membership' '37e809ead5824bc753a1c3d56f11615bdb1296c5'
```

## investigation\execution.json:current-default actual exit0
```powershell
gh 'api' 'repos/dotnet/aspnetcore/branches/main'
```

## investigation\execution.json:current-present actual exit0
```powershell
git 'cat-file' '-e' '49147673007a4b1d676694e2c5f85b83ad76c36f^{commit}'
```

## investigation\execution.json:baseline-source-0 actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Security/Authorization/Core/src/ClaimsAuthorizationRequirement.cs'
```

## investigation\execution.json:default-source-0 actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Security/Authorization/Core/src/ClaimsAuthorizationRequirement.cs'
```

## investigation\execution.json:baseline-source-1 actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Security/Authorization/Core/src/AuthorizationPolicyBuilder.cs'
```

## investigation\execution.json:default-source-1 actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Security/Authorization/Core/src/AuthorizationPolicyBuilder.cs'
```

## investigation\execution.json:baseline-source-2 actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Security/Authorization/Core/src/AuthorizationServiceExtensions.cs'
```

## investigation\execution.json:default-source-2 actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Security/Authorization/Core/src/AuthorizationServiceExtensions.cs'
```

## investigation\execution.json:baseline-source-3 actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Security/Authorization/Core/src/AuthorizationHandler.cs'
```

## investigation\execution.json:default-source-3 actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Security/Authorization/Core/src/AuthorizationHandler.cs'
```

## investigation\execution.json:baseline-source-4 actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Security/Authorization/Core/src/PassThroughAuthorizationHandler.cs'
```

## investigation\execution.json:default-source-4 actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Security/Authorization/Core/src/PassThroughAuthorizationHandler.cs'
```

## investigation\execution.json:baseline-source-5 actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Security/Authorization/Core/src/DefaultAuthorizationService.cs'
```

## investigation\execution.json:default-source-5 actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Security/Authorization/Core/src/DefaultAuthorizationService.cs'
```

## investigation\execution.json:baseline-source-6 actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Security/Authorization/Core/src/DefaultAuthorizationServiceImpl.cs'
```

## investigation\execution.json:default-source-6 actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Security/Authorization/Core/src/DefaultAuthorizationServiceImpl.cs'
```

## investigation\execution.json:baseline-source-7 actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Security/Authorization/Core/src/AuthorizationHandlerContext.cs'
```

## investigation\execution.json:default-source-7 actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Security/Authorization/Core/src/AuthorizationHandlerContext.cs'
```

## investigation\execution.json:baseline-source-8 actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Security/Authorization/Core/src/DefaultAuthorizationHandlerContextFactory.cs'
```

## investigation\execution.json:default-source-8 actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Security/Authorization/Core/src/DefaultAuthorizationHandlerContextFactory.cs'
```

## investigation\execution.json:baseline-source-9 actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Security/Authorization/Core/src/DefaultAuthorizationHandlerProvider.cs'
```

## investigation\execution.json:default-source-9 actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Security/Authorization/Core/src/DefaultAuthorizationHandlerProvider.cs'
```

## investigation\execution.json:baseline-source-10 actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Security/Authorization/Core/src/DefaultAuthorizationEvaluator.cs'
```

## investigation\execution.json:default-source-10 actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Security/Authorization/Core/src/DefaultAuthorizationEvaluator.cs'
```

## investigation\execution.json:baseline-source-11 actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Security/Authorization/Core/src/AuthorizationServiceCollectionExtensions.cs'
```

## investigation\execution.json:default-source-11 actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Security/Authorization/Core/src/AuthorizationServiceCollectionExtensions.cs'
```

## investigation\execution.json:baseline-source-12 actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Security/Authorization/Core/src/AuthorizationPolicy.cs'
```

## investigation\execution.json:default-source-12 actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Security/Authorization/Core/src/AuthorizationPolicy.cs'
```

## investigation\execution.json:baseline-source-13 actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Security/Authorization/Core/src/AuthorizationMetrics.cs'
```

## investigation\execution.json:default-source-13 actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Security/Authorization/Core/src/AuthorizationMetrics.cs'
```

## investigation\execution.json:baseline-source-14 actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Security/Authorization/Core/src/Microsoft.AspNetCore.Authorization.csproj'
```

## investigation\execution.json:default-source-14 actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Security/Authorization/Core/src/Microsoft.AspNetCore.Authorization.csproj'
```

## investigation\execution.json:baseline-source-15 actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Security/Authorization/test/ClaimsAuthorizationRequirementTests.cs'
```

## investigation\execution.json:default-source-15 actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Security/Authorization/test/ClaimsAuthorizationRequirementTests.cs'
```

## investigation\execution.json:baseline-source-16 actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Security/Authorization/test/DefaultAuthorizationServiceTests.cs'
```

## investigation\execution.json:default-source-16 actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Security/Authorization/test/DefaultAuthorizationServiceTests.cs'
```

## investigation\execution.json:baseline-source-17 actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Security/Authorization/test/Microsoft.AspNetCore.Authorization.Test.csproj'
```

## investigation\execution.json:default-source-17 actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Security/Authorization/test/Microsoft.AspNetCore.Authorization.Test.csproj'
```

## investigation\execution.json:baseline-source-18 actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Security/perf/Microbenchmarks/ClaimsAuthorizationRequirementBenchmark.cs'
```

## investigation\execution.json:default-source-18 actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Security/perf/Microbenchmarks/ClaimsAuthorizationRequirementBenchmark.cs'
```

## investigation\execution.json:owner-history actual exit0
```powershell
git '--no-pager' 'log' '--format=%H %ad %s' '--date=iso-strict' '-n' '8' '49147673007a4b1d676694e2c5f85b83ad76c36f' '--' 'src\Security\Authorization\Core\src\ClaimsAuthorizationRequirement.cs'
```

## investigation\execution.json:value-matching-history actual exit0
```powershell
git '--no-pager' 'log' '-p' '-S' 'AllowedValues!.Contains' '-n' '3' '49147673007a4b1d676694e2c5f85b83ad76c36f' '--' 'src\Security\Authorization\Core\src\ClaimsAuthorizationRequirement.cs'
```

## investigation\execution.json:related-claims-prs actual exit0
```powershell
gh 'search' 'prs' 'ClaimsAuthorizationRequirement' '--repo' 'dotnet/aspnetcore' '--limit' '12' '--json' 'number,title,state,url,author'
```

## investigation\execution.json:related-direct-set-prs actual exit0
```powershell
gh 'search' 'prs' 'RequireClaim HashSet' '--repo' 'dotnet/aspnetcore' '--limit' '8' '--json' 'number,title,state,url,author'
```

## investigation\execution.json:current-sdk-context actual exit0
```powershell
git '--no-pager' 'diff' '37e809ead5824bc753a1c3d56f11615bdb1296c5' '49147673007a4b1d676694e2c5f85b83ad76c36f' '--' 'global.json' 'eng/Versions.props'
```

## measurements\comparison-1\comparison-execution.json: actual exit0
```powershell
. .\activate.ps1
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\images\original\AutoPerf.Benchmarks.dll' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\sources\original' '--context' 'original-comparison-1' '--measure' '--filter' '*ClaimBenchmarks*' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\measurements\comparison-1\original'
```

## measurements\comparison-1\comparison-execution.json: actual exit0
```powershell
. .\activate.ps1
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\images\candidate\AutoPerf.Benchmarks.dll' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\sources\candidate' '--context' 'candidate-comparison-1' '--measure' '--filter' '*ClaimBenchmarks*' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\measurements\comparison-1\candidate'
```

## measurements\comparison-2\comparison-execution.json: actual exit0
```powershell
. .\activate.ps1
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\images\candidate\AutoPerf.Benchmarks.dll' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\sources\candidate' '--context' 'candidate-comparison-2' '--measure' '--filter' '*ClaimBenchmarks*' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\measurements\comparison-2\candidate'
```

## measurements\comparison-2\comparison-execution.json: actual exit0
```powershell
. .\activate.ps1
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\images\original\AutoPerf.Benchmarks.dll' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\sources\original' '--context' 'original-comparison-2' '--measure' '--filter' '*ClaimBenchmarks*' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\measurements\comparison-2\original'
```

## measurements\comparison-3\comparison-execution.json: actual exit0
```powershell
. .\activate.ps1
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\images\original\AutoPerf.Benchmarks.dll' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\sources\original' '--context' 'original-comparison-3' '--measure' '--filter' '*ClaimBenchmarks*' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\measurements\comparison-3\original'
```

## measurements\comparison-3\comparison-execution.json: actual exit0
```powershell
. .\activate.ps1
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\images\candidate\AutoPerf.Benchmarks.dll' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\sources\candidate' '--context' 'candidate-comparison-3' '--measure' '--filter' '*ClaimBenchmarks*' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\measurements\comparison-3\candidate'
```

## preparation-attempts\attempt-1\builds\original\execution.json:restore-new-benchmark-manifest actual exit0
```powershell
. .\activate.ps1
dotnet 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\harness\AutoPerf.Benchmarks.csproj' '--configfile' 'C:\src\aspnetcore\NuGet.config' '-m:2' '-v:q' '-p:UseIisNativeAssets=false'
```

## preparation-attempts\attempt-1\builds\original\execution.json:restore-new-compatibility-manifest actual exit0
```powershell
. .\activate.ps1
dotnet 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\compatibility\AutoPerf.Compatibility.csproj' '--configfile' 'C:\src\aspnetcore\NuGet.config' '-m:2' '-v:q' '-p:UseIisNativeAssets=false'
```

## preparation-attempts\attempt-1\builds\original\execution.json:build-frozen-benchmark actual exit0
```powershell
. .\activate.ps1
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\builds\original\build-frozen-benchmark.binlog'
```

## preparation-attempts\attempt-1\builds\original\execution.json:build-frozen-compatibility-net462 actual exit0
```powershell
. .\activate.ps1
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\compatibility\AutoPerf.Compatibility.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-f' 'net462' '-t:Rebuild' '-m:2' '-v:q' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\builds\original\build-frozen-compatibility-net462.binlog'
```

## preparation-attempts\attempt-1\builds\original\execution.json:build-frozen-compatibility-net12.0 actual exit0
```powershell
. .\activate.ps1
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\compatibility\AutoPerf.Compatibility.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-f' 'net12.0' '-t:Rebuild' '-m:2' '-v:q' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\builds\original\build-frozen-compatibility-net12.0.binlog'
```

## preparation-attempts\attempt-1\builds\original\execution.json:legacy-characterization actual exit-532462766
```powershell
C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\images\legacy-original\AutoPerf.Compatibility.exe 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\characterization\legacy-original' 'original-net462-on-actual-framework48' '.NETFramework,Version=v4.6.2' 'B5ABA48147AA454307342A677902690F314DB34B4DCE234953477D3874D9A8D3'
```

## preparation-attempts\candidate-1\builds\candidate\execution.json:fresh-owner-net462 actual exit0
```powershell
. .\activate.ps1
dotnet 'build' 'src\Security\Authorization\Core\src\Microsoft.AspNetCore.Authorization.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-f' 'net462' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\builds\candidate\fresh-owner-net462.binlog'
```

## preparation-attempts\candidate-1\builds\candidate\execution.json:fresh-owner-netstandard2.0 actual exit0
```powershell
. .\activate.ps1
dotnet 'build' 'src\Security\Authorization\Core\src\Microsoft.AspNetCore.Authorization.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-f' 'netstandard2.0' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\builds\candidate\fresh-owner-netstandard2.0.binlog'
```

## preparation-attempts\candidate-1\builds\candidate\execution.json:fresh-owner-net12.0 actual exit0
```powershell
. .\activate.ps1
dotnet 'build' 'src\Security\Authorization\Core\src\Microsoft.AspNetCore.Authorization.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-f' 'net12.0' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\builds\candidate\fresh-owner-net12.0.binlog'
```

## preparation-attempts\candidate-1\builds\candidate\execution.json:owning-test-build actual exit1
```powershell
. .\activate.ps1
dotnet 'build' 'src\Security\Authorization\test\Microsoft.AspNetCore.Authorization.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\builds\candidate\owning-test-build.binlog'
```

## tests\original\execution.json:fresh-owner-net462 actual exit0
```powershell
. .\activate.ps1
dotnet 'build' 'src\Security\Authorization\Core\src\Microsoft.AspNetCore.Authorization.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-f' 'net462' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\tests\original\fresh-owner-net462.binlog'
```

## tests\original\execution.json:fresh-owner-netstandard2.0 actual exit0
```powershell
. .\activate.ps1
dotnet 'build' 'src\Security\Authorization\Core\src\Microsoft.AspNetCore.Authorization.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-f' 'netstandard2.0' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\tests\original\fresh-owner-netstandard2.0.binlog'
```

## tests\original\execution.json:fresh-owner-net12.0 actual exit0
```powershell
. .\activate.ps1
dotnet 'build' 'src\Security\Authorization\Core\src\Microsoft.AspNetCore.Authorization.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-f' 'net12.0' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\tests\original\fresh-owner-net12.0.binlog'
```

## tests\original\execution.json:owning-test-build actual exit0
```powershell
. .\activate.ps1
dotnet 'build' 'src\Security\Authorization\test\Microsoft.AspNetCore.Authorization.Test.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\tests\original\owning-test-build.binlog'
```

## tests\original\execution.json:owning-tests actual exit0
```powershell
. .\activate.ps1
dotnet 'test' 'src\Security\Authorization\test\Microsoft.AspNetCore.Authorization.Test.csproj' '--no-build' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '--logger' 'trx;LogFileName=owning-original.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F010\tests\original'
```

## Results and retained failures
Original full owner suite214passed/0failed/0skipped=212area+2sentinels;candidate219/0/0=217area+2sentinels. Both rows of UsesOrdinalHashSetValueComparison and UsesLiveAllowedSet plus UsesOverriddenAllowedValuesEnumeration explicitly checked. All3 owner TFMs build;39/39/50 final public checks per role. Actual enabled pack task executes successfully;existing nonservicing released-baseline comparison remains disabled. Scoped whitespace exits0.

Original preparation1 compiles all consumers with wrong unused Metadata-name warnings,then native net462 exits-532462766 after25 producer records on incorrect harness deferred-count assumption. Actual eager failure formatting explains counts2/3/4;corrected harness/reference passes. Candidate preparation1 owner builds all pass then test build exits1/xUnit2017;Boolean-local repair preserves assertions and reuses exact unchanged owners. Extractor1 exits1 for wrong GC prefix;independent audit1 wrong additional-source folder,audit2 setup-only native field assumption,audit3 passes. No timing repeated or budget reset.

## Actual measured source publication: exit0,actual fork ref/both canonical source blobs verified
```powershell
git '-c' 'credential.helper=' '-c' 'credential.helper=!gh auth git-credential' 'push' 'autoperf' 'autoperf/F010-claims-allowed-values-membership'
```

## Actual copied portable audit: exit0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-published-results\F010\reproduce-analysis.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-published-results\F010' --verify
```
Independent copied source/native producer/TRX/raw-sample/GC/statistical consistency passed;omitted binaries/binlogs/packages not rehashed or replayed.
