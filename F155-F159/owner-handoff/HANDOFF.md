# F155–F159: preparation handoff — all five PENDING

No candidate, shipping/permanent-test edit, source commit, benchmark, counters, profiler, performance outcome, ledger write or publication. Both private checkouts have clean tracked-source status. Coordinator checkout and other owners' scopes were not changed.

## Pinned roles and native results

| Role | Actual source commit | Actual configured/loaded test runtime | Existing native cases |
|---|---|---|---|
| Original37 | `37e809ead5824bc753a1c3d56f11615bdb1296c5` | `12.0.0-alpha.1.26562.105` | Five passed; none failed/skipped |
| Entry-observed upstream main | `90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d` | `12.0.0-alpha.1.26569.107` | Five passed; none failed/skipped |

Fresh entry observation: command `002-upstream-entry` in `command-bundle.json`. Fresh closing observation: `081-upstream-close.*`; still the same main SHA. Older builds were not relabeled.

Every method below is an existing parameterless `[Fact]` in `Microsoft.AspNetCore.Mvc.Formatters.Xml.ValidationProblemDetailsWrapperTest`; there are no theory/data rows.

| Finding / original construction line | Exact existing method | Assertion-owned visible boundary |
|---|---|---|
| F155 / 29 | `ReadXml_ReadsValidationProblemDetailsXml` | Real deserialization; wrapper type, title, instance, status, both decoded extension names/values, all three error entries including empty key and bracket name. `error1` is one combined string, not two split messages. |
| F156 / 85 | `ReadXml_ReadsValidationProblemDetailsXml_WithNoErrors` | Real deserialization without an errors element; wrapper type, title, instance, status, extension entries/order, empty errors. |
| F157 / 123 | `ReadXml_ReadsValidationProblemDetailsXml_WithEmptyErrorsElement` | Real deserialization of `<MVC-Errors />`; wrapper type, title, status, empty errors. |
| F158 / 175 | `WriteXml_WritesValidXml` | Real serialization; exact entire XML text, declaration/namespace/order, bracket encoding, joined two-message error text and `MVC-Empty`. |
| F159 / 213 | `WriteXml_WithNoValidationErrors` | Real serialization; exact entire XML text and omission of the errors element. |

`requirements-and-assertion-receipts.json` preserves precise expected strings/data and unasserted boundaries. These are **saved source/assertion-ownership receipts**, not runtime value dumps.

## Producer, consumer, frequency and lifetime

`DataContractSerializer.ReadObject(Stream)` invokes the actual `IXmlSerializable` wrapper/base reader, derived error reader and `ValidationProblemDetails`. `WriteObject(XmlWriter, wrapper)` invokes the actual wrapper/base writer; the existing tests read the actual output stream and compare full text. No replacement consumer or copied shipping implementation was compiled.

Each method constructs one serializer for one read/write operation per Fact invocation. Serializers are local, with write-side locals inside the writer scope; there is no serializer construction loop, shared serializer fixture, DI lifetime or observed production request frequency. Scope exit does not prove collection/disposal. Test-only severity is not a performance outcome.

## Exact evidence and boundaries

- Each role's `facts.json` contains exact TRX test/execution IDs, native xUnit XML rows/counters, selected PE MVID/CodeView GUID+stamp, freshly parsed PDB Document/raw-source checksums, resolved properties and loaded-image witnesses. All six raw native reports are retained and reparsed.
- Original VSTest ran twice (5 passed each); default initially aborted before any case because runtime 69 was absent, then passed all 5. Existing xUnit console 2.9.2 ran the same five real methods once per role. Adapter is 3.1.3; existing test dependencies were not migrated.
- VSTest emitted no testhost exit identity receipt even with explicit runsettings. Native console PIDs **42920** / **42140** produced actual loaded test, target, corelib, serializer and host identities. Those are console-run observations, not retroactive VSTest module attestations.
- The common identity-only hook was successfully compiled **once**, C# 13, zero warnings; identical DLL/PDB/deps/runtimeconfig reused across roles. No diagnostics/performance comparison was performed.
- Both roles share SDK `12.0.100-alpha.1.26557.102`. Original uses a declared shared `.dotnet` junction. After the actual missing-runtime failure and a retained public-runtime ZIP 404, default privately staged the exact runtime 69 package from the ref-pack's actual public feed; SDK/host/packs remain shared. No runtime-version override, bootstrap, authentication detour or machine-wide install.
- Actual graph builds preserve source/reference/restore graphs and normal analyzers. Only after observed unrelated failures: `BuildNodeJS=false`, `UseIisNativeAssets=false`, `StaticWebAssetsEnabled=false`. JS packaging, ANCM and static-web-assets behavior are excluded, not validated.
- Native commands activate from their exact checkout root, use required certificate/tools/node-reuse environment and explicit local dotnet. MSBuild operations use `/m:2 /nr:false /p:UseSharedCompilation=false`. Native `exec` console runs are not MSBuild operations.
- Complete declared `artifacts\bin`, resolved reference/analyzer and loaded-image inventories include every filename/hash, fixtures/shared names included. `all-differences.json` enumerates **1,916** differences across its five closed scopes without prefix exceptions. Cross-source graphs are **not a causal performance pair**. Omitted payload files remain hash-only saved receipts; no full compiler-input attestation is claimed.
- Both roles' test source Git blob is `e27b908379181fe06706b151c62205f9c6ec4639`; Git/LF SHA-256 `4eac71c9ad530306b5d81e72c12f6b647fce7ad1ad0bcd7a189c5b03f8d62a2a`; physical 8,148-byte source, 222 CRLF pairs, SHA-256 `f340072365fb668bc1b245b165c5f988bb7b8683049fce74e41981378b109b93`. Source histories/blame and actual build/reference documentation are retained.
- Failed initial attempts are retained, including long-path checkout, missing generated/task/assets prerequisites, JS/ANCM/static-assets failures, initial runtime failure, runtime ZIP 404 and the corrected artifact-script parser error. The initial failed Python shim did not capture its child PID/exit; that boundary is explicit.

## Portable audit and terminal state

From any copied capsule: `node .\audit.mjs`. It only reads capsule-relative selected files, launches no process/.NET, and checks hashes, physical versus Git/LF source, PE/PDB pairing/Documents, native XML rows/IDs/counters, selected loaded-image receipts and exhaustive **declared-scope** difference enumeration. It does not re-execute assertions or read omitted external graphs.

`terminal-native-work.json` and the awaited `082-terminal-native-snapshot.*` receipt state actual terminal command/stream status and bounded process observation, not an exhaustive historical child census. Exact final selected count/bytes, manifest SHA-256, hash-list SHA-256 and handoff SHA-256 are in sibling `seal.json`; `manifest.json` and `SHA256SUMS.txt` cover this immutable preparation capsule. All five IDs remain **PENDING**.
