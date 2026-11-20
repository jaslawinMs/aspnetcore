# F166-F168: lookup cleanup without an established material workload

**Disposition: not admitted; each closed at zero of three comparisons.** No candidate, performance measurement or implementation PR was produced. This is not a measured no-gain result or a claim that the existing operations are free.

| Finding | Actual issue and classification | Why no performance proposal |
|---|---|---|
| F166 | Configuration-time MIME insertion: six initially missing extensions and existing `.mjs` go through a contains/write helper. | Seven fixed registrations during `UseBlazorFrameworkFiles`, not the per-request MIME lookup. No material application registration workload was established. |
| F167 | Constructor-time key-map/default-holder lookup: the enumerated key must win over a distinct supplied key with the same ID. | Real retained-object, duplicate, absent-default and lazy-instantiation contracts were established, not material construction frequency/cardinality. Compatible alternatives were not ruled out merely because older references lack `Dictionary.TryAdd`. |
| F168 | Test-support-only write-once dynamic property insertion. | Real binder and JsonPatch behavior is established, but no material test-suite workload or shipping hot path was demonstrated. |

## Connected evidence

| Artifact | Location |
|---|---|
| Detailed producer descriptions, exact native filters/commands, common probes and limitations | [Unchanged owner handoff](owner-handoff/payload/HANDOFF.md) |
| Coordinator's decision and per-finding reasons | [Acceptance](coordinator-acceptance.json) |
| Actual offline metadata/XML audit | [Coordinator audit](coordinator-portable-audit.json) |
| Independent real XML reconciliation of every row | [System.Xml receipt](coordinator-independent-system-xml.json) |
| All selected evidence and byte hashes | [Payload manifest](owner-handoff/manifest.json), [envelope seal](owner-handoff/seal.json), [authoritative copies](authoritative-copies.json) |
| Separate permanently closed comparison budgets | [Budgets](closed-budgets.json) |
| Fork tracking, immutable evidence commit and final index | `publication.json`, added after evidence sealing; linked from the root campaign index |

### The important behavior is not just dictionary syntax

F166 uses the actual default case-insensitive content-type provider. Missing mappings become `application/octet-stream`; existing `.mjs` remains `text/javascript`. The probe also drives public middleware over real physical files, negotiated Brotli bytes and response streams. A matched-but-missing file really produces **404** within the branch; excluded/outside paths reach the outer **418** sentinel. This is in-process middleware evidence, not browser boot, server transport or generated-asset validation. The native F166 build required disclosed compiler-only `BuildNodeJS=false; StaticWebAssetsEnabled=false` after actual asset failures.

F167's real filesystem-backed manager produces key inputs, including a separately reread distinct same-ID object. The actual constructor retains the enumerated key, inserts an absent default and rejects duplicate enumerated IDs; actual later lookup creates and reuses its lazy object. Supplying an earlier snapshot is a deliberate constructor characterization, **not proof that the normal filesystem-backed provider omits a persisted key**. The separate native fallback test uses a real provider algorithm with mocked inputs. Shipping targets `net462`, `netstandard2.0`, and `net12.0` all compiled in both revisions. Native tests ran `net472` and `net12.0`; that is not exact .NET Framework 4.6.2 execution. Actual older target references lack declared `Dictionary.TryAdd`, which does not make all one-probe alternatives impossible.

F168 drives the actual test helper through real C# dynamic binding and public JsonPatch adapters. It preserves case-sensitive property identity, duplicate exceptions/old values, null removal/reinsertion and replace's remove-before-add. Its private scenarios are reference-valued. Adjacent passing value-type theory rows use a **different** dynamic helper and are not write-once value-type coverage.

## Executed validation

Unchanged Original `37e809ead5824bc753a1c3d56f11615bdb1296c5` and observed whole Default `90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d` were exercised independently. Normal net12 assertion runtimes were **62/69**, not SDK runner57 or hostfxr65.

Eight successful raw native reports contain **84 passed executions / 33 distinct expanded cases**, with zero skipped rows. The ninth report is a retained **zero-row missing-runtime abort**. Both F168 theory values are individually reconciled. The accepted V4 common C#13 fixture passed **six rows per role**; its identical image uses each role's actual native dependency graph/runtime.

There were **two successful common compilations total**, not one: V3 then failed the private 418-vs-404 expectation; V4 corrected only that expectation and compiled once. All earlier build/compiler/probe/helper/seal failures remain selected. Exact commands/results and native/test-framework distinctions are in the handoff; the native commands were not replayed for publication.

From this directory:

```powershell
node .\verify.mjs
# PASS: selected bytes, fresh PE/PDB/raw-source/reference parsing and actual XML rows
```

The verifier admits the unchanged **252-file / 60,174,576-byte owner envelope**, whose selected payload is **248 files / 59,953,667 bytes**. It freshly parses **22 selected PE/PDB pairs**, five retained target-reference images, raw sources and all nine reports. Declared accepted image unions contain 178 keys/141 differences with no prefix exemptions; these are not causal performance pairs.

Inventories are not copied SDK/runtime distributions or fresh rehashes of omitted bytes. Selected provenance/loaded-console observations and terminal PID/creation-time receipts are bounded, not native testhost managed-MVID, whole compiler-input, whole Git-tree or exhaustive execution-closure attestations. No full-browser/native-AOT workflow, custom-provider/concurrency matrix or material performance effect is claimed.
