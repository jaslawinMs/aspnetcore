# F039: non-consuming TempData collection containment

**Qualified fork-only research draft:** the predeclared `Match:12:8` primary uses
**45.83/45.62% less time**, median **45.73%**, in two completed comparisons.
All allocation reports are **0 B/op unchanged**. This measures a prepared loaded
actual TempData collection lookup, **not application, cookie, DI, rendering or browser performance**.

| Attempt | Actual native order | Original ns | Candidate ns | Less time % | Original/candidate CV % |
|---|---|---:|---:|---:|---:|
| 2 | candidate then original | 36.4859 | 19.7628 | 45.83 | 0.32/0.63 |
| 3 | original then candidate | 36.5937 | 19.9000 | 45.62 | 0.88/0.69 |

Source branch [`autoperf/F039-tempdata-contains-lookup`](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F039-tempdata-contains-lookup)
at `ae7b2c751c2d4ff18302779ecd6f4fa76beb0260`. Exactly two source files change: one shipping return
statement and 48 focused preservation-test lines. F040 collection removal, public/protected
surface and all other statements stay unchanged. `publication.json` is added separately
after immutable remote verification and draft creation.

## Change and compatibility

Only explicit `ICollection<KeyValuePair<string, object?>>.Contains` changes:

```csharp
return Data.TryGetValue(item.Key, out var value) && Equals(value, item.Value);
```

The original calls `ContainsKey` and then non-consuming `Peek`, repeating a dictionary lookup
on hits. The candidate uses the **private Data dictionary**, not public
`IDictionary.TryGetValue`: that public operation consumes retained keys and would be incompatible.
The same lazy loader, case-insensitive comparer, missing/present-null distinction,
equality direction/call count/exceptions, and retained/consumed Save state are preserved.

The actual public producer is `AddRazorComponents` + `RazorComponentResult` rendering a
component with a real cascading ITempData parameter. It captures the actual source-built
internal owner with the registered cookie-provider callback. No copied owner/dictionary algorithm,
reflection member invocation, new IVT or UnsafeAccessor is used. DI/rendering/key/value preparation,
loading, evidence and cleanup are outside timing. Direct result execution does not execute
endpoint-invoker persistence; separate real mapped sample requests cover that boundary.

## Attempts, failures and non-wins

- **Three authorizations consumed, two completed comparisons, no fourth attempt.** Attempt 1
  started original PID14908 and failed before timing: BDN0.13 requires a non-sealed fixture.
  Its native exit -532462766, output, old seven-file source, 687-input seal and original failed
  budget entry remain intact. There are zero timing samples from that attempt.
- A new corrected harness makes only the fixture non-sealed and adds actual untimed public
  BDN discovery of all 40 cases. Both source variants pass discovery/characterization before
  the two remaining authorizations. A successor 1,186-input seal preserves the old epoch;
  the budget was **not reset**. The earlier untimed CS0136 build failure is also retained.
- [All 40 profiles and both comparisons](comparison-results.md): 160 rows, 1,280 raw samples
  independently cross-checked between actual stdout and full JSON. Counts0/1/8/64,
  key lengths12/128, Match/Different/Null/MissingNull/unchanged ContainsKey controls.
  Zero-count profiles are actual misses; strings/queries/pairs are prepared outside timing.
- All adverse medians: **MissingNull:12:0: 2.56% slower; Match:128:0: 4.64% slower; Null:128:0: 2.32% slower; ControlContainsKey:12:1: 0.76% slower; ControlContainsKey:128:1: 0.06% slower; MissingNull:12:8: 3.61% slower; ControlContainsKey:12:8: 1.53% slower; MissingNull:128:8: 2.18% slower; ControlContainsKey:128:8: 0.15% slower; ControlContainsKey:12:64: 0.14% slower**.
  Worst individual paired rows: **Match:128:0 attempt 3: 10.19% more time; MissingNull:12:8 attempt 3: 6.44% more time; ControlContainsKey:12:1 attempt 3: 4.08% more time**. No miss/control median regression reaches
  the declared 5% qualification threshold, but individual adverse observations are not hidden.
- Maximum profile CV is **29.37%**; the table above gives each
  primary CV. This shared VM is noisy, not isolated. No uniform-speedup or production-frequency claim.
  All 160 allocation reports remain0B/op; no structural allocation-saving claim.

## Preservation and reproducibility

| Boundary | Actual evidence |
|---|---|
| Owning managed tests | 74 original +74 candidate rows pass,0skipped; all eight rows of CollectionContains_PreservesValues_WhenFirstAccessTriggersLazyLoad and CollectionContains_DoesNotRetainConsumedValue are parsed individually |
| Untimed real producer | Five full characterizations match all15semantic records and40benchmark lifecycles, including original/candidate in both harness epochs and the independently rebuilt corrected harness; each exercises43actual public-owner captures and640prepared calls |
| Lazy loading and equality | Actual registered cookie provider remains unloaded at capture, loads once at first access; null/missing/casing, actual null-key failure and in-memory asymmetric/throwing/reentrant equality are checked; custom object persistence is not claimed |
| Real mapped cookie persistence | Eight actual canonical BlazorWebAppPerPage static-SSR browser navigations on each source version prove non-consuming containment and consumption by Get/public TryGetValue on subsequent requests; framework200; zero page/console errors |
| Permanent adjacent browser coverage | Ten existing nonquarantined TempDataCookieTest facts pass,0skipped, after dependency-aware Debug build; ContainsKey is adjacent coverage, not direct collection Contains proof |
| Known excluded existing test | TempDataPersistWithoutAccessing stays pre-quarantined by dotnet/aspnetcore#70085; never forced, selected or counted as passed |
| Exact timed image | 197files per variant; only Endpoints DLL/PDB differ.195unchanged entries include identical measured harness DLL/PDB, leaving193other unchanged entries |
| Runnable project | Exact corrected seven-file project independently relocates/restores/builds with0warnings/errors, discovers40actual BDN cases and characterizes15semantic/40lifecycle records; separately compiled harness, no extra timing or same-PE claim |
| Cleanup | Only our archived temporary Razor page was removed; all captured owned sample/Selenium helpers are gone; four unrelated reports are preserved |

This is intended behavior-preserving performance work, **not a semantic-bug red/green claim**.
[Every exact command and result](validation-commands.md), original TRX/browser records,
and the five-field permanent boundary are retained.

## Runtime, history and claim limits

- SDK12.0.100-alpha.1.26557.102; pinned runtime12.0.0-alpha.1.26562.105
  (Environment.Version12.0.0), C#13, Release, ServerGC, Windows x64 RyuJIT.
  [Actual host metadata](environment.json).
- BDN0.13.0; settings-preserving in-process emit executor;3warmups/8results,100ms,
  unroll1,DontRemove,Guid.Empty power-plan mode. All before/after executor settings checked.
  No priority/affinity/power/OS/network changes or unrelated process termination.
- Fresh selected comparison against upstream default `c5baf473f31fa3bbe9f8201e3411361c632f3a91`:
  all18owner/interface/producer/project/test files match the tested baseline before our edits.
  **Not a full-current-default build or dependency-equivalence claim.**
- Timed source was baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5` plus the uncommitted candidate,
  not relabeled as built from the later publication commit. Both committed source files'
  LF-canonical content matches the tested snapshots.
- Authoritative feature design dotnet/aspnetcore#65039 and relevant lazy-load/serialization
  history were read. Bounded open-work searches and all file pages for five TempData-related
  open PR hits are retained; they are not proof of global novelty or absence.
- Selected PE/PDB witnesses cover120source-document associations,
  not complete compiler provenance or method coverage. Live audit hashes1476
  unique files,985consumer and1087loaded-assembly bindings.
- No whole-app/transport/DOM/browser/cookie timing, session-provider, streaming-performance,
  InteractiveServer/Auto/WASM/Mono/AOT performance or production-frequency claim.
  Existing Debug static-SSR Selenium adds correctness only, not the measured Release image.

## Use the evidence and exact project

Portable copied-text/statistics audit, without .NET or retiming:

```powershell
node .\F039-verify.mjs .
```

`harness\AutoPerf.Benchmarks.csproj` and its six C# files are the exact corrected measured
project. For a **new** experiment, copy them outside the source checkout, activate that
checkout's repository SDK and set `AUTOPERF_ASPNETCORE_ROOT`. Build the actual
Components.Endpoints.Tests project in Release, not installed framework binaries, then restore/build
the standalone project. The independently successful commands are retained under
`raw\reproduction-candidate-001\build-commands.json`.

The program requires explicit mode,variant,fresh state directory,new197-file consumer closure,
current12selected source documents and report directory. Its usage/validation are in Program.cs/Evidence.cs;
the executed preparation/reproduction drivers show exact manifest construction. Run untimed
`characterize` first. Closed-budget historical drivers/absolute paths are evidence, **not overwrite/replay instructions**.

Compiled/restore/native bytes are omitted with exact hashes. Portable verification cannot rehash
those omitted bytes or independently recreate historical compilation/runtime execution.
All copied source/stdout/CSV/full JSON/TRX/browser data is byte-exact.
