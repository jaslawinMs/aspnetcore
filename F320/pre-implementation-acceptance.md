# F320 unused body-property metadata acceptance

Independent fresh current main37e809ead5824bc753a1c3d56f11615bdb1296c5.
Existing real JsonTranscodingServiceMethodProviderTests pass12/12 before edits.
The current sole source caller is the actual generated-service binding
CreateDescriptorInfo producer. It copies Descriptor/IsDescriptorRepeated/
FieldDescriptor into CallHandlerDescriptorInfo, not PropertyInfo/ParameterInfo.
The former PropertyInfo consumer was the removed Swagger description provider,
in39e1ac975cf138c56fff984dd824ab651a448367/dotnet/aspnetcore#67919.
Initial incorrect Swagger-path filtered history is empty, not removal evidence;
corrected actual paths and former member consumers are retained.

Evaluate removal of only the unused named-body CLR property metadata work:
its underscore-name projection, Type.GetProperty, and redundant constructor
argument. Keep BodyDescriptorInfo's existing shape/defaults, wildcard request
method/ParameterInfo discovery(F321), every branch, field/descriptor selection,
invalid-body exception, and request/body protocol behavior unchanged.
No new cache or process-wide metadata state: no invalidation mechanism needed.
Do not combine F295's formatter changes or F319's cache with this item.

- Actual owner audit: enumerate complete owning assembly method/token evidence
  for ResolveBodyDescriptor callers and PropertyInfo getter references. Require
  the real binding caller and zero getter calls, plus actual source ownership;
  disclose external/arbitrary reflection boundaries rather than claiming a
  whole-repository graph or reflection impossibility proof.
- Before shipping edit, preserve real generated message/sub/repeated/map body
  descriptor identities, repetition and field accessors, empty/wildcard and
  invalid-name/nested/primitive partitions in focused original tests.
- Validate actual generated-service startup/endpoints and real named JSON body
  handling at an appropriate existing hosted boundary; do not inject downstream
  descriptor objects as proof of upstream discovery behavior.
- Fixed full ResolveBodyDescriptor cases use actual protoc-generated descriptors;
  include repeated/message/map named-body partitions and unchanged wildcard/
  empty/error controls. Full MapGrpcService startup cases contextualize the
  component-local gain. Setup materializes/describes actual endpoint output.
- A justified improvement must be grounded in the complete affected owning
  descriptor producer, not an isolated copied lookup/name formatter. No request
  throughput/cold-first-process or overall startup speed claim from diagnostic
  helper gains. Retain all full-startup non-wins and control/heap variance.
- Original/final suites and each theory row, actual immutable fixture receipts,
  exact source hashes, original harness/runtime/deps, and owner-only closure.
- Serial shared-box .NET12/BDN0.13 with3warmups/8iterations/DontRemove, maximum3
  complete comparisons; no fourth. Stop early only for a supported clear large
  affected-producer gain; otherwise consume remaining comparisons honestly.
- Only justified minimal shipping work with all required boundaries green gets
  fork-only originating issue/template draft, immediate browser-opening request
  and exact remote verification. Otherwise restore shipping source and publish
  no-gain/rejection without manufacturing a cache or PR.
