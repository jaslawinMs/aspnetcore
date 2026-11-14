# F228 current-default acceptance and diagnostic boundary

Fresh default37e809ead5824bc753a1c3d56f11615bdb1296c5, independent of F295/F272.
Before edits, investigation establishes a missing current consumer:
- Bounded Grpc source search and resolved symbol references find only helper
  definition. Current ParseRoute/CreateDescriptorInfo do not call it.
- Actual caller history shows dotnet/aspnetcore#67919
  (39e1ac975cf138c56fff984dd824ab651a448367) removed its former Swagger provider,
  including the exact ResolveQueryParameterDescriptors invocation.
- Current request binding resolves paths on demand through TryResolveDescriptors
  and PathDescriptorsCache instead; no restoring or optimizing removed Swagger.

Reject a current production optimization unless a supported current consumer
is established. No dead-code cleanup or new consumer is in scope. To honor the
per-item local benchmark request, retain diagnostic-only actual dormant helper
A/B data, clearly separated from the live ParseRoute control and never used as
a request/startup performance claim.

- Fixed16case matrix before first launch: flat8/64/256/1024 protobuf schemas,
  real route parser and ResolveRouteParameterDescriptors exclusion producer;
  varying0/1/4/8/32/64/128/256/512exclusions. Full query dictionary construction,
  exact ordered JSON names and FieldDescriptor identities. No copied Contains loop.
- One wildcard-body early return and one actual current production ParseRoute
  control with256schema fields and16route exclusions (reflection/expression
  bridge cached outside timing) included.
- Before capture/timing, the original LiveParseRoute_256_128 fixture failed
  in actual RoutePrecedence: this template exceeds28allowed segments. Its
  exact source/error are retained and the corrected live control is explicitly
  renamed LiveParseRoute_256_16. Large dormant templates do not establish
  live-binder reachability; no claimed production gain for those templates.
- Temporary diagnostic prototype changes only List<FieldDescriptor> to
  HashSet<FieldDescriptor> at local construction and recursive parameter type.
  Do not tune it for shipping while no current consumer exists.
- Original/prototype/restored containing tests must pass individually, with
  real generated Google.Api.HttpRule method/route/body producer and exact
  output ordering/field identity; body wildcard remains empty.
- Same benchmark DLL/PDB/deps/runtime, only owner DLL may differ; recursive
  hashes, actual loads/MVIDs and every fixture/launch receipt retained.
- At most three pairs, N>=8 and DontRemove outliers on shared host. A clear
  large dormant-helper gain may stop after one; otherwise honor remaining
  budget. No result overcomes missing current production reachability.
- Audit owner compiled IL method references with full coverage/unresolved
  reporting; zero static references does not prove arbitrary reflective
  external calls impossible. Live ParseRoute fixture must complete with
  actual route descriptors and empty path-descriptor cache.
- The initial runtime ResolveMethod audit failed on an absent standalone
  Http.Abstractions dependency before producing a complete count. Preserve
  that failed preparation log. The replacement reads every owner IL body
  and method/token/string operand name from PE metadata, without resolving
  external runtime assemblies. Report metadata coverage and zero matches,
  not zero unresolved runtime dispatch or whole-repository graph coverage.
- Restore exact shipping source; publish tests-only isolated branch,
  diagnostic project/results, removed-consumer history and rejection verdict.
  No optimization issue/PR if no supported consumer; no fourth pair.
- No complete hosted HTTP/production throughput, cold-runtime, concurrency,
  other platforms/runtimes or composition with previous changes claim.
