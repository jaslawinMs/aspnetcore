# F160–F162: factual source-generator preparation, 011

**F160, F161 and F162 remain PENDING.** No candidate, shipping/permanent edit,
source commit, benchmark, performance verdict, publishing, campaign-ledger or
policy write was made. This is a compiler-only boundary, not browser/component
rendering evidence.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| F160: genuine duplicate tool declarations and aggregate registration | Unchanged native `ToolBlockGeneratorTests.DuplicateToolNames_ReportDiagnostic`; private `F160_DuplicateToolNamesKeepFirstAndRegisterEveryCandidate`. |
| F161: genuine property-symbol/attribute parsing, duplicate argument key, first retained property | Unchanged native `ToolBlockGeneratorTests.InvalidPropertyMappings_ReportDiagnostics`; private `F161_DuplicateParametersKeepFirstOrdinalKeysAndUsableSetter`. |
| F162: genuine result-property parsing, duplicate result key, first retained property | Same native `InvalidPropertyMappings_ReportDiagnostics`; private `F162_DuplicateResultsKeepFirstOrdinalKeysAndUsableSetter`. |
| Adjacent controls | Private `IndependentParameterResultDictionariesAndInheritedPropertyControl`; per-key case, empty/null Name, default-property-name collision and unusable-setter controls in the F161/F162 rows. |
| Generated C# really consumed | Every private row uses the real `ToolBlockGenerator` through Roslyn `GeneratorDriver`, compiles and emits the output, loads that real consumer assembly and executes its generated registration method twice. |

The private rows pass in two explicitly different roles:

1. **Original:** Original generator, Original native-built AI producer, runtime62.
2. **Fresh Default TARGET ONLY:** independently native-built Default generator,
   under the identical Original producer/common verifier/runtime62. This is
   intentionally **not whole-default execution**.

The fixture does not extract/reimplement generator bodies. Its references are the
actual native outputs. Reflection only invokes the emitted consumer and inspects
the actual internal registration list/handler instances; it is not a replacement
producer, handler fallback, or injected generator callback.
Emitted in-memory consumer identity fields in the private rows are saved runtime
observations; their ephemeral PE images were not retained. The offline audit
checks the generated-source bytes and runtime receipt consistency, not a fresh
parse or re-execution of those ephemeral consumer images. The selected native
test-consumer PE/PDB bytes are separately freshly parsed.

## Native execution: original abort retained, exact Default runtime reached

Entry upstream `git ls-remote` genuinely observed
`90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d`. Original is
`37e809ead5824bc753a1c3d56f11615bdb1296c5`. `entry.json` preserves that observation;
`closing.json` records a separate later query and does not relabel an earlier build.
The target generator source and UIAgentOptions diff between these pins is empty.

Both graphs first failed missing generated Directory.Build imports, then
GenerateFiles assets, then native test assets. Cache-only restores were performed
only after these real prerequisite failures. Both actual native generator/test
graphs restored successfully, without HostFactoryResolver/package substitution.
Initial test builds hit missing Blazor JS assets. The documented `BuildNodeJS=false`
mode still hit a missing static-web-assets manifest, including after a successful
isolated Assets Build. The compiler-only run then explicitly used the SDK-supported
`StaticWebAssetsEnabled=false`; no browser/static-asset validation is claimed.
All these attempts are retained.

The final unchanged Original native command, after setting the required environment
and activating **that** checkout, was:

```powershell
.\.dotnet\dotnet.exe test src\Components\AI\gen\test\Microsoft.AspNetCore.Components.AI.SourceGenerators.Tests.csproj --no-restore -c Release -v:minimal -p:BuildNodeJS=false -p:StaticWebAssetsEnabled=false -p:UseSharedCompilation=false -p:UseIisNativeAssets=false /m:2 /nr:false --logger "trx;LogFileName=original-native.trx" --results-directory <private-root>\evidence\native-original
```

**Exit 0: 15 passed, zero failed/skipped.** These are 13 generator-test rows,
including all five `InvalidBlock_ReportsDeclarationDiagnostic` theory rows
BAIC001–BAIC005, plus the two real `AlwaysTestTests.SuccessfulTests` fixture rows
`GuaranteedQuarantinedTest` and `GuaranteedUnquarantinedTest`. Fixture rows are
retained, not silently counted as new target coverage.

The initial same compiler-only native command in fresh Default built its generator,
AI assembly, dependencies and native tests, but **exit 1 / Test Run Aborted**:
its real testhost requests `Microsoft.NETCore.App 12.0.0-alpha.1.26569.107`.
The installed frameworks reported by that host were 26557.102, 26562.105 and
26565.104. That original Default TRX still records Failed with **zero individual
rows**, without historical relabeling.

After this real failure and a same-task prerequisite hint, this owner privately
downloaded exact runtime69 from the actual ref-pack's public `dotnet12` feed.
`runtime69-staging.json` preserves the resolved feed, HTTP 200, 41,329,885-byte
package SHA256 `B76DF99F590E48A0AD4F4C924BD424A87C87A3578B072EF324397BCFB4759B7D`,
and the explicitly declared private Default dotnet root/shared SDK-host junctions.
No runtime-version override, machine-wide installation or authentication detour
was used. The existing Default outputs were not rebuilt or relabeled:

```powershell
.\.dotnet\dotnet.exe test src\Components\AI\gen\test\Microsoft.AspNetCore.Components.AI.SourceGenerators.Tests.csproj --no-build --no-restore -c Release -v:minimal -p:BuildNodeJS=false -p:StaticWebAssetsEnabled=false -p:UseSharedCompilation=false -p:UseIisNativeAssets=false /m:2 /nr:false --logger "trx;LogFileName=default-native69.trx" --results-directory <private-root>\evidence\native-default69
```

**Exit 0: 15 passed, zero failed/skipped**, including all five individual
BAIC001–BAIC005 theory rows and both fixture rows. The separate third native TRX
is parsed independently with the real XML parser and portable structural parser.
This proves the unchanged native suite on its actual normal runtime69 graph;
it does not extend the private four-row projection into a full-Default execution.

Each final private probe `dotnet exec` exited 0 with four rows. Exact absolute
commands, executable, checkout activation environment, PID, exit, stdout/stderr
and drained-stream state are preserved in `evidence\all-attempts.json.gz`.
Native dependency language/analyzer defaults were retained: the generator declares
C#13/netstandard2.0; the native test graph evaluates its normal `preview` language.
Only the separate private verifier explicitly sets C#13.

**Common-verifier exception, not concealed:** V1 compiled successfully once but
its location assertion dereferenced `Diagnostic.Location.SourceTree`. Real parser
diagnostics use `Location.Create(path, ...)` and have **ExternalFile**, not SourceFile,
locations. V1's source, DLL/PDB, failed results and logs remain preserved.
Corrected V2 resolves the genuine reported span against the identical input tree,
checks the real external-file path, and compiled successfully once with no warnings.
The same V2 DLL/PDB/deps/runtimeconfig and common closure were then used for both
final roles. Thus **one successful compilation of the accepted V2** is established,
but a literal one-successful-compile total across all attempts was **not met**
(two, including failed-at-runtime V1).

## Exact key, comparer and diagnostic contracts

All three dictionaries are ordinary local `Dictionary<string, ...>()` instances,
with **no explicit comparer argument**. The documented comparer is
`EqualityComparer<string>.Default`, not property-symbol identity and not an
OrdinalIgnoreCase dictionary. Real generator controls accept `tool` versus `Tool`
and `key` versus `KEY` as distinct. The internal concrete comparer implementation
was not separately introspected.

* **F160:** key is `ToolBlockCandidate.ToolName`, the actual string constructor
  argument read from the ToolBlock attribute. Values retain the first full
  candidate. For FirstBlock, SecondBlock, ThirdBlock with `"tool"` and CaseBlock
  with `"Tool"`, actual ordered diagnostics are:
  * BAIC008 Error, Location.None:
    `Duplicate tool name 'tool' — classes 'FirstBlock' and 'SecondBlock' both map to the same FunctionCallContent.Name`
  * BAIC008 Error, Location.None:
    `Duplicate tool name 'tool' — classes 'FirstBlock' and 'ThirdBlock' both map to the same FunctionCallContent.Name`
  Both refer to the first candidate; later duplicates never replace it. The
  diagnostic contains simple class names, not namespace-qualified type names.
* **F161:** key is a nonempty string named argument `ToolParameterAttribute.Name`;
  null/empty/absent Name falls back to the actual `IPropertySymbol.Name`. The value
  stored in `seenKeys` is that property-name string, not an IPropertySymbol.
  Duplicate keys are ignored after BAIC006 Error:
  `A property mapping to argument key 'key' is already declared on this ToolBlock; the duplicate is ignored`.
  The private input produces ordered BAIC006 for Second at line 5/column 50,
  Third at 6/50, FallbackDuplicate at 9/55, then BAIC007 Warning for Unusable
  at 12/53. All are ExternalFile locations on the exact property identifier span.
* **F162:** corresponding `ToolResultAttribute.Name`/property-name fallback, in a
  separate dictionary. Duplicate BAIC010 Error:
  `A property mapping to result key 'key' is already declared on this ToolBlock; the duplicate is ignored`.
  Actual order: Second at 5/47, Third at 6/47, FallbackDuplicate at 9/52, then
  BAIC007 Warning for Unusable at 12/50; all ExternalFile identifier spans.

The reports retain exact UTF-16 starts/lengths, file paths, messages, severities
and observed order without sorting away ordering evidence. An unusable setter is
diagnosed/skipped before reserving a key, so a later usable property with that key
is retained. Parameter/result dictionaries are independent; the same `"shared"`
key in one parameter and one result is accepted. `GetMembers()` examines this
class's members; the real inherited-property control is not emitted. Mapped
properties retain their fully qualified property-type metadata; emitted members
use the actual property name, with the emitter's identifier escaping.

These are finite source-order observations, not a promise of ordering across
arbitrary syntax-tree arrangements, partial declarations, or Roslyn versions.
The selected native mixed-invalid-property test sorts IDs and does not by itself
prove exact diagnostic order; the private rows supply that additional evidence.

## Generator frequency, registrations and object lifetime

`ToolBlockGenerator.Initialize` wires `ForAttributeWithMetadataName` into parsing,
per-declaration source outputs, and a collected candidate array for aggregate
registration. Source and LSP identify EmitRegistration's owning call at
ToolBlockGenerator.cs line 46. Candidate/parse-result value equality supports
Roslyn incremental reuse; no invocation rate was measured.

The F160 dictionary exists only within an aggregate EmitRegistration invocation.
F161/F162 each allocate a local dictionary while parsing a valid, named annotated
class, after declaration validation. Each relevant property/key is examined during
that compiler operation. These dictionaries are not retained per request/render,
and are distinct from `args.TryGetValue` in emitted runtime handlers.

Duplicate-name diagnostics do **not** remove candidates from emitted registrations:
the F160 input emits four handlers plus one registration source, in source order,
including both later duplicate-name candidates. Executing the generated method
twice on one real UIAgentOptions yields eight registrations; the other three rows
each yield two. Every call constructs fresh handler instances and appends; there
is no runtime deduplication in that generated method.
The reported Error diagnostics ordinarily prevent a successful user build.
The private consumer intentionally characterizes the actual emitted output
despite those reported generator errors; it is not an error-free shipping-app
or production reachability claim.

Source-only lifetime trace: UIAgentOptions stores each handler in a
HandlerRegistration; each BlockMappingPipeline creates an entry retaining that
handler; TryHandle creates state and active entries retain state/handler while
processing updates. That runtime trace was not presented as a browser test.
The emitted internal extension is caller-invoked; automatic invocation by a
shipping application, actual application cardinality, and render/request rates
were not established.

The generator is truly targeted at **netstandard2.0**. The actual
NETStandard.Library 2.0.3 reference image was freshly parsed: Dictionary`2 has
TryGetValue/ContainsKey/Add/set_Item but **no TryAdd instance method**.
The loaded runtime Dictionary does expose TryAdd, which does not make it an
available declared-target API. No ref slot, CollectionsMarshal substitution,
extension-method workaround or implementation was authored or judged.

## Loaded identities, source and binary metadata

Actual final probe identities:

| Image | MVID | SHA256 |
|---|---|---|
| Original generator | `2489f1ab-a78e-47f1-8296-23fd2504b33d` | `ECD8AF02FB88F8CF1581700926D76122DF303E68D6C36E49CA766BB31197E166` |
| Fresh Default generator | `fdf247d7-d9d6-4897-b1ee-29bb46e76a25` | `D6285A48D0C482FC60ABECBFC14A7CC35CFA26F467438721B88000296734B4D7` |
| Common V2 | `0fa750bc-a742-44bf-90d0-eab1ced6ce13` | `1D55CE3B41B6B5A2ADDA07B0110E087A781E9F9C7995A8A297043818C895A39B` |
| Common Original AI producer | `ff7ff17c-3bb3-41b2-9418-95c284038d91` | `E03D665B9BC4FF18636B76A263C29D91A5A51AF557D5966E85E803C45195E6C4` |

Both final probes actually loaded CoreLib/CoreCLR/hostpolicy/clrjit **26562.105**,
with **hostfxr 26565.104**. Loaded managed images and native process modules have
their actual paths/hashes; 82 distinct loaded file paths were freshly reconciled.
Selected CoreLib and four host-module copies let the portable audit check those
bytes without opening an external runtime. These are private-probe observations.

The later real Default native run additionally has **17** bounded, read-only
Process.Modules snapshots of actual testhost **21496**, covering **106** distinct
module-file paths, with no transient read errors. They genuinely observe the
selected native test-consumer image, CoreLib/CoreCLR/hostpolicy/clrjit **26569.107**
and hostfxr **26565.104**. The selected CoreLib69 and three runtime-host copies are
freshly hash-checked and CoreLib MVID/CodeView metadata freshly parsed. Generator
and AI-producer images were **not** observed in these bounded native snapshots;
their separate built PE/PDB/dependency identities are not relabeled as native
loaded-assembly witnesses. This is not an exhaustive managed-assembly census.

Eight managed PE/PDB pairs have freshly parsed MVIDs, CodeView GUID+stamp/age and
portable-PDB IDs. **26 selected raw document snapshots** match freshly parsed PDB
Document checksums, including both target sources in both roles, producer seams,
native test source, and both verifier versions. All PDB Document rows are retained,
but the audit does not claim that every compiler input/reference/resource/option
has been attested.

The emitter Git blob is `4bacce8efe1e321e62c0154a12da135199171ccf` in both pins;
raw CRLF SHA256 is
`7BD014735323B845FDC53F1F2643FFAD4C54950AB29ABFA1A2F661DB8217922C`,
while LF SHA256 is
`779213723213CD4169E06F65ABAB634D762CA4865A484060E2302B20108CCA91`.
The parser Git blob is `29813c83fa9cc951f9ce2d3de8024b97e1a25c91`;
raw CRLF SHA256 is
`CE208BB0B2EBE0AB1089031DD0F1DCEA95077C7E9BC70DA79C276D0975E85F02`,
while LF SHA256 is
`3371C466F6D132FCD5D19F8E5042CC5A007E84B9399BB1F749E83F74FA835D09`.
Raw compiled-source checksums must not be relabeled as Git/LF checksums.

Relevant history pins introduction
`f43bd56c5d3d3579390ddf68887413fc02abc089` / PR #68327,
`[Blazor] Add Components.AI server tool rendering`. Repository build/error,
cross-cutting and Components guidance plus the API comparer documentation URL are
retained. Long Windows paths caused ordinary Git status to report 75/73 spurious
deletions; the same independent checkouts with `-c core.longpaths=true` both report
zero tracked changes. Both observations are preserved; no files were “repaired.”

## Complete image union and portable capsule

Complete keyed image maps, including fixture/shared names and non-DLL entries:
common V2 **163**, target-only projection **163**, native Original **183**,
native Default **193**. Complete before/after maps for these four scopes match.
The two role images differ in exactly the generator DLL and PDB; **all** entries
are compared, with no prefix exceptions. Native Original versus Default has
**48** differences, including InternalTesting, global.json, deps/runtimeconfig,
package/framework images and fixture/shared output metadata. Different source and
runtime closures are **not a causal performance pair**.

Omitted whole images are individually hash-inventoried: Original full bin 196,
Default full bin 283, runtime62 197, SDK57 3652, hostfxr65 1, Original obj 81,
Default obj 226, common obj 21, failed V1 role images 163 each, plus **128 package
directories / 3839 files**. These catalogs are metadata evidence, **not freshly
copied portable runnable distributions or full execution-closure attestation**.
The privately staged runtime69 and every extracted runtime-package file are
additionally individually hash-inventoried, not copied as whole portable images.
Shared SDK/host junctions and package-cache paths are explicitly declared; source, restore
assets, references, outputs and scratch locations are private to this owner.
No whole-repository physical-source or full compiler-input attestation is claimed.

Run the portable read-only audit from any directory:

```powershell
node <capsule>\Audit.cjs
```

It uses only Node standard-library code and selected relative payload paths: no
.NET, child process, old external graph, package or runtime is opened. It verifies
manifest counts/bytes, every selected file, freshly parsed PE/PDB Document/MVID and
source checksums, reference-image Dictionary methods, generated/probe metadata,
complete image differences and actual native TRX IDs/execution IDs/names/counters.
Its bounded structural XML parser is not a validating general-purpose XML library;
the same rows/counters are independently reconciled against the preserved real
System.Xml.XmlDocument + namespace-aware XPath receipt. The failed/zero-row
initial Default TRX, later exact-runtime69 pass and all fixture/theory rows remain
visible.

Exact final file count, byte count and manifest SHA are in MANIFEST.json and the
adjacent FREEZE-RECEIPT.json. The latter is outside the once-sealed capsule.

## Terminal state and excluded boundaries

All **32** owned .NET invocations have terminal direct-PID receipts and both
stdout/stderr streams drained. The final own-root native command-line census
found zero matching live dotnet/testhost/compiler processes. No helper/service
was left running and no agent was delegated.

Descendant PID sampling was **not exhaustive**: short-lived testhost/compiler
children, initial bootstrap Git and metadata-collector Node children do not have
complete independent PID histories. Their completed tool exits and direct native
wait receipts are not advertised as exhaustive descendant attestation.
The first four prerequisite attempts predated private CLI/scratch environment
hardening; their receipts record only the environment actually captured. Subsequent
native attempts explicitly used private scratch/CLI paths and shared cache paths.

The explicit F147-F149-011 HOLD was acknowledged only after all32 native
invocations, observed testhost and collector had terminated and streams drained;
no work resumed until the explicit RELEASE. No measurement was performed here.

The private four detailed rows under the full Default producer/runtime69,
browser/rendering reachability, cross-tree/partial-declaration ordering,
cancellation/fault races and all compiler inputs remain unverified.
No implementation acceptance or performance disposition is assigned.
Coordinator owns any next action; every retained ID remains PENDING.
