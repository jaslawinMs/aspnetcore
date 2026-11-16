# F105: validation-state public enumerator contract

**Rejected incompatible replacement;original allocation pressure is real.**
The shipped public GetEnumerator returns IEnumerator,not a public struct.
Changing that return type is a binary/source contract change,not a compatible
performance-only replacement. No shipping source edit,optimization commit or
performance PR was made. This is a local API assessment,not formal approval
or an executed modified-binary compatibility test.

## Measured original behavior

One24-case original BenchmarkDotNet profile completed:192 retained results,
72 workload warmups,399 actual overhead samples,24 hash/PID-linked setups.
All eight results per case are retained with DontRemove. This is **not a
before/after comparison or measured optimization gain**. Zero of three possible
source comparisons were used;the evaluation budget is closed.

[Every original result and all variability](original-profile.md),
[raw-derived arithmetic/identity audit](measurement-audit.json),
[actual full reports/log](measurements/original),
[final local API judgment](final-api-assessment.md),
[pre-implementation acceptance](acceptance.md).

| Actual warmed original boundary | Recorded managed allocation |
|---|---:|
| Empty concrete/generic/non-generic/retained complete traversal | 0B |
| Nonempty concrete/generic/retained traversal,1/16/128 entries | 56B |
| Non-generic traversal,1/16/128 entries | 88/568/4152B |
| Actual Required-model validation,null/empty/remapped/16 or128 unrelated entries | 1408B |
| Actual suppression/metadata/strategy overrides | 256B |

These are complete measured workloads,not isolated allocation-stack traces.
The non-generic totals are consistent with an enumerator and per-element
boxing;allocation types were not independently traced.

Two independent frozen-original probes retain240 precise process-wide caliper
samples,each65536 complete operations after16384 warmups. Concrete16/128 have
some near-zero samples even though the BDN profile reports56B. The null-state
validator has some approximately1472B calipers versus1408B elsewhere. These
are retained observations,not erased as noise or credited as an optimization.
No JIT/escape-analysis/scheduling/GC cause was directly established. Process-
wide accounting includes other managed activity;all actual enclosing BDN-helper
extra bytes are retained. The highest BDN CV is12.865756639331817%.

## Real owner and preservation boundary

Traversal directly uses the actual public ValidationStateDictionary with
0/1/16/128 inserted reference-distinct,value-equal keys and exact entry objects.
It completes the actual concrete,generic or non-generic consumer and returns
a checksum. Four retained-interface cases deliberately keep the real returned
IEnumerator after full traversal:an escaping caller diagnostic,not a claim
about ordinary MVC consumer frequency. Representation/GetType probes are
outside timing and are not themselves hot-allocation proof.

Validation resolves IObjectModelValidator through public AddMvcCore and
AddDataAnnotations registration. The actual DefaultModelBindingContext factory
creates the dictionary. State population/explicit null-state input are caller-
owned;no model binding is executed. Real DataAnnotations providers invoke the
Required-property getter,produce the exact input.Name/renamed.Name error,or
obey suppression/metadata/custom strategy. The real visitor invokes that
strategy;the probe does not inject its callback. Extra16/128 means17/129 total
stored entries. The inspected visitor uses TryGetValue:these cases are not
silently treated as timed state-dictionary enumeration.

Dictionary/DI/model-metadata construction,state population,output assertions
and serialization are outside timing. The timed validator includes clearing
the previous ModelState and completing validation/error construction/getter/
strategy work. This is a warmed managed service boundary,not HTTP,whole model
binding,browser,Native AOT,native memory or production-throughput evidence.

All24 complete original contracts match between pre-profile,BDN setup and
post-profile.48 independent frozen observations plus24 setups each check two
actual completions. Additional controls establish real reference-identity
lookups without value Equals/GetHashCode,live key/value views,independent
interleaved enumerators,public Reset,and Add-invalidated/Remove-continues/
Clear-completes behavior through all three public consumer shapes.

Ten exact existing DefaultObjectValidatorTests Facts pass,0 skipped,with
positive durations/exact TRX definition/result/entry/execution IDs and actual
test source/PDB/output-owner/dependency identities. These are owning validation
controls,not pre-existing dedicated enumerator tests or red-green performance
bug-fix evidence. The test output identity is not misrepresented as an
in-test loaded-hash marker;the harness records actual executing owner hashes.

## Source,related work and immutable inputs

Independent branch:`autoperf/F105-validation-state-enumeration`,unchanged
campaign baseline`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Captured current default`dd1062f94f356d6be59ad340e5aff2fd829165c6`.
All20 scoped current/baseline/working files have equal Git identities;actual
Git-fetched canonical bytes and separate raw BOM/CRLF-sensitive bytes are kept.
The current/default/baseline formatting configuration also matches.

Actual owner history's latest captured entry is154177cd875497fc1e70fee9bc289c990e3a8f63
(2023-12-19,dotnet/aspnetcore#52867). Bounded related-work research captured
dotnet/aspnetcore#70210 atad6a8131543fb83317af22ac267a4e6f159e6c6b.
Its five-file proposal lazily allocates storage but retains interface-returning
enumeration;the actual pinned owner blob is included. Same-file overlap was
not counted as a duplicate. GitHub semantic search returned404,LSP returned
only three same-file references;neither is solution-wide absence proof.

The exact frozen image has305 recursively hashed application files/126 declared
runtime assets;the actual MVC Abstractions/Core/DataAnnotations owners match
the original executed control outputs. Seventeen image source/PDB associations
cover four harness/thirteen selected owning sources. Separate actual test
and reused evidence-tool source/PDB proofs are included. Associations are
not method/branch coverage.

Harness SHA256:`DFCEF05D3B14C362916FAAFA1A8C78B6A2B3C61A068702D08765C1E5312464A0`.
Abstractions owner SHA256:`6C6655A731796009242B907B3BA44609044D24E0CF64B5018D9CCB121D5D4115`.
SDK12.0.100-alpha.1.26557.102/runtime12.0.0-alpha.1.26562.105,
net12/C#13,Release/x64,concurrent server GC,BDN0.13.0,in-process,
3 warmups/8 results/100ms requested,DontRemove. Raw Unknown/null CPU host fields
remain unmodified;separately captured live Windows hardware metadata is included.
CPU-heavy work was serialized on the shared machine,max2 build nodes;
power,priority,affinity and unrelated processes were not changed.

Initial harness build had one CS8602 warning;the exact initial sources/build
record are retained. The focused nullable guard and explicit invariant parsing
precede freezing. Final build and exact repository whitespace check exit0,
0 build warnings/errors. The initial portable auditor rejected a single-command
JSON object as if it were an array;its exact source/failure is preserved.
The reader was corrected without changing raw data or rerunning the benchmark.

## Reproduction and limits

From this capsule directory:

```powershell
node .\reproduce-analysis.mjs (Get-Location).Path --verify
```

This rechecks exact copied artifacts,Git/source identities,input/producer/state
outcomes,all retained sample/statistical/GC/actual overhead arithmetic and TRX
rows. It verifies sample N-1 variance/SE,R7,fences and recorded CI arithmetic,
not independent confidence-distribution critical values. Tagged public BDN
sources/receipts were reused exactly from verified F104,not freshly downloaded.

[Exact commands and actual outcomes](validation-commands.md) and
[parameterized actual-owner project](harness/AutoPerf.Benchmarks.csproj) are
included. Start each fresh dotnet shell at the repository root and activate
`. .\activate.ps1`. Build the real Core.Test Release output before the external
harness;override AspNetCoreRoot for another checkout. Historical scripts retain
their actual session paths/guards;portable audit needs only Node built-ins.

Raw DLL/PDB/binlogs/runtime-pack bytes are not published. The portable auditor
checks their recorded identities/closure/PDB receipts,not omitted bytes.
No new public/protected API,dependency,TFM,shipping visibility,IVT or UnsafeAccessor.
The finding rejects the evaluated incompatible replacement,not all future
compatible implementations. No optimization percentage is invented.
