# F151/F152: the MVC boxing prerequisite remains unestablished

**Two distinct optimization proposals not admitted; zero comparisons and no performance PR.** F151 concerns `Contains`; F152 concerns first-index/`-1` behavior in `IndexOf`. The exercised real MVC producers close `CopyOnWriteList<T>` over **`IValueProviderFactory`, a reference interface**, even when an application supplies a struct factory already boxed into that interface. This does not establish the scan's material **value-type generic `T`** precondition. It also does not prove that every possible value-type producer is absent.

The disposition is `rejected` / `boxing-prerequisite-unestablished`, **not measured no-gain, zero boxing everywhere, a literal no-op, or a confirmed MVC correctness bug**. These methods are not duplicates of one another and this is not a replay of earlier F120/F123 collection-operation studies.

## Connected artifacts

| Artifact | Link | Meaning |
|---|---|---|
| Separate decisions | [Both original IDs/contracts](decisions.json), [F151 closed budget](F151-closed-budget.json), [F152 closed budget](F152-closed-budget.json) | Separate membership and first-index contracts; each budget permanently closed at zero authorizations |
| Source at both studied pins | [Original owner](https://github.com/dotnet/aspnetcore/blob/37e809ead5824bc753a1c3d56f11615bdb1296c5/src/Mvc/Mvc.Core/src/Infrastructure/CopyOnWriteList.cs), [observed default](https://github.com/dotnet/aspnetcore/blob/ae89581dfd24c6277b4267a9779d05f7b9f047f1/src/Mvc/Mvc.Core/src/Infrastructure/CopyOnWriteList.cs) | Actual source owner unchanged; no implementation or API change |
| Later default freshness | [Exact target Git identities](latest-target-identity.json) | Owner blob also matches later live main 00560e2; the whole later framework graph was not rebuilt |
| Full owner handoff | [Immutable handoff](owner-handoff/handoff.json), [acceptance](owner-handoff/acceptance.json), [source/history contract](owner-handoff/manifest/source-contract.json) | Bounded producer findings, explicit helper-only limits, source/worktree/runtime details and failed attempts |
| Actual original producer | [All 183 assertions, requests and source associations](owner-handoff/outputs/original/resume02-producer-characterization.json) | 136 real-MVC, 36 helper-only and 11 identity/runtime assertions |
| Actual default producer | [All 183 assertions, requests and source associations](owner-handoff/outputs/default/resume02-producer-characterization.json) | Same explicit partition, real source owner; not an entire-framework performance comparison |
| Existing exact test rows | [Original/fallback records and historical blocked default](owner-handoff/manifest/existing-test-results.json), [later canonical default success](canonical-default-007/verified-canonical-default.json) | Original canonical 3/3, explicit fallback 3/3, then unchanged canonical default config 3/3 |
| Canonical default runtime | [Exact invocation](canonical-default-007/invocation.json), [actual native host trace](canonical-default-007/dotnet-host-trace.log), [runnable follow-up](F151-verify-canonical-default-007.ps1) | Existing private runtime 12.0.0-alpha.1.26568.110 reused read-only; no installation or silent fallback |
| Reproduction and exact outcomes | [Validation guide](validation-commands.md), [recorded command/input authority](authoritative-copies.json) | Functional probe source/projects/scripts and every retained command; pre-existing source/runtime graph prerequisites explicit |
| Independent coordinator acceptance | [765-file cross-handoff audit](coordinator-frozen-handoff-007-verification.json), [original 230-file manifest](owner-handoff/frozen-files.json) | Original frozen payload unchanged, not an assertion that unrelated studies are finalized |
| Historical portable audit | [Auditor](verify.mjs), [XML parser](audit-trx.ps1), [immutable core manifest](capsule-file-hashes.json) | Rechecks 366 individual assertions, all nine actual passing XML executions and closed zero-comparison budgets without native builds or timing |
| Copies and omissions | [Copied file hashes](authoritative-copies.json), [omitted image hashes](omitted-file-hashes.json) | Compiled source-owner/probe/full native consumer images hashed but not publicly included |
| Tracking issue and live disposition | [Additive publication record](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/CopyOnWriteEquality/publication.json) | Added only after the immutable core is verified remotely; no PR/window or sealed-file rewrite |

## What the real MVC path establishes

The probe uses actual MVC service/options registration, application-part/controller discovery, endpoint routing and resource-filter invocation. It does **not** inject a `CopyOnWriteList` for producer cases. Both default `ControllerRequestDelegateFactory` and the `EnableActionInvokers=true` provider path execute two real requests each.

Inside that genuine resource-filter boundary, membership and first-index behavior are observed before and after the real `Add` operation creates the request-local copy. Removal, configured-options isolation, fresh-request isolation and the identity of the already-boxed interface factory are checked. The actual closed generic argument is `IValueProviderFactory`, with `IsValueType=false`.

The current interface-closed `EqualityComparer<IValueProviderFactory>.Default` also uses object equality in these observations. **We do not claim that a comparer substitution breaks this real producer.**

## Why the synthetic equality witnesses are kept separate

Manually closed `CopyOnWriteList<FactoryValue>` and `CopyOnWriteList<FactoryReference>` witnesses deliberately give `IEquatable<T>` and `object.Equals` different answers. In both read-only/copied storage states, replacing the existing object equality with `EqualityComparer<T>.Default` changes those **helper-level** answers. That is a conditional contract constraint if such a concrete closed type becomes relevant, **not proof that MVC creates a value-type `T` collection**.

Existing `Remove` delegates to `List<T>.Remove` and already uses typed equality. Its different behavior is retained, not repaired incidentally or promoted to a new bug.

## Runtime, provenance and excluded boundaries

- Genuine producer probes for both source pins ran on exact installed .NET 12.0.0-alpha.1.26557.102. Per pin: 136 real MVC assertions, 36 explicitly helper-only assertions, 10 owner/source associations and one actual-runtime assertion.
- Private assembly loading prevented installed-framework unification from replacing the selected source-built MVC owner. Actual owner hashes, PE/PDB GUID association and four physical-source/PDB checksums per pin passed. This is selected evidence, not complete compiler/loader attestation.
- Original existing tests passed 3/3 on canonical runtime 12.0.0-alpha.1.26562.105. The first default run could not start its requested 12.0.0-alpha.1.26568.110 in that checkout. Its explicitly labeled 57 fallback passed 3/3 and is not relabeled.
- A later coordinator follow-up copied the unchanged canonical 68 runtimeconfig and complete existing test consumer to a new directory, reused the already available **private F145 runtime** read-only, and passed the same three exact rows. Native host-resolution trace, actual copied owner SHA and all invocation streams are retained. The original 230-file capsule remains unchanged.
- Supporting assemblies came from each retained graph where available, otherwise the explicitly recorded installed ASP.NET Core transport. These are not byte-identical complete-framework source comparisons.
- The source/reference search was bounded, not a complete absence proof for generated code, reflection, friend-assembly consumers or extensions. Razor Pages was source-inspected only.
- Resource filters short-circuit with `EmptyResult`. Factory execution/model-binding output, socket/network behavior, arbitrary custom source lists, native/browser, AOT/trimming and whole-application performance were not asserted.

No candidate was applied, no performance data collected, and no new public/protected framework API or framework assembly-boundary mechanism was introduced. The classified root REPORT.md remains its fixed 118-finalized snapshot.

```powershell
node .\verify.mjs . --require-seal
```

This audits the historical evidence; it does not restore an SDK, execute omitted binaries or reopen either closed budget.
