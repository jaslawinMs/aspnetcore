# F166–F168: terminal preparation handoff

**F166, F167, F168 remain PENDING. No candidate implementation or performance verdict.**

## Capsule and read-only verification

The capsule is `finding-F166-F168-012`. Exact selected counts, bytes and SHA256s are in its root `manifest.json` and `seal.json`. The manifest covers **every physical file in `payload`**, with no exclusions. The four root envelope files are `manifest.json`, `audit-execution.json`, `terminal.json`, `seal.json`; the seal hashes the first three and does not self-hash.

From the capsule root, with Node 20 or later:

```powershell
node .\payload\Audit.cjs --envelope
```

The verifier only reads this capsule and emits JSON. It uses standard-library Node, the attributed byte-identical F160–F162 `Metadata.cjs`/`Xml.cjs`, and no child process, SDK, checkout, package directory, browser, timing/allocation counter or old evidence graph. It actually parses selected PE metadata/MVIDs, CodeView GUID+stamp, portable PDB ID/Document tables and raw source checksums, retained-target Dictionary method tables, and **every real XML result/definition/entry/execution/counter**. It reconciles XML with the independently produced real `System.Xml` receipt. It reconstructs the complete keyed all-file image unions/differences, without prefix exceptions.

Optional independent read-only System.Xml reconciliation, using PowerShell 7.5 or later:

```powershell
pwsh -NoLogo -NoProfile -File .\payload\Reconcile-Xml.ps1 -Verify
```

Do **not** rerun `Collect.cjs`, `Stage.cjs`, `Check-Stability.cjs`, `Pack.cjs`, `Seal.ps1`, native builds or the fixture as an offline audit. Those are historical preparation tools, not dependencies of `Audit.cjs`.

## Source roles, boundaries and unchanged state

| Role | Actual immutable source HEAD | Private native checkout | Actual net12 execution |
|---|---|---|---|
| Original | `37e809ead5824bc753a1c3d56f11615bdb1296c5` | `C:\src\ap-F166-o012` | `12.0.0-alpha.1.26562.105` |
| Observed default | `90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d` | `C:\src\ap-F166-d012` | `12.0.0-alpha.1.26569.107` |

Fresh GitHub API and `git ls-remote` observations agree on the default pin; separately instrumented closing observations agree too. The initially unavailable default commit checkout failure and subsequent exact upstream fetch are retained. The private clones use independent object stores (`--no-hardlinks`, no alternates), private native outputs and initialized pinned submodules. All three primary target files have identical Original/default Git blobs. This does **not** mean all repository sources/dependencies/images are identical.

Normal repository GenerateFiles, compiler language (`preview`) and analyzer defaults were retained for native owners. All commands disclose `UseIisNativeAssets=false`, `UseSharedCompilation=false`, `/m:2`, `/nr:false`; no IIS-native-assets validation is claimed. F166 additionally needed the compiler-only JS/static-assets boundary below.

Every `dotnet` invocation was run from, and activated, its exact private checkout with certificate generation/global-tool-path additions disabled, node reuse disabled, private CLI/scratch/temp/HTTP-cache paths and declared shared NuGet cache `C:\.tools\.nuget\packages`. SDK `12.0.100-alpha.1.26557.102` and existing host inputs were reused through declared junctions. No roll-forward override was used. Node/git/pwsh helpers used no activation; their recorded ambient environment is retained, and their explicit writes stayed in owned paths.

Default's first native testhost really failed for missing exact runtime69. Only then was exact runtime69 privately staged from the user-designated existing F155 copy, with CoreLib SHA256 `09DC73D8B850905F8250C160732CEDEB532349827E59267BF04B0F59B0D55AF8`. No runtime/version substitution or machine-wide install occurred. Actual console modules distinguish **hostfxr `12.0.0-alpha.1.26565.104`** from Original62/default69 hostpolicy/CoreCLR. Hostfxr65 is not evidence that default ran CoreCLR65.

No shipping/permanent-test source edits, candidate implementations, commits, PRs/issues, browser windows, shared-ledger/policy/published-results or machine/global/auth/power/priority/affinity changes were made. Closing source/status/catalog observations are retained. The coordinator checkout remains on its unrelated F145 branch with its pre-existing untracked reports.

## F166 — real mapping producer and middleware consumer

Target: `src\Components\WebAssembly\Server\src\ComponentsWebAssemblyApplicationBuilderExtensions.cs:133–135`.

`UseBlazorFrameworkFiles` constructs static-file options during pipeline configuration. The actual provider exposes `IDictionary<string,string>`, whose actual default instance is `Dictionary<string,string>(StringComparer.OrdinalIgnoreCase)`. Seven fixed calls add `.dll`, `.webcil`, `.pdb`, `.br`, `.dat`, `.blat`, `.mjs`. The first six are naturally absent; `.mjs` already maps to `text/javascript` and must remain so. Missing names acquire `application/octet-stream`. This is configuration work, not the per-request MIME lookup. No application registration cardinality, invocation rate or savings is inferred.

The private probe separately:

* Invokes the **actual native private factory** for structural mapping/comparer/provider-retention observations; this alone is not public producer proof.
* Calls **actual public `UseBlazorFrameworkFiles`**, builds its RequestDelegate and sends real DefaultHttpContexts through `MapWhen → ContentEncodingNegotiator → StaticFileMiddleware → PhysicalFileProvider/IFileInfo → response stream`.
* Uses actual physical files for all seven extensions and uppercase `.DLL`; negotiates real Brotli bytes, verifies restored MIME/no-cache responses, and checks excluded server/web JS, outside-prefix and missing-file controls.
* Records that matched-but-missing files terminate in the branch's **404**, while excluded/outside paths reach the outer **418** sentinel.

This is genuine in-process middleware/file-provider/response evidence, **not server transport, browser, client boot, hosted/E2E or production asset-generation validation**. Native ContentEncodingNegotiator tests are adjacent negotiator coverage, not direct AddMapping coverage. Native normal builds actually failed on missing JS/static assets; `BuildNodeJS=false` alone still failed. Only afterward did `BuildNodeJS=false; StaticWebAssetsEnabled=false` allow the disclosed compiler-only native tests.

History retains the `.mjs` addition `adf603f4de06d6e030c3f4e48ed499d032caff37` and later comment history.

## F167 — constructor map, real key inputs and target references

Target: `src\DataProtection\DataProtection\src\KeyManagement\KeyRing.cs:31–33`.

The map is a retained `Dictionary<Guid,KeyHolder>` with the default Guid comparer. Construction enumerates `allKeys` using `Add`: duplicate enumerated IDs throw. A present default ID retains the **enumerated** key/holder even when the supplied default is a distinct same-ID object. An absent default gets a new holder. `_defaultKeyHolder` comes from this map; real encryptor instantiation is lazy and reused by lookup. Unknown IDs return null with `isRevoked=false`.

Actual owner chain: `KeyRingProvider.CreateCacheableKeyRingCore → CreateCacheableKeyRingCoreStep2 → CacheableKeyRing → KeyRing`. Manager keys and resolver decisions produce constructor inputs; `keyJustAdded` fallback exists when refreshed inputs still lack a usable default. A 24-hour option exists, but refresh/cancellation/fallback mean it does not establish real construction frequency.

The private probe obtains genuine key objects from **FileSystemXmlRepository + XmlKeyManager**: a first key, a real snapshot before second-key creation, a second key, then an independent provider's actual file reread yielding distinct same-ID objects. It reflectively invokes the **actual internal constructor** with these real outputs and observes present-object retention, absent insertion, duplicate exception, lazy real encryptor identity and unknown-ID output. Generated private key XML was deleted in `finally` and is not copied.

**Producer limit:** deliberately supplying the earlier snapshot bypasses KeyRingProvider. It does not show the normal filesystem-backed provider omits a persisted key. The native provider fallback test runs the real provider algorithm with **mocked manager/resolver inputs**, not an actual filesystem omission producer. Neither observation establishes real application cardinality, frequency or savings.

Actual retained shipping targets are **net462, netstandard2.0, net12.0**. Both roles built all three. The established native test project instead targets **net472 and net12.0**. The first mistaken `-f net462` test attempt failed NETSDK1005 and is retained; correct net472 tests passed. net472 execution is not execution on an exact .NET Framework 4.6.2 runtime. netstandard2.0 was compiled, not independently executable.

Fresh parsing of actual MSBuild-resolved reference images finds `Dictionary<TKey,TValue>` declares `TryAdd` in net12 reference images, not in the actual net462 `mscorlib.dll` or netstandard2.0 `netstandard.dll`. Original/default product net12 reference versions are respectively 26562.105/26569.107; the common fixture's SDK targeting-pack reference is **26557.102**, separately identified. This is direct type-method presence evidence, **not** an extension-method inventory or prescribed candidate replacement.

Last retained target-file change: `8cc20ec87dc2a0b315ef1628c056de1a86f527ac`.

## F168 — actual test helper and real binder/JsonPatch producer

Target: `src\Features\JsonPatch\test\WriteOnceDynamicTestObject.cs:109–114`, an established **test helper**, not shipping implementation.

Each instance owns `Dictionary<string,object>()` with the default case-sensitive comparer. Null removes before the presence check. Duplicate non-null insertion throws `ArgumentException("Value for {key} already exists")`, retaining the old value. Missing non-null values are inserted. The indexer, both Add overloads and genuine `DynamicObject.TrySetMember` call this seam.

The probe loads the **actual source-built Microsoft.AspNetCore.JsonPatch.Tests.dll helper**, not extracted replacement source. It exercises genuine C# runtime-binder writes, case distinctions, duplicate/old-value retention, null removal/reinsertion, and **public JsonPatchDocument → actual ObjectAdapter/ObjectVisitor/AdapterFactory → JsonDynamicContract/DynamicObjectAdapter → genuine binder CallSite → native helper**. It observes replace's remove-before-add, remove/add, missing-path no-mutation and duplicate-add exception. No callback injection, new IVT or UnsafeAccessor is used.

Private helper scenarios use reference-valued properties. Native `TryRemove_SetsPropertyToDefaultOrNull(value: 1, expectedValue: 0)` uses **DynamicTestObject**, not WriteOnceDynamicTestObject; its passing row is not write-once value-type coverage. F168's separate net472 suite was not run.

Origin commit `0b76599c31b3fa367dc172272e81cee87a634ba9` explains replace as remove then add (historical JsonPatch #110); full retained patch/history preserves original historical paths.

## Native validation and exact execution accounting

All commands, environment, arguments, PIDs, waits, full stdout/stderr (including empty streams), exits and failures are preserved as raw base64 bytes in `evidence\all-attempts.json.gz`, with an independent complete member index (**85 historical native attempts, 343 exact raw members**). The packer's and post-pack auditor's own four files each remain standalone; the final manifest audit has its root `audit-execution.json`. Exact test command arrays are in the named receipts; path/TFM switches are not elided there.

All test commands used `dotnet test <actual test csproj> -f <TFM> --no-restore -c Release -v:minimal --filter <below> -p:UseIisNativeAssets=false -p:UseSharedCompilation=false /m:2 /nr:false --logger <actual TRX> --results-directory <owned path>`. The successful default F167 net12 runtime retry additionally used `--no-build`; it reused the real successful default build preceding the initial runtime abort. F166 also used the two disclosed compiler-only asset switches.

| Real selected filter | Original | Default |
|---|---:|---:|
| `FullyQualifiedName~ContentEncodingNegotiatorTests`, net12, compiler-only F166 | 9 passed | 9 passed |
| `FullyQualifiedName~KeyRingTests\|FullyQualifiedName~CreateCacheableKeyRing_GenerationRequired_NoDefaultKey_CreatesNewKeyWithImmediateActivation_StillNoDefaultKey_ReturnsNewlyCreatedKey`, net12 | 9 passed | 9 passed |
| Same F167 filter, **net472** against retained net462 product | 9 passed | 9 passed |
| `FullyQualifiedName~DynamicObjectAdapterTest`, net12 | 15 passed | 15 passed |

Eight successful TRXs contain **84 passing execution rows, 33 distinct expanded native case names**, not 84 distinct tests. The ninth TRX is the initial default runtime-prerequisite abort with zero rows. No selected successful row is skipped. `FullyQualifiedName~KeyRingTests` also matches **CacheableKeyRingTests**: four KeyRing cases + four CacheableKeyRing cases + the one named provider fallback case make nine, not merely four.

Both actual F168 theory values `(value: 1, expectedValue: 0)` and `(value: "new", expectedValue: null)` passed separately on each role. Every full case name, TestMethod, definition/entry/execution ID, result, summary and counter attribute is retained in raw TRXs and `xml-system-receipt.json`; the Node verifier parses them again rather than trusting saved summaries.

For both roles, `dotnet build src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj --no-restore -c Release -v:minimal -p:UseIisNativeAssets=false -p:UseSharedCompilation=false /m:2 /nr:false` passed for all three retained product targets.

### Common private C#13 probe

The accepted **V4** common DLL/PDB/deps/runtimeconfig compiled once, with zero warnings/errors, against the actual Original native reference union and separately identified SDK57 BCL references. Identical common files were staged with **each role's own independent native owner/dependency output union**. `dotnet exec --runtimeconfig <that role's actual native F167 test runtimeconfig> <that role's fixture image>\PreparationProbe.dll ...` ran Original62/default69 respectively. The common saved own runtimeconfig still requests62 and is **inactive** under the explicit role runtimeconfig; its bytes remain in both full image unions.

This is not a full-default-compiled fixture or full-repository build attestation, a target-only substitution, or a causal/performance pair.

Six accepted rows passed on **each** role:

1. `F166_ActualProviderFactoryPreservesExistingMappings`
2. `F166_PublicMiddlewareServesRealFilesAndNegotiatedResponses`
3. `F167_RealManagerInputsAndRetainedKeyDictionary`
4. `F168_RealDynamicBinderWriteOnceCaseAndNullSemantics`
5. `F168_JsonPatchDocumentReplaceRemoveAndAdd`
6. `F168_JsonPatchMissingAndDuplicateControls`

**Two successful common compilations occurred in total**, not one. V1 failed missing StaticFiles compiler references; V2 failed recursive inclusion of the saved V1 source. V3 compiled successfully but failed the private missing-file **418-vs-404 expectation** on both roles (five passing rows/one failed row each). This was a fixture expectation failure, not a shipping defect. Its source, successful DLL/PDB/deps/config, full role image inventories, outputs and failures are retained. V4 corrected only that expectation and compiled once successfully. The literal one-successful-compile-total goal was therefore **not met**; accepted V4 has one common compile.

## Retention, limitations and terminal state

The capsule copies 80 exact role-labeled physical source/config/doc files, six actual primary-target Git LF blobs, 22 actual managed PE/portable-PDB pairs, real native test deps/runtimeconfigs/binding configuration, selected actual retained-target references, selected actual CoreLib/hostpolicy/hostfxr bytes and attributed common inputs. Offline verification reconstructs raw/LF/Git object identities and PDB associations, **not an entire Git commit/tree or compiler-input closure**.

Full declared native/fixture/reference/obj all-file catalogs and Original/default keyed unions include fixture, helper, PDB, JSON and all other non-DLL entries, **without prefix exceptions**. Accepted role images have 178 union keys, 141 differing keys; this is structural byte-image information only. A second fresh read verifies every declared owned image key and selected physical source unchanged **during the collection-to-sealing window**, not before/through the executions.

The declared SDK57 `sdk` directory, runtime/host directories and 143 package directories are inventoried but not copied as distributions. This is not an inventory of every SDK distribution root/targeting pack. Omitted bytes are **not** copied or freshly rehashed by the future offline audit. No full physical-source/compiler-input/execution-closure claim is made.

Loaded managed MVID/SHA256s and bounded native module observations come from **actual console probe PIDs**. They are **not VSTest observations or exhaustive managed/native censuses**. TRXs identify real native test runs; selected post-run native test binaries/PDBs are retained, but a VSTest loader census was not collected.

Every failed/superseded native attempt is retained: missing generated props/assets; prerequisite generation/restore; default cache-only package misses; malformed CLI public-source normalization (`https:\...`); normal configured-feed restores; JS/static-manifest failures; missing exact runtime69 abort; mistaken net462 test target; private V1/V2 compile and V3 runtime failures. The collection helper's first wrong helper-source path and corrected successful attempt, plus the first superseded XML reconciliation, are retained too. `failed-seal-v1.json.gz` preserves the first helper's incorrect zero byte total (dictionary `Measure-Object`), actual auditor rejection/complete receipt, original manifest/helper versions and caller-only syntax note. A scalar fold corrects the total. `failed-seal-v2.json.gz` preserves the next **passed** native audit and subsequent recorder failure on nullable Process.StartTime, plus actual bounded PID diagnostics: the observed conhost PID had been reused by WmiPrvSE with a later CIM creation time; a former csc PID was a later dotnet process. Neither reused process was waited/stopped. Final reconciliation uses guarded UTC times and bounded single-PID CIM fallback.

`failed-seal-v3.json.gz` retains the first complete superseded envelope and changed helper versions, with the actually passed Node envelope audit and failed optional XML `-Verify` tool receipts. PowerShell 7.6.10 converted saved JSON XML date **strings** to local DateTime values during Verify; a read-only characterization proved a fresh real System.Xml serialization exactly matched the untouched saved receipt before any change. Verify now uses `ConvertFrom-Json -DateKind String`; no XML, native owner, fixture binary or behavioral result changed. Earlier sealed bytes remain in that archive rather than being represented as the final seal.

No helper service was intentionally created. Recorded direct native roots were actually waited to exit and both streams drained; known observed children are reconciled by PID plus **UTC-normalized, <1 ms** creation-time identity. Earlier exact/tolerant timestamp comparisons lacked explicit parse-to-UTC normalization; final reconciliation corrects that boundary. These limitations and bounded sampling gaps are not an exhaustive descendant census. Root `terminal.json` records final reconciliation through the included capsule audit; subsequent read-only verifier invocations produce their own terminal tool receipts rather than modifying this immutable capsule.

Unverified/excluded: benchmarks/performance/material savings; production cardinalities/rates; full JS/assets/browser/transport/E2E; normal filesystem producer omission of a persisted default key; independently executable netstandard2.0; exact Framework4.6.2 execution; F168 net472; write-once value-type replacement; whole compiler/runtime/package/execution closure; complete VSTest/process/module censuses. **All three remain PENDING.**
