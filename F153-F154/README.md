# F153/F154: TestHost request byte overrides are not admitted

**No override admitted; each finding closes at zero comparisons, with no PR.**
F153's inherited byte-read mechanism is real on the executed runtime, but a
material byte-read workload and beneficial contract-preserving replacement were
not established. F154's real request transport is read-only: there is no
successful request byte-write workload here.

Classification is `rejected` /
`testhost-byte-override-benefit-and-full-default-contract-unestablished`, not
measured no-gain, zero cost or proof that an override cannot help. This is
**Original-only executable characterization**; the full default owner/filter and
all ten default producer scenarios remain unexecuted.

## Why simple byte delegation is not automatically equivalent

Real `TestServer.CreateClient` / `HttpClient.SendAsync` enters `ClientHandler`,
which creates `HttpContextBuilder`. For content that can have a body it installs
the compiled `AsyncStreamWrapper` on **server `Request.Body`**, over the real
`System.IO.Pipelines.PipeReaderStream` produced by `PipeReader.AsStream()`.
The wrapper captures the same `AllowSynchronousIO` property exposed through the
live context feature. It is not a fabricated wrapper/stream or injected callback.

On actual runtime62, inherited `Stream.ReadByte` / `WriteByte` IL contains
`new byte[1]` followed by a virtual array-based bulk operation. The wrapper's
bulk override checks its sync gate **before** calling the inner stream. This
is a runtime-resolved IL observation, **not an allocated-byte measurement or
proof that the JIT cannot elide an allocation**.

| Finding | Actual observed contract | Admission limit |
|---|---|---|
| F153 | Enabled mixed byte/bulk and real `BinaryReader` reads preserve exact bytes/EOF. Disabled reads reject before inner null/buffer validation or EOF, consume no bytes, and later async reads recover the complete payload. Live feature enable/disable changes subsequent calls. | Finite correctness packets do not establish material byte-read frequency or an appropriate useful override. |
| F154 | Disabled byte/bulk writes throw `InvalidOperationException` first. Enabled writes reach the **read-only** inner stream and throw `NotSupportedException`. | No successful request-byte-write workload. A replacement must preserve the wrapper gate, not bypass it by directly delegating. |

Server response writes instead use `ResponseBodyWriterStream`; the client sees
the BCL `StreamContent.ReadOnlyStream`. Their successful `09 08` response is not
a successful `AsyncStreamWrapper.WriteByte`. Direct
`TestServer.SendAsync(Action<HttpContext>)` retains the caller's `MemoryStream`
and does **not** install this wrapper; that control is not wrapper-producer
evidence. Wrapper disposal intentionally leaves the inner request reader open.
Cancellation/fault races, APM and flush forwarding were not newly characterized.

## Connected artifacts

| Artifact | Link | Outcome / scope |
|---|---|---|
| Coordinator dispositions | [Acceptance](coordinator-acceptance.json), [two closed budgets](closed-budgets.json) | Each 0/3 permanently closed; no candidate, benchmark or performance PR |
| Full unchanged preparation | [Handoff](owner-handoff/HANDOFF.md), [acceptance](owner-handoff/ACCEPTANCE.md), [manifest](owner-handoff/MANIFEST.json) | All 242 selected files / 21,604,385 bytes preserved; historical PENDING status precedes this decision |
| Real request producer | [Ten original scenarios](owner-handoff/evidence/producer-original.json), [same-scenario confirmation](owner-handoff/evidence/producer-original-confirmation.json), [executed fixture](owner-handoff/tools/Program.cs) | Actual bytes/exceptions, live feature gates and loaded identities; ten scenarios, not twenty distinct cases |
| Actual native executions | [First XML](owner-handoff/evidence/native-results/focused.trx), [confirmation XML](owner-handoff/evidence/native-results-confirmation/focused.trx), [exact rows](owner-handoff/evidence/native-test-rows.json) | 12 distinct unchanged Facts twice = 24 passing executions; no selected theories or skips |
| Raw compiled identity | [Selected associations](owner-handoff/evidence/selected-proofs.json), [original Python verification](coordinator-independent-selected-metadata.json), [new portable verifier](verify.mjs) | Three selected PE/PDB associations and ten raw Document checksums freshly reparsed by the new Node verifier |
| Independent XML/whole-capsule audit | [Coordinator verification](coordinator-whole-payload-verification.json), [copied bytes](authoritative-copies.json), [historical owner auditor](owner-handoff/Audit.cjs) | Real `System.Xml` previously reconciled all rows/IDs/counters. Old auditor's regex XML and saved Document associations are not mislabeled as structural/PDB-table parsing |
| Final linkage | [Verified publication](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F153-F154/publication.json) | Closed fork-only tracking issue; no PR/window; fixed classified report unchanged |

The existing native Facts are `ClientHandlerTests.Send_ThrowsNotSupportedException`,
`ContentLengthWithBodyWorks`, `ContentLengthNotPresentWithNoBody`,
`ContentLengthWithImplicitChunkedTransferEncodingWorks`,
`ContentLengthWithExplicitChunkedTransferEncodingWorks`, `ResubmitRequestWorks`;
`ResponseBodyTests.BodyStream_SyncDisabled_WriteThrows`,
`BodyStream_SyncEnabled_WriteSucceeds`, `BodyStream_SyncDisabled_FlushThrows`,
`BodyStream_SyncEnabled_FlushSucceeds`; and
`TestServerTests.TestServerConstructorSetOptions`,
`DispoingTheRequestBodyDoesNotDisposeClientStreams` (actual spelling).
The ten private scenarios include default/explicit policy, server enable, live
feature enable/disable, enabled/disabled real BinaryReader, StreamContent,
zero-length Stream.Null selection, and the separated direct-Send control.

## Honest default/runtime boundary

The real Original source is `37e809ead5824bc753a1c3d56f11615bdb1296c5`;
actual assertion CoreLib/CoreCLR/hostpolicy is `26562.105`, distinct from hostfxr
`26565.104`. Target Git blob
`7754c45d1c7e43e6df35b38c3c44cbe3cc8e11b3` is unchanged at both observed default
pins `c97a797f19154e97f9723634a8033ef8325cb277` and
`90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d`. A closing target-only main/blob check
does not claim a later default rebuild.

Freshest-default generation eventually passed after the cache changed. The
subsequent owner restore failed on `HostFactoryResolver.Sources69`; a separate
exact-runtime69 native host prerequisite failed before assertions. Those are
**historical failures**, not permanent availability claims. Exact runtime69 is
now privately available and has been executed in the separate
[F155-F159 native default study](https://github.com/jaslawinMs/aspnetcore/blob/4275d9e5586f0cf60997e7b9cc89ab1fdc77624a/F155-F159/owner-handoff/HANDOFF.md).
The coordinator also freshly hashed that private CoreLib for this acceptance.
That does not retroactively execute TestHost's default owner or scenarios.

`node .\verify.mjs` verifies all selected copied bytes, runs only the historical
Node read-only auditor, **then independently reparses the three selected
PE/PDBs and all ten raw Document associations plus structural native XML**.
No .NET target, scenario/test rerun, counter or benchmark starts. The old
auditor's narrower parser limits remain visible.

Complete declared metadata covers native owner 19 entries, native tests 213,
common 192, runtime 197 and SDK 3,652, with no prefix exemptions and unchanged
before/after maps. Omitted bytes are not freshly rehashed; neither all compiler
inputs nor a portable full execution distribution is claimed. No full-default
contract, useful override or measured benefit was established. Both 0/3 budgets
remain permanently closed.
