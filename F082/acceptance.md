# F082 acceptance and actual MicrosoftAccount boundary

Current default main was freshly fetched at
37e809ead5824bc753a1c3d56f11615bdb1296c5.
Independent branch:autoperf/F082-microsoft-account-utf8-user-info-json.
F081 is a different owner/proposal,not a duplicate or reusable measurement.

## Before implementation

Exercise the actual hosted challenge/correlation/state/OAuth callback,
real HttpClient SendAsync response bytes/headers,the actual MicrosoftAccount
claim actions/CreatingTicket,and ticket/document lifetime. Assert the actual
Bearer header and default id/displayName/email fallback claims. Use the existing
Authentication.Test project and MicrosoftAccountTests class.

Preserve declared UTF8 (including uppercase/quoted),UTF16/big-endian/UTF32/
Latin1,missing charset/BOM inference,and malformed-byte replacement. Include
small/large/BOM/invalidUTF8 producer inputs,with safe labels and assertions
proving the ticket/event path ran. Establish original behavior first.

The proposed alternative may copy UTF8 bytes into an owned array and parse
read-only memory after validating UTF8 and stripping exactly one UTF8 BOM.
Malformed/other/missing/quoted charset cases must retain legacy string decoding.
The copied array remains unchanged for the full JsonDocument/event lifetime.
This still materializes bytes;it removes the UTF16 bridge,not all buffering.
No raw byte-parser assumption may replace the actual legacy decoder contract.

Preserve default SendAsync ResponseContentRead buffering,status failures,
full JSON/trailing-content rejection,Authorization header,claims/events and
before/during/after-buffer cancellation behavior. Do not fix unrelated owner
request/response disposal,change completion mode or add framework visibility.

Freeze actual original/selected owner/source/PDB and identical harness/runtime/
dependency execution sets before at most three measured comparisons. Include
small/large/Unicode/BOM/invalidUTF8/fallback/error controls and retain every
non-win/cost. No gain is claimed from source review or F081's data.
Any qualified draft must prominently disclose residual tradeoffs and boundaries.

## History and documentation

GitHub semantic lookup returned404;local owner/test symbols had no matches.
Known-subtree fallback located the actual owner/options/tests. Five owner
commits and JSON/cancellation seam history were inspected and captured.
Last owner change dotnet/aspnetcore#47717 obsoletes/replaces ISystemClock.
dotnet/aspnetcore#7105 retained ReadAsStringAsync when introducing JsonDocument;
dotnet/aspnetcore#30715 added RequestAborted to that content call.
Bounded eight-result active MicrosoftAccount/JsonDocument search returned no
PRs;issue search returned unrelated/noisy entries,not an exhaustive absence claim.

Microsoft documentation states Utf8.IsValid validates the complete byte span.
JsonDocument.Parse(ReadOnlyMemory<byte>) retains memory for its lifetime and
forbids a leading UTF8 BOM. ReadAsByteArrayAsync buffers viaLoadIntoBufferAsync
and has a cancellation overload. Actual charset/replacement/BOM/cancellation
and copied-memory behavior must be established on this repository runtime.

No external-provider/browser,production-throughput,custom-encoding-provider
or other-platform/runtime claim. Shared CPU-heavy work remains serialized,
two MSBuild workers,no power/affinity changes.
