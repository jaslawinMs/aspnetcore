# F040: TempData conditional collection removal

**Qualified fork-only research draft:** the predeclared `Match:12:8` primary uses
**16.88/16.66/16.17% less time**, median **16.66%**, in three completed comparisons.
All 240 allocation reports are **0 B/op unchanged**.
This measures prepared loaded **RemoveAndRestore round trips, with restoration inside timing**,
not isolated Remove nanoseconds or application/cookie/DI/rendering/browser performance.

| Comparison | Actual native order | Original ns | Candidate ns | Less time % | Original/candidate CV % |
|---|---|---:|---:|---:|---:|
| 1 | original then candidate | 98.9171 | 82.2226 | 16.88 | 0.68/0.70 |
| 2 | candidate then original | 99.1150 | 82.6045 | 16.66 | 0.96/0.57 |
| 3 | original then candidate | 98.3995 | 82.4873 | 16.17 | 2.83/0.73 |

Source branch [`autoperf/F040-tempdata-remove-lookup`](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F040-tempdata-remove-lookup)
at `619ced41b0946739f6c5d851f335608a425b6d13`. Exactly two source files change: one existing shipping condition
and 47 focused preservation-test lines. F039 Contains and all other shipping statements,
public/protected declarations, friend grants and API baselines remain unchanged.
`publication.json` is added separately after immutable remote verification and draft creation.

## Change and compatibility

Only the condition in explicit `ICollection<KeyValuePair<string, object?>>.Remove` changes:

```csharp
if (Data.TryGetValue(item.Key, out var value) && Equals(value, item.Value))
{
    return Remove(item.Key);
}
```

The original calls ContainsKey and non-consuming Peek before the same final Remove(key).
The candidate uses **private Data.TryGetValue**, never the consuming public IDictionary member.
It removes one initial successful-hit probe, **not all removal/retained-key work**.
The branch, final Remove(key), its returned Boolean and final false return are unchanged.
Lazy load ordering, absent/present-null, OrdinalIgnoreCase keys, stored-value-first equality,
exceptions and Save retention are preserved. Reentrant equality may remove or replace a key:
the outer operation still returns the result of the final actual Remove(key).

## Actual producer and steady-state benchmark

AddRazorComponents and public RazorComponentResult rendering capture the actual source-built
internal owner through its registered ITempData cascade and real cookie-provider callback.
No copied owner algorithm, private constructor/member reflection, new IVT or UnsafeAccessor is used.
The real provider remains cold at capture and loads once. Direct memory-response result execution
does not execute endpoint-invoker persistence; separate real mapped sample requests cover it.

All keys, distinct equal string objects, case-varied queries, pairs and restoration inputs are
prepared outside timing. Every nonempty timed call performs collection Remove (or the explicitly
unchanged public string-key Remove control), then restores the original target using its actual setter.
Restoration and retained-key work **remain inside timing** for every nonempty profile, including
mismatch/missing controls. Empty profiles skip restoration and remain genuinely empty misses.
Both complete untimed characterizations and the independent rebuild exercise 16 repeated selected
calls for each of 40 profiles (640 calls), checking the result/cardinality after each call.
Eighty setup/cleanup validation calls per characterization are recorded separately.

## All observations and failures retained

- [All 40 profiles and three comparisons](comparison-results.md): 240 report rows and 1,920
  stdout/JSON-matched samples; counts0/1/8/64, key lengths12/128, Match/Different/Null/MissingNull/
  unchanged string-key Remove controls. Three authorizations completed; no fourth or extra timing.
- **All adverse medians:** Null:12:0: 0.18% slower; MissingNull:128:0: 1.00% slower; ControlRemoveKey:12:1: 2.27% slower; MissingNull:128:1: 0.05% slower; ControlRemoveKey:128:1: 0.18% slower; MissingNull:12:8: 4.04% slower; ControlRemoveKey:12:8: 0.47% slower; MissingNull:128:8: 0.18% slower; ControlRemoveKey:128:8: 0.10% slower; MissingNull:12:64: 4.18% slower; ControlRemoveKey:12:64: 1.78% slower; MissingNull:128:64: 0.09% slower.
  **Worst individual rows:** MissingNull:12:64 comparison 3: 5.67% more time; MissingNull:12:8 comparison 3: 5.63% more time; ControlRemoveKey:12:8 comparison 3: 5.60% more time.
  No miss/control median regression reaches 5%; individual adverse observations are still retained.
- Maximum profile CV is **36.57%**; primary CVs are in the table.
  This is a shared Windows Hyper-V VM, not isolated. No uniform-speedup or production-frequency claim.
  All allocation reports remain0B/op, with no structural allocation-saving claim.
- The initial broad managed build **failed**, exit1, in unchanged Framework.App.Runtime packaging:
  MSB4057 missing CreateWixInstaller and NETSDK1094 missing ReadyToRun runtime package.
  The exact command/logs and focused fallback are retained. No false successful-initialization marker
  or repository-wide/packaging pass is claimed; focused managed/sample/harness/E2E builds pass.
- An earlier untimed added-theory compilation failed with CS8632. The exact failing source/output
  are retained. Only the added theory adopted the existing project's nullable-disabled style.
  Neither untimed failure is misreported as a completed timing run.

## Preservation and reproducibility

| Boundary | Actual evidence |
|---|---|
| Owning managed contract | 73 original +73 candidate rows pass,0skipped; all eight CollectionRemove_UpdatesRetainedValues_WhenFirstAccessTriggersLazyLoad cases are parsed individually |
| Public producer | Three complete characterizations (original, candidate, independent rebuilt project) match17semantic records and40lifecycles;43actual public-owner captures each |
| Equality/retention | Cold real-provider load once, null/missing/casing, actual null-key failure, asymmetric/throwing equality, and reentrant removal/matched replacement/mismatched replacement; custom equality objects are in-memory only |
| Mapped cookie persistence | Eight real full-document canonical BlazorWebAppPerPage navigations per source version; mismatches preserve, matches remove, missing-null preserves present-null, unrelated sibling survives following requests; framework200;0page/console errors |
| Existing permanent browser suite | Ten nonquarantined TempDataCookieTest facts pass,0skipped, after dependency-aware Debug build; string-key Remove is adjacent, not direct collection Remove coverage |
| Known excluded fact | TempDataPersistWithoutAccessing remains pre-quarantined by dotnet/aspnetcore#70085; never forced or counted |
| Exact timed image | 197files per variant; only Endpoints DLL/PDB differ.195unchanged entries include identical measured harness DLL/PDB, leaving193other entries |
| Runnable project | Exact seven-file project independently relocates/restores/builds with0warnings/errors, discovers40actual BDN cases and characterizes17semantic/40lifecycle records; separately compiled harness, no extra timing or same-PE claim |
| Cleanup | Only our archived temporary Razor page was removed; all captured owned sample/Selenium helpers are gone; four unrelated reports are preserved |

This is intended behavior-preserving performance work, **not a semantic-bug red/green claim**.
[Every exact command and result](validation-commands.md), original TRX/browser records and the
five-field permanent boundary are retained.

## Runtime, source history and limits

- SDK12.0.100-alpha.1.26557.102, pinned runtime12.0.0-alpha.1.26562.105
  (Environment.Version12.0.0), C#13, Release, ServerGC, Windows x64 RyuJIT.
  [Actual host metadata](environment.json).
- BDN0.13.0; settings-preserving in-process emit executor;3warmups/8results,100ms,
  unroll1,DontRemove,Guid.Empty power-plan mode. Executor settings are observed before/after
  every profile. No priority/affinity/power/OS/network changes or unrelated process termination.
- All18selected owner/interface/producer/project/test files match fresh upstream default
  `c5baf473f31fa3bbe9f8201e3411361c632f3a91` before edits. Not a full-current-default build or dependency-equivalence claim.
- Timed source was baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5` plus the uncommitted candidate,
  not relabeled as built from the later publication commit. Both committed source files'
  LF-canonical content matches the tested snapshots.
- Authoritative feature design dotnet/aspnetcore#65039 and relevant history were read.
  Bounded open-work searches and complete file pages for five TempData-related open PR hits are
  retained, not proof of global novelty or absence.
- Selected PE/PDB witnesses cover108source-document associations,
  not complete compiler provenance or method coverage. Live audit hashes991
  unique files,591consumer and1086loaded-assembly bindings.
- No whole-app/transport/DOM/browser/cookie timing, session-provider, streaming-performance,
  InteractiveServer/Auto/WASM/Mono/AOT performance or production-frequency claim.
  Existing Debug static-SSR Selenium adds correctness only, not the measured Release image.

## Use the evidence and exact project

Portable copied-text/statistics audit, without .NET or retiming:

```powershell
node .\F040-verify.mjs .
```

`harness\AutoPerf.Benchmarks.csproj` and its six C# files are the exact measured project.
For a **new** experiment, copy them outside the source checkout, activate that checkout's repository
SDK and set AUTOPERF_ASPNETCORE_ROOT. First dependency-aware build the actual owning
Components.Endpoints.Tests project in Release, not installed substitute framework binaries.
Then restore/build the standalone project. The independent successful commands are retained
under `raw\reproduction-candidate-001\build-commands.json`.

The program requires explicit mode,variant,fresh state directory,new197-file consumer closure,
current12selected source documents and report directory. Its usage/validation are in Program.cs/Evidence.cs;
the executed preparation/reproduction drivers show exact manifest construction. Run untimed
characterize first. Closed-budget historical drivers/absolute paths are evidence, not overwrite/replay instructions.

Compiled/restore/native bytes are omitted with exact hashes. Portable verification cannot rehash
those omitted bytes or independently recreate historical compilation/runtime execution.
All copied source/stdout/CSV/full JSON/TRX/browser data is byte-exact.
