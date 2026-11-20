# F147/F149 — actual compiled sample preparation, 010

**Both findings remain PENDING. All replacements remain unadopted and unexecuted.**
This is untimed correctness/provenance preparation, not a performance result,
optimization decision, useful-gain gate, publication or campaign seal.

## Actual result

The **actual source-built `WebTransportInteractiveSampleApp.dll` was reached for
both source roles**, without executing its top-level startup/certificate code.
Test-side reflection locates its real private top-level handler methods and
creates delegates; no handler body is copied into the consumer.

The existing managed `Http3InMemory` transport sends SETTINGS/CONNECT and actual
unidirectional `0x54` or bidirectional `0x41` stream/session headers. Real
source-built Kestrel pending-stream parsing creates and publishes the real
`WebTransportStream`; `AcceptStreamAsync` returns it to the actual compiled
sample handler. The probe never calls `session.AddStream`, supplies mock streams
or injects an acceptance callback.

**13 actual TRX rows passed per role: 10 compiled-sample producer rows plus
3 unchanged repository contract rows; 26 total, none skipped.**
Every parameter value is individually retained in TRX and
`evidence\ALL-ACTUAL-TEST-ROWS.json`, not inferred from process exit.

Class `Microsoft.AspNetCore.Server.Kestrel.Core.Tests.CompiledSampleProducerTests`:
each theory ran `bidirectional: False` and `bidirectional: True`.

| Theory suffix | Material observation |
|---|---|
| `SeparateWritesRetainStringsAndEchoOriginalBytes` | Two ASCII writes, each gated on actual console receipt or exact reversed pipe echo; shorter second write; retained first uni string unchanged. |
| `PayloadAbove4096TraversesRealReads` | One 9000-byte patterned ASCII write; uni exact aggregate and at least three nonempty reads of at most 4096; bi exact bytes reversed per exercised 4096/4096/808 read boundary. |
| `IndependentStreamIdsAndHandlerOwnership` | Two real accepted streams, distinct actual inbound IDs, independently gated payloads and reuse of the first handler. |
| `ExactInitiateCommandProducesRealOutboundStream` | Lowercase near-command remains ordinary; exact `Initiate Stream` creates a real outbound session stream with actual `40 54 00` header and exact sample literal bytes; incoming bi command also echoes reversed bytes. |
| `ExactAbortCommandRemovesRealSession` | Lowercase `abort` is ordinary; exact `Abort` removes the real session. The actual handler then faults with asserted `InvalidOperationException` after its pipe is completed. This is not a graceful-shutdown claim or a new defect verdict. |

Unchanged native rows: `WebTransportSession_CanOpenNewStream`, and
`WebTransportSession_Closed_RemovedFromConnection(abortSession: False/True)`.
They establish their existing session contracts, not additional sample coverage.

## Finding ownership and lifetime

F147 and F149 are distinct **per-nonempty-read byte copies**, not the once-per-handler
4096-byte buffer allocations of F146/F148. The sample source was not changed.

- F147 slices the reusable memory, copies it for synchronous `Encoding.Default`
  decoding, awaits the command, then prints the independent string.
- F149 copies only for command-string decoding. Its original memory slice remains
  live across the awaited command, is reversed, is awaited through the actual
  output-pipe write, and the reusable memory is then cleared. Echo validation is
  against the original incoming bytes, not against a replacement handler.

No span-decode replacement, allocation observation, benchmark, custom timing,
counter, gain threshold or comparison mode was executed. Framework/logger/build
durations remain raw runner output only.

## Source, common-once and runtime boundary

Fresh upstream query observed `00560e2dd1954a2acf2bc54b35422b0f32484bf1`.
New graph pins:

- Original: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- CurrentDefault: `00560e2dd1954a2acf2bc54b35422b0f32484bf1`.
- Sample Git blob rechecked across Original, historical `ae89581`, and live main:
  `2fa999a73fc8ce4e4d1c7a7cc7185f8723727696`.

Both actual sample projects were separately source-built in new graphs.
The existing native consumer had two preserved artifact-only compilation failures,
then **one successful compilation**. Its same physical 224-file output, including
the actual fixture/helper assemblies, was reused without per-role rebuilding.
All six complete before/after inventories match by every keyed file; no
fixture/AutoPerf prefix exclusions exist. Individual compiler invocations for
every transitive dependency are not separately attested.

**Both test roles intentionally use the freshly built Original common Kestrel
producer. CurrentDefault names the actual current-default sample owner only; it
does not claim a current-default Kestrel runtime graph.** Per-row loaded
SAMPLE/Kestrel/consumer/helper paths, hashes and MVIDs are retained.

Both roles assert Core runtime `12.0.0-alpha.1.26557.102`, SDK
`12.0.100-alpha.1.26557.102`, and roll-forward `Disable`.
Actual native host observations distinguish **hostfxr65** from
**hostpolicy/CoreCLR57**. Runtime68 was neither selected nor installed.
New probe code is C#13; dependency preview defaults were preserved. All successful
builds retained their normal analyzers; this is still focused validation, not CI.

## Integrity and limitations

Five selected real PE/PDB pairs have matching portable-PDB/PE GUID+stamp; ten
selected source documents match their PDB checksums using **raw physical bytes**.
The portable auditor independently parses selected PE/PDB IDs. Compiled Program.cs
has CRLF bytes (SHA256 `E7C63A32C1733C1EF8603774D9D934F674D436451F6A05F129AE3057F49C8376`);
LF canonicalization is separate and reproduces the pinned Git blob, not a raw
byte-identity claim.

Complete Git-entry catalogs retain individual hashes for all 17,868/17,928 tree
entries. Each graph has three missing Unicode paths and two external gitlinks;
14/17 remaining LF-canonical mismatches are retained, not repaired or waived.
These are complete scoped catalogs, **not whole-tree materialization attestation**.
`fullCompilerInputAttestation` remains **false**.

Complete output maps hash all 224 common-consumer, 157 Original-sample,
157 CurrentDefault-sample and 197 runtime files. Individually omitted files retain
their hashes. The fresh sample output graphs have **113 differences, 111 outside
the sample DLL/PDB**. Original/default are not a causal optimization pair.
Any eventual authorized source-variant work must remain paired on one physical
machine; no remote comparison was prepared.

Invalid/split/non-ASCII decoding, general EOF/cancellation/fault handling, native
QUIC/MsQuic, TLS, browser, routing and full sample startup remain unverified.
Existing managed outbound transport uses a fixed outbound ID; only inbound ID
independence is asserted. The observed outbound header is the implementation's
literal `40 54 00`, not proof of remote stream/session association. Probe teardown aborts inputs and awaits every started
handler and its actual owning connection task; it is not cancellation validation.

## Historical execution and compact payload

Actual driver commands included:

```powershell
.\Build010.ps1 -Role Original -Stage Sample
.\Build010.ps1 -Role CurrentDefault -Stage Sample
.\Build010.ps1 -Role Original -Stage Fixture -Attempt 3 -SkipRestore
.\Test010.ps1 -Role Original -DiscoverOnly -Attempt 0
.\Test010.ps1 -Role Original -Attempt 1
.\Test010.ps1 -Role CurrentDefault -Attempt 1
```

Initial no-restore/generation/restore commands, every exact selected executable,
argument, checkout activation, exit code and observed owned PID are in
`logs\*.receipt.json` and `evidence\EXACT-COMMANDS-AND-TERMINALS.json`.
Preserved failures include missing generated props, two probe compilation errors,
metadata overload binding, and an inventory-order false failure corrected by
keyed all-file identity. No test prerequisite blocked any of the 26 final rows.
Final observed original process identities are terminal; instantaneous short-lived
child discovery is not claimed exhaustive. No unrelated process was terminated.

The selected portable capsule excludes graphs, archives, caches, toolchains and
unnecessary image copies. Source catalogs are gzip-compressed **metadata**, not
source archives. Counts, bytes and all selected-file hashes are in `MANIFEST.json`;
`MANIFEST.sha256` is its checksum. This freezes historical artifact integrity only.
Legacy build/test commands require original absolute graphs, cached packages and
SDK; selected binaries are not a bundled runnable test distribution.

Default audit is portable and read-only; it starts no native test or dotnet process:

```powershell
node .\Audit010.cjs
```

Only Node.js built-ins and this payload are needed. `--workspace-preflight` is a
separately labeled development check that does not verify a freeze manifest.
No shipping edits/commits, GitHub/ledger writes, machine setup, remote execution,
campaign-policy changes or publication were performed.
