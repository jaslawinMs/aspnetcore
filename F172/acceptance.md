# F172 pre-implementation acceptance criteria

F172 is the `owin.Version` default in the actual public
`OwinEnvironment(HttpContext)` constructor. Fresh upstream main is
`37e809ead5824bc753a1c3d56f11615bdb1296c5`; this branch is independent of every
earlier proposal, including F171. Relevant allocation history is
dotnet/aspnetcore#58917, commit fd3fe12cec7cc0b8b820e414a39fd5cae10abcc2;
do not reuse historical results as current measurements.

Before shipping edits, establish actual default ItemsDictionary, Dictionary
and SortedDictionary behavior for absent version, existing custom string,
empty string, null, arbitrary object and existing default string. Assert exact
existing identity, public environment exposure, unrelated entry, existing
cancellation token, actual context storage and exact Items count.
Preserve the actual caller-supplied version indexer-setter exception through
the real public constructor. Reconstruct an environment over the same real
context and preserve version/token identities without growing Items.
Account for each of the 20 new rows, not only suite totals.

The smallest direct generic IDictionary.TryAdd experiment is not presumed
compatible. It still calls ContainsKey/Add and changes indexer-set side effects
on arbitrary public Items. Unlike F171's token argument, the version string is
not newly boxed. Do not claim a single native Dictionary probe or invent a
boxing gain. Do not alter CallCancelled, introduce cross-assembly private
access, cache/share new mutable state, or change manifests/API shape.

Freeze a twelve-case standalone BenchmarkDotNet matrix before timing:
six fresh default-Items version states, Dictionary absent/custom version,
three stable reused contexts (default and Dictionary with 32/1,024 padding
entries), and a real request-only control. Fresh cases measure actual
DefaultHttpContext/Items producers and complete OWIN construction; input values
are made in setup. The faulting dictionary is a separate compatibility test,
not a timed mock. Reused contexts must have bounded counts and exact existing
identities. Verify every fixture twice outside timing.

Compare immutable snapshots with the identical original harness DLL/PDB and
runtime/deps configuration. Verify complete recursive closure with only
Owin.dll different, actual owner loads/MVIDs and every raw case/allocation/SD.
Serialize work on the shared Windows machine; do not change other users'
processes or power settings.

If compatibility fails, preserve one diagnostic pair, stop without tuning,
restore only owned shipping edits byte-for-byte, rerun the containing suite and
publish a rejected disposition with exact original/prototype/restored source
and test evidence. A final tests-only commit is not the measured prototype.
No speculative optimization issue or PR. Otherwise use at most three pairs
under the campaign rule and record no-gain absent a supported benefit.

This scope does not establish hosted/network throughput, abort delivery,
concurrency, cold-runtime behavior, other runtimes/architectures or the
exhaustion of every possible alternative. No new process-wide metadata cache
or hot-reload work is required.
