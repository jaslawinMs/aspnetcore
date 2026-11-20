# F146: bounded untimed investigation acceptance

Defined before any proposed patch or executable consumer. This is an investigation contract, **not an adopted or sealed campaign comparison plan**.

## Scope and identities

- Finding: `arraypool-absent-in-hot-path`, only `handleUnidirectionalStream` in `src\Servers\Kestrel\samples\WebTransportInteractiveSampleApp\Program.cs`.
- Original: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Observed default: `ae89581dfd24c6277b4267a9779d05f7b9f047f1`.
- Coordinator root is read-only. No source patches are applied to any source graph. No timings, allocation counters, performance comparisons, publication, policy, budget or ledger changes.
- Native-work hold is active on entry. No native build/test/host may start until an explicit release. Metadata, source inspection and artifact preparation are permitted.
- Only new files beneath this F146 artifact directory.

## Acceptance assertions

1. Record pinned source identities, available documentation and relevant history; distinguish locally observed default from a live remote observation.
2. Identify the real sample producer: HTTP/3/WebTransport session acceptance, incoming stream acceptance, direction dispatch and the unidirectional read handler. Do not equate invoking a helper with exercising that producer.
3. Establish that the 4096-byte array is allocated once per handler invocation/accepted stream, outside the read loop. Do not call it a per-message allocation.
4. Map buffer ownership across `ReadAsync`, `ApplySpecialCommands`, console output, loop exit and exceptions. Preserve the existing cancellation/EOF behavior rather than adding unrelated fixes.
5. If feasible after hold release, source-build both pinned owners in isolated source/output graphs and drive the actual native accepted-stream producer. Assert accepted input-stream direction and exact received byte-derived output, including multiple writes on one stream and independent streams.
6. If actual native reachability cannot be established within scope, name the precise missing prerequisite or excluded boundary. A pipe/fake-stream/helper test must be labeled downstream-only and cannot satisfy assertion 5.
7. Any proposed pool patch must rent once, expose exactly 4096 bytes even for an oversized rental, and return exactly once only after the whole asynchronous handler has unwound. Include fault and cancellation obligations, but make no runtime claim without execution.
8. A future comparison consumer must have a non-executing verify-only path, explicitly identify source-built owners for both roles, and refuse to claim installed shared-framework owners as pinned source-built owners. Candidate source must never be applied or run here.
9. Freeze exact executable inputs, commands, exit codes, setup failures, hashes, named unrun tests and excluded cases. Finish with all owned processes terminal and an informational recommendation, not a campaign verdict.

## Explicitly excluded

- Browser execution and client UI behavior.
- Machine certificate stores, URL ACL/firewall changes, system-wide tool installs, priority/affinity/power changes, remote execution.
- Bidirectional handler changes; decoding, framing, command dispatch, fire-and-forget task ownership, EOF spinning and cancellation policy changes.
- Performance claims, threshold selection or tuning, and isolated `ArrayPool` microbenchmarks.

## Proposed future comparison (not adopted)

Primary proposal: complete real accepted-unidirectional-stream lifecycles with a fixed payload and fixed stream count, including native acceptance and actual receipt. A many-messages-on-one-stream control distinguishes per-stream from per-read costs. A persistent-open-stream control is relevant to retained rental lifetime. Correctness gates would require exact same received data and observed teardown with both source-built owners. A material-improvement threshold remains for the coordinator to define before authorizing any measurement; none is adopted here.
