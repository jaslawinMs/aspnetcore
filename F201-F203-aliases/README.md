# F202 and F203: generated-helper aliases of F201

**Only F202 and F203 close as duplicate generated-helper findings.** F201 is
the canonical retained investigation and remains **pending at this alias
closure**. This is not a rejection of the underlying concern, a performance
result or a claim that the exception fallback is harmless.

All three retained paths are different verified snapshots containing the same
`file static class JsonNodeExtensions`. The complete helper, including null
handling, the first `JsonNode.Parse`, the quoted-string retry and both
`JsonException` handlers, is identical to the shared production emitter's
helper in **both** frozen source roles:

| Source role | Commit |
|---|---|
| Original | `37e809ead5824bc753a1c3d56f11615bdb1296c5` |
| Observed Default | `d3483989953ae3cccd773aea5ea04cb0c7198531` |

`XmlCommentGenerator.Initialize` registers the source output and calls `Emit`.
That method calls `GenerateXmlCommentSupportSource` and adds the single fixed
`OpenApiXmlCommentSupport.generated.cs` output. The three snapshots vary
elsewhere, but their helper is not three independent production implementations.
A future justified emitter change belongs to F201 and would update its generated
baselines, rather than producing separate fixes for F202 and F203.

[Source records](source-records.json) name all original paths, raw blob hashes
and exact helper line spans. Twelve complete raw source files and the necessary
raw Git commit/tree/blob objects are supplied. The offline auditor verifies
commit-to-path membership and byte identity, then compares the two emitter
copies and six snapshot helper copies. LF projection is explicit; whole source
bytes are not normalized. Capsule-local Git attributes preserve all raw bytes.

The test project references Verify.SourceGenerators and includes snapshots as
Helix content. This review does **not** infer compilation membership, runtime
execution, input frequency or cost merely from snapshot filenames. It does not
run the generator, compile an application, invoke the helper or establish a
behavioral/performance reproduction. Those remain canonical F201 work.

Run `node verify.mjs . --require-seal` from this folder to audit the supplied
source-only evidence without Git, network, SDK or product execution.

No candidate, native/build/test/common cohort, timing, counter or comparison
authorization was used. No implementation PR or browser window is authorized.
The fixed historical report and its existing browser window remain untouched.
