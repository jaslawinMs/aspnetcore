# GO286 — finite F234/F235 manager-factory source continuation

Owner: `cb6dfbf4-dd69-4c3e-b55f-d49f1820df2b`.

**F234 and F235 independently remain `source-only-no-material-candidate`; both canonical outer statuses remain pending.** These are gap-limited source recommendations, not measured no-gain, false-positive, duplicate, native qualification, acceptance, retirement or finalization decisions. Parent alone owns qualification and disposition.

## Completed finite boundary

Exactly the two permitted new direct Git/gh roots were consumed, once each:

1. **Root011:** one exact-class-identifier **filenames-only** discovery, limited to `src/Identity` at pinned observed268Default `d3483989953ae3cccd773aea5ea04cb0c7198531`. Its exact NUL-terminated output uniquely names `src/Identity/Specification.Tests/src/UserManagerSpecificationTests.cs`. It returned no source lines/snippets.
2. **Root012:** one binary `git cat-file --batch` with exactly that new whole file in Original `37e809ead5824bc753a1c3d56f11615bdb1296c5` and observed268Default. Both members were complete **83120-byte blobs**, SHA256 **`10BC2D9F9ABA89EE9A15D74555C8113E4BC6EBEFB5653A473D5AF31B2CC25185`**. Both native Git roots and both actual outer source helpers returned **exit0**.

There are **two new complete bodies, zero new missing responses;18 complete bodies /19 requested paths per role,36 complete body bindings overall**. The aggregate direct Git/gh root count is **12**, not a reopened32-root budget. No further source utility, new body, alternative filename, request/parser/global-passkey-scenario expansion or fresh upstream resolution is authorized.

The earlier279 literal `UserManagerSpecificationTestBase.cs` requests and their **two missing responses**, source-helper **outer exit1**, native Git **exit0**, and subsequent data-only decoding remain unchanged. The new separately authorized discovery does not replay, replace or erase those outcomes.

## Named factory dispatch and explicit instance lifetime

`FACTORY-DISPATCH-286.json` binds the source observations and line ranges:

- The existing `InMemoryStoreTest` derives through the two/three-argument `IdentitySpecificationTestBase` forms to the actual two-argument `UserManagerSpecificationTestBase` now captured in `UserManagerSpecificationTests.cs`.
- The new inherited **CreateManager**, lines79–92, creates an omitted service collection, creates a context only when omitted, calls virtual `SetupIdentityServices`, invokes an optional configure callback afterwards, builds a provider and requests `UserManager<TUser>`.
- For this target, that virtual call selects the existing **IdentitySpecificationTestBase.SetupIdentityServices**, lines40–58. It calls `AddIdentity<TUser,TRole>`, default token providers, and the target's **AddUserStore/AddRoleStore** overrides with the supplied context.
- The target's **CreateTestContext**, lines13–16, constructs a fresh `InMemoryStore<PocoUser,PocoRole>`. Its two store-registration overrides register the supplied same context as their singleton instance.
- **Important alternative-path distinction:** the base default `SetupIdentityServices` would forward to virtual `SetupBuilder`; the existing derived builder explicitly calls `base.SetupBuilder` and adds roles. But this target's ordinary factory instead selects the derived `SetupIdentityServices` override directly. **Neither SetupBuilder body is an additional execution in that ordinary path.**

The existing **CanGetUsersInRole** source fixture creates **one context**, calls **CreateManager(context)** once and **CreateRoleManager(context)** once. It supplies neither a service collection nor a configure callback. Each factory creates its **own collection/provider**; both compositions explicitly register the **same context/store instance**. This is not one shared provider and must not be conflated with ControllerTest's separate implementation-type registrations.

The existing users/roles dictionaries are instance fields. An instance singleton registration does not establish a process-global user population. Default factory calls request a fresh context; callers supplying contexts, collections or callbacks can alter reuse/composition. No provider-disposal, GC, runner-lifetime or all-callers invariant is claimed.

**The named inherited dispatch and explicit construction/registration lifetime are established at source.** DI registration-extension internals were not expanded, and effective resolution/selected concrete runtime manager-store, native test discovery/run, selected SDK/CLR/testhost and behavior were not executed or qualified.

## Separate findings

### F234 — role membership

The new body closes the formerly missing named factory link for the shown ordinary source-owned fixture. It does not enlarge that fixture: six users, four roles, three member users with four memberships, four populated-role queries expecting three results, plus one unknown-role query.

The nested per-user search is real, but each inner collection belongs to a different user, not one invariant lookup set. No naturally larger/frequent material workload or cost is established. No material candidate is justified by this finite source evidence.

Preserve role-name validation/normalization and duplicate/null exceptions, RoleId string equality, per-user short-circuiting, membership duplicates, outer order/reference identity, eager materialization, cancellation and synchronous/completed-Task boundaries. No candidate or test was authored.

### F235 — global passkey credential membership

The same factory body supplies explicit specification-store composition/lifetime, **not a new global-lookup invocation**. The two conditional global-handler edges identified in279 remain unchanged; general passkey assertions/sign-ins must not be counted as global lookup frequency.

A complete ordinary global-lookup scenario selecting this InMemory store, its natural global user/passkey population and frequency, and a material effect remain unqualified. The older per-user fixtures are not relabeled as global workloads. GO286 did not broaden request/parser/handler/global-scenario analysis or fabricate larger inputs/repetition.

Preserve byte-content equality, first-user order, within/across-user duplicates, inner short-circuiting, mutable arrays/collections and aliasing, miss/null, cancellation and exception/async behavior. No cache/index or candidate was authored.

## Bytes, inventory and actual custody

- All **136 prior268 +44 prior279 =180** artifacts were independently rehashed unchanged at286 bootstrap and audit. `BASELINE-268-279-PINS.json` lists the complete exact inventory. Parent acceptance remains **bytes/inventory only**, not a new raw-tree/runtime/materiality qualification.
- `BINDINGS-286-002.json` retains the exact two ordered commit:path requests, raw framing/offsets, blob type/size/object ID/recomputed Git SHA1/body SHA256 and captures. There was no archive extraction or normalization. Request/member association is not independent raw commit/tree-chain/file-mode expansion.
- Original and observed268Default retain their prior immutable meanings. The reserved navigation checkout was not used as Default, checked out, edited or rebuilt. No new current-head claim or selected CLR/SDK/runtime claim is made.
- New roots: **53500** under source observer **40924**, and **44404** under source observer **29844**; creation identities, exact argv, raw guard bytes, stdin/stdout/stderr, waits and observed-child limits are retained.
- New roots: **2/2 root waits**, **4/4 output EOF streams**, two stdin streams, **zero retained observed children**. Raw stdout is111+166346 bytes; stderr0.
- Aggregate: **12/12 root waits,24/24 output EOF streams,12 stdin streams,7/7 retained observed-child waits**. Per-root recomputation gives raw stdout **919315 bytes**, stderr0. Older null/incomplete aggregate-byte fields remain untouched; this rollup explicitly uses all12 retained per-root rows.
- Aggregate source observers: **11980,23928,28568,29844,35900,40924,43696**. The data-only audit observer was **49372**; actual `f234-f235-286-audit-003` returned **exit0**.
- Child observation remains a creation-checked live-parent CIM census, nominal100ms root waits, maximum64 observed descendants and10s total post-root observed-child waits. Prior unresolved census observations remain retained. **No universal closure** is claimed for short-lived, reparented, inaccessible or unobserved descendants.

Fresh actual-owner/exact286scope/registration/lease-absence/HOLD=false/quiesced=false/pending-status guards precede each source utility. These are point observations, not future permission.

No SDK activation, dotnet, restore/build/test, product-native/class/host/server/browser execution, timing/allocation/profiling, candidate/source/test/configuration edits, shared/policy/lease/ledger writes, old-helper replay/replacement, remote action, subagent, cleanup or publication occurred.

## Seal and stop

`ROLE-BINDINGS-286.json`, `TERMINAL-RECEIPTS-286.json` and `AUDIT-286-003.json` preserve the complete-versus-missing source inventory, actual completed receipts and qualification boundaries. `EVIDENCE-INDEX.json` lists every local pre-seal artifact plus the180 unchanged external pins; only the local index and final seal are excluded from recursive self-hashing.

The final sealer records its live creation identity, **not its prospective outer exit**. Report that actual outer result only after the tool returns. Stop after this finite boundary; parent alone handles any further qualification or finalization.
