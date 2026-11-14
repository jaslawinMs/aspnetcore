# F181 pre-implementation acceptance

Freshly fetched upstream default:
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Independent branch: `autoperf/F181-dfa-literal-pairs`.
No shipping source has changed before these criteria.

## Actual source and prior work

`DfaMatcherBuilder.DfaBuilderWorker.AddParentsMatchingComplexSegment` enumerates
an ordinary ordinal-ignore-case `DfaNode.Literals` dictionary's keys, parses each
literal against the real complex route segment, evaluates actual literal-node
matching policies, and re-probes the dictionary when all policies pass.
`routeValues.Clear()` executes after every sibling.
The dictionary is an intermediate build structure, not a runtime request lookup.
`DfaMatcherBuilder.Build()` invokes the real tree producer, policy processing,
state/candidate construction and jump-table creation.

Current nearby pair enumeration is used by DfaNode.Visit and AddNode.
Relevant history: dotnet/aspnetcore#46323 introduced per-builder parameter-policy
caching and an actual complete-builder benchmark. Latest file history includes
the unrelated typo change dotnet/aspnetcore#67428.
Current dotnet/aspnetcore#70138 changes candidate reuse and
dotnet/aspnetcore#70159 changes ApplyPolicies work-list reuse; their retrieved
patches do not change this complex-literal loop. Keep those changes out of this
independent proposal and do not claim combined results.

## Intended surgical change

Enumerate the existing dictionary's key/value pairs, preserve the explanatory
`literal` value and all original matching/policy/clear branches, and add the
already-enumerated node instead of re-probing by key.
Do not replace the dictionary, comparer, route-value storage, policy evaluation,
ordering, candidate construction or state lifetime.
No new process-wide metadata cache, public API, IVT, UnsafeAccessor,
shipping dependency-manifest or machine-setting change.

## Compatibility and faithful original reproduction

Extend only the existing DfaMatcherBuilderTest class. Each new row must pass on
exact original and candidate source, and the containing Routing.Tests suite
must pass before publication.

1. Actual endpoint registration and BuildDfaTree must produce multiple sibling
   literal nodes, including an ordinal-ignore-case alias, a complex match,
   policy rejection and complex-syntax rejection. Preserve every original
   literal branch and attach the complex continuation to the selected nodes.
2. Real complex parsing must feed recorded custom
   IParameterLiteralNodeMatchingPolicy calls in sibling/parameter order.
   Cover an optional value present and absent after a previous sibling supplied
   it, so stale routeValues cannot make an unexercised case pass.
   Preserve later-parameter evaluation after an earlier parameter rejects.
3. An actual DI-created builder, full Build and default endpoint selector must
   preserve selected endpoint identity, parameter values, optional absence,
   rejection and case-insensitive literal selection.

Mocks may record the public policy callback in the focused tree test; do not
inject private callbacks or handcrafted DfaNodes/dictionaries.
Full matcher selection uses real routing services and policies.
These are optimization compatibility checks, not functional bug-fix red/green.

## Measurement boundary and stop policy

A standalone BenchmarkDotNet 0.13.0/net12/C#13 project must run the actual
source-built Routing assembly's transient builder and complete Build method.
Use cached reflection/expression bridges outside timing to reach existing
internal owner types; do not add a shipping friend assembly or copy the loop.
Create a fresh actual builder, add real preconstructed RouteEndpoints, and
consume the actual complete matcher per operation.
Endpoint parsing, service setup, bridge compilation, graph inspection and
request-selection assertions run outside timing.

Cover empty/literal-only/simple-constraint/no-sibling controls and matching,
nonmatching, mixed/rejecting policies, optional fragments, larger siblings and
repeated complex routes. Validate complete producer/tree structure and actual
matcher selection, not just a callback count. Keep timed mocks and growing
invocation or result-history collections out of the harness.

Freeze original and changed complete outputs with the exact same original
harness DLL/PDB/runtime/dependency configuration; only Routing.dll may differ.
Every launch must complete the expected nonzero case count with eight positive
retained measurements and allocation diagnostics.
At most three serialized A/B comparisons, alternating A/B, B/A, A/B.
Stop early only for a clear large gain; retain every control and non-win.
No fourth run, no cherry-picking or aggregation of different implementations.
If no meaningful benefit is supported, publish no-gain rather than a draft.

Scope is warmed managed complete matcher construction. Full application startup,
live endpoint-refresh latency, hosted HTTP/production throughput, concurrent
builds, cold runtime, other architectures/runtimes and combined branch effects
remain outside the claim unless separately established.

## Fixed matrix before any measured launch

The final original standalone harness has 24 cases: six controls (empty, three
literal-only sizes, simple integer constraints and no literal siblings), fifteen
matching complex-literal cases (1/8/32/128/512 siblings, one/eight complex
continuations, mixed integer policies, alternating optional fragments, Unicode,
128-character prefixes and eight actual parent groups), and three no-successful
membership cases (two syntax misses and integer rejection).
Every setup builds two real complete matchers, compares a complete ordered DFA
graph, and asserts endpoint identity and exact route values for all generated
literal, case-insensitive alias, complex-continuation, parameter-fallback and
unregistered-path requests. These checks are untimed.

Original source passes all 3,511 containing tests, including every one of the
six new compatibility rows, and all 24 actual benchmark setups.
Two initial standalone runtime-closure attempts lacked explicit Routing and
HTTP abstraction references; their original failure logs are retained.
The final project has explicit source-project references, a pinned runtime and
no implicit shared ASP.NET Core framework fallback. No timed launches occurred
during dependency preparation.
