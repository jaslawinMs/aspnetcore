# F237 / F238: Razor Pages runtime discovery

**Rejected at the material-workload gate, not measured no gain.** These are two
startup/runtime-compilation discovery sites in one unchanged shipping class.
The public registration explicitly marks runtime compilation obsolete:
production should use build-time compilation and development should use Hot
Reload. The repeated list scans are real, but no representative material
discovery workload was established to justify a candidate or comparison.
Each finding is permanently closed **0 of 3 authorizations**. No optimization,
benchmark, performance PR, or browser window was created.

Classification: **Lifecycle optimization - material workload unestablished
for an obsolete feature.** This does not establish zero cost, equivalence of a
proposed lookup index, or the absence of a possible benefit for a large
application.

| Finding | Issue | Decision and connected artifacts |
|---|---|---|
| F237 | `AddPageModels` scans the growing route-model list for each normal-root Razor item. | Rejected, no candidate or performance PR. [Tracking issue and exact commit links](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F237-F238/publication.json); [native Original](owner-handoff/native-Original-native-after-restored-assets/results/selected.trx), [native Default](owner-handoff/native-Default-native-after-restored-assets/results/selected.trx); [real-producer Original](owner-handoff/common-Original-Run-first-070/stdout.txt), [Default](owner-handoff/common-Default-Run-first-070/stdout.txt). |
| F238 | `AddAreaPageModels` performs the corresponding repeated lookup during area-first discovery. | Same bounded decision and evidence, not a second optimization or benchmark. [Acceptance](coordinator-acceptance.json), [closed budgets](closed-budgets.json), [portable audit](coordinator-portable-audit.json), [verified publication](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F237-F238/publication.json). |

## What actually ran

Original is `37e809ead5824bc753a1c3d56f11615bdb1296c5`; independently pinned
Default is `d3483989953ae3cccd773aea5ea04cb0c7198531`. Both independent native
test graphs were freshly built without modifying shipping source or test
bodies. The provider blob is identical:
`07bc493e7b0cebf8930f03aef0211ea29f8b8ac6`.

The original precompile selection was the file-system and runtime-registration
test-class filter. All **nine exact facts per role / 18 executions** passed.
Their real XML result/definition/execution/entry/image identities and counters
were freshly reconciled by both System.Xml and the offline Node XML parser.
The nine-name reconciliation was performed after execution; it is not
retrospectively described as a precompile exact-name freeze.

One accepted C#13 consumer DLL was byte-reused across the two native roles:
`EE2FE4DC7E540FE28605F697A0FDE264418036A63EDCC1FEDCA012583E1088E6`.
The consumer uses the real public
`AddMvcCore().AddRazorPages(...).AddRazorRuntimeCompilation()` registrations,
native physical Razor file system, directive engine, model factory, and route
provider. Moq supplies only the host-environment interface; it does not fabricate
Razor items, route models, or repeated enumeration entries.

| Physical fixture, on each role | Produced models | Passing contract checks |
|---|---:|---:|
| `EmptyPhysicalPages` | 0 | 10 |
| `SingletonNormalIndex` | 1 | 12 |
| `SingletonAreaIndex` | 1 | 12 |
| `MixedSeparatePagesRoot` | 5 | 20 |
| `MixedOverlappingRoot` | 7 | 24 |
| `CaseVariantAreaRoot` | 4 | 18 |

Total: **12 common cases / 192 checks**, plus the 18 existing native executions.
The two common processes directly observed assertion CLR
`12.0.0-alpha.1.26562.105` and `12.0.0-alpha.1.26569.107`, respectively.
This is not a same-runtime performance comparison. Native testhost and compiler
managed runtimes were not directly observed by this characterization.

## Why the existing duplicate condition matters

Equality is **`RelativePath.OrdinalIgnoreCase`**, not `ViewEnginePath`.
The area pass runs first so a physical area page under an overlapping normal
root keeps its area route instead of gaining an additional normal route.
The case-variant `/areas` fixture produces that overlap through the actual
Windows physical file-system enumerations, not injected duplicate rows.

An unsupported area-shaped file may still legitimately become a normal-root
page in the later pass. A non-page file must not become a registered page.
Consequently, a future lookup index cannot safely mark every enumerated file
as registered before directive parsing and model creation succeed. The real
factory also preserves Index selectors, absolute route overrides, route values,
area precedence, enumeration order, warning events, and repeated-discovery
reference/selector stability. These are observed contracts, **not an
implemented candidate-equivalence claim**.

## Failures and boundaries retained

Four native prerequisite failures (missing generated imports, then restore
assets) and the successful prerequisite repairs are retained.
The final Original native root passed its nine tests and exited 0, but its
outer wrapper failed a post-root ownership check. The legacy recorder followed
numeric parent PIDs without checking birth ordering and incorrectly adopted
11 preexisting processes. No process was stopped, and the native test was not
rerun to erase that failure.

The original raw process receipts remain private and byte-exact. Public
[scoped receipts](owner-handoff/native-scoped-receipts.json) and
[exclusion fingerprints](owner-handoff/private-observation-exclusions.json)
explicitly omit unrelated process arrays and command lines. The bounded
[chronology summary](owner-handoff/ownership/scoped-chronology-summary.json)
does not retrospectively attest ancestry or universal closure. Seven
synthetic tests execute the exact old/new recorder blocks: two old
false-adoption cases reproduce, and all seven future cases pass without
widening the original sub-millisecond root identity check.

The first common compilation failed on the pinned Moq's .NET6-to-.NET12
`System.Linq.Expressions` reference warning treated as an error. Two later
successful compilations retain CS1701 as a visible warning. The first compiled
consumer's two role executions failed before assertions because the broader
`IServiceCollection.AddRazorPages()` aggregate needs an assembly absent from
the native test graph. The accepted new cohort uses the documented public
IMvcCoreBuilder registration instead; it does not merge dependency graphs.
A separate CRLF-sensitive preparation assertion also failed before any
compiler started and remains preserved.

Malformed directives, actual compiled/prepopulated-page overlap, other
registered providers' execution, the broader MVC aggregate, full HTTP hosting,
performance, and material workload frequency remain unestablished. Managed
snapshots precede final serialization, not process exit. Root exits and drained
streams do not establish a universal descendant census or shared-host
isolation. Selected compiler files and references are not a complete native
compiler execution closure.

## Portable evidence

The immutable owner capsule contains **1,341 payload files / 204,293,410 bytes**,
plus its manifest: eight PE/PDB associations, all 328 selected raw documents
(32 embedded), 317 compiler reference images, 139 unique observed managed-image
files, and 308 cryptographic source memberships / 186 raw Git objects.
SDK selection is `12.0.100-alpha.1.26557.102`; the common consumer language is
C#13. The [manifest](owner-handoff/MANIFEST.json) and
[source/command map](authoritative-copies.json) distinguish originals,
scoped derivatives, generated documents, and compiler/reference/runtime roles.

Run `node .\verify.mjs --require-seal` from this directory. It freshly runs the
copied capsule auditor with exactly capsule-only filesystem read permission
and no writes, child/native processes, workers, or addons. Verification is not
a benchmark or replay of the native tests.
