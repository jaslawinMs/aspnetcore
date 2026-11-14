# F319 current-default descriptor reflection acceptance

Independent current main37e809ead5824bc753a1c3d56f11615bdb1296c5.
Current GetServiceDescriptor caller is JsonTranscodingServiceMethodProvider.
OnServiceMethodDiscovery, before BindService and endpoint materialization.
Actual existing MapGrpcService producer/helper tests pass13/13 before edits.
LSP reference navigation missed the live caller; exact current gRPC source
inspection located it. Do not classify the helper as dormant or per-request.
No existing target-specific upstream issue/PR found in the bounded searches.

Evaluate a temporary per-Type PropertyInfo cache, not cached descriptor values.
Preserve original property local/branch, public/static lookup, getter execution
on each call, null result, exception behavior and current descriptor identity.
Only this helper seam may change; no body/request reflection optimization.

Any process-wide reflection cache needs metadata lifetime/Hot Reload handling
before a shipping proposal. A diagnostic cache alone is not merge-ready.
A material gain at actual binding/startup, not just repeated isolated helper
lookups, is required before justifying that added state and invalidation.
No new cross-assembly IVT/UnsafeAccessor or private runtime factory access.

- Original getter behavior: every call executes the real property getter;
  current descriptor, null, missing/inherited property, throwing getter and
  wrong CLR value preserve exact return/exception contracts.
- Real producer: AddGrpc/AddJsonTranscoding, DI construction, MapGrpcService
  and materialized EndpointDataSource. Use actual protoc-generated service
  BindService/Descriptor and real HTTP annotations, not hand-written binding
  callbacks or a copied reflection lookup.
- Fixed actual full-startup workloads for generated Greeter/Colon services,
  repeated fresh DI/mapping operations and a no-bind service control. Also
  include explicitly diagnostic isolated helper/getter controls. Capture exact
  endpoint method/HTTP route signatures and service descriptor identities.
- Options/descriptor producer preparations may warm before timing; explicitly
  do not claim true cold-first-process/app-lifetime cache or request throughput.
- Original/temporary/final compatibility and every parameterized row; exact
  before/prototype/restored source hashes and immutable owner-only DLL/JSON
  closure, identical harness/runtime/deps and actual owner/fixture receipts.
- Serial shared-box .NET12/BDN0.13,3warmups/8iterations/DontRemove. Maximum3pairs,
  no fourth or cherry-picked launch. Preserve all allocations/control variance.
- No supported net startup win or unjustified cache state: restore exact
  shipping code, rerun compatibility and publish explicit no-gain/rejected
  tests-only branch plus full diagnostic results. Only justified shipping
  work with all required boundaries green gets a fork-only template draft
  and immediate browser request/remote source/results verification.
