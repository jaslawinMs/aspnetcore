# F069 acceptance and faithful boundary

Actual current main/independent baseline:
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Original actual `SniOptionsSelectorTests`:31 passed/0 failed/0 skipped,
without a restore or shipping changes. All source/test bytes are preserved.
No active code graph covers this GitHub repo; C# symbol search returned none.
Known source/test paths and actual construction/callback source were read.

The disputed work is the configured wildcard-suffix scan after an exact miss
and the existing DNS-name guard, once during TLS option selection. It is not
per HTTP request. Preserve exact-name priority, longest matching literal-dot
suffix, catch-all and null/empty behavior, ordinal-ignore-case/raw Unicode
semantics, equal-length unrelated suffixes, duplicate configuration exceptions
(including their current key/message), option cache/clone/callback behavior,
feature output and delayed-client-certificate flag.

Existing dotnet/aspnetcore#69395 changes configuration-key IDN canonicalization,
not the suffix scan. Do not mix that proposed behavior into this finding.
Keep the current exact lookup before the existing DNS guard.
The selector's new state, if any, is per configured endpoint constructor,
not a static metadata cache; do not add a Hot Reload mechanism or public API.

| Requirement | Evidence before publication |
|---|---|
| Original reachability and output | Actual owner constructed from configured patterns; complete original selection contracts and real Kestrel/SslStream ClientHello -> actual selector callback -> negotiated HTTP protocol/application response. Real runtime and Kestrel populate read-only callback state; no private setter or injected synthetic ClientHello event. |
| Priority/casing/current conventions | All31 original tests green; focused preservation rows for deep/overlapping labels and Unicode suffix/case/raw A-label distinction. No change to validation or normalization. |
| Caller/configuration/option lifetime | Duplicate-case wildcard full exception unchanged; cached option identity and both callback clone paths/ordering/features remain. Each constructor owns fresh configured state; caller mutation cannot update an existing selector. |
| Normal versus scaled costs | Include1/2/8 patterns, first/last/miss, exact/null/empty/unreached controls,64/512 scaled sets and callback paths. Preserve small-set regressions and startup constructor time/allocation; a large last-match win is not handshake or request throughput. |
| Faithful timing boundary | Time actual shipping GetOptions via a prepared typed delegate, not reflection or a copied match loop; configured connection/name inputs and complete option consumption. Separate real Kestrel/TLS/HTTP producer validation; prepared-connection selection cost is not full handshake throughput. |
| Bounded comparisons | At most three serialized A/B comparisons total; identical harness/runtime/recursive DLL+JSON closure and owner-only difference; all eight samples and raw reports kept. No fourth comparison. |
| Persistent handoff | Exact final test/build/format and measured/Git text identities; immutable source/raw results and verified remote receipt. Only a justified fork draft; request its browser opening immediately. |

This is a performance-only proposal: existing correctness is original-green.
Do not pretend preservation tests expose an original functional failure.
If an unmeasured deliberate matcher mutation is used, distinguish its failures
from original behavior. Keep raw caller diagnostics distinct from real names
observed in the runtime's TLS callback; do not infer IDN wire representation.
Browser/application throughput, every runtime/architecture and NativeAOT
remain unverified unless independently established.

## Final observed disposition

Three actual source strategies consumed all three comparisons. No fourth is
permitted; only comparison3 measures the final strategy. Its64/512 last/miss
selection reductions are68.49-96.09%; first-match cost is about1% higher.
All ordinary non-callback selection allocations remain24 B/op, unchanged from
original. The second strategy's added56 B/op on small sets is eliminated.
Do not credit enumeration-allocation savings against the original owner.

Small timing non-wins remain: Patterns1_Last+9.58%, Patterns8_Last+7.40%,
Patterns8_Miss+9.32%; exact/null/empty/trailing-dot controls improve5-9% without
using the new lookup. These do not establish a universal latency gain.
Construction64/512 adds24.39%/17.12% time and2184/14785 allocated bytes;
large configurations retain a second index of64/512 key/value references.
Small constructors add8 B/op. Allocated bytes are not retained-byte measurements.

All198 outcomes/99 pairs/1584 actual samples/204 owner markers are accounted.
Six correctness phases give250 passed/0 failed/0 skipped rows; expanded
original, second and final strategies each pass all47 exact row identities.
The final47-row test owner's DLL matches the measured final DLL; source build,
both scoped formats and all nine actual PDB source checks pass.
The29 complete option contracts and17 real TLS/HTTP receipts are identical
against original for the frozen final105-file owner-only closure.
