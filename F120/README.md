# F120: copied-store Contains specialization - no gain

**No performance proposal.** The declared copied-five-factory miss became
**54.37% and 36.46% slower** in the two completed source comparisons.
BenchmarkDotNet reports **0 B/op for both variants** of that primary.
The experimental source is retained only for inspection; it is not recommended
for merge and has no performance PR.

All three permitted authorizations were consumed: the first failed in the
common fixture before any workload sample; the remaining two completed in
opposite source orders, retaining **512 observations**. The failed slot was
not reset or replayed. Favorable empty/ordinary-path observations do not replace
the predeclared copied-store primary.

## Connected artifacts

| Artifact | Location and scope |
|---|---|
| Experimental source | [Independent fork commit](https://github.com/jaslawinMs/aspnetcore/commit/6cbee2d052c988b07d936ea8de489456beb22317), [two-file diff](https://github.com/jaslawinMs/aspnetcore/compare/37e809ead5824bc753a1c3d56f11615bdb1296c5...6cbee2d052c988b07d936ea8de489456beb22317); diagnostic only |
| Proposed seam | [Exact measured patch](candidate.patch), only `CopyOnWriteList<T>.Contains`; 13 insertions, no deletions |
| Runnable benchmark project | [Project](harness/AutoPerf.Benchmarks.csproj), [both timed methods](harness/CollectionBenchmarks.cs), [real HTTP producer](harness/HostedProducer.cs), [exact eight-input hashes](harness-source-hashes.json) |
| Complete results | [Every profile, variability and raw run links](comparison-results.md), [independent arithmetic](measurement-audit.json), [final audit](audit-summary.json) |
| Acceptance and disposition | [Sealed plan](acceptance-plan.json), [decision](decision.json), [permanently closed budget](diagnostic-budget.json), [close receipt](permanent-budget-close.json) |
| Behavioral evidence | [Pre-edit baseline](baseline-validation.json), [final fixture seal](premeasurement-validation.json), [exact commands and results](validation-commands.md), [seven focused preservation rows](preservation-source/src/Mvc/Mvc.Core/test/Infrastructure/CopyOnWriteListTest.cs) |
| Independent reconstruction | [Exact-input rebuild and both untimed variants](reconstruction-paired-001/verified-reproduction.json) |
| Preserved failed authorization | [Failure](comparison-001/failure.json), [raw output](comparison-001/Original/stdout.txt), [complete old fixture epoch receipt](fixture-epoch-001-async-setup-failure/archive-receipt.json), [setup-only repair](fixture-repair-installed.json) |
| File integrity and omissions | [Immutable manifest](capsule-file-hashes.json), [byte-exact copies](authoritative-copies.json), [hashed build/binary omissions](omitted-file-hashes.json) |

The tracking issue and final campaign index are created only after immutable
remote evidence verification. Their additive
[publication receipt](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F120/publication.json)
is deliberately outside the sealed manifest. The fixed classified findings
report excludes no-gain items and is not changed by this evaluation.

## Why this apparently simple change needed preservation checks

All four inspected controller/page producers cache a source **array** and
create a per-request copy-on-write wrapper. Its private `List<T>` exists only
after a write. The candidate adds a concrete-list enumeration branch only when
that private copy exists, leaving the original arbitrary-`IReadOnlyList<T>`
fallback untouched.

It intentionally does **not** substitute `List<T>.Contains`:
the existing `object.Equals(obj, item)` can disagree with typed
`IEquatable<T>.Equals`. It also preserves enumeration order, short-circuiting,
disposal and the version exception after nonmatching reentrant mutation.
Specializing an arbitrary source list would be incorrect when a subclass
reimplements interface enumeration. These are behavioral concerns, not a claim
that the existing implementation has a correctness bug.

The actual default branch observed before implementation was
`415ed2bad38605bfc133a8bbed1877a3c9c82a94`.
The target Git blob and all ten selected normalized source/project/test inputs
match the campaign baseline. Actual original/default builds and behavior were
checked before the shipping edit; selected physical source and six PE/PDB
document associations are retained for each variant.

## Faithful boundary, not a whole-MVC speedup

Real TestServer HTTP requests route to and activate an MVC controller.
The action obtains `ControllerContext.ValueProviderFactories` naturally,
without assigning that property or constructing a surrogate wrapper. A public
temporary add/remove establishes the private copy; a second request proves
distinct wrappers, an unchanged shared source array and no copy on that request.

Default-five, empty, singleton and eight-factory setups are observed on real
hosts. A parameterless action reads raw query instructions so an empty
value-provider configuration cannot silently prevent the mutation setup.
Both `EnableActionInvokers` modes are characterized.

Timing contains one public `IList<IValueProviderFactory>.Contains` call on the
already-prepared collection and stable probe. Host startup, HTTP requests,
first-write copying, reflection, checks and shutdown are outside timing.
`UnchangedIndexOf` is a separately measured unchanged method on the same
prepared profile. Two unmodified `Contains` profiles expose ordinary-path costs.
This does not measure request throughput, construction or production frequency.

Each successful full characterization executes **48 HTTP requests, 16 public
profile/mode contracts, six extra equality/enumeration contracts and eight
public benchmark lifecycles**. Original, actual current default and candidate
agree. The exact-input rebuild repeats both original/candidate matrices.
The existing managed Razor Pages producer suite passes nine rows; a real
compiled-page request was **not** exercised or claimed.

## Requirement coverage

These are **green/green preservation tests**, not semantic-bug red/green proof.
The unchanged source and candidate each pass the same 35 selected XML rows,
including all seven new rows below. The actual current default passes 28
existing rows; the candidate Pages producer class passes nine.
All **135 historical passing rows** are independently parsed, not 135 unique
tests. Exact activated commands, results and XML are linked from
[validation-commands.md](validation-commands.md).

| Requirement | Evidence |
|---|---|
| Null/present/missing membership and source/copy isolation | `Contains_PreservesSourceAndCopiedStoreContents(copied: False)` and `Contains_PreservesSourceAndCopiedStoreContents(copied: True)` |
| Preserve object rather than disagreeing typed equality | `Contains_CopiedStoreUsesObjectEqualsInsteadOfEquatableEquals` |
| Mutation failure and immediate matching return | `Contains_PreservesReentrantMutationAndEarlySuccess(matches: False)` and `Contains_PreservesReentrantMutationAndEarlySuccess(matches: True)` |
| Enumerate/dispose the arbitrary source without indexing it | `Contains_UnmodifiedStoreEnumeratesAndDisposesSource` |
| Respect a source subclass's interface enumeration order | `Contains_UnmodifiedListSubclassPreservesInterfaceEnumerationOrder` |
| Real request producer, copy setup and per-request isolation | Three matching source-variant HTTP characterizations and both independently rebuilt variants |

## Fixture failure and measurement limits

Authorization 1 exposed a common-fixture defect: the pinned BDN 0.13.0 in-process
emit path did not await asynchronous `GlobalSetup`, so the workload saw an
unassigned scenario. There were **zero retained workload samples**.
The old eight inputs, all three complete old images' hashes, failed output and
source bindings remain preserved. This was not a framework correctness failure.

The repair awaits all eight real HTTP producer setups in async `Main`, before
BDN starts; synchronous `GlobalSetup` only selects a prepared profile.
Both timed bodies, all profiles, source candidate, orders, numerical gates and
executor settings are unchanged. Repaired original/default/candidate
characterizations pass before authorization 2. Authorizations 2 and 3 then run
Candidate then Original and Original then Candidate; no further timing is permitted.

The copied primary's source-case CVs range from 0.75% to 2.79% in those two
pairs. Its allocation saving is zero in both. The source-array controls report
32 B/op in both variants; no nominal 40-byte saving is inferred from C# syntax.
Raw amortized bookkeeping counts and midpoint-to-even allocation rounding are
retained. No disassembly was collected, so no specific JIT explanation is
claimed. All favorable, adverse and unchanged-control results remain visible.

The shared Windows box is not isolated. .NET 12 preview, BDN 0.13.0, three
warmups, eight retained results, requested 100 ms iterations, unroll 1 and
`DontRemove` are recorded. The settings-preserving executor requests no
priority/affinity/power changes; 25 runtime and 130 per-benchmark settings
records are checked. No application, browser, AOT/trimming, full-repository,
packaging or merge-readiness claim follows.

## Reproducibility

The standalone .NET 12/C# 13 project references source-built ASP.NET Core
outputs, not installed ASP.NET Core shared-framework owners. Build prerequisites
and exact historical commands are in [validation-commands.md](validation-commands.md);
the MVC test graph and referenced product outputs must exist first.
Activate the repository-local SDK before any `dotnet` command.

The independent reconstruction relocated and byte-checked all eight inputs,
actually restored and rebuilt them, overlaid measured owner bytes and held
all other dependencies fixed. Each 328-entry rebuilt image differs from its
measured counterpart only in the rebuilt common harness DLL/PDB. Both untimed
characterizations agree. This is not a clean-machine rebuild of every framework
dependency or complete compiler provenance.

Audit committed text, hashes, raw arithmetic and XML without timing:

```powershell
node .\F120-verify.mjs . --require-seal
```

Node and PowerShell 7 are required. Compiled/restored files are omitted from
Git but fully hash-inventoried. `--live-images` additionally needs the original
materialized images. Historical absolute paths and command records are evidence,
not permission to replay the permanently closed comparison authorizations.
