# F171 pre-implementation criteria

Actual F171 is the `owin.CallCancelled` default in `OwinEnvironment(HttpContext)`,
not protocol or version. F172 is the separate `owin.Version` default.
The initial handoff shorthand was wrong; the owned unpushed branch was renamed
to `autoperf/F171-owin-cancellation-default` before shipping edits or timing.
Fresh upstream main remains `37e809ead5824bc753a1c3d56f11615bdb1296c5`.

The constructor accepts public HttpContext.Items, an arbitrary
IDictionary<object,object?>. The actual default producer is the lazy internal
ItemsDictionary in the Http assembly. Its ContainsKey and indexer setter forward
to the underlying dictionary. A generic IDictionary TryAdd still uses
ContainsKey/Add; do not assume one native probe, a normal-traffic gain, or
equivalence of a caller's indexer setter and Add side effects.
None is a struct and passing it eagerly to TryAdd boxes on present-key paths.
Do not add IVT/UnsafeAccessor or reach across the Http assembly's private
dictionary boundary. Do not change F172 or cache/share a mutable boxed token.

Relevant history is dotnet/aspnetcore#58917, commit
fd3fe12cec7cc0b8b820e414a39fd5cae10abcc2: large per-environment feature-map
allocation reduction. Keep that already-shipped work separate; current
constructor comparisons must include the actual complete OwinEnvironment,
not copy a dictionary loop or reuse those historical figures.

Before an experimental rewrite, verify original values on actual default,
Dictionary and SortedDictionary Items producers for absent/None/cancelled/null/
arbitrary existing values. Preserve exact existing object identity, unrelated
items and existing version. Verify real request-lifetime feature precedence
through the actual public environment, independent of the fallback Items value.
Preserve the original exception from a caller-supplied Items indexer setter
under actual public constructor invocation. Account for every theory row in
actual TRX, not just suite totals.

Evaluate the smallest direct generic TryAdd rewrite as an experiment, not as an
assumed semantics-preserving optimization. If any accepted-input compatibility
case changes, reject it, restore only owned shipping edits, retain original,
experimental and restored outcomes, and do not create an optimization PR.
One measured comparison may document a rejected experiment; incompatible
changes do not get tuned into unrelated abstractions or further timing runs.
Otherwise use at most three serialized comparisons for sub-50% results and
record no-gain if a supported net benefit is absent.

BenchmarkDotNet must exercise real context/Items creation plus the complete
constructor, or an explicitly labeled stable existing-context constructor
case. Fixtures, existing value creation and assertions are outside timing.
Fresh and existing-key/null/lifetime-feature paths, ordinary/default Items
producers, and real reused-context controls must be distinguished.
Keep existing-key contexts bounded, no retained results or growing timed mock
history. Freeze the identical harness/configuration and exact owner DLL
snapshots, check full dependency closure and actual owner loads, and retain
every allocation, non-win and variance outcome.

No change to public API/default, other constructor statements, process-wide
metadata caches, shipping manifests or shared machine settings. Hosted/network
requests, real abort delivery, concurrent contexts, cold runtime and other
runtimes/architectures remain outside the measured scope.

Before any measured launch, fix the conventional-input benchmark matrix to
12 cases: five fresh default-Items value states; fresh Dictionary absent/None;
real lifetime-feature precedence with absent fallback; three real reused
contexts (default, Dictionary with 32/1,024 padding items); and a request-only
control which never creates OWIN. Fresh cases time the actual context and Items
producer as well as constructor. Existing values are created in setup.
Reused cases keep stable Items count and exact existing object identity.
The deliberately faulting dictionary is a separate compatibility case,
not a timed mock or a claimed successful benchmark fixture.
