# F077 acceptance and experiment boundary

Baseline: dotnet/aspnetcore `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Branch: `autoperf/F077-jsonpatch-token-bridge`.

The finding concerns the Newtonsoft ConvertTo serialization/deserialization text
bridge. CopyTo must keep its existing independent-copy behavior. The public
infrastructure signatures, null and assignability shortcuts, failure contract,
and deserialization-only contract-resolver override must remain unchanged.

Acceptance before proposing shipping changes:

1. Exercise real JsonPatchDocument construction or JSON deserialization followed
   by public ApplyTo. Verify incoming representations and complete resulting
   values, not a directly injected internal adapter callback.
2. Preserve JsonTextReader's observable date and floating-point representation
   for nested object-valued properties and the String token seen by a
   destination converter for a byte-array patch input. Add focused tests that
   pass on baseline. An optimization that fails them is rejected, not a fix.
3. Preserve all existing owning test outcomes, including nullable empty-string
   coercion, resolver behavior, errors, and copy independence.
4. Verify JsonConvert.DefaultSettings is invoked independently for both stages
   in an isolated process. Do not mutate global defaults in parallel unit tests.
5. Build the shipping project for net12.0, net462, and netstandard2.0.
6. Use an identical BenchmarkDotNet harness/runtime/dependency closure for
   immutable A/B snapshots. Measure 28 public patch cases with eight retained
   samples per launch, memory diagnostics, alternating order, and at most three
   measured comparisons. Never time incompatible contract probes as gains.
7. Retain every result and regression. A semantically incompatible token bridge
   receives a rejected experiment report, not an optimization draft PR.

Relevant history: `51828cc4f9a4d8cafad0d6c5039941dfa88f06b0` added the separate
resolver branches; `7c4ccff710f524cbb439934d8187c3b7cd9a7d0d` made the resolver
overload internal. Closed dotnet/aspnetcore#17032 describes nested resolver
propagation; it is not proof that its unmerged implementation shipped. Open
dotnet/aspnetcore#70323 changes adapter null/empty test semantics, not this
conversion bridge. Its proposed behavior is deliberately outside this item.

The shared Windows host is not dedicated to these measurements. No host
configuration changes, concurrent benchmark launches, or causal explanations
for unexplained timing variability are permitted.
