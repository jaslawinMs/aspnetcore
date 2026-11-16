# F111 acceptance before implementation

F111 targets only `JsonStoredDataSerializer.SerializeData`, not F112's distinct
`SerializeValue` method. The scanner classification is provenance, not proof of
production frequency, actual stream-resize counts or a measured defect.

## Required boundary and invariants

- Use the actual compiled owning serializer, registered by public
  `AddRazorComponents`, without shipping IVT/UnsafeAccessor/API changes.
  Bind the public methods on its internal concrete type once outside timing;
  document that harness-only reflection boundary rather than compiling a copy.
- Measure complete `SerializeData` and actual registered session-provider saves
  through a real public `DistributedSessionStore` session with a memory cache.
  Observe exact persisted JSON bytes at `ISession`; distinguish the pre-commit
  synchronous save from external/distributed storage I/O or HTTP throughput.
- Preserve exact UTF8 bytes, property order, options, type tokens, nested/null/
  scalar/collection/enum behavior, independent result arrays and later-call
  independence. All output is complete before storage. Do not remove the final
  independently owned byte array or impose new limits.
- Preserve unsupported-type, throwing-enumerator and writer/depth failure
  behavior; no partial replacement of previously saved session data. Keep
  independent `SerializeValue`, deserialization and empty-session-save controls.
- Start with the simplest existing BCL buffer-writer mechanism already used by
  this owning assembly. Pooling is not mandatory and must not add retention,
  lifetime, assembly-boundary, dependencies or configuration merely to chase a
  number. Do not describe direct ArrayBufferWriter as segmented or pooled.

## Source, sample and tests

Capture current-default/fetched/baseline/raw/canonical source identities,
relevant owner history and related work. Current owner/history is unchanged
at captured default `7c704fed602c54d174e5674aee7b2eefe57073c9`.
Only14 scoped initial identities are established, not whole-build equivalence.

Validate a temporary static-SSR/default-Cookie TempData scenario in canonical
`BlazorWebAppPerPage`, first on original and then selected source, through real
browser navigation and actual typed stored data. Use ephemeral public Data
Protection for the temporary app only; no shared user keyring or machine
configuration changes. Record actual loaded Endpoints identity, page/asset
responses, browser errors and exact consumed payload/typed-array results.
This sample does not establish a different render-mode/lifecycle/browser or
production performance distribution.

Permanent boundary:

- Behavior owner: server `JsonStoredDataSerializer.SerializeData`.
- Production producer: actual serializer JSON writing, consumed by the actual
  TempData provider after complete serialization.
- Final observable: exact independent UTF8 output/roundtrip and unchanged
  exception/storage behavior; performance measured with real owner calls.
- Selected permanent surface: extend existing
  `Endpoints/test/TempData/JsonStoredDataSerializerTest.cs` for buffer-ownership/
  large escaped output/failure recovery, only after original sample validation.
- Lower-boundary false-pass risk: copied writers or mock serialization can
  conceal missing final Flush, output aliasing or partial storage. The harness
  uses the actual registered owner/provider, actual session implementation and
  complete persisted bytes; browser checks are supplementary preservation
  evidence, not proof of benchmark frequency or allocation attribution.

Keep sample edits temporary; remove only our exact sample seams after selected
permanent tests pass. No browser-owned behavior change is proposed, so do not
add unrelated Selenium coverage. Existing quarantines remain untouched.

## Measurement and publication

Before any shipping edit, freeze original real-owner observations, independent
managed allocation calipers and complete exact-output fixtures. Record any
resource threshold only after observing that original and before implementing.
Each advertised allocation threshold must fail on original for its expected
resource reason and pass selected. Semantic preservation controls may pass
both; never label them red performance tests.

At most3 complete original/candidate comparisons; one frozen identical harness,
inputs, runtime/settings and independent source branch. Include tiny/empty,
scaled ASCII/escaped/Unicode, many entries, collections/nesting, actual session
saves and unchanged controls. No extra sweep after the budget closes. Retain
all non-wins, variance and failed attempts.

Publish exact commands/results, versions, owner/harness/dependency/PDB/source
identities and raw evidence. A justified win receives only a fork draft with
the repository PR template; open it immediately and verify actual head/base,
source and immutable evidence. Otherwise publish a no-gain/rejection, without
manufacturing a PR. Advance the finalized counter only after verified remote
receipt/index publication.
