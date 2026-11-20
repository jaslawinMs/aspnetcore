# F153/F154: bounded TestHost preparation, 010

**F153 and F154 remain PENDING, unadopted and unmeasured.**
No shipping/candidate/override/permanent-test change, performance measurement,
allocation measurement, finding verdict, policy/ledger/publication or GitHub write.

## What actually ran

The original TestHost project and its unchanged native test project were built in
the new isolated original checkout. One artifact-only **C#13 verifier was
successfully compiled once** against that output. Its same DLL, PDB, deps,
runtimeconfig and complete helper closure served every producer and metadata run.
`common-evaluated-language.stdout.txt` confirms language 13.0, runtime
`12.0.0-alpha.1.26562.105`, roll-forward Disable and shared compilation false.
Native dependency language/preview defaults were not changed.

**10 producer/control scenarios passed, then the same 10 passed once more for
closure stability.** This is 10 scenarios, not 20 distinct coverage cases.

| Actual verifier row | Observed boundary |
|---|---|
| `default-policy` | Real default false; byte/bulk gates reject; async request drain remains exact. |
| `explicit-disabled` | Explicit server false has the same behavior. |
| `server-enabled` | Server true before CreateClient enables request byte/bulk reads. |
| `feature-enable` | Actual context `IHttpBodyControlFeature` enables the captured gate. |
| `feature-disable` | The same feature disables an initially enabled context. |
| `binary-reader-enabled` | Real BinaryReader consumes this real owned request stream; exact bytes and EOF exception. |
| `binary-reader-disabled` | BinaryReader reaches the real request gate and rejects. |
| `stream-content-enabled` | Genuine seekable StreamContent path selects the same wrapper. |
| `zero-length-content-selection-control` | Zero-length ByteArrayContent selects `Stream.Null`, not this wrapper. |
| `TestServer.SendAsync-caller-stream-control` | Direct-context API retains caller MemoryStream; explicitly not evidence of wrapper production. |

`producer-original*.json` retains ordered operations, exact values, exception
types/messages, loaded identities and terminal application disposal observations.
JSON byte arrays are base64 (for example `AH//Kg==` is `00 7F FF 2A`).
These finite diagnostic packets are correctness probes, not application workloads
or evidence of byte-operation invocation frequency.

**12 unchanged native facts passed in each of two runs; 24 actual TRX execution
rows, 12 distinct tests, none skipped. No selected tests are theories.** Full
discovery output, both original TRX files and every parsed row are retained.
The selected methods are:

- `ClientHandlerTests`: `Send_ThrowsNotSupportedException`,
  `ContentLengthWithBodyWorks`, `ContentLengthNotPresentWithNoBody`,
  `ContentLengthWithImplicitChunkedTransferEncodingWorks`,
  `ContentLengthWithExplicitChunkedTransferEncodingWorks`, `ResubmitRequestWorks`.
- `ResponseBodyTests`: `BodyStream_SyncDisabled_WriteThrows`,
  `BodyStream_SyncEnabled_WriteSucceeds`, `BodyStream_SyncDisabled_FlushThrows`,
  `BodyStream_SyncEnabled_FlushSucceeds`.
- `TestServerTests`: `TestServerConstructorSetOptions`,
  `DispoingTheRequestBodyDoesNotDisposeClientStreams` (actual discovery spelling).

## Actual producer, direction and gates

The verifier uses the public `TestServer(IServiceProvider)` constructor, starts
the real `IServer` with an `IHttpApplication<HttpContext>`, calls
`TestServer.CreateClient`, then `HttpClient.SendAsync`. It does **not** construct
AsyncStreamWrapper, a fabricated inner stream, or a fabricated gate.

`CreateClient` → `CreateHandler` copies server sync policy into the real
ClientHandler. Its SendAsync constructs HttpContextBuilder, copies the client
content into that builder's request pipe, and, for content that can have a body,
sets **server Request.Body** to the real compiled AsyncStreamWrapper over
`PipeReader.AsStream()`. The observed inner type is
`System.IO.Pipelines.PipeReaderStream`, readable but not writable/seekable.
The closure reads the same HttpContextBuilder.AllowSynchronousIO property exposed
through the actual context feature, so feature changes affect subsequent calls.

**F153:** On enabled requests, mixed byte/bulk reads return `00`, then exactly
`7F FF` into a nonzero-offset buffer without altering sentinels, then `2A`.
Byte EOF is `-1`, bulk EOF is `0`. BinaryReader reads the same payload and then
throws `System.IO.EndOfStreamException`. On disabled requests both byte reads and
bulk reads, including invalid-buffer bulk reads, throw **first**:

`System.InvalidOperationException: Synchronous operations are disallowed. Call ReadAsync or set AllowSynchronousIO to true.`

They consume no request bytes: subsequent async reads recover the entire payload
and EOF. Once enabled, null bulk input instead reaches the inner validation:
`System.ArgumentNullException: Value cannot be null. (Parameter 'buffer')`.
Disabling the feature again rejects ReadByte even at EOF.

**F154:** This wrapper's genuine request transport is read-only. With sync false,
WriteByte and bulk Write reject with **first**:

`System.InvalidOperationException: Synchronous operations are disallowed. Call WriteAsync or set AllowSynchronousIO to true.`

With sync true, both reach the actual PipeReaderStream and throw
`System.NotSupportedException: Specified method is not supported.`
There is no successful request-body byte-write workload established here.
Direct inner byte delegation without the wrapper gate would not preserve the
observed rejection order/contract. No such replacement was written or executed.

**Response direction is different:** server writes use ResponseBodyWriterStream,
not AsyncStreamWrapper. Enabled byte/bulk response writes yield exact client
bytes `09 08`; disabled response WriteByte rejects. The client-observed stream is
the BCL `System.Net.Http.StreamContent+ReadOnlyStream`, with byte/bulk reads and
EOF validated. Source traces its underlying TestHost response transport to
ResponseBodyReaderStream; the verifier does not claim to have reflection-unwrapped
that client BCL object.

The direct `TestServer.SendAsync(Action<HttpContext>)` path does not install this
request wrapper; its source even carries a wrapping TODO. The MemoryStream
control is therefore explicitly separated from real ClientHandler production.
Wrapper Close/Dispose/DisposeAsync intentionally do not dispose the inner reader.
Probe-owned content, client, response, streams and services use deterministic
disposal; native application disposal is awaited and the real builder completes
its request/response pipes. Existing native ownership coverage also passed.
Cancellation/fault races, APM and Flush forwarding were not newly characterized.

## Exact loaded fallback, not an allocation measurement

Actual selected runtime is **CoreCLR/CoreLib 26562.105**, not the newest available
runtime. Process module observations distinguish **hostfxr 26565.104** from
**hostpolicy/CoreCLR/clrjit 26562.105**; no silent runtime roll-forward occurred.
CoreLib MVID is `818a7b40-a6a6-4d5f-b778-6d2c5d7acf01`; SHA256 is
`0CEBA028A838AFF170CFF9D03570B34F9F044D6A9597974088E58B9834DF74E4`.

Reflection on the actual wrapper says ReadByte/WriteByte are inherited from
System.IO.Stream. The loaded CoreLib method bodies are retained as raw IL plus
resolved instructions: both contain `newarr System.Byte` of length 1, followed by
virtual array-based Read/Write. Real wrapper IL then invokes its gate **before**
calling the inner bulk method. Inner read validation and unconditional unsupported
write IL are also retained. This establishes this runtime's fallback mechanism;
it does not measure allocated bytes, JIT elision, elapsed time or useful gain.

Pinned TestHost source has one wrapper construction site and no local
ReadByte/WriteByte invocation sites. TestHost is shipping test infrastructure;
neither that source inventory nor these finite probes establish a business-request
hot path or a production invocation rate.

## Pins and honest fresh-default blocker

- Original: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Entry upstream query: `c97a797f19154e97f9723634a8033ef8325cb277`.
- A second live upstream query observed the newer
  `90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d`. It has its own new checkout/catalog;
  c97 was not relabeled. Both observed defaults preserve the scoped TestHost source.

Initially, both observed defaults failed cache-only generation restores with
NU1102 for `Microsoft.DotNet.Build.Tasks.Templating >=12.0.0-beta.26569.107`
(nearest cached version 26568.110), before generated files or assertions.
These failures are historical observations, not a claim that the shared cache
cannot change.

**Late additive reassessment:** 26569 package directories appeared in the shared
cache. Freshest-90f generation was retried and **passed** without dependency
substitution. Its actual native owner then failed missing assets; the justified
cache-only restore failed **NU1102 for
Microsoft.Extensions.HostFactoryResolver.Sources >=12.0.0-alpha.1.26569.107**,
nearest cached 26568.110. No default owner DLL was built.

Fresh source also requests transport/Core runtime **26569.107**. An explicit
`dotnet exec --fx-version 12.0.0-alpha.1.26569.107` prerequisite attempt failed
at the native host with exit **-2147450730**, listing missing required framework;
the verifier never loaded or produced a scenario result. Root runtime69 is absent,
although its reference package became cached. The same compiled verifier was
used only as an entry assembly for this host prerequisite check, not as evidence
of a built default owner. All 10 fresh-default verifier scenarios and the selected
TestHost.Tests filter remain unexecuted there.

No old default, original producer, runtime68, remote helper or substituted
dependency graph is presented as fresh-default execution. No new runtime or SDK
was installed. The original source-built boundary above is the faithful boundary
actually validated. There is **no built default owner/runtime comparison and no
causal optimization pair**.

Relevant history retains the 2019 sync gate introduction, default-off change and
request-body no-op disposal change. Initial native generated-file/task/assets
failures, failed long-path source materialization/recovery attempts and both
default prerequisite failures remain available. No failed attempt was silently
converted to a pass.

## Raw source, PE/PDB and complete image metadata

Actual loaded original TestHost:

- SHA256 `848975AB7628A9C33F3CE0023DBF7841ADDE82AE4707EA58AA00C0460386BEDC`.
- MVID `043b9259-8847-4e20-83da-02f41fd32dbf`.

The wrapper has identical pinned Git blob
`7754c45d1c7e43e6df35b38c3c44cbe3cc8e11b3` across all three pins.
Physical CRLF SHA256 is
`8B385BF5BCD2FAAC23E42634D19C1FA93E180BB383947709D91562AF3A09A1E4`;
CRLF-to-LF SHA256 is
`2D35551DE6137AC592F93BDD18A053D7BE60ABBA092BA577BC84E7136DFFCFAC`.
The LF Git-blob identity matches the pin; it is **not** the raw compiled checksum.

Three selected real PE/PDB pairs have matching PE CodeView GUID+stamp and portable
PDB ID. Ten selected raw source snapshots match the actual compiled PDB document
checksums. All document metadata is retained, but selected documents do not attest
all compiler inputs, generators, resources, references or options.

Every file in these image scopes was inventoried, including fixture/helper and
non-DLL entries, without prefix exemptions; complete keyed before/after maps match:
native owner **19**, native tests **213**, common verifier/helpers **192**, selected
runtime **197**, selected SDK **3652**. The first runs overlapped collection;
the confirmation runs occurred after complete before catalogs and before after
catalogs. The repeated executions are closure checks, not new coverage.

Complete source catalogs contain **17,868 / 17,928 / 17,928** Git tree entries,
zero missing physical paths and two external gitlinks each. Their byte-wise
CRLF-to-LF model records **67 / 70 / 70** mismatches; all these entries already
match their pinned blobs by raw bytes. These catalogs predate the late generated
file/restore reassessment. Their unchanged before/after metadata is **not
whole-tree materialization or compiler-input attestation**.

## Portable payload and terminal state

The payload omits working graphs, full runnable images, runtime/SDK/package/tool
binaries and source archives. Individual omitted-file hashes remain in compressed
metadata catalogs. Selected DLL/PDB copies are evidence, not a runnable portable
test distribution. Historical native commands need the original absolute graphs,
cached dependencies and SDK.

Exact controlled environment, activated checkout, executable/arguments, observed
native PIDs, exits and stream-drained receipts are in `evidence\*.receipt.json`.
`TERMINAL-RECEIPT.json` rechecks every recorded native process identity. Child
sampling is not exhaustive; early Git/bootstrap and metadata collector child PIDs
were not captured, and their tool completions are not mislabeled as exhaustive
process attestation. No unrelated process was terminated.

`MANIFEST.json`, `MANIFEST.sha256` and the adjacent root
`FREEZE-RECEIPT.json` give final portable counts/bytes and manifest SHA.
The default audit is portable, read-only and uses Node built-ins only:

```powershell
node .\Audit.cjs
```

It verifies every payload file, selected loaded-binary hashes, raw PE/PDB IDs,
selected source checksums against the common verifier's real document associations,
actual TRX rows and all-image metadata equality. Node does not independently parse
the PDB document table or run native tests. Final audit stdout/exit receipt is
adjacent to, outside, the once-frozen payload.

**Coordinator owns acceptance/disposition/publication. Both findings stay pending.**
