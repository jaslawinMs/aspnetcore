# F112: pooled temporary buffers for stored session values

**Conditional warmed-pool component draft, not merge-ready.** One measured comparison is complete and closed; two allowed comparisons were intentionally unused after clear large gains. The seven predeclared large-value targets observed **39.64-76.80% lower component time** and **68.57-85.71% fewer allocated bytes/op**. Six targets exceeded50% lower time. These are synthetic warmed calls, not application speedups, production frequencies, bounded memory, or lower retained heap.

The scanner's medium/high-confidence/moderate-hot-path labels are provenance, not measured deployment severity. The retained finding is the growable MemoryStream followed by ToArray in **JsonStoredDataSerializer.SerializeValue**, reached through **SessionCascadingValueSupplier.PersistAllValues**. This branch is independent of F111; its **SerializeData remains original**. See [all28 paired rows](paired-outcomes.md), [strict arithmetic audit](measurement-audit.json), [complete actual commands and outcomes](validation-commands.md), and [acceptance/boundaries defined before the edit](acceptance.json).

## Measured change

Use the existing shared PooledArrayBufferWriter<byte> as Utf8JsonWriter's IBufferWriter destination, flush, and copy WrittenSpan into the final independently owned byte[]. Writer disposal still precedes buffer disposal. A single shared-source Compile include and focused tests accompany the two changed method statements. The shared helper is unchanged; no new pool, public API, package/default/TFM changes, IVT, UnsafeAccessor or shipping reflection.

The helper still grows a **contiguous, unbounded** rental and can retain arrays in ArrayPool.Shared. Its source clears committed written spans during growth/disposal and returns rentals. The final result copy and real session Set copy remain. **Cold pool misses, pool-retained heap, trimming/capacity policy, concurrency/load and production input distribution were not measured.** The measurements do not identify exact stream-resize/copy counts or establish the loaded runtime's retention policy.

## Target observations

Negative change means lower time. All seven targets and35 individual allocation checks were predeclared; all seven resource goals failed on the exact original for the expected allocation reason and passed on the candidate. Semantic preservation checks pass on both versions.

| Case | Original ns | Pooled ns | Time change | Original B/op | Pooled B/op |
| --- | ---: | ---: | ---: | ---: | ---: |
| ValueString16K | 12377.80 | 3902.67 | -68.47% | 115745 | 16616 |
| ValueString128K | 343442.35 | 79689.94 | -76.80% | 918558 | 131305 |
| ValueEscaped16K | 266245.72 | 122142.97 | -54.12% | 387759 | 72331 |
| ValueUnicode16K | 313534.34 | 134647.97 | -57.05% | 492603 | 98546 |
| SessionString16K | 13493.14 | 8144.09 | -39.64% | 132282 | 33153 |
| SessionString128K | 402409.24 | 161119.35 | -59.96% | 1049801 | 262536 |
| SessionEscaped16K | 272557.13 | 134928.86 | -50.50% | 460025 | 144569 |

SessionString16K's candidate CV is22.65%; its39.64% mean reduction is not presented as an equally precise universal effect. Maximum CV across all56 outcomes is23.59%. BDN's reported99.9% confidence intervals and every retained result are preserved; the portable audit recomputes statistics but does not independently compute the confidence critical value.

## Unchanged controls and costs

| Case | Original ns | Pooled ns | Time change | Original B/op | Pooled B/op |
| --- | ---: | ---: | ---: | ---: | ---: |
| SessionNull | 75.22 | 75.10 | -0.16% | 88 | 88 |
| DataScalarControl | 588.41 | 632.74 | 7.53% | 1032 | 1032 |
| DataString16KControl | 12169.79 | 13615.34 | 11.88% | 115842 | 115842 |

The bulk serializer and null-removal branches did not change. Their timing movement, including11.88% slower for the large bulk control, is **not attributed to SerializeValue**. Their allocated bytes are unchanged. No weighted/global speedup is computed.

## Actual producer and owning boundary

Public AddRazorComponents registers the real singleton serializer and scoped supplier. In setup, public RazorComponentResult renders a real ComponentBase with SupplyParameterFromSession, causing the framework to create its real property subscription/PropertyGetter. **No direct RegisterValueCallback, synthetic ComponentState, injected persistence callback or source-linked serializer replacement is used by the benchmark.**

The harness binds the internal PersistAllValues method once using harness-only reflection/CreateDelegate, outside timing. The timed session operation reads the actual component property, calls the real serializer, and performs the actual DistributedSession.Set copy. Real DistributedSessionStore, DistributedSession and MemoryDistributedCache are loaded before timing. The current method completes synchronously and returns an already-completed Task; contract checks confirm completion outside timing. Rendering and verification/output reads/hashing/logging are outside timing. **Public RazorComponentResult creates subscriptions but does not itself persist**; the harness explicitly invokes the actual internal consumer. This is not a full HTTP/render/cache-commit benchmark.

The harness session factory has an explicit always-true establishment callback, not SessionMiddleware. Independently, the **canonical BlazorWebAppPerPage browser scenario** exercises the normal RazorComponentEndpointInvoker completion path, actual SessionMiddleware/session cookie, real property subscriptions and next-request persistence. Both original and selected owner builds pass ready->stored->read->retained-read->cleared->missing with the exact17024 UTF16-unit payload/hash and int[] values7,11,19. Framework JS returns200 and current-page console/page/request errors are zero. Actual loaded serializer/session hashes match the frozen images. Only our exact helper/listener processes were stopped; temporary Program/page/Session-project-reference additions were precisely removed. No interactive-mode, enhanced-navigation, streaming race or native browser-regression claim.

## Preservation and exact red/green evidence

The fixture preserves28 deterministic synthetic typed input snapshots and28 exact original UTF8 output files, including null/scalars, empty/small/1KiB/16KiB/128KiB strings, escaped text, Unicode, arrays, nullable enums, dictionaries, recursive object[] and exact4095/4096/4097-byte boundaries. Case labels are identities, not traffic weights. Values are built outside timing.

Each source/benchmark setup checks exact original bytes, typed roundtrip, retained output after an unrelated100KB SerializeValue call, independent subsequent output, actual unsupported IntPtr and writer-depth failures through the real getter/serializer, unchanged bytes at the failing session key and recovery through the same producer. No multi-key atomicity is claimed.

| Requirement | Evidence |
| --- | --- |
| Independently owned retained output | JsonStoredDataSerializerTest.SerializeValue_PreservesOwnedBytesAcrossSubsequentCalls |
| Exact escaped output and declared string roundtrip | JsonStoredDataSerializerTest.SerializeValue_PreservesLargeEscapedOutputAndDeclaredType, all16/4096/131072 rows |
| Actual framework property getter, no Set on unsupported/depth failure, same-owner recovery | JsonStoredDataSerializerTest.SerializeValue_PreservesFailureBeforeSessionReplacementAndRecovers, both unsupportedType True/False rows |
| Existing null/enum/nullable collection/recursive output and session controls | Twelve exact existing Facts selected in the actual test execution records |
| Reduced allocation, not a new semantic regression | Seven frozen25% resource goals: original7red/candidate7green;all35 target samples inspected per version |

Owning test command outcomes: original12passed, extended-original18passed, selected18passed; **48 total exact TRX rows,0 failures,0 skips**, with individual IDs/definitions/entries and positive durations checked. Existing tests and new preservation tests do not become resource-regression tests merely because they pass; the separately frozen allocation goals provide that red/green evidence. Permanent tests use the managed owning boundary; Moq verifies the failure-before-Set requirement. The browser independently establishes the exercised request/cookie path.

## Frozen source and executable provenance

- Current default captured before implementation:7c704fed602c54d174e5674aee7b2eefe57073c9;campaign baseline:37e809ead5824bc753a1c3d56f11615bdb1296c5. All25 scoped current-default/baseline/working raw+canonical identities match. History and bounded related-work queries are retained, not an absence proof.
- Source publication commit:03ccc90e1b18f4ec3d888f617019349bf6c65310;branch:autoperf/F112-stored-value-buffer. Actual remote fork source ref and all three canonical source blobs are verified.
- Original Endpoints SHA256:EF055C83C65546A3C5F2F1647638EA44FC020DC8635566F48D2BDD07DB5E7768.
- Selected Endpoints SHA256:B37DD7CF1D12D82D2FFFD63959159833E0422282FF804673DFFFD4466111CFC9.
- Identical harness SHA256:3E551507BF3B34A1C28B798E9904B23A50DEDB06F68B76CD0FB542FF80D9F95B;Session SHA256:A9B2D9D6B06E0F541B30D19DB023348EF20A0B52446BF766872E5513ECB71B8B.
- Each frozen image has199 copied files/87 declared runtime assets. Candidate clones the entire original closure, replacing only Endpoints DLL/PDB. Runtimeconfig/deps and complete hash metadata are retained.
- Actual System.Text.Json SHA256:0BB3A7D6EF39B3D4A477C61268819FF7B740473121E07A6A19CA38BB7DC0A809;MVID:e7008c2e-22da-4a10-8ac1-4ffc89e441a8.
- Actual CoreLib informational version:12.0.0-alpha.1.26562.105+dfd6ac738610ea05f42e704be82b386e71052e12. SDK12.0.100-alpha.1.26557.102;net12.0/C#13 harness;runtime12.0.0-alpha.1.26562.105,x64,server/concurrent GC.
- Windows11 Enterprise10.0.26300,Microsoft VM,Intel Xeon Platinum8473C,8cores/16logical processors,approximately64GiB RAM. CIM observation is explicitly before profiles. BDN itself reports Unknown processor;that raw report is unchanged.

**Measured binaries predate the later source publication commit.** They are not relabeled as built from it. A rebuild at that later Git revision can acquire different revision metadata/MVIDs even when code is equivalent. The23 portable-PDB source-document checks verify selected captured documents, **not PE-CodeView/PDB binding or method coverage**. Test captures cover key owner/test image files, not a complete test closure or an in-test loaded-hash marker.

## Benchmark settings and limits

BenchmarkDotNet0.13.0,Release,CLI --inProcess (actual **InProcessEmitToolchain**),Short job,3warmups,8retained measurements,requested100ms iterations,DontRemove,JSON+CSV. Exactly two sequential28-case profiles constitute **one of at most three comparisons**, now closed. Raw console includes pilot,overhead,GC and setup witnesses.

The audit verifies **56 outcomes/448 retained results/168 warmups/1000 actual overhead samples/56 hash-PID-linked setups/112 complete contracts/280 five-sample resource observations/48 passing TRX rows/23 source-document checks**. Thread and precise process-wide allocation counters are separately retained without attributing differences. Diagnostic caliper times are not BDN timing claims.

This is a shared Windows machine. CPU-heavy work was serialized,max2 build nodes;the agent did not set power,priority or affinity or stop unrelated processes. The initial harness build succeeded with11 CA2007 warnings;before freezing, explicit configured awaits removed those warnings and the final harness/candidate/sample builds succeeded with0warnings. No failed benchmark attempt or hidden timing rerun is discarded.

## Reproduce or inspect

The [historical commands](validation-commands.md) include their actual exit/results. Every fresh dotnet shell activates the repository-local environment from the repository root with `. .\activate.ps1`. Historical guards protect the independent baseline branch,closed budget and existing artifacts;do not blindly rerun them or substitute installed ASP.NET assemblies. No global.json/package.json/package-lock.json/NuGet.config was changed.

For a **new independently budgeted reproduction**, build the owning Endpoints test project on the recorded baseline with the pinned SDK and required repository dependencies,then build [harness/AutoPerf.Benchmarks.csproj](harness/AutoPerf.Benchmarks.csproj),overriding AspNetCoreRoot if needed. Freeze its complete Release/net12.0 output and use the original executable's --create-fixture with a new absolute directory. Apply [selected-source.diff](selected-source.diff) on the baseline,build/test the actual candidate,clone the complete original image and replace only the newly built Endpoints DLL/PDB. Keep the harness/config/runtime/fixtures unchanged;then use the exact BDN flags in the recorded commands with fresh artifact paths. The original source,measured source,harness,typed inputs,outputs and JSON/deps metadata are included. Historical absolute paths identify what ran,not portable command examples.

To recheck published arithmetic without .NET/builds or new comparisons:

```powershell
node .\F112\reproduce-analysis.mjs (Resolve-Path .\F112).Path --verify
```

The public capsule retains byte-identical mapped raw artifacts,source/config,exact synthetic UTF8 .bin fixtures and warning-bearing development records. **Runtime DLL/PDB,build binlogs and build image directories are omitted.** The portable public audit rehashes copied artifacts and captured identity metadata,not omitted binary/runtime bytes,and cannot by itself recreate their historical runtime provenance. No private-key fixture or random session-cookie value is published. See [documentation/history boundary](documentation-boundary.json).
