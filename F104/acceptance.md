# F104 acceptance, recorded before implementation

Finding: `concurrentdictionary-default-constructor-overallocation` in
`RouteHandlerAnalyzer.cs`. The set dictionaries are already cleared and pooled
within a compilation. Their allocation is initial/concurrently active pool
population, not one new dictionary for every operation block or runtime request.
The scanner's small-cardinality/frequency assumptions are unverified.

## Prerequisites

- Revalidate the exact owner, ambiguity helper, related route helpers, caches,
  diagnostics, test definitions and project configuration against the captured
  current default and the independent campaign baseline.
- Preserve and inspect the actual pooling introduction, current relevant PR
  scopes and product/build guidance. Bounded searches do not establish
  exhaustive absence of existing work.
- Run the existing ambiguity controls on the unchanged owner, recording every
  Fact and InlineData row, skips, durations, exact TRX IDs and output owner/
  compiler identity. Missing prerequisites are failures, not passing tests.
- Build a real compiler-driver harness against actual in-tree endpoint-builder,
  routing and HTTP metadata. No dictionary-only benchmark, stub framework,
  injected operation callback or route-parser replacement stands in for the
  owning measurement.

## Faithful reproduction

Five controlled shapes, each in serial and concurrent driver mode:
ordinary non-route blocks, small unique routes, small duplicate routes,
wide unique routes and wide duplicate routes. Every ordinary timed compilation
includes a separate positive duplicate-route anchor. Exact compiler bindings,
diagnostic IDs/severity/file/spans/messages and complete diagnostic consumption
must pass before timing.

Retain nearest-opposite HTTP-method/builder/conditional/metadata controls,
actual pool-reuse block lifetimes, generated-code suppression and concurrently
started distinct compilation lifetimes on the same analyzer instance.
Probe-only forwarding may observe callbacks created by Roslyn; it must not
inject callbacks or be used for timed runs. Record global and per-block callback
overlap without claiming contention that was not observed.

Time a fresh real `CompilationWithAnalyzers` run and await `Task<int>`. Parsing,
metadata/setup and observers stay outside timing. Reuse immutable compilations
after warmup, but do not claim that compilation-start pool construction is
preserved across different driver runs. Separate process-wide managed-allocation
calipers must include worker threads, actual driver/task/cache/diagnostic work.
Cold/fresh-compilation work is reported separately from warmed driver work.

## Proposal and comparison gates

The first candidate may reduce the private set's initial concurrency/capacity
using an explicit supported `ConcurrentDictionary` constructor. It must remain
thread-safe and grow correctly for high cardinality. Do not replace it with an
unprotected dictionary, remove the pool or modify comparer/equality, collection
reset/return, route parsing, diagnostics, generated-code settings, public API,
dependencies, target frameworks or assembly visibility.

Choose final sizing from actual full-owner and large/concurrent controls, not
from an assumed production cardinality or a dictionary-only speedup. A laziness
alternative must account for its per-block closure/gate cost and actual pool
reuse; it is not automatically better.

Freeze the exact original executable/config/dependency harness. Proposed images
must clone it and change only the same-identity analyzer DLL/PDB. Record raw
source patches, complete image/declared-asset hashes, source/PDB associations,
actual runtime/compiler/metadata identities and emitted input bytes. Reject
harness drift before measurement.

At most three actual source comparisons, each paired with a retained fresh
exact-original sweep. Stop early only for a clear compatible approximately50%
full-owner win; otherwise close the budget at three. Preserve every sample,
overhead/GC/setup record, regression and control movement; never substitute
finite-policy, dictionary-only or untimed differences for optimization gains.

Repeatable compatible full-owner allocation savings can justify a clearly
qualified allocation-only draft even without a material speedup. Do not credit
timing changes when unrelated controls move similarly. No repeatable owning
benefit means `no-gain`; incompatible trade-offs mean rejection, not a
performance PR. Explicitly report the saving's fraction of total driver work.

## Publication

Publish exact commands with actual outcomes, original/final control results,
all compared source/images and all raw measurements. Audit exact input bytes,
samples, GC rounding and actual overhead subtraction; disclose omitted binary/
runtime-pack bytes and statistical/causal limitations. A proposed image built
before its source commit remains labeled baseline plus its recorded patch.

Use the repository default PR template, create only a justified fork draft,
verify its actual head/base/body and immediately launch its actual URL in the
default browser. Count finalized only after the evidence and receipt/index
blobs/ref are verified remotely. No public API, production-frequency,
whole-build, browser/native, VS2019 CLR, Mono, WASM or AOT claim is implied.

Shared Windows machine: serialize CPU-heavy work, max two build nodes; preserve
unrelated processes, priorities, affinity, power settings and untracked reports.
Activate the repository's local .NET environment in every fresh dotnet shell.
