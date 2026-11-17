# F001 exact historical commands and observed outcomes

Every fresh dotnet shell activates `. .\activate.ps1` at `C:\src\aspnetcore`. One original-only3-case diagnostic,zero changed-source profiles/comparisons. Historical overwrite guards intentionally prohibit replaying into completed outputs.

## build\attempt1\execution.json: actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-v:quiet' '--nologo'
```

## build\attempt2\execution.json: actual exit0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '-m:2' '-v:quiet' '--nologo' '--no-restore'
```

## context-amendment.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Shared/runtime/Http3/Http3StreamType.cs'
```

## context-amendment.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Shared/runtime/Http3/Http3StreamType.cs'
```

## context-amendment.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/Kestrel/shared/test/TestServiceContext.cs'
```

## context-amendment.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Servers/Kestrel/shared/test/TestServiceContext.cs'
```

## context-amendment.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:docs/WebTransport.md'
```

## context-amendment.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:docs/WebTransport.md'
```

## context-amendment.json: actual exit0
```powershell
git '--no-pager' 'diff' '37e809ead5824bc753a1c3d56f11615bdb1296c5' '49147673007a4b1d676694e2c5f85b83ad76c36f' '--' 'src/Servers/Kestrel/Core/src/Internal/Http3/Http3Stream.cs'
```

## development\analysis-attempt1-execution.json: actual exit0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F001-reproduce-analysis.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001'
```

## development\original-prep1\execution.json: actual exit-532462766
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep1\AutoPerf.Benchmarks.dll' '--characterize' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\characterization\original-prep1\states'
```

## development\original-prep2\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\AutoPerf.Benchmarks.dll' '--characterize' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\characterization\original-prep2\states'
```

## investigation\bdn-memory-accounting\borrowed-source-read-execution.json: actual exit0
```powershell
gh 'api' 'repos/dotnet/BenchmarkDotNet/contents/src/BenchmarkDotNet/Engines/GcStats.cs?ref=v0.13.0' '-H' 'Accept: application/vnd.github.raw+json'
```

## investigation\execution.json: actual exit0
```powershell
git 'status' '--porcelain' '--untracked-files=no'
```

## investigation\execution.json: actual exit0
```powershell
gh 'api' 'repos/dotnet/aspnetcore/commits/main' '--jq' '.sha'
```

## investigation\execution.json: actual exit0
```powershell
git 'rev-parse' 'origin/main'
```

## investigation\execution.json: actual exit0
```powershell
git 'rev-parse' 'HEAD'
```

## investigation\execution.json: actual exit0
```powershell
git 'switch' '-c' 'autoperf/F001-webtransport-session-disposal' '37e809ead5824bc753a1c3d56f11615bdb1296c5'
```

## investigation\execution.json: actual exit0
```powershell
git 'rev-parse' 'HEAD'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/Kestrel/Core/src/Internal/WebTransport/WebTransportSession.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Servers/Kestrel/Core/src/Internal/WebTransport/WebTransportSession.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/Kestrel/Core/src/Internal/WebTransport/WebTransportStream.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Servers/Kestrel/Core/src/Internal/WebTransport/WebTransportStream.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/Kestrel/Core/src/Internal/WebTransport/WebTransportStreamType.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Servers/Kestrel/Core/src/Internal/WebTransport/WebTransportStreamType.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/Kestrel/Core/src/Internal/Http3/Http3Connection.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Servers/Kestrel/Core/src/Internal/Http3/Http3Connection.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/Kestrel/Core/src/Internal/Http3/Http3Stream.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Servers/Kestrel/Core/src/Internal/Http3/Http3Stream.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/Kestrel/Transport.Quic/src/Internal/QuicStreamContext.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Servers/Kestrel/Transport.Quic/src/Internal/QuicStreamContext.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/Kestrel/shared/CompletionPipeReader.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Servers/Kestrel/shared/CompletionPipeReader.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/Kestrel/shared/CompletionPipeWriter.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Servers/Kestrel/shared/CompletionPipeWriter.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Http/Http.Features/src/IWebTransportSession.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Http/Http.Features/src/IWebTransportSession.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Http/Http.Features/src/IHttpWebTransportFeature.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Http/Http.Features/src/IHttpWebTransportFeature.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/Kestrel/Core/src/Microsoft.AspNetCore.Server.Kestrel.Core.csproj'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Servers/Kestrel/Core/src/Microsoft.AspNetCore.Server.Kestrel.Core.csproj'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/Kestrel/test/InMemory.FunctionalTests/InMemory.FunctionalTests.csproj'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Servers/Kestrel/test/InMemory.FunctionalTests/InMemory.FunctionalTests.csproj'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/Kestrel/shared/test/Http3/Http3InMemory.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Servers/Kestrel/shared/test/Http3/Http3InMemory.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/Kestrel/test/InMemory.FunctionalTests/Http3/Http3TestBase.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Servers/Kestrel/test/InMemory.FunctionalTests/Http3/Http3TestBase.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/Kestrel/test/InMemory.FunctionalTests/Http3/WebTransport/WebTransportSessionTests.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Servers/Kestrel/test/InMemory.FunctionalTests/Http3/WebTransport/WebTransportSessionTests.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/Kestrel/test/InMemory.FunctionalTests/Http3/WebTransport/WebTransportStreamTests.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Servers/Kestrel/test/InMemory.FunctionalTests/Http3/WebTransport/WebTransportStreamTests.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/Kestrel/test/InMemory.FunctionalTests/Http3/WebTransport/WebTransportHandshakeTests.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Servers/Kestrel/test/InMemory.FunctionalTests/Http3/WebTransport/WebTransportHandshakeTests.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '37e809ead5824bc753a1c3d56f11615bdb1296c5:src/Servers/Kestrel/test/InMemory.FunctionalTests/Http3/WebTransport/WebTransportTestUtilities.cs'
```

## investigation\execution.json: actual exit0
```powershell
git 'show' '49147673007a4b1d676694e2c5f85b83ad76c36f:src/Servers/Kestrel/test/InMemory.FunctionalTests/Http3/WebTransport/WebTransportTestUtilities.cs'
```

## investigation\execution.json: actual exit0
```powershell
git '--no-pager' 'log' 'origin/main' '-12' '--format=%H %ad %s' '--date=iso-strict' '--' 'src/Servers/Kestrel/Core/src/Internal/WebTransport/WebTransportSession.cs'
```

## investigation\execution.json: actual exit0
```powershell
git '--no-pager' 'log' 'origin/main' '-12' '--format=%H %ad %s' '--date=iso-strict' '--' 'src/Servers/Kestrel/Core/src/Internal/WebTransport/WebTransportStream.cs'
```

## investigation\execution.json: actual exit0
```powershell
git '--no-pager' 'show' 'b120cefca18a2000c93e5b297d7a4d68c6e89e47' '--' 'src/Servers/Kestrel/Core/src/Internal/WebTransport/WebTransportSession.cs' 'src/Servers/Kestrel/Core/src/Internal/WebTransport/WebTransportStream.cs'
```

## investigation\execution.json: actual exit0
```powershell
git '--no-pager' 'show' '03c314bbe77aa36fffe1c97e56edd8e548d3017c' '--' 'src/Servers/Kestrel/Core/src/Internal/WebTransport/WebTransportSession.cs' 'src/Servers/Kestrel/Core/src/Internal/Http3/Http3Connection.cs' 'src/Servers/Kestrel/test/InMemory.FunctionalTests/Http3/WebTransport/WebTransportSessionTests.cs'
```

## investigation\execution.json: actual exit0
```powershell
gh 'pr' 'view' '69708' '--repo' 'dotnet/aspnetcore' '--json' 'number,title,body,url,state,mergedAt,mergeCommit,files,comments,reviews'
```

## investigation\execution.json: actual exit0
```powershell
gh 'pr' 'view' '42097' '--repo' 'dotnet/aspnetcore' '--json' 'number,title,body,url,state,mergedAt,mergeCommit'
```

## investigation\execution.json: actual exit0
```powershell
gh 'search' 'prs' 'WebTransportSession DisposeAsync' '--repo' 'dotnet/aspnetcore' '--limit' '10' '--json' 'number,title,state,url'
```

## measurements\original-diagnostic-only\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\AutoPerf.Benchmarks.dll' '--benchmark' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\measurements\original-diagnostic-only\states'
```

## pdb\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\Microsoft.AspNetCore.Server.Kestrel.Core.pdb' 'WebTransportSession.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\producer-source\src\Servers\Kestrel\Core\src\Internal\WebTransport\WebTransportSession.cs'
```

## pdb\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\Microsoft.AspNetCore.Server.Kestrel.Core.pdb' 'WebTransportStream.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\producer-source\src\Servers\Kestrel\Core\src\Internal\WebTransport\WebTransportStream.cs'
```

## pdb\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\Microsoft.AspNetCore.Server.Kestrel.Core.pdb' 'Http3Connection.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\producer-source\src\Servers\Kestrel\Core\src\Internal\Http3\Http3Connection.cs'
```

## pdb\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\Microsoft.AspNetCore.Server.Kestrel.Core.pdb' 'Http3Stream.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\producer-source\src\Servers\Kestrel\Core\src\Internal\Http3\Http3Stream.cs'
```

## pdb\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\Microsoft.AspNetCore.Server.Kestrel.Core.pdb' 'Http3StreamType.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\producer-source\src\Shared\runtime\Http3\Http3StreamType.cs'
```

## pdb\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\InMemory.FunctionalTests.pdb' 'Http3InMemory.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\producer-source\src\Servers\Kestrel\shared\test\Http3\Http3InMemory.cs'
```

## pdb\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\InMemory.FunctionalTests.pdb' 'TestServiceContext.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\producer-source\src\Servers\Kestrel\shared\test\TestServiceContext.cs'
```

## pdb\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\InMemory.FunctionalTests.pdb' 'Http3TestBase.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\producer-source\src\Servers\Kestrel\test\InMemory.FunctionalTests\Http3\Http3TestBase.cs'
```

## pdb\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\InMemory.FunctionalTests.pdb' 'WebTransportSessionTests.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\producer-source\src\Servers\Kestrel\test\InMemory.FunctionalTests\Http3\WebTransport\WebTransportSessionTests.cs'
```

## pdb\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\InMemory.FunctionalTests.pdb' 'WebTransportStreamTests.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\producer-source\src\Servers\Kestrel\test\InMemory.FunctionalTests\Http3\WebTransport\WebTransportStreamTests.cs'
```

## pdb\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\InMemory.FunctionalTests.pdb' 'WebTransportHandshakeTests.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\producer-source\src\Servers\Kestrel\test\InMemory.FunctionalTests\Http3\WebTransport\WebTransportHandshakeTests.cs'
```

## pdb\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\InMemory.FunctionalTests.pdb' 'WebTransportTestUtilities.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\producer-source\src\Servers\Kestrel\test\InMemory.FunctionalTests\Http3\WebTransport\WebTransportTestUtilities.cs'
```

## pdb\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\InMemory.FunctionalTests.pdb' 'CompletionPipeReader.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\producer-source\src\Servers\Kestrel\shared\CompletionPipeReader.cs'
```

## pdb\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\InMemory.FunctionalTests.pdb' 'CompletionPipeWriter.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\producer-source\src\Servers\Kestrel\shared\CompletionPipeWriter.cs'
```

## pdb\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\Microsoft.AspNetCore.Http.Features.pdb' 'IWebTransportSession.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\producer-source\src\Http\Http.Features\src\IWebTransportSession.cs'
```

## pdb\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\Microsoft.AspNetCore.Http.Features.pdb' 'IHttpWebTransportFeature.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\producer-source\src\Http\Http.Features\src\IHttpWebTransportFeature.cs'
```

## pdb\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\AutoPerf.Benchmarks.pdb' 'Program.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\frozen-source\original-prep2\Program.cs'
```

## pdb\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\AutoPerf.Benchmarks.pdb' 'ProtocolFixture.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\frozen-source\original-prep2\ProtocolFixture.cs'
```

## pdb\original\execution.json: actual exit0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll' 'pdb' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\binaries\original-prep2\AutoPerf.Benchmarks.pdb' 'SettingsPreservingEmitToolchain.cs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\frozen-source\original-prep2\SettingsPreservingEmitToolchain.cs'
```

## tests\original\execution.json: actual exit0
```powershell
dotnet '--info'
```

## tests\original\execution.json: actual exit0
```powershell
dotnet 'test' 'src\Servers\Kestrel\test\InMemory.FunctionalTests\InMemory.FunctionalTests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName~Microsoft.AspNetCore.Server.Kestrel.Core.Tests.WebTransport' '--list-tests' '-v:quiet'
```

## tests\original\execution.json: actual exit0
```powershell
dotnet 'test' 'src\Servers\Kestrel\test\InMemory.FunctionalTests\InMemory.FunctionalTests.csproj' '--no-restore' '--no-build' '-c' 'Release' '-m:2' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName~Microsoft.AspNetCore.Server.Kestrel.Core.Tests.WebTransport' '--logger' 'trx;LogFileName=webtransport-original.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\tests\original' '--diag' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F001\tests\original\vstest-diagnostic.log' '-v:minimal'
```

## Preserved preparation outcomes
- Initial discovery child exit0 found17 rows;outer initial display-uniqueness checker exit1 before any test execution because two source rows share truncated text. Same discovery continued without rediscovery;17 unique test/execution IDs passed once,zero skips.
- Two standalone builds exit0. First has two redundant missing Pipelines-reference warnings;second removes that reference because net12 provides it and has0 warnings. First producer preparation actual child exit-532462766:incorrect enum namespace after actual session construction. Second preparation fixes exact System.Net.Http type name and passes all six producer/leaf/opposite controls. All original source/logs/negative exits retained.
- One original-only three-case monitoring profile actual exit0. Three warmups/eight retained each;no actual overhead samples. Source comparisons0,not a comparative no-gain or optimized candidate.
- Independent full live auditor actual exit0:3 outcomes/24 retained/9 warmups/36 prepared+36 checked closed fixtures/17 exact test rows/19 PDB documents;complete frozen image and captured physical runtime identities rehashed.

## Actual unchanged independent source-branch publication:push/ref/canonical content verified
```powershell
git '-c' 'credential.helper=' '-c' 'credential.helper=!gh auth git-credential' 'push' 'autoperf' 'HEAD:refs/heads/autoperf/F001-webtransport-session-disposal'
# Actual exit0,unchanged baseline ref and canonical source matched. No source commit or PR created.
```

## Actual public copied audit:exit0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-published-results\F001\reproduce-analysis.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-published-results\F001' --verify
# Passed:3 original-only outcomes/24 retained/9 warmups/36 prepared+36 closed fixtures/17 exact test rows/19 PDB documents. Omitted DLL/PDB/runtime bytes cannot be rehashed offline.
```
