# F155-F159: one-operation test serializer reuse is not established

**No reuse change admitted; each finding closes at zero comparisons, with no
performance PR.** These are five local `DataContractSerializer` constructions in
five existing XML formatter Facts. Each instance performs **one operation per
Fact invocation**, not one allocation per item in a serializer loop. Material
suite benefit and an appropriate shared lifetime preserving test isolation were
not established.

Classification: `rejected` /
`one-operation-test-serializer-reuse-benefit-unestablished`. This is not a measured
no-gain result, a zero-cost construction claim or proof that serializer reuse
cannot help another workload. All five original IDs remain separately indexed.

## Five sites and actual visible contracts

All methods belong to
`Microsoft.AspNetCore.Mvc.Formatters.Xml.ValidationProblemDetailsWrapperTest`.
The source/assertion descriptions below are not runtime value dumps.

| Finding | Exact existing Fact | Actual assertion-owned boundary |
|---|---|---|
| F155 | `ReadXml_ReadsValidationProblemDetailsXml` | Real read; type/title/instance/status, decoded extension names/values, all three error entries including empty and bracket names. `error1` is one joined string, not two messages. |
| F156 | `ReadXml_ReadsValidationProblemDetailsXml_WithNoErrors` | No errors element; type/title/instance/status, extension entries/order and empty errors. |
| F157 | `ReadXml_ReadsValidationProblemDetailsXml_WithEmptyErrorsElement` | Empty `MVC-Errors` element; type/title/status and empty errors. This Fact does **not** assert instance/extensions. |
| F158 | `WriteXml_WritesValidXml` | Entire output text: declaration, namespace/order, encoded brackets, joined error messages and `MVC-Empty`. |
| F159 | `WriteXml_WithNoValidationErrors` | Entire output text and omission of the errors element. |

`ReadObject(Stream)` and `WriteObject(XmlWriter, wrapper)` use the real
`IXmlSerializable` wrapper/base implementation and actual model or full XML
consumer. No copied serializer/wrapper algorithm or fabricated callback stands in
for this producer. The constructors are local to the individual Facts; there is
no observed shared serializer fixture, construction loop, DI lifetime or
production request frequency. Scope exit is not proof of collection/disposal.

## Connected artifacts

| Artifact | Link | Outcome / scope |
|---|---|---|
| Coordinator disposition | [Acceptance](coordinator-acceptance.json), [five closed budgets](closed-budgets.json) | Every ID independently closes 0/3; no candidate or material suite benefit established |
| Complete immutable preparation | [Handoff](owner-handoff/HANDOFF.md), [manifest](owner-handoff/manifest.json), [exact roles](owner-handoff/roles.json) | All 159 selected files and 86,979,281 bytes preserved unchanged; historical PENDING status precedes this coordinator disposition |
| Exact assertions and source ownership | [Requirement receipts](owner-handoff/requirements-and-assertion-receipts.json), [Original facts](owner-handoff/original37/facts.json), [default facts](owner-handoff/observedDefault/facts.json) | Five distinct parameterless Facts per role; exact source/PDB and assertion boundaries |
| Actual native XML | [Original VSTest](owner-handoff/original37/reports/original37.trx), [Original confirmation](owner-handoff/original37/reports/original37-explicit-identity.trx), [Original console](owner-handoff/original37/reports/console-original37.xml), [default VSTest](owner-handoff/observedDefault/reports/observedDefault-runtime69.trx), [default console](owner-handoff/observedDefault/reports/console-observedDefault.xml) | 25 passing executions, not 25 distinct Facts |
| Historical runtime failure | [Default initial abort](owner-handoff/observedDefault/reports/observedDefault.trx) | Failed before any individual case; zero rows retained, not relabeled as a pass |
| Independent coordinator checks | [Native XML/metadata verification](coordinator-whole-payload-verification.json), [copied bytes](authoritative-copies.json), [portable wrapper](verify.mjs), [owner auditor](owner-handoff/audit.mjs) | Real `System.Xml` reconciled every actual report; portable audit freshly parses selected PE/PDB/raw sources/XML |
| Complete declared image union | [All 1,916 differences](owner-handoff/all-differences.json), [exact commands/failures](owner-handoff/command-bundle.json) | Fixture/shared/non-DLL names retained; normal source/runtime graphs are not a causal optimization pair |
| Final linkage | [Verified publication](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F155-F159/publication.json) | Closed fork-only tracking issue; no PR/window; fixed classified report unchanged |

## What ran, and what did not

Original source is `37e809ead5824bc753a1c3d56f11615bdb1296c5`, with actual
runtime `12.0.0-alpha.1.26562.105`. Entry-observed main is
`90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d`, with its actual normal runtime
`12.0.0-alpha.1.26569.107`. Five existing Facts passed in both. Original VSTest ran
twice and console once; default VSTest and console each passed once after the
retained initial runtime abort. There are no theory rows or skipped target cases.
The established test project's `.Test` suffix and existing runner dependencies
were preserved, not migrated.

Actual console PIDs 42920/42140 recorded loaded test/target/serializer/CoreLib and
host identities. These are **console-run observations, not retroactive VSTest
module attestations**. One C#13 identity-only hook compiled successfully once,
with zero warnings, and the same common bytes were reused. Native dependency
language/analyzer defaults remained normal.

Missing generated/task/assets prerequisites, unrelated JS/ANCM/static-assets
failures, initial missing runtime69, public-runtime ZIP 404 and the corrected
artifact-script parser failure are retained. The successful compiler-only
exclusions do not validate JS packaging, ANCM or static-assets behavior. Runtime69
was staged privately only after its actual missing-runtime failure; no runtime
override, machine-wide installation or authentication detour was used.

`node .\verify.mjs` passes the copied manifest/hashes and invokes **only the
selected Node read-only owner auditor**, which freshly parses selected PE/PDB
Documents, raw source/Git-LF identities and all six native XML reports. It does
not start .NET, rerun tests/assertions, collect counters or benchmark. The wrapper
starts that one Node audit child, not a native target.

Complete declared inventories and saved loaded-image observations are preserved,
but omitted bytes are not freshly rehashed, every compiler input is not attested,
and this is not a portable runnable full distribution. No reusable-lifetime
candidate, isolation-equivalence test or representative suite-speedup measurement
was produced. The five 0/3 budgets are permanently closed.
