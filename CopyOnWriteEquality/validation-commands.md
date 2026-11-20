# F151/F152 exact validation boundaries and results

All commands were untimed. Native .NET invocations first activated the corresponding checkout with `. .\activate.ps1`, with certificate generation/tool-path mutation disabled and MSBuild node reuse disabled. Exact ArgumentLists, directories, selected executable, environments, streams and lifecycle records are retained under [owner-handoff/logs](owner-handoff/logs).

## Real source-owner characterization

| Command record / proof | Actual outcome |
|---|---|
| [Original 183 assertion rows and four requests](owner-handoff/outputs/original/resume02-producer-characterization.json) | Passed, actual source-owned MVC, exact runtime 12.0.0-alpha.1.26557.102 |
| [Default 183 assertion rows and four requests](owner-handoff/outputs/default/resume02-producer-characterization.json) | Passed, independently selected source-owned MVC, same explicitly selected runtime |
| [Exact native-process closure](owner-handoff/manifest/final-process-lifecycle.json) | Fourteen recorded owned native roots terminal; no worker-owned process remained |
| [Earlier failed owner-loading attempt and other failures](owner-handoff/handoff.json) | Preserved; failure is not counted as producer success |

The actual reproduction entry point is the handoff's `scripts\Resume-Characterization.ps1 -RunId <fresh> -UseInstalledRuntimeForDefaultExistingTests`. It requires the retained exact source/output/runtime inputs. Existing immutable run directories must not be overwritten. The copied source projects/scripts are runnable inputs, not turnkey full-clone reconstruction.

## Original and historical default existing tests

The three exact names are retained in [existing-test-results.json](owner-handoff/manifest/existing-test-results.json).

| Execution | Result | Exact record |
|---|---|---|
| Original canonical requested/actual 12.0.0-alpha.1.26562.105 | **3/3 passed**, zero skipped | [Actual XML](owner-handoff/outputs/original/test-results/targeted.trx) |
| Default canonical request for 12.0.0-alpha.1.26568.110 in its own SDK root | **Blocked before any assertion**, not passed/skipped | [Exact command](owner-handoff/logs/default/resume02-existing-mvc-tests.command.json), [actual error](owner-handoff/logs/default/resume02-existing-mvc-tests.stderr.txt) |
| Explicit default fallback requesting 12.0.0-alpha.1.26557.102 with RollForward=Disable | **3/3 passed**, zero skipped; not a canonical pass | [Exact command](owner-handoff/logs/default/resume03-existing-tests-explicit-runtime.command.json), [actual XML](owner-handoff/outputs/default/test-results/resume03-explicit-runtime.trx) |

## Later canonical default prerequisite resolution

No installation or rebuild was needed. The existing private F145 runtime contained .NET 12.0.0-alpha.1.26568.110. The coordinator copied the complete existing default test consumer and unchanged original canonical runtimeconfig into a fresh output directory and invoked VSTest with that exact already-available host.

```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F151-verify-canonical-default-007.ps1'
```

**Passed:** same three exact XML rows, zero failed/skipped. Source owner SHA256 remains `5D7628E0E23C9378BC8A264C81AB04C65F7A44AA3495792881202B95157DBEF8`. Canonical config was copied, not edited; original 230-file capsule unchanged.

The [exact invocation and ArgumentList](canonical-default-007/invocation.json) uses the private runtime's `dotnet.exe exec --fx-version 12.0.0-alpha.1.26568.110 --roll-forward Disable` with the existing SDK's `vstest.console.dll`, copied test DLL, exact three-name filter, fresh result path and diagnostics. Process-only `DOTNET_ROOT`, `DOTNET_ROOT_X64` and `DOTNET_HOST_PATH` select that existing private runtime. [Native host-resolution trace](canonical-default-007/dotnet-host-trace.log), [actual XML](canonical-default-007/results/canonical-default.trx), [verified result](canonical-default-007/verified-canonical-default.json).

The three formerly blocked tests now all reach their assertions and pass:

1. `Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvokerProviderTest.OnExecuting_ConfiguresModelState_WithMvcOptions`
2. `Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvokerTest.AddingValueProviderFactory_AtResourceFilter_IsAvailableInControllerContext`
3. `Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvokerTest.DeletingValueProviderFactory_AtResourceFilter_IsNotAvailableInControllerContext`

## Portable historical audit

```powershell
node .\verify.mjs . --require-seal
```

**Passed:** copied/core file hashes; 366 individual producer/helper/identity assertions with their 136/36/11 per-pin partitions; exact four real requests per pin; source-owner identity; all nine individual passing XML executions; preserved initial canonical failure; actual later canonical resolution; distinct decisions; both zero-authorization closed budgets. No native .NET host, benchmark, allocation counter or candidate is executed by this audit.

The first portable-auditor attempt incorrectly expected a JSON Boolean for one producer observation; that probe deliberately records expected/actual values as strings. The parser now requires the exact recorded `"False"` on both sides. Raw records and all assertions were unchanged; [the failed audit invocation is retained](capsule-audit-first-run.json).

No performance comparison or regression-fix red/green claim is made. Helper-only equality divergence is not evidence that the real producer closes generic `T` over a value type.
