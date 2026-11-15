# F081: large Facebook UTF-8 payload string allocation

**Qualified allocation/scaling draft, not merge-ready.** The selected 64 KiB
profile saves118578-118580B/op and68.38% median paired time, but small/typical
UTF8 remain11.72%/12.57% slower and large UTF16 remains14.02% slower. No
ordinary-login throughput improvement is claimed.

The proposed owner change replaces the whole UTF16 string only for explicit
canonical UTF8 responses of at least16384 bytes. A UTF8-to-UTF8 transcoding stream
preserves HttpContent's replacement decoding for malformed input. Quoted,
missing and other charset values retain the original string decoder. Small
responses also retain it. Existing HTTP status/query/claim/event/document and
post-buffer cancellation behavior is preserved.

The stream wrapper still decodes/re-encodes and has buffer costs. GetAsync
retains default ResponseContentRead, so the network body is still buffered.
The existing response-disposal behavior is unchanged. The benchmark fixture
uniformly disposes responses externally in both variants.

## All measurements and qualifications

[Selected strategy table](comparison.md) contains every profile from rounds2/3
in BA/AB order. Percentages are paired mean changes; with two selected pairs
the median is their midpoint, not a confidence interval or significance test.
[Full raw arithmetic, variability and all strategies](measurement-audit.json)
and [all six exact executions](all-execution.json) retain120 outcomes,
60 pairs and960 actual result samples.

Round1 used unconditional canonical-UTF8 transcoding. It made small UTF8
33.67% slower and added12496B/op;error controls were28-44% slower. The selected
size gate removes these small-response allocation penalties, but does **not**
eliminate the retained small-response timing regressions. The first strategy
is published separately and is never averaged into the selected summary.

The16KiB gate is anchored to the lowest measured beneficial profile, not an
optimal crossover. Intermediate sizes, exact threshold-adjacent sizes and
unknown-length transport behavior were not timed. The payloads are explicit
backchannel scaling inputs, not observed production Facebook response sizes.

All five selected large UTF8/BOM/invalidUTF8 profiles are faster in both pairs
and save20200-118580B/op. No charset-fallback speedup is claimed. Legacy UTF16,
Latin1, quoted/missing-charset and small-response branches retain all time
movements. Empty/malformed error paths retain552B allocation differences in
some launches;no causal JIT,GC or scheduling explanation is asserted.

## Requirement coverage and actual producer

| Requirement | Evidence |
|---|---|
| Actual callback,claims,event and payload lifetime | UserInfoResponseEncodingPreservesClaims:all17 rows pass in the original and selected43/43 owning suites |
| UTF8/UTF16/big-endian/UTF32/Latin1,quoted and BOM decoding | Explicit bytes/headers pass through a real hosted challenge/correlation/state/OAuth callback and HttpClient backchannel |
| Large valid/BOM/invalid UTF8 reaches the selected path | Utf8Large,Utf8BomLarge andInvalidUtf8Large use32768-character padding;all producer/event assertions pass |
| Malformed-byte replacement,not strict byte parsing | Size-gated raw prototype fails exactlyInvalidUtf8Large withDecoderFallbackException at the actual claim/string consumer;42 other rows pass |
| Existing query,status,claims and full JSON rejection | All20 original/selected actual-owner profile contracts match;FailedHttpControl and empty/trailing/malformed JSON produce their expected exceptions |
| Before/during/after-buffer cancellation | Three small andnine large UTF8/BOM/invalidUTF8 contracts match;actual content writes cause cancellation,not injected result callbacks |
| Post-buffer cancellation preserves legacy success | All three largeAfterBuffer probes produce the actual ticket,event and disposed JsonDocument while caller cancellation is requested |
| Measured allocation effect and exact owner | All120 outcomes and960 samples reproduce;startup plus all setup owner markers match frozen/tested source/PDB identities |

The real options/DI-initialized Facebook handler executes CreateTicketAsync,
GetAsync buffering,claim actions and CreatingTicket. A test-only subclass
exposes the existing protected method;no shipping visibility mechanism is
added. Benchmark setup/cleanup validate full byte consumption,claims,query,
expected errors and document lifetime outside measured code. Timed exercise
creates/consumes an actual ticket and applies identical external cleanup.

## Preservation and negative evidence

[Actual XML-validated test rows](correctness.json) account for293 outcomes:
283 passes and10 expected failures from two rejected raw-stream prototypes;
no skipped or unreached rows are presented as verification. Initial original/
compatible suites have41 rows;final original/selected suites have43 rows.

The unconditional raw stream fails9 encoding/claim scenarios. The size-gated
raw stream fails the new large malformed-byte scenario only. The first
transcoding source failed compilation withCS8604 before any tests;the corrected
nullable guard passed. The initial final-source/PDB check failed because its
source-copy prerequisite was missing;the subsequent recorded source/PDB check
passes. These unmeasured diagnostics consume no comparison.

[Exact successful and expected-failing commands](validation-commands.md) name
each result and exit code. Preservation is green before/after;this is a
performance proposal,not a claim that the original functional behavior was
broken. The negative prototypes demonstrate the relevant compatibility trap.

## Identity and reproduction

[Before](before-manifest.json),[initial](after-manifest.json) and
[selected](after-2-manifest.json) source/PDB/runtime/owner identities are frozen.
Both measured closures contain262 files and116 declared runtime assets;only
Facebook.dll/PDB differ. The large cancellation probe has210 recursively
verified files and the same two owner differences. Harness DLL/runtime/deps
are identical between every measured pair. Raw executables are not published.

The external[harness](harness/AutoPerf.Benchmarks.csproj) targets the real
in-tree owner and tested dependencies,C#13,BDN0.13.0 and the pinnednet12 runtime.
Activate the repository SDK with`. .\activate.ps1` before any dotnet command.
Use the exact build/test commands in validation-commands.md,overriding
AspNetCoreRoot only for another checkout. The separate
[cancellation probe](cancellation-probe/CancellationProbe.csproj) compiles the
shared real fixture.

Non-timing reproduction:

```powershell
node .\reproduce-analysis.mjs . --verify
```

This parses raw samples and TRX XML,checks all contract/source/PDB/owner/closure
receipts and recomputes the selected-only summary. It consumes no new timing.
Historical paths in command records are provenance,not portable output paths.
Source patch and committed source identity refer to the actual fork commit.
Current campaign comparison budget is closed3/3;future independent reproduction
does not revise these immutable historical observations.

No external-provider/browser,other-platform/custom-encoding-provider,network
streaming or production-performance claim. CPU-heavy work was serialized on a
shared Windows host,two MSBuild workers,no power or affinity changes.
