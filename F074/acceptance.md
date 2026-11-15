# F074 pre-implementation acceptance

Baseline: current upstream main `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Independent branch: `autoperf/F074-render-fragment-parameter-deserialization`.
This record was created before editing the shipping owner or measuring a comparison.

## Scope and provenance

Only the top-level SerializedRenderFragment branch in
ComponentParameterDeserializer.TryDeserializeParameters is under evaluation.
Keep F075 typed/union parameter deserialization and F076 nested fragment
attribute deserialization unchanged. Keep the existing options, type cache,
lazy RenderFragment construction, dictionary ordering, catches and Debug
InvalidParameterValue event4 unchanged.

The real producer is SSRRenderModeBoundary: it wraps an executed
RenderFragment in RenderFragmentCapture, serializes the captured frames into
the Endpoints SerializedRenderFragment DTO, and supplies it to
ServerComponentSerializer. ServerComponentDeserializer decodes the descriptor
and passes the resulting JsonElement parameter values to this owner.

RenderFragment boundary serialization was introduced by
dotnet/aspnetcore#66528, merge654900e3a13f96b0544aca7d0e779dd996d386cd.
Current main explicitly rejects uncaptured/non-prerendered fragments.
No compatibility switch enables an otherwise unsupported combination here.
dotnet/aspnetcore#68295 retains GetRawText at the F074 seam; its typed-parameter
change overlaps F075, not this candidate.

## Required matrix and boundaries

| Cell | Required evidence |
|---|---|
| Server, per-page, prerendered, initial activation, static Router | Canonical BlazorWebAppPerPage with actual captured plain and escaped/Unicode/large fragments. Observe actual Server WebSocket, installed event handler, trusted input, exact content and counter change after activation. |
| Same restored fragments, interactive rerender | Increment the consuming component and verify content/attributes still match exactly. |
| No fragment, ordinary typed/null parameters | Nearest-opposite control remains interactive and unchanged. |
| Valid captured frames and protected descriptor collection | Actual producer/consumer pipeline yields the expected ParameterView and materialized RenderTreeBuilder frames. |
| Invalid DTO shapes and JsonElement lifetime | Preserve success/failure, deferred-render failure, exception category, the default failed out-view and existing Debug event4; distinguish raw diagnostic inputs from valid producer reachability. |

Excluded: WebAssembly/F076 changes, Auto switching and cached-client
activation, global interactivity, enhanced-navigation races, disabled
prerendering, unexecuted conditional fragments, generic RenderFragment<T>,
cross-version compatibility, new caches/DI lifetimes, and trimming/AOT design
changes. Existing relevant browser tests may provide broader preservation,
but do not silently expand the claim. This representation-only hypothesis
introduces no renderer/runtime/DI or assembly boundary.

Behavior owner: Server top-level component-parameter deserialization.
Production producer: the executed SSR capture and Endpoints marker serializer.
Final observable: restored fragment content/attributes and a successful actual
interactive rerender; managed diagnostic failures keep their existing events.
Permanent surface: focused ServerComponentDeserializerTest coverage and the
existing Components Selenium RenderFragmentSerializationTest surface.
Lower-boundary false-pass risk: a hand-made JsonElement or captured DTO can
prove the downstream contract but cannot prove that SSR actually captured,
emitted and restored it in a browser. The canonical sample and owning Selenium
scenario must cover that real path.

## Implementation and measurement gate

1. Establish the original sample and producer behavior before a shipping edit.
2. Add only focused preservation tests, preserving every existing line.
3. Evaluate replacing the one GetRawText argument with the existing JsonElement
   overload. No other proposal is approved by this record.
4. Use an external BenchmarkDotNet project invoking the actual owner, not a
   reimplemented primitive. Bind reflection/delegate adapters only during
   setup, capture actual producer-derived inputs, and observe materialized
   fragments. Include ordinary typed controls.
5. Freeze original/proposed source, actual owners, identical harness/settings,
   PDB documents and an owner-only execution dependency closure.
6. At most three actual measured comparisons, with all samples, allocations,
   failed/tuned strategies and regressions retained. No smoke/dry timing.
7. Credible improvement must be demonstrated by measured actual-owner time
   and/or removal of the intermediate UTF16-string allocation. Preservation
   tests are not a claimed functional-red bug fix.
8. No draft until required sample, focused tests and selected Selenium checks
   are green. Remove only owned temporary sample files after permanent coverage.
9. Publish immutable complete evidence, then the actual issue/draft, immediately
   request browser opening, verify actual state and finalize receipt/ledgers.

## Build prerequisite record

Submodules initialized successfully. The initial dependency-aware managed
NoRestore build failed on missing project.assets.json files (376 errors).
The restored initial build then exposed unrelated MSB4057 CreateWixInstaller
in App.Runtime despite the no-installers request; the owned command was stopped
to avoid further unrelated CPU work. Both logs are retained. No successful
full-build sentinel was created. Follow the area's failed-build discipline
with the smallest supported dependency-aware Components/sample build.
Debug blazor.web.js passed the source-freshness check. Playwright is currently
MODULE_NOT_FOUND; the already-authorized existing Edge/Node CDP path remains
available for real-browser validation without new dependencies.

Original targeted tests exposed that a failed default ParameterView is not a
valid enumerable empty view: ToDictionary throws before the logger assertion.
The preservation assertion therefore compares the failed out-view to default,
without changing this existing owner contract. The failed attempt and all
seven rows are retained separately.

The original Selenium suite passed all14 existing rows but the new exact
Unicode/newline assertion failed. One focused diagnostic captured actual
GetDomProperty UTF16:2176 expected code units became2240, adding CR before
each of64 LFs. After those two original-case failures, an isolated native
browser producer established the WebDriver limitation: DOM codes65,10,66
were returned by string property transport as65,13,10,66. No Blazor owner
was changed to address this. The permanent scenario uses one minimal
IJavaScriptExecutor operation returning numeric UTF16 units for that exact
read; orchestration, input, and final exact string/attribute assertions
remain C# Selenium. Both temporary diagnostic methods/logging are removed.

## Original gate completed before the one-argument proposal

The canonical browser passed six plain/Unicode/no-fragment states and actual
Server activation plus trusted counter input. All47 managed preservation
rows passed. All15 owning Selenium rows passed after the transport read was
isolated and repaired. The24 untimed external harness profiles passed both
the actual owner and stateless descriptor collection, including comparison
of materialized frames with the executed capture's source fragment.

The immutable original harness owner matches the original tested Release
owner (C997B7D333814BCCABD5614453CE0D1BDE075FC5DDC7CEBB6D2FF1688C098136).
Its portable PDB matches original source SHA256
5215120E6F3A1EAA3711630DE2D209704F67C52614116839152A65CCBE4BDDF2.
The proposed shipping edit changes only the F074 Deserialize argument from
value.GetRawText() to value. F075/F076 are unchanged. Measured budget remains
zero until the runner launches the first recorded pair.

## Selected disposition after three comparisons

The one-argument proposal passed the same six canonical browser states,
all47 managed rows, and all15 owning Selenium rows. Both frozen owners
passed byte-identical24-profile contracts and source/PDB correspondence.
All six measured launches used the expected actual owner hash and identical
harness/runtime/dependency manifests. The three-comparison budget is closed.

Owner-only long text improved36.82% by the median paired time change.
Large escaped text removed19544B/op (about67%) and owner time improved9.76%.
Ordinary typed-only controls kept identical allocations. The large escaped
full descriptor case regressed20.28% by median paired time change
(+20.28%/-3.50%/+32.68%); collection timings were volatile. This is an
allocation-focused draft proposal, not a merge-ready throughput improvement.
All regressions and controls remain in the evidence, not filtered out.

The frozen harness's provisional string-size model used24+2*n and can
overpredict by8B for some lengths. External analysis records the corrected
22+2*n model aligned to8, retaining the original contracts and harness bytes.
The pre-timing209-common-file hash proof allowed only Server.dll/PDB changes;
one extra validation compiler-generator output is absent from the identical
runtime manifest. A PowerShell enumeration initially reported zero runtime
assets; the corrected re-enumeration validated all90 actual declared assets.
This correction is recorded explicitly rather than rewriting the first
diagnostic as if it had succeeded.

Changed C# whitespace verification and diff checks passed. Only the two
owned temporary sample files were removed after permanent browser coverage
passed; their source and all original/proposed/failed receipts are retained.
