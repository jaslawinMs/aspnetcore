# F146 executable continuation 007 — untuned and untimed

## Result and recommendation

**All three prepared real managed HTTP/3 producer scenarios passed on both fixed source pins: six actual TRX rows, not process-exit-only evidence.** Each row asserts its loaded source-built Kestrel.Core path and SHA256 and actual Core runtime-directory version.

**Keep the finding informational; useful pooling is not established.** The flagged 4096-byte array is allocated once per accepted unidirectional handler, outside its read loop—not per message. These are producer/correctness observations, not optimization evidence, a verified pooling fix, a performance acceptance, rejection, no-gain result, or campaign verdict.

This continuation supersedes only the executable status. `ACCEPTANCE.md` and `source-observations.json` copied from 006 are **historical provenance**, including the corrected hold interpretation and old unrun flags. Current authority/status are `EXECUTABLE-ACCEPTANCE.md` and `EXECUTABLE-RESULTS.json`. The original 100-file F146-006 capsule remains unchanged.

## Actual boundary

The existing `Http3InMemory` multiplexed transport produces HTTP/3 settings/CONNECT and unidirectional stream-type/session-ID bytes. Real source-built Kestrel pending-stream parsing produces the real `WebTransportStream`, real session publication and `AcceptStreamAsync` acceptance. The exact extracted sample handler then reads the actual pipe and its decoded console messages are observed and asserted.

The probe does **not** call `session.AddStream`, mock streams or inject the acceptance callback. Every TRX row contains actual SETTINGS/HEADERS and input-stream traces.

The sample methods are source-extracted and compiled into **InMemory.FunctionalTests.dll**, not `WebTransportInteractiveSampleApp.dll`. Kestrel.Core is the source-built managed **producer** owner, not the assembly owning the proposed sample allocation change. Native QUIC/MsQuic, TLS, browser, full sample startup, and the compiled sample assembly were not exercised.

## Named rows: Passed on Original and ObservedDefault

Class: `Microsoft.AspNetCore.Server.Kestrel.Core.Tests.F146ManagedProducerTests`.

| Method | Material assertions |
|---|---|
| `ManagedHttp3_TwoWritesReachOneAcceptedUnidirectionalHandler` | Two separately written/received exact strings through one real accepted readable/non-writable stream. |
| `ManagedHttp3_PayloadLargerThan4096IsReceivedAcrossReads` | Exact 9000-character receipt, at least three nonempty chunks, every chunk at most 4096 characters. |
| `ManagedHttp3_IndependentInputStreamsReachIndependentHandlers` | Independent exact payloads through two accepted handlers and distinct actual stream IDs. |

TRX files:

- `results\Original\attempt1\F146-Original-rt57-attempt1.trx`
- `results\ObservedDefault\attempt1\F146-ObservedDefault-rt57-attempt1.trx`

`TRX-ROW-CHECKS.json` verifies exact names/counts/outcomes and real frame traces. No requested producer test remains blocked before its assertions.

## Identity and explicit runtime

- Original: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- ObservedDefault: `ae89581dfd24c6277b4267a9779d05f7b9f047f1`.
- Separately observed live default: `00560e2dd1954a2acf2bc54b35422b0f32484bf1`; it did not replace either pin.
- Both pinned and observed-live sample blobs: `2fa999a73fc8ce4e4d1c7a7cc7185f8723727696`.
- SDK: `12.0.100-alpha.1.26557.102`, activated in each relevant isolated checkout before every dotnet command.
- **Actual test Core runtime: `12.0.0-alpha.1.26557.102`, asserted inside all six rows.** Runtime62 was the recorded first setup choice; its uncached ILLink dependency failed restore. Runtime57 was then explicitly selected, not silently rolled forward.
- The declared 268 runtime was not selected or installed into the SDK root. The separately available read-only private F145 runtime268 was not used.

`PDB-SOURCE-OWNER-CHECKS.json` verifies four real managed-producer source documents and both artifact/test documents per role against the actual portable PDBs using **raw bytes**: twelve checksum checks, plus owner/test MVIDs. Every owner DLL/PDB copy in each test output matches its own source-build output. Complete before/after output-image inventories hash **every** file, including the common test DLL/PDB/deps/runtimeconfig; no fixture-prefix exemption exists.

The historical 36 source snapshots are LF text; Windows-materialized files have CRLF. `SOURCE-TEXT-AND-RAW-IDENTITIES.json` records both identities and requires LF-canonical equality, without rewriting files. Raw source-byte equality to historical LF snapshots is not claimed or used to excuse image differences. Actual compiled-source/PDB checks remain raw-byte checks.

The wider archive audit found a missing expected Unicode filename outside the tested producer boundary, then remained incomplete at the bounded stop. No unrelated source graph repair was attempted, and **whole-repository materialization identity is not claimed**. All 36 recorded source inputs and the twelve actual compiled PDB source checks must match. The stopped audit and limits are retained rather than waived into a green full-tree gate.

## Preserved prerequisite failures and corrections

Exact native commands, complete stdout/stderr, exit codes and observed child PIDs are in `logs\*.receipt.json` and consolidated in `EXACT-COMMANDS-AND-EXIT-CODES.json`.

| Attempt | Recorded result/correction |
|---|---|
| Both initial no-restore builds | MSB4019: graph-local generated props missing. Generated each graph's own files; no coordinator outputs copied. |
| Original runtime62 restore | NU1102: cached ILLink62 unavailable. Explicit cache-only runtime57 selection; no installation. |
| Original runtime57 build 1 | CS9260: existing dependency uses C#14 syntax. Restored unchanged dependency `preview` defaults; new test project stays C#13. |
| Original runtime57 build 2 | Explicit language guard caught later import overwrite. Selected C#13 inside the artifact-only before-CoreCompile target. |
| Default runtime57 build 1 | AD0001: existing readonly-field analyzer could not load Serialization.Primitives12. Default-only retry explicitly disabled diagnostic analyzers; compilation/source generation remained enabled. **Not full CI/analyzer validation.** |
| Metadata Python command | Exit9009: Windows alias, no installed interpreter. Preserved unrun Python input; used existing Node.js/PowerShell without installing anything. |
| Initial full-archive metadata audit | Missing expected Unicode filename outside producer scope; exact failure retained. Continued audit records mismatches, without asserting full-tree equality or editing those files. |

Earlier missing-path/cache lookups were setup lookups, not producer-test failures. See the historical capsule and `SETUP-LOOKUP-LIMITS.json`. All build/test corrections affect artifact harness/setup only; archived shipping inputs were not intentionally edited and no candidate patch was applied.

## Lifetime and remaining boundaries

Static sample inspection still establishes that the buffer remains owned across tokenless `ReadAsync` and awaited `ApplySpecialCommands`. A proposed rental would require an exact 4096-byte slice and a whole-handler `finally`; returning at token notification could precede completion of the pending read.

Only ordinary ASCII payload receipt is runtime-verified here. Special commands, pending-read cancellation, EOF behavior, exceptional console/decode paths, pool return/clearing, actual stream churn/overlap under a real client, and any resource/performance benefit remain unverified. Teardown aborts owned in-memory inputs and awaits every started handler; this is not a general cancellation-behavior test. Existing zero-length-read and per-read copy behavior were not changed.

## No future comparison adoption

These are independently compiled Original/default characterization assemblies, with an explicit Default analyzer-profile exception. They are **not a common-once performance pair**. `COMPLETE-IMAGE-AUDIT.json` hashes all **224 files per image**, retains **61 non-owner differences**, and marks performance eligibility false. Only the actual sample-owner DLL/PDB could be intended differences in a separately authorized future candidate pair; Kestrel.Core or a common harness cannot be exempted. No primary/control/gate proposal or campaign policy was adopted.

No shipping edits/commits, candidate execution, benchmarks, custom timings, allocation counters, GitHub writes, remote execution, installs, machine configuration changes, or shared budget/policy/ledger/publication changes occurred. Incidental test/build framework durations are preserved raw, never treated as measurements.

## Frozen verification

`MANIFEST.json` hashes every portable payload file, including exact source archives, scoped source evidence, metadata and **complete byte-verified copies of both actually executed output images** in `verified-images`. The retained `graphs` directory, including build intermediates/uncompiled source and shared toolchain junctions, is explicitly outside this portable manifest; whole-tree identity is not claimed. The two manifest self-files are also excluded. This is artifact integrity, **not** a performance/campaign seal. `MANIFEST.sha256` gives its checksum.

Read-only verification, with no dotnet starts or writes:

```powershell
node .\Audit007.cjs verify-only
```

All observed original owned processes were terminal at recorded command completion (`FINAL-OWNED-PID-CHECK.json`); the sampling observer does not claim exhaustive instantaneous child discovery. Later numeric PID-slot reuse was retained as a separate observation, not treated as original-process survival, and no unrelated process was terminated. Do not rebuild, rerun or modify this frozen capsule or F146-006.
