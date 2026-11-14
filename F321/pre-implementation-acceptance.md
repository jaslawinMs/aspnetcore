# F321 acceptance, before shipping edits

Independent baseline: upstream main `37e809ead5824bc753a1c3d56f11615bdb1296c5`,
freshly fetched. The original generated service-discovery tests passed 12/12.
F320 is not included. F321's retained card describes cold endpoint-setup work,
not per-request work.

The actual binder calls `ResolveBodyDescriptor`, but its runtime descriptor
copies only protobuf descriptor/field/repetition. The former Swagger
`ParameterInfo` consumer was removed by `39e1ac975cf138c56fff984dd824ab651a448367`.
The remaining service invoker resolves the actual virtual override by exact
parameter types; the separate name-only wildcard metadata lookup is redundant.

Acceptance:

1. Remove only wildcard `GetMethod`/`GetParameters`/parameter-name selection and
   its unused constructor argument. Preserve the helper/type/constructor shapes,
   named-body property reflection (independent F320), guards, and exceptions.
   Add no metadata cache, public API, options, or cross-assembly access.
2. Verify real generated protobuf descriptor identity and normal/named/empty/
   invalid body contracts. Verify fresh `AddGrpc`/`AddJsonTranscoding`/
   `MapGrpcService` produces a request delegate which consumes actual wildcard
   HTTP JSON rather than conflicting query values, invokes the generated service,
   and returns the expected 200 JSON response. Include a renamed request argument.
3. Characterize the extra name-only lookup's handling of a service with an
   unrelated overload before deciding whether elimination is compatible. If the
   exact-signature invoker supports that service but obsolete metadata discovery
   rejects it, explicitly retain the original failure and prove the corrected
   actual produced handler. Do not call that exception change preservation.
4. Freeze an identical A/B BenchmarkDotNet harness using the actual helper, full
   binder ParseRoute/CreateDescriptorInfo, and fresh generated-service startup.
   Retain named/empty/error/colon/no-bind controls. Audit the complete owning PE/IL
   for the actual helper caller and any ParameterInfo getter/selector consumers.
   Only the owning assembly may differ in the recursive snapshot closure.
5. Use at most three paired comparisons, serialized on this shared machine.
   Strong repeatable helper gains do not establish startup/request gains.
   Publish every case, allocation, variance, unchanged control and failed attempt.
   No native/JIT, live-edit, trimmed/AOT, network-routing, or first-process claim
   without corresponding evidence.
6. Require a clean focused/full-owner test result and scoped format/diff checks
   before a fork draft. If accepted, preserve the repository PR template,
   immediately request browser opening, and verify/publish exact head/body/files
   and final report receipt. Otherwise restore shipping and publish the rejection.

## Compiler-required signature seam, before measured comparisons

The initial removal left an unused `serviceType` parameter and the owning
build correctly failed IDE0060. Do not suppress that diagnostic or add a dummy
read. Remove the unused effective-internal helper parameter and update its one
owning binder caller and focused tests. Constructor/type shapes and external
public API remain unchanged. The complete owner audit identifies the one caller;
the gRPC project inventory has one shared-source include.

The unmeasured v1 snapshot/receipts and failed build log are preserved. Before
measuring anything, rebuild a common harness with an expression-compiled adapter
which calls either internal signature directly (original with the actual service
type, proposed without it). Both variants use the same outer delegate and frozen
benchmark binary. Do not overwrite a measured snapshot or count preparation as
a measured comparison.
