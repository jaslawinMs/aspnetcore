# F199: bounded transport-abort task-array assessment

**Source-only no material candidate, not measured no-gain.** The copy is real: `TransportConnectionManager.AbortAllConnectionsAsync` materializes its local `List<Task>` before one `Task.WhenAll`. No candidate, private graph, native workload or comparison was created.

The located producer is the transport-stop fallback after graceful close fails, including endpoint stop/reconfiguration as well as server stop. It collects completion tasks from live connection references after issuing transport aborts. The captured actual connection-finally/disposal/removal/completion source is retained; no standalone list or injected callback substitutes for the producer.

Complete `Task.cs` at Original's declared `dfd6ac738610ea05f42e704be82b386e71052e12` and Default's `4f30608f5e5220a5671e61f4bd5dece130657f47` is byte-identical. Its enumerable `WhenAll` has a **`List<Task>` span fast path**; do not assume removing `ToArray` must copy the list again. This is **dependency-source provenance, not a loaded CLR, exact hypothetical binding, allocation or performance observation**.

There is no established material owning-scenario workload or connection count. A fabricated large list, repeated abort operation or isolated `WhenAll` benchmark would not provide that evidence. The neighboring graceful-close copy, metrics/end reason, ordering and existing one-second delay were not changed; the delay is not claimed to be a measured minimum or performance-dominating constant.

[Assessment and limits](evidence/ASSESSMENT.json), [complete source memberships](evidence/source-completion-230.json), [declared dependency blobs](evidence/external-source.json), bounded history/search, source-command records and the unchanged original 229 capture are preserved. Original is `37e809ead5824bc753a1c3d56f11615bdb1296c5`; independently observed Default is `d3483989953ae3cccd773aea5ea04cb0c7198531`.

No test/server/runtime probe was scheduled after the source gate; no runtime correctness, shutdown result, prerequisite availability or universal immateriality is implied. No performance PR, browser window, fixed historical `REPORT.md` edit or budget reopening follows.

## Verify offline

```text
node verify.mjs .
```

Add `--require-seal` after publication. This checks all retained files, both original/additive raw Git indices, whole dependency blob identities and source-only no-native boundaries. It does not execute Kestrel or product code.
