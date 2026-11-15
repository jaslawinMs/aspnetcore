# F081 acceptance and real-producer boundary

Current default main verified at37e809ead5824bc753a1c3d56f11615bdb1296c5.
Independent branch:autoperf/F081-facebook-user-info-json-stream.
Retained card:stream-materialized-before-stream-consumer.

## Before shipping edits

Establish the actual Facebook ticket path with a real HttpClient backchannel
and explicit HTTP response bytes/headers,not a synthetic JsonElement callback.
Observe the claim actions,CreatingTicket event,callback result and JsonDocument
lifetime. The containing Authentication.Test project is the established hosted
test boundary;no new project suffix or shipping visibility accessor.

Preserve successful JSON materialization for declared UTF8/UTF16/Latin1,
quoted charset,BOM-inferred decoding and missing charset. Establish actual
legacy behavior for malformed UTF8 rather than assuming byte parsing is
equivalent. Include ordinary,Unicode/LF and large payloads. Safe theory labels
contain only scenario names,not payloads or control characters. All producer
and event assertions must be reached for every row.

Preserve request-aborted propagation,failed HTTP status behavior,full JSON
consumption/trailing-content rejection,query fields/app-secret proof,existing
claim actions/events and payload disposal. Do not fix unrelated response
disposal or change GetAsync completion mode. The actual existing GetAsync uses
ResponseContentRead and buffers content;removing the UTF16 bridge would not
establish streaming network delivery.

Use at most three measured owner comparisons with identical immutable
harness/runtime/dependency closure and actual source/PDB/owner identities.
Retain all small/encoding/control costs and reject incompatible replacements.
No performance gain is claimed before actual measurement. No public API,
shipped default/convention or assembly-boundary change is intended.

## History and documentation

The GitHub semantic code tool returned repository404;local C# owner symbols
were available but test/reference coverage was incomplete. Known-area
source/test reads were used. No Security AGENTS or authentication-specific
instruction file was found;cross-cutting source/build guidance applies.

Five owner commits and four JSON-seam commits were inspected. Current owner
last changed in dotnet/aspnetcore#56235 for hex formatting.
dotnet/aspnetcore#7105 retained ReadAsStringAsync when switching to JsonDocument.
dotnet/aspnetcore#30715 added Context.RequestAborted to ReadAsStringAsync.
Eight-result-bounded active Facebook search found only
dotnet/aspnetcore#69315 (unrelated return-URI handling);OAuth JsonDocument PR and
Facebook JSON issue searches returned no entries. This is not an exhaustive
absence-of-existing-work claim.

Microsoft's JsonDocument.ParseAsync documentation explicitly describes UTF8
stream input and full consumption. ReadAsStringAsync documents internal
buffering and its cancellation overload. HTTP decoding/BOM behavior must be
established on this repository's actual runtime,not inferred solely from those
docs. Source APIs targetnet12;no unsupported framework substitution.

No full external-provider/browser or production-throughput claim. Explicit
backchannel input is legitimate test data;the actual HttpClient/content/handler
and hosted callback producers remain in the exercised boundary.

## Final measured disposition

Qualified allocation/scaling proposal,explicitly not merge-ready.
All three permitted comparisons are complete. Round1 used unconditional
canonical-UTF8 replacement-preserving transcoding;rounds2/3 used the unchanged
selected >=16384-byte gate. The strategies are not averaged.

The first strategy added12496B/op and33.67% time to the small UTF8 case.
The gate is anchored at the lowest measured beneficial payload size,16KiB;
it is not a measured optimum or evidence for intermediate/boundary sizes.
The selected strategy saves118578-118580B/op and68.38% median paired time at
64KiB;UTF8/BOM16KiB improve24.59%/25.46%. However,small/typical UTF8 remain
11.72%/12.57% slower and large UTF16 remains14.02% slower. All20 profiles,
fallback/error costs,raw samples and variability remain published.

Original and final owner each pass43/43,including17 safe-label actual hosted
callback cases. The original raw-stream prototype fails9 of41 rows;the
size-gated raw-stream prototype fails exactlyInvalidUtf8Large while42 rows pass.
This failure reaches the actual claim/string consumer,not just a parser stub.
Transcoding preserves the legacy replacement character. The nullable compiler
failure and initial missing-source-copy PDB setup failure are retained;
neither reached new timing.

All20 standard ticket contracts,three small cancellation contracts andnine
large UTF8/BOM/invalidUTF8 before/during/after-buffer contracts match exactly.
Large post-buffer cancellation still produces a ticket and disposes its
JsonDocument;pre/during-buffer cancellation produces no ticket. These use the
real HttpClient content-write producer. The size-gated path is reached by
the large cases,not asserted from the small controls.

Original/initial/final source/PDB and actual tested/measured/executing owner
identities match. The measured262-file/116-runtime-asset execution sets differ
only in Facebook.dll/PDB;the untimed large probe has210 files and the same
two owner differences. Focused whitespace passes. All120 benchmark outcomes,
60 pairs,960 result samples and293 owning TRX rows are retained.
No additional timing is authorized for this finding.
