# F134: no material owned-List emptiness optimization established

**Optimization proposal not admitted; zero comparisons and no performance PR.** `WebSocketClient.SubProtocols.Any()` receives its actual owned `List<string>`. The selected, actually loaded `System.Linq.dll` has the `ICollection<T>.Count` fast path before enumeration. The proposed enumeration/allocation mechanism has not been established for this genuine producer/runtime.

This is `rejected` / `material-optimization-unestablished`, **not measured no-gain, zero residual dispatch cost, literal no-op, JIT-equivalence or proof that `Count` could never help**. Any remaining dispatch/inlining cost is unmeasured; no material optimization proposal is established.

## Connected artifacts

| Artifact | Link | Outcome / scope |
|---|---|---|
| Coordinator disposition and source freshness | [Independent acceptance](coordinator-acceptance.json), [closed zero-comparison budget](closed-budget.json) | All 837 frozen payload files / 53,887,295 bytes rehashed; exact owner Git blob unchanged at 37e809, ae89581 and later live 00560e2; no complete later framework rebuild |
| Source/history and complete handoff | [Source/history, actual contracts and boundaries](owner-handoff/HANDOFF.json), [original frozen manifest](owner-handoff/manifest.json) | Original `SubProtocols.Any()` unchanged; no candidate applied |
| Twenty real producer cases | [Ten cases per actual source owner, full observations](owner-handoff/evidence/verify-only-comparison.json) | Same empty/one/several protocol negotiation, header order, payload, close, rejection and error behavior; no injected collection stand-in |
| Actual runtime/library identity | [Loaded owner/LINQ hashes in both processes](owner-handoff/evidence/verify-only-comparison.json), [selected LINQ IL](owner-handoff/evidence/installed-linq-static-il.json) | Exact .NET 12.0.0-alpha.1.26565.104; actual loaded LINQ SHA256 `3ABB77BBE12F449B1EB633F8B772E4858D4CEBE3DD98AC9C669FF0C2A3849501` |
| Physical owner provenance | [Copied owner PE/PDB/source associations](owner-handoff/evidence/copied-owner-static-proof.json), [actual loaded-owner proof](owner-handoff/evidence/verify-only-comparison.json) | Both distinct source-built TestHost owners, selected physical source/PDB checksum and PE/PDB GUID/stamp association |
| Existing repository tests | [Exact six default test executions and commands](owner-handoff/evidence/existing-test-outcomes.json), [first five XML rows](owner-handoff/logs/test-results/F134-existing.trx), [missing exact follow-up row](owner-handoff/logs/test-results-subprotocol/F134-subprotocol.trx) | **Six total on source ae89581**, zero skipped; not six per source pin |
| Compiled common consumer and future image gate | [Executable source](owner-handoff/consumer/Program.cs), [project](owner-handoff/consumer/F134.Characterization.csproj), [all-file gate](owner-handoff/Audit-ImagePair.cjs), [actual gate result](owner-handoff/evidence/image-pair-audit.json) | Compiled once; common DLL/PDB/deps/runtimeconfig byte-identical; 47 other Original/default differences correctly reject a causal performance pair |
| Exact executed commands / result streams | [All command lines](owner-handoff/evidence/executed-commands.txt), [lifecycle and toolchain verification](owner-handoff/evidence/final-toolchain-and-process-verification.json) | Untimed producer modes and existing tests; measurement mode deliberately refused with exit 2 |
| Runnable evidence and copied/omitted images | [Portable historical auditor](verify.mjs), [XML parser](audit-trx.ps1), [copied inputs](authoritative-copies.json), [individually hashed omissions](omitted-file-hashes.json), [immutable core](capsule-file-hashes.json) | Existing pinned owner/dependency/runtime inputs required; no turnkey fresh-clone claim |
| Tracking and live disposition | [Additive verified publication](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F134/publication.json) | Closed tracking issue; no performance PR or new window; the classified root report stays fixed |

## Real producer and material observations

The actual source-owned TestHost `WebSocketClient.ConnectAsync` constructs the request, populates protocols and invokes the real application. Ten cases run per pin: empty, one and several protocols; unrequested server selection; duplicate offers; empty/nonempty HTTP 400 rejection; status 101 without acceptance; propagation of the same application exception; and `ConfigureRequest` overriding the generated protocol header.

Successful requests check negotiated client/server protocol, exact binary payload and normal two-sided close. These assertions establish TestHost behavior, **not network WebSocket conformance**: in-memory TestHost permits an unrequested selection and duplicate offers without imposing new client validation.

The runtime witness identifies the same selected LINQ image whose IL checks `ICollection<T>` at offset 11, calls `get_Count` at offset 21 and compares/returns at offsets 26-29, before fallback at 30. The owned collection is a `List<string>`. This does not constitute a JIT trace or allocation observation, and no elapsed-time or allocated-byte values were collected.

## Exact validation results and retained failures

All native .NET commands first activated the corresponding checkout with `. .\activate.ps1`. The [exact arguments, selected executable, stream paths and exit codes](owner-handoff/evidence/executed-commands.txt) cover:

- Common consumer build: **passed once**. Untimed original/default invocations: **10/10 each**, zero skips, actual runtime 65. An unapproved measurement mode: **refused with expected exit 2**.
- Existing default VSTest execution: **5/5 rows**, including all three `ConnectAsync_ShouldSetRequestProperties` theory rows. Its inherited filter had an incorrect extra namespace segment for `TestClientTests`, so the six-row parser correctly rejected this incomplete report. A fresh exact-name follow-up passed `Microsoft.AspNetCore.TestHost.TestClientTests.WebSocketSubProtocolsWorks` **1/1**, giving six total.
- The first static IL report formatter failed on an ambiguous metadata-token overload. Correcting only unnecessary report formatting produced the retained IL report; no native producer or timing ran in that step.
- All 11 observed owned PIDs were terminal. Sampling covers observed roots/descendants, not a claim that every short-lived compiler process was observed.

Run the portable historical audit after obtaining this capsule:

```powershell
node .\verify.mjs . --require-seal
```

**Passed:** copied/core file hashes; all twenty actual producer rows; common-image equality and the correctly failed 47-difference performance-image gate; loaded LINQ identity; all six individual existing XML executions; distinct bounded disposition and closed zero-comparison budget. It runs neither .NET nor timing.

The two unchanged source graphs differ in 35 of 44 input PE hashes and 47 non-owner full-image files. They are valid separately identified functional characterizations, **not an owner-isolated performance pair**. A hypothetical later performance study would need a single fixed dependency closure and allow only TestHost DLL/PDB differences; no such study is authorized here.

Concurrent mutation, null/invalid protocol/URI variants, cancellation races, TCP/browser behavior and whole-application performance remain outside this bounded study. The worker's historical "no GitHub requery" field is preserved; the coordinator's later exact-target freshness check is additive.
