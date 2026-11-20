# F141: NativeAOT enumerator setup, without an established material workload

**Rejected at the workload gate, not measured no benefit.** The interface scan is real and the real client producer is now exercised by a native executable. It runs once per reflection-enumerator construction, not for each streamed item. No material application stream-setup frequency, relevant interface cardinality, or net cache benefit was established. No cache candidate, performance comparison, performance PR, or new browser window was authorized. The finding's own budget is permanently closed **0 of 3**.

| Artifact | Evidence |
|---|---|
| Original finding, decision, boundaries | [Coordinator acceptance](coordinator-acceptance.json), [closed budget](closed-budgets.json) |
| Before-first-publish source/input cohort | [Frozen plan](native-aot/acceptance-before-nativeaot-035.json), [unchanged consumer](native-aot/frozen-before-first-publish/Program.cs), [project](native-aot/frozen-before-first-publish/NativeUploadProbe.csproj) |
| Actual native result and entire wire frames | [Seven checks and 21 frames](native-aot/invocations/native-036/native-result.json), [actual executable start](native-aot/invocations/native-036/started.json), [terminal/drained exit](native-aot/invocations/native-036/exit.json) |
| Native executable proof and real compiler inputs | [Preexecution receipt](native-aot/native-preexecution-037.json), [ILC response](native-compiler/AutoPerf.SignalR.NativeUploadProbe.ilc.rsp), [link response](native-compiler/link.rsp) |
| Actual native output | [Native executable](native-aot/native-publish/AutoPerf.SignalR.NativeUploadProbe.exe), [native Windows PDB](native-aot/native-publish/AutoPerf.SignalR.NativeUploadProbe.pdb) |
| Managed input and source associations | [Fresh metadata index](selected-metadata.json), [Git commit/tree/blob proofs](source-provenance/proofs.json), [selected intermediate](consumer-intermediate/AutoPerf.SignalR.NativeUploadProbe.dll) |
| Initial missing-assets failure, before compilation | [Actual failed exit](native-aot/invocations/publish-no-restore-036/exit.json), [stdout](native-aot/invocations/publish-no-restore-036/stdout.txt), [stderr](native-aot/invocations/publish-no-restore-036/stderr.txt) |
| Necessary restore and successful native publish | [Restore exit](native-aot/invocations/restore-036/exit.json), [publish exit](native-aot/invocations/publish-after-restore-036/exit.json), [publish stdout](native-aot/invocations/publish-after-restore-036/stdout.txt) |
| Original design rationale | [Merged dotnet/aspnetcore#56583](https://github.com/dotnet/aspnetcore/pull/56583), [captured response](native-aot/original-aot-pr-56583.json) |
| Offline verification and immutable-byte inventory | [Verifier](verify.mjs), [copied byte inventory](authoritative-copies.json), [actual preparer](executed-drivers/F141-prepare-publication-041.mjs) |

The fork tracking issue and immutable evidence commit are recorded in `publication.json` after publication. This case does not change the fixed campaign `REPORT.md` snapshot.

## What actually runs

`ReflectionHelper.GetIAsyncEnumeratorInterface` scans implemented interfaces after its direct-type check. `ReflectionAsyncEnumerator` calls it in its **constructor** and retains the resolved `MoveNextAsync` and `Current` methods. Invoking those methods for each item is a different operation; it is not another call to this target lookup.

The client uses the reflection adapter when dynamic code is unavailable and the stream element is a value type. The probe uses public `HubConnection.StartAsync`, `SendCoreAsync`, `StopAsync`, and disposal, a real `System.IO.Pipelines` transport, and the real source-generated JSON hub protocol. It does not invoke the adapter privately or inject a callback to simulate its owning producer.

The native AMD64 PE32+ executable has **no CLR data-directory header**. Its actual runtime reports both `IsDynamicCodeSupported` and `IsDynamicCodeCompiled` false. The saved ILC response names the frozen Original37 Client.Core/Common/Json DLL inputs. This is actual NativeAOT, not the existing CoreCLR test harness with a forced runtime configuration.

| Requirement | Evidence |
|---|---|
| Actual native runtime, not a configured CoreCLR substitute | `NativeAot.DynamicCodeUnsupportedAndNotCompiled`; fresh native PE/header and exact executable-hash checks |
| Real handshake and connected state | `PublicConnection.ActualJsonHandshakeAndStartedState` |
| Class-produced value-type stream and lifetime | `PublicSend.IAsyncEnumerableIntExactFramesEnumeratedOnceDisposed`: `42, -7, 0`; one enumeration, four moves including completion, one disposal |
| Compiler-generated value-type async iterator | `PublicSend.CompilerAsyncIteratorIntExactFramesAndFinally`: `11, 13, 17`; one body entry and one `finally` |
| Reference-type control | `PublicSend.IAsyncEnumerableStringReferenceTypeControlExactFrames`: `"alpha", "omega"` and complete enumeration/disposal |
| Distinct value-type channel reflection control | `PublicSend.ChannelReaderIntValueTypeDistinctReflectionControlExactFrames`: `3, 1, -2` and completion |
| Real connection and owned-service lifetime | `PublicConnection.ActualTransportAndServiceProviderDisposed` |

All seven checks passed in the **one actual native execution**, exit 0. The complete 21-frame record includes the exact handshake, one independently verified ping, and each actual unique stream ID's invocation, values, and successful completion. These are standalone consumer assertions, not discovered VSTest Facts.

**Counter limitation:** the compiler-iterator `MoveNextCalls: 0` field in the preserved raw result is a literal, uninstrumented placeholder in the frozen reporter. It is **not an observed zero**. Only its three exact item frames, body entry, and `finally` were asserted. The coordinator and offline auditor explicitly classify that move count as unobserved/null. None of the producer counters measures F141 helper calls or application workload frequency.

The shared server `HubMethodDescriptor.FromReturnedStream` lazily caches a conversion delegate. For the no-dynamic-code/value-type enumerable case that delegate still constructs the reflection adapter per returned stream; caching the delegate does not cache this interface lookup. That server path is **source-only evidence here**: no actual server NativeAOT execution is claimed.

## Source, compilation, and limitations

The executed inputs are unchanged Original37 (`37e809ead5824bc753a1c3d56f11615bdb1296c5`), not F140's private cache candidate. All three relevant target blobs match the independently observed default `83d976704fa0f9aa4361327d1f9d929c93bd9256`; this is **not** a whole-default native build or run. The two additional server/test-harness source paths in the Git proofs are not executed coverage.

This consumer uses **SDK/ILCompiler/BCL `12.0.0-alpha.1.26557.102`**. Earlier ordinary CoreCLR assertions on builds 62/69 are not relabeled NativeAOT. The native process observes the client assembly's full name, version `42.42.42.42`; no native in-process managed MVID reflection observation is claimed. The copied managed input and consumer intermediates are freshly parsed separately.

The initial `publish --no-restore` failed with `NETSDK1004` before compilation. Its evidence is retained. The necessary restore then passed; the unchanged consumer had one successful C# compilation/native publish and one native execution. The four recorded roots exited `1, 0, 0, 0`; both owned inner streams drained and specifically observed children were terminal. Bounded observations do not establish exhaustive descendant history or unrelated-user inactivity.

The outer `vcvars`/`cmd` setup emitted a **bare `vswhere.exe` not recognized** diagnostic, but nevertheless populated usable C++ tools and the actual native publish succeeded. That diagnostic was observed in interactive tool output; **byte-exact outer setup streams were not saved**. The copied runner streams cover its inner dotnet/native roots. No machine-wide PATH repair was performed.

Fresh offline checks cover **four managed PE/portable-PDB associations and seven selected raw document associations**: the three target source files in Client.Core, plus four consumer documents. The consumer PDB declares 16 documents; the other **12 JSON source-generator raw documents are not copied/attested**. Common/Json PDB identity is checked without claiming all their raw documents. The native Windows PDB is preserved/hash-checked, not mislabeled a portable PDB or independently symbol-resolved. The incidental `aspnetcorev2_inprocess.dll` in native publish output is preserved without an IIS execution claim.

Saved compiler responses, assets, and selected outputs are not a complete compiler input, runtime distribution, operating-system, or hermetic replay closure. Unsupported-type exception/trimming behavior, server-side NativeAOT output, browser/network/server execution, and cache invalidation/lifetime behavior are not newly tested or changed by this no-candidate outcome.

## Commands and results

The exact executable, arguments, PIDs, creation identities, streams, and exit receipts are in the invocation records. The actual driver [F141-run-nativeaot-036.ps1](native-aot/executed-drivers/F141-run-nativeaot-036.ps1) activates its exact checkout before every repository dotnet command.

| Saved driver invocation | Result |
|---|---|
| `F141-run-nativeaot-036.ps1 -Mode publish-no-restore` | Failed, exit 1, `NETSDK1004` before compilation; retained |
| `F141-run-nativeaot-036.ps1 -Mode restore` | Passed, exit 0 |
| `F141-run-nativeaot-036.ps1 -Mode publish-after-restore` | Passed, exit 0; generated actual native code |
| `F141-run-nativeaot-036.ps1 -Mode native` | Passed, exit 0; seven checks and all 21 saved frames |

To re-audit copied evidence **without** executing the native consumer, builds, or any performance work:

```powershell
node --permission --allow-fs-read="$PWD" --no-addons .\verify.mjs --require-seal
```

The coordinator ran the permission-bounded verifier successfully before publication; the publisher also requires it before sealing. Native tests/publish are not repeated by this offline command.
