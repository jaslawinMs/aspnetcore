# F173-F175: real test-store lookups, no established material benefit

**Disposition: not admitted; all three budgets permanently closed at zero of three comparisons.** A one-probe cleanup is plausible, but these are test-support stores, not shipping production Identity stores. No performance candidate, measurement or implementation PR was produced. This is not a measured no-gain or zero-cost result.

| Finding | Actual lookup | Classification and decision |
|---|---|---|
| F173 | Role ID in `InMemoryStore<TUser,TRole>` | Test-support-only repeated dictionary lookup; real role-manager creation/update/reference-identity/deletion passed, no material workload established. |
| F174 | Composed login provider/key in `InMemoryUserStore<TUser>`, also inherited by the role store | Test-support-only lookup; actual manager insertion, duplicate handling, removal/null value and re-add contracts passed, no material workload established. |
| F175 | User ID in both base and inherited stores | Test-support-only lookup; real user-manager lifecycle, equal-string/case/identity/missing/update/deletion passed, no material workload established. |

## Connected artifacts

| Artifact | Location |
|---|---|
| Exact producer/ownership boundaries, all tests and expanded command receipts | [Unchanged owner handoff](owner-handoff/HANDOFF.md), [ownership](owner-handoff/OWNERSHIP.json), [results](owner-handoff/RESULTS.json) |
| Coordinator's reasons and exclusions | [Acceptance](coordinator-acceptance.json) |
| Fresh portable selected-byte/metadata/XML verification | [Coordinator audit](coordinator-portable-audit.json) |
| Independent real XML reconciliation of all 44 executions | [System.Xml receipt](coordinator-independent-system-xml.json) |
| Selected bytes, hashes and source membership | [Manifest](owner-handoff/MANIFEST.json), [source records](owner-handoff/source-records.json), [authoritative copies](authoritative-copies.json) |
| Permanently closed, separate finding budgets | [Budgets](closed-budgets.json) |
| Fork tracking, immutable evidence commit and final index | `publication.json`, added after evidence sealing; linked from the root campaign index |

### Why preserving behavior matters

The actual native factory creates the real store and registers that same instance as a singleton. Both native managers and the supplemental public DI/manager path operate on real store state; the latter verifies reuse across two manager scopes. The native fixture also opens its actual unchanged SQLite in-memory connection. There is no substituted dictionary or injected private callback.

Role/user checks preserve the exact stored or replacement reference, including newly allocated equal strings, repeated lookups and case-distinct controls. Login removal assigns **null at the existing composed dictionary key**; a later real manager re-add exercises that existing-key/null-value path. Separate diagnostic tuple cases retain the composed-string alias between `("Pipe|Provider","Key")` and `("Pipe","Provider|Key")`, plus both-empty components. These observations characterize this test helper; they are not new shipping findings, frequency estimates or universal storage contracts.

The source-linked DefaultUI asset and hosted/controller consumers were not executed here. Two passkey samples use different same-simple-name stores and are not target consumers.

## Actual validation

Unchanged Original `37e809ead5824bc753a1c3d56f11615bdb1296c5` and whole observed Default `90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d` ran independently with normal assertion runtimes **62/69**.

Four raw native reports each contain **11 passed Facts, zero failed/skipped**: the same eleven Facts ran twice per role, for **44 executions, not 44 unique tests**. Exact names, definitions, IDs, entries and counters were freshly reconciled with Node and independent real `System.Xml`. No selected parameterized row or zero-discovery support project stands in for these Facts.

One common **C#13 compilation** produced byte-identical DLL/PDB/deps/runtimeconfig files across roles. Each role passed these six supplemental rows (**156 assertions per role; 312 total**):

| Required behavior | Exact supplemental evidence |
|---|---|
| Role-ID lifecycle and identity | `F173_RoleId_ManagerIdentityLifecycle` |
| Login lifecycle on base and inherited stores | `F174_Login_ManagerIdentityLifecycle_BaseStore`, `F174_Login_ManagerIdentityLifecycle_InheritedStore` |
| Composed-key/both-empty diagnostics | `F174_Login_ComposedKeyAndEmptyComponents` |
| User-ID lifecycle on base and inherited stores | `F175_UserId_ManagerIdentityLifecycle_BaseStore`, `F175_UserId_ManagerIdentityLifecycle_InheritedStore` |

Exact native/test/build/restore and consumer commands with results are in the handoff and results file. Six prerequisite failures reached no discovery/assertions and have no reports. An initial Node input-preparation error preceded any compiler invocation; its diagnostic and partial inputs remain retained. There was no failed C# compiler or supplemental execution.

Actual owner/manager MVIDs were observed **inside the supplemental process**. Initial native exit-hook observations covered SDK/VSTest, not the assertion owner. An unchanged, unhooked replay sampled the actual native testhost's CoreCLR/CoreLib **62/69** and testhost modules, but the early snapshot did not capture managed owner/manager modules. Native owner provenance is the exact native command/TRX codeBase/output inventory/selected PE/PDB, **not an invented native in-process managed-MVID observation**. Hostfxr65 and runner57 are not assertion CoreCLR69.

## Offline verification and limits

```powershell
node .\verify.mjs
# PASS: exact selected bytes, fresh PE/PDB/raw Documents/source membership and native XML
```

The unchanged owner envelope has **1,116 files / 125,264,656 bytes**, including the manifest and its hash. The manifest itself covers **1,114 files / 125,036,802 bytes**. The auditor freshly parses **199 unique retained PE images**, seven associated portable PDBs, all **229 raw Documents** in those PDBs and **262 source-membership/absence proofs**. These are **seven PE/PDB pairs, not 199 pairs**.

All explicit common compiler inputs are retained. Complete normal native inventories have 271 files per role; each becomes 275 after adding the four unchanged consumer companions. Whole graph/runtime inventories and union/differences include every non-DLL/helper path, with no prefix exemptions; they are not causal performance pairs or copied full distributions.

Selected bytes and bounded identities are not full SDK/OS/compiler/execution/descendant-process closures. Broader native suites/theories, hosted/UI/browser/native-AOT workflows, null/empty IDs, null keys, one-empty login components, broader Unicode/culture/concurrency/cardinality matrices and material workload benefit remain unverified. All recorded native roots/observed descendants/streams were terminal at handoff; PID reuse and sampling limits remain explicit.
