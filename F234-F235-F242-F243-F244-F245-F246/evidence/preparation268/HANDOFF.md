# GO268 — F234 and F235 bounded source handoff

Owner: `cb6dfbf4-dd69-4c3e-b55f-d49f1820df2b`.

**Both recommendations are `source-only-no-material-candidate`.** They are separate findings, not duplicates. Neither recommendation means measured no-gain, false positive, complete producer qualification, acceptance, retirement or finalization. Both canonical outer statuses remain **pending**; only the parent has disposition authority.

## Immutable roles and exact source evidence

- Original: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Fresh upstream observation: `dotnet/aspnetcore`, default branch `main`, immutable Default `d3483989953ae3cccd773aea5ea04cb0c7198531`. Read-only `gh api graphql` response and exact argv are retained in `roots\root-001`.
- `24875ef5dabb55567870b39f6eb0002170435e2f` is navigation/object-store only, never Default.
- Exactly **15 whole logical files per role**, including three common guidance files; **30 exact whole-blob bindings**. The target and containing project are complete. Fourteen corresponding files are byte-identical between roles; only `.github/copilot-instructions.md` differs.
- The target's SHA256 in both roles is `F052BBBB26E5F4A8ABD0C3DD89A5C48D9E18317D46E4367521B4DAD5121A242A`.
- `ROLE-BINDINGS.json`, `bindings-003.json` and `bindings-005.json` bind commit:path, object type, size, Git blob ID, independently recomputed object ID, SHA256, request ordinal and raw framing offsets to retained binary `cat-file --batch` stdout. Source captures were copied directly from binary bodies, never through an extracted/normalized text roundtrip. The data-only audit independently rechecked all30 memberships.
- Filename-only trees and grep discovery are separate metadata evidence, not proof of relationships or repository-wide absence. No body/snippet of an unselected discovered file is used as behavioral evidence. No AGENTS file appeared in the selected root/.github/src/Identity inventory. Configured unrelated Bluebird and navigation-checkout LSP results were not substituted for immutable source.

## F234 — role membership query

The real nested search is at `InMemoryStore.GetUsersInRoleAsync`, lines58–69. The ordinary inherited `CanGetUsersInRole` source producer creates **six users and four roles**, adds every role to three users, then makes **four populated-role queries plus one unknown-role query**. Each populated result is expected to contain three users.

Positive owner/caller evidence includes the actual InMemory.Test project, `InMemoryStoreTest`'s fresh-store context and same-context singleton user/role registrations, the inherited Fact, and the real `UserManager.GetUsersInRoleAsync` store cast/normalization/delegation. The inherited `CreateManager` helper body is outside the15-file budget: its dispatch and any native execution are not claimed verified.

Each inner search examines a different user's role list. The captured small producer and finite query loop do not justify a material candidate. A per-query/per-user set would still traverse each input to construct the set; no persistent index or other candidate was authored.

Preserve role-name normalization and existing case-sensitive RoleId equality; `SingleOrDefault` duplicate-role and evaluated null behavior; membership short-circuiting; duplicate membership yielding one outer result; existing user-reference/enumeration order without an added Distinct; eager list materialization; synchronous exception timing; completed Task behavior; and currently ignored store cancellation tokens. Exact details and citations are in `ASSESSMENT.json`.

## F235 — passkey lookup, not another role query

Canonical F235 is `InMemoryStore.FindByPasskeyIdAsync`, lines184–187: outer first-user search, inner passkey Any, and structural credential-byte SequenceEqual. It is not a second role finding despite the assignment shorthand.

The actual `UserManager.FindByPasskeyIdAsync` forwarding body is captured. Actual passkey creation/update is also captured: per-user mutable lists, content-based first matching entry, and retention of the caller's CredentialId array reference.

Existing specification producers create one user with one or two **Guid-produced16-byte** credentials. The hosted password/passkey-count producer creates one user and one credential, with two declared theory rows. **Those reviewed scenarios use per-user get/list/remove operations, not this global lookup.** They cannot establish its frequency/cardinality or serve as a faithful global-lookup workload. Discovery names `Core\src\PasskeyHandler.cs`, but that body and a complete normal global-lookup caller chain remain unopened. This is an explicit reachability gap, not evidence that the method is unreachable.

Preserve ordered byte-content equality, first matching user in existing enumeration order, short-circuiting, duplicates within/across users, mutable credential arrays and collection lifetime, null/miss behavior, eager synchronous error timing and completed Task behavior, and ignored store cancellation tokens. No immutability or index invalidation invariant was established. No material candidate can responsibly be selected from this bounded evidence.

## Boundaries and finite next-source proposal

`ASSESSMENT.json` contains separate complete decision records, producer counts, contracts, citations and limitations. `BOUNDED-NEXT-SOURCE-PROPOSAL.json` is **unexecuted and not authorized by GO268**: at most three additional bodies per existing immutable role (`UserManagerSpecificationTestBase.cs`, `PasskeyHandler.cs`, `ControllerTest.cs`), one raw batch root, then stop. It requires separate parent authorization; no source broadening occurred.

Both per-role five-entry target histories are retained in roots006/008. They are metadata/stat observations, not historical whole-blob/patch semantics or proof that a particular commit introduced a method.

The project declares `$(DefaultNetCoreTargetFramework)`. No effective SDK, CLR, testhost, framework/property evaluation or native runtime closure was established from that declaration or canonical net12.0 metadata. Existing tests were **read, not run**. No behavior, performance, allocation or benchmark pass is claimed.

## Actual custody and preserved failures

- **9/32 direct Git/gh roots**, all actual exit0 and explicit root waits returned. Source-root PIDs: `6672,54196,35908,23620,47840,38416,51208,18592,53052`.
- Source observer PIDs: `43696,35900,23928,28568`; their creation identities and exact command arguments are in the individual receipts.
- **18/18 redirected output streams awaited to EOF**, nine stdin streams retained, **7/7 observed child identity waits returned**. Raw stdout totals **666522 bytes**; raw stderr totals **0 bytes**.
- Child observation was a creation-checked live-parent CIM census with nominal100ms root waits, maximum64 observed descendants and10s total post-root observed-child waits. It does not prove absence of short-lived, reparented, inaccessible or otherwise unobserved descendants.
- Every source root has its own fresh policy/registration bytes and checks of actual owner/exact268 scope, absent lease paths, HOLD=false, quiesced=false and pending canonical findings. These are point checks, not an unrestricted future permission.
- Preserve the initial32KB policy-view rejection and the failed Python Store-alias launch (**actual outer exit9009**, interpreter/helper did not start, zero Git/gh roots). The Python helper and failure receipt remain unchanged. Fresh PowerShell phases were used once each; no source command was replayed, no executed helper file was edited, and no dependency was installed.
- `artifact-audit-006.ps1` completed with actual outer exit0, observer `53608`. This is a data integrity/custody result, not a product test.

No SDK activation, dotnet, restore/build/test, product-native/scenario/host/server/browser execution, timing/warmup/allocation/profiling, candidate/source/test edits, checkout/worktree, shared policy/lease/ledger/runtime writes, remote action, subagent, cleanup or publication occurred.

## Seal

`EVIDENCE-INDEX.json` hashes every pre-seal artifact, including full raw streams, captures, helpers, assessments, role bindings, failed attempts and terminal receipts. It excludes only itself and `FINAL-SEAL.json` to avoid recursive hashing. `FINAL-SEAL.json` binds that index, this handoff and aggregate custody.

The final sealer records its live creation identity but deliberately does **not** predict its own outer completion. The parent's final response must bind the actual final tool result after the sealer returns.
