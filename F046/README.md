# F046: HTTP.sys connection-close header append

**Qualified, focused local efficiency; not merge-ready.** The declared fresh
default-dictionary primary took **13.41% less time** by median paired effect:
9.44%, 16.85%, and 13.41% across three AB/BA/AB comparisons.
Allocation was **384 B/op before and after**. This is roughly a 10-19 ns saving
inside a small response-preparation suffix, not a measured HTTP.sys, IIS, or
application-throughput improvement.

Classification: **Focused allocation-neutral lookup reduction**. The target is
an internal `HeaderCollection.Append` call from HTTP.sys connection-close
preparation, **not** ordinary application/request-header extension calls.
The branch remains a review proposal, with all controls and adverse observations
retained. The shared-machine timing budget is permanently closed at three pairs.

## Connected artifacts

| Artifact | Location |
|---|---|
| Source proposal | [Two-file source commit](https://github.com/jaslawinMs/aspnetcore/commit/4b84f010b923c6dd7154d5a3cc19dc0b17874bbc) |
| Tracking issue, draft PR, immutable evidence commit, and browser receipt | [Additive publication connections](publication.json), populated after the immutable capsule is published |
| Runnable BenchmarkDotNet project | [Project](harness/AutoPerf.Benchmarks.csproj), [benchmark cases](harness/HeaderAppendBenchmarks.cs), [actual-owner adapters](harness/HeaderAccess.cs) |
| Complete comparisons, variability, and raw-report links | [Every measured row](comparison-results.md), [independent arithmetic audit](audit-summary.json) |
| Owning tests and exact executed commands/results | [Validation catalog](validation-commands.md), [original unit XML audit](original-unit-trx-audit.json), [candidate unit XML audit](candidate-unit-trx-audit.json) |
| Actual native producer and shared-owner contracts | [Native host](harness/NativeProducer.cs), [contracts](harness/Characterization.cs), [compiled IL witness](harness/IlWitness.cs) |
| Original/default/candidate source and binary bindings | [Original inputs](source-inputs-original.json), [current-default inputs](source-inputs-current-default.json), [candidate inputs](source-inputs-candidate.json), [premeasurement gate](premeasurement-validation.json) |
| Independent nine-file project rebuild | [Untimed reconstruction receipt](reconstruction-paired-001/verified-reproduction.json) |
| Criteria and measurement limit | [Preimplementation acceptance plan](acceptance-plan.json), [closed budget](diagnostic-budget.json), [closure hash](permanent-budget-close.json) |
| Capsule integrity and omitted binary inventory | [SHA256 inventory](capsule-file-hashes.json), [omitted files](omitted-file-hashes.json) |

The campaign's classified `REPORT.md` remains its previously published
118-finalized snapshot. This later case does not silently revise that report.

## What actually calls the changed method

`src\Shared\HttpSys\RequestProcessing\HeaderCollection.cs` compiles into both
`Microsoft.AspNetCore.Server.HttpSys` and `Microsoft.AspNetCore.Server.IIS`.
The observed production call is HTTP.sys `Response.ComputeHeaders`: append
`Connection: close` when the response must close and its Connection header is
not already exactly `close`.

The actual source-built managed owner IL was inspected, rather than treating an
empty language-server result as proof of absence. It contains one HTTP.sys
`Response.ComputeHeaders` call site and zero references to this method in the
inspected IIS owner. This is complete for those managed method bodies, not a
claim about external reflection or native dispatch.

Real public `UseHttpSys` requests established the producer preconditions and
material boundary before a shipping edit, on both the original and observed
current default; the candidate and independent rebuilds repeat the same checks.
The application does not append close or fabricate native request contexts.
`OnCompleted` observes the real producer's managed headers; the client separately
observes the response. Wire `close` alone would not prove the managed append,
because the kernel can supply connection behavior independently.

| Native profile | Application Connection seed | Managed result after producer | Instance append expected |
|---|---|---|---|
| HTTP10.Missing | None | close | Yes |
| HTTP10.MixedCaseExisting | keep-alive, upgrade; mixed-case key | keep-alive, upgrade, close | Yes |
| HTTP11.RequestClose | None | close | Yes |
| HTTP11.RequestCloseWithKeepAlive | keep-alive | keep-alive, close | Yes |
| HTTP11.KeepAliveControl | None | None | No |
| HTTP11.AlreadyCloseControl | close | close | No |

Every native profile observes the requested request protocol, the actual
source-built header type, read-only completion state, HTTP/1.1 200 response,
empty body, zero content length, and expected client connection behavior.
Each listener uses one acceptor and an ephemeral loopback port and is stopped
and disposed. These are behavioral observations, not throughput measurements.
Native IIS integration is not claimed.

## Why the replacement preserves the supported store behavior

The old body reads the existing value through `IDictionary.TryGetValue`, then
uses the indexer to write `StringValues.Concat(existing, value)`: two dictionary
lookups for the standard store.

The candidate retains every existing trailer/read-only/character guard in the
same order. Only when
`Store.GetType() == typeof(Dictionary<string, StringValues>)` does it obtain a
slot with `CollectionsMarshal.GetValueRefOrAddDefault` and assign the concatenated
value through that slot. It keeps the dictionary's own comparer, key spelling,
and value order. No add/remove or callback occurs while the returned reference
is used; `StringValues.Concat` computes the struct value before assignment.

**Why not `Store is Dictionary<...>`?** `Dictionary` can be subclassed and its
`IDictionary` operations explicitly reimplemented. Skipping those operations
would change behavior. Exact type equality excludes subclasses as well as
wrappers; the fallback preserves the original three statements and interface
read/write ordering. A null append still leaves a present empty entry when the
key was absent, rather than accidentally removing that entry.

There are no constructor, field-type, public/protected API, dependency, new
friend-assembly, or unsafe-accessor changes.

## What the benchmark measures

Each operation constructs the real default header collection with its original
capacity and comparer, optionally writes preexisting Connection values, writes
the Content-Length header through its indexer, appends the fixed `close` value,
and returns the count. One precompiled expression-delegate invocation and all
collection/setup writes are timed. The existing-value arrays are prepared
outside timing; their optional setter and concatenation are timed.
No copy of the Append algorithm is benchmarked.

The Content-Length **header indexer** matters: explicitly setting the application's
cached `ContentLength` property changes how an empty response is finalized.
The real producer for the declared unset-length empty response writes `"0"`
before appending close. This fixture correction was documented before the first
compilation or timing, not used to retune a measured result.

Two methods cover six fixed profiles: NoExisting, KeepAlive, TwoExisting,
EightExisting, MixedCaseExisting, and WrappedStore. The primary is
`FreshNativeAppend/NoExisting`. The unchanged same-profile control explicitly
calls public `HeaderDictionaryExtensions.Append`, whose implementation does not
call the changed instance method. Wrapped/scaled cases are secondary and do not
establish real production frequency.

The common harness DLL/PDB is byte-identical across measured sources.
Each consumer has 189 files; **only the two owner DLL/PDB pairs differ**.
There are 185 unchanged files including the common harness pair, hence
183 other unchanged files. The actual current-default owners are separately
built and characterized; they are not relabeled baseline binaries.

## Results and limitations

| Pair | Order | Original primary ns/op | Candidate primary ns/op | Less time | Unchanged primary-control effect |
|---|---|---:|---:|---:|---:|
| 1 | Original then Candidate | 104.08 | 94.25 | 9.44% | -0.96% |
| 2 | Candidate then Original | 111.55 | 92.75 | 16.85% | 3.56% |
| 3 | Original then Candidate | 106.59 | 92.30 | 13.41% | -1.15% |

Positive effect means less time. The 13.41% headline is the median of paired
percentage effects, not a ratio of separately aggregated source means.
The primary is faster and exceeds its unchanged control in all three pairs,
passing the predeclared numerical and control gates. No allocation gate is met.

Important adverse/noisy observations are not hidden:

- The unchanged **KeepAlive extension control appears 27.44% faster in pair 2**,
  larger than that pair's 21.84% native KeepAlive secondary effect. Do not treat
  that secondary pair as clean causal evidence.
- The WrappedStore fallback has only a 2.85% median apparent benefit and is
  **2.31% slower in pair 3**. No fallback improvement is claimed.
- The largest case CV is 13.46%. This is shared, non-isolated hardware and three
  sequential source pairs, not formal statistical significance.

The method is a small once-per-closing-response step at the observed call site.
Its frequency, native network/host costs, and whole-application impact were not
measured. Larger existing-value profiles are not substituted for the primary.
All 72 case/source observations, 576 retained samples, 144 per-benchmark settings
records, and 22 runtime records remain available.

## Requirement coverage

The ten new owning unit rows pass unchanged on original and candidate. The five
existing native HTTP.sys functional rows also pass per source, with zero skips.
The independent XML auditor checks every parameterized row and safe, distinct
metadata. This is **green/green preservation**, not a semantic-bug red/green claim.

| Requirement | Evidence |
|---|---|
| Missing/existing keys, mixed-case original key, value order | `HeaderCollectionTests.Append_PreservesKeyAndValueOrder(existing: False/True)` |
| Arbitrary interface-store read-before-write behavior | `HeaderCollectionTests.Append_CustomStorePreservesInterfaceReadThenWrite` |
| Derived dictionary's explicit interface operations | `HeaderCollectionTests.Append_DerivedStorePreservesInterfaceOperations` |
| Read-only guard and invalid key/value before any store access | All three rows of `HeaderCollectionTests.Append_ValidationPrecedesStoreAccess` |
| Trailer restriction before read-only failure | `HeaderCollectionTests.Append_TrailerRestrictionPrecedesReadOnly` |
| Actual null value preserves absent/present entry semantics | `HeaderCollectionTests.Append_NullValuePreservesEntry(existing: False/True)` |
| Real HTTP/1.0, HEAD, keep-alive, HTTP/1.1 close behavior | Five exact existing `ResponseHeaderTests` rows in the validation catalog |
| Both shared-class owners and actual native producer | Twenty contracts, twelve fresh boundaries, and six native profiles per characterization |

An initial original-only fixture run had seven passes and three incorrect
expectations: the old character-error message contains a raw CR after `0x`, and
Connection is not in this class's restricted-trailer set. The corrected fixture
preserves the observed message, uses genuinely restricted Content-Length for
trailer ordering, and keeps raw CR data out of test names. All initial inputs
and failures are retained in
[fixture history](preparation/contract-expectations-001/correction.json).
Shipping code was not changed to make those assumptions pass.

## Audit and reproduction

From this directory, Node.js plus PowerShell can audit the published source and
results without restoring packages or running HTTP.sys or a timing job:

```powershell
node .\F046-verify.mjs . --require-seal
```

Result: all 576 samples reconstructed from native actual/overhead records,
sample statistics and midpoint-to-even allocation arithmetic checked, all
30 passing unit/functional XML rows checked, and the capsule seal verified.
`--live-images` is an additional local-only check requiring omitted binaries.

The nine authored project inputs were independently relocated, restored,
rebuilt, and used to characterize both source variants without timing.
Only the fresh common project DLL/PDB differs from each measured consumer;
both owning image pairs and all other dependencies are byte-identical.
The exact Restore, Build, and characterization commands/results are retained.
The project's `AspNetCoreRoot` property is overridable; the source-built HTTP.sys
functional graph and managed IIS owner must exist first.

Historical command paths describe this box. Published consumers, package caches,
`bin`, and `obj` are intentionally omitted and hashed, not supplied as executable
downloads. The reconstruction driver requires those retained local measured
images; the source/results auditor above does not. Do not replay old comparison
authorizations: the three-run budget is closed, including during reconstruction.

Source baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Observed current default: `31c15331c03714b7a602e1817e65881474c29e2e`.
The three relevant complete area trees and eleven selected source files match
at those commits. This does not assert equality of every dependency or toolchain.
The actual SDK is `12.0.100-alpha.1.26557.102`, runtime
`12.0.0-alpha.1.26562.105`, and harness language version C# 13.

The candidate was measured before its later source-publication commit.
Selected physical snapshots are bound to seven matching loaded PE/portable-PDB
documents across three source-built assemblies; remote LF-canonical source blobs
are separately verified. Embedded SourceLink URLs are historical metadata, not
proof that the measured images were built from the later commit. Full compiler
provenance, native IIS, JS/static-web-assets, packaging, full-repository builds,
and application-throughput validation are explicitly outside this evidence.
