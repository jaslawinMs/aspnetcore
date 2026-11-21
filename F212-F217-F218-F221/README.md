# AutoPerf F212/F217/F218/F221: bounded source-qualified assessments

**Disposition: rejected, material candidates not established.** These are not measured no-gain results, universal costlessness claims, or verified candidate rewrites. No performance PR or browser-window launch is justified.

| Finding | Owning producer and decision | Qualification boundary |
|---|---|---|
| F212 | The Photino sample hands a real native browser-message callback to the default task scheduler. Inlining can instead enter dispatch/render/application processing on the callback stack; a material scheduling workload and an equivalent replacement were not established. | Native callback and managed/window-dispatch sources plus authoritative Windows threading documentation, not a running native window, selected Photino binaries, reproduced hang, or cross-platform thread-affinity proof. |
| F217 | Built-in named-pipe server endpoints use server name `"."`; XOR with that fixed hash is bijective over pipe-name hashes. Reviewed real producers/consumers did not establish a material owning endpoint hash-key workload. | Equality/hash contract and bounded consumer evidence, not an exhaustive external-consumer inventory, production name distribution, collision benchmark, or zero-benefit proof. |
| F218 | The library set is checked once per discovered assembly before pages are enumerated, including real endpoint refresh configuration. The first empty-set `Contains` returns without hashing; initialized sets can repeat lookup work. A material owning discovery/refresh workload was not established. | Canonical samples configure two assemblies in source, not a universal bound or executed application/Hot Reload workload. |
| F221 | A real compile-time analyzer retains candidates to distinguish no compatible member (E2E001) from compatible but nonstatic members (E2E003). A simple static-only `FirstOrDefault` conflates those diagnostics. Material analyzer work was not established. | Real invocation/symbol/diagnostic producers and normal registrations, not runtime server-start frequency, synthetic member sets, executed analyzer tests, or measured allocation savings. |

F218 refresh is **not startup-only**: the initialized endpoint data source responds to the real metadata-update token and creates a fresh discovery builder. More pages or routes do not by themselves multiply this assembly-level check. No candidate, duplicate-exception equivalence, actual metadata delta, selected CLR/JIT/comparer, or hash-operation count is claimed.

F221 is a `DiagnosticAnalyzer`, not an incremental generator. Its separate startup-hook generator does not consume this temporary analyzer list. The captured ordinary registrations do not establish a material external compilation workload; external package consumers remain possible.

## Reproducible evidence

Run `node verify.mjs` in this directory, or pass its absolute path. This is an offline source/custody verifier, **not a product test or performance measurement**.

| Finding | ASP.NET Core commit/tree/blob memberships | Original indexed payloads | Complete copied owner files |
|---|---|---|---|
| F212 | 59 | 312 | 315 |
| F217 | 84 | 918 | 920 |
| F218 | 34 | 155 | 157 |
| F221 | 37 | 396 | 398 |

All **214 memberships** are independently followed from retained raw commit and tree objects to whole captured blobs. Original is `37e809ead5824bc753a1c3d56f11615bdb1296c5`; each owner records its independently observed and pinned Default and bounded history. Exact qualified raw objects and source blobs are reused by identity, not by inheriting earlier conclusions or native acceptance.

[Source membership](source-membership.json), [external source fingerprints](external-source.json), and [complete copied-file index](evidence-index.json) are portable. Twenty whole external source/documentation captures are retained: sixteen Photino/Windows-documentation bindings, two named-pipe/string documentation captures, and two declared HashSet implementations. They are **not full external commit/tree archives or proof of loaded packages, native images, SDKs, or runtimes**. The two F217 documentation records carry capture SHA256 rather than independent external Git membership proof. Legacy F212 `.tree` fields are not used as root-tree evidence.

Detailed assessments: [F212 qualification](evidence/F212/qualification-007.json), [F217 assessment](evidence/F217/assessment.json), [F218 assessment](evidence/F218/ASSESSMENT.json), [F221 handoff](evidence/F221/HANDOFF.json).

## Execution and limitations

No product build, test, server, runtime probe, candidate, or performance comparison was performed for these four source outcomes. Existing test names/source are not passing test results. F212's unit-test manager bypasses the native callback producer and cannot establish equivalent callback-stack behavior.

All failures and superseded source helpers remain intact, including F212's policy-parse/PowerShell-pipeline failures, F217's unqualified CRLF-converted archive and documentation 404s, and F221's unavailable Python alias/policy-parse failure. Only qualified raw captures support source claims.

F217's 124 native source-utility roots and 228 observed children are **not 124 product builds/tests**. Its dotnet/build/test root arrays are empty. F212 retains all 36 direct Git/GitHub roots and drained streams; separate outer PowerShell raw streams were not captured. Outer helper/tool summaries are not universally raw stream captures. F221's final-sealer exit is bound by its later, outside-seal [actual tool receipt](evidence/parent/finding-F221-terminal-240/enclosing-tool-result.json), not a claim about a future exit written by the sealer.

[Parent acceptance](evidence/parent/owner-retirements-242.json) rehashes the complete accepted F212/F217 payloads and binds the later F221 terminal receipt. The earlier parent240 receipt also contains an F209 source-layout subsection outside this capsule: that does **not** make F209's runtime proposal or binaries portable or qualified here. Owner retirement is not campaign finalization.

The source-archive helper records only its actual waited/drained Git roots. Its own [external tool-result boundary](preparation-terminal.json) is added after it returns. No all-machine idleness, complete unseen-descendant inventory, dedicated host, or uninterrupted operation is asserted. The fixed historical classified `REPORT.md` is unchanged.
