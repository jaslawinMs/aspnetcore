# F169–F170 unchanged preparation — both PENDING

No candidate, shipping/permanent-test change, commit, GitHub/ledger/policy write, benchmark, counter, profiler, timing/allocation comparison or performance verdict.

| Unchanged source role | Actual native assertion runtime | Existing native Facts | Supplemental checks |
|---|---|---:|---:|
| Original37 `37e809ead5824bc753a1c3d56f11615bdb1296c5` | `12.0.0-alpha.1.26562.105` | 4 passed | 12 passed |
| Entry-observed main `90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d` | `12.0.0-alpha.1.26569.107` | 4 passed | 12 passed |

Fresh entry/closing git and gh observations agree. Later observations do not relabel either graph. Coordinator F145 branch/head and both private tracked-source graphs are unchanged. Independent clones/output graphs are `C:\src\ap-F169-o012` and `C:\src\ap-F169-d012`; the common diagnostic consumer is `C:\src\ap-F169-c012`. Shared SDK, host/runtime junctions and package cache are explicit in `roles.json`; CLI/scratch/HTTP/plugin caches are private. This is a shared Windows host, not a dedicated-idleness experiment.

## What actually runs

Both helpers belong only to `UseWhenExtensionsTests`, not shipped middleware. Native `CreateContext` produces real `DefaultHttpContext`; its lazy `ItemsFeature` creates `ItemsDictionary`, which creates a backing `Dictionary<object, object?>` only on a write. The default comparer is `EqualityComparer<object>.Default`, observed as `ObjectEqualityComparer<object>`; string keys use case-sensitive value equality. `Items` is replaceable, so this is not a comparer guarantee for arbitrary supplied dictionaries.

`Increment` captures its string key/termination flag when middleware is configured. Its returned body runs only through the selected real `UseWhen`/`Use` request delegate: absent → boxed `Int32` 1; present `Int32` n → unchecked n+1; present null/non-`Int32` → 1. It either short-circuits or invokes the real `Use`-produced next function. `Count` is a private post-execution reader: missing/null/non-`Int32` → 0, `Int32` → exact value, no write. The actual `ApplicationBuilder` default terminal also writes `__RequestUnhandled=true` and sets 404; terminating middleware skips it.

The four native Facts are:

- `NullArguments_ArgumentNullException`
- `PredicateTrue_BranchTaken_WillRejoin`
- `PredicateTrue_BranchTaken_CanTerminate`
- `PredicateFalse_PassThrough`

Their full names, result/definition/execution IDs, counters and raw XML are retained. The three pipeline Facts use new contexts and reach each named key once: they establish real branching/rejoin/short circuit, absent writes and present/absent reads, **not an existing-key increment**. Fixed source-derived invocation counts are scoped per test in `requirements-and-boundaries.json`, not measured counters, business traffic or an assumed suite speedup.

## Supplemental boundary

Exactly one common C#13 compile succeeded, zero warnings. Identical DLL/PDB/deps/runtimeconfig/common inputs serve both roles. Reflection directly invokes the **actual source-built native test DLL's private Increment factory and Count reader**; the returned middleware executes through actual public source-built `ApplicationBuilder`/`UseWhen`/`Use`, never a copied helper body or injected next callback.

The twelve named checks cover reused/fresh contexts; seeded zero/positive/negative/MaxValue boxed integers; null/string/Int64 resets; string case/value equality; real terminating and false branches; and invalid null-key lazy-versus-initialized behavior. Exact names and all observations are in `supplemental-results.json`. Seeded/repeated states are explicit diagnostic setups, not claims about existing native-test or business-request frequency. Null-key reads directly invoke the private helper; first invalid-null write creates backing storage then throws `ArgumentNullException("key")`, and later null-key reads also throw.

**Runtime distinction:** both separate supplemental consoles and SDK/VSTest runners actually use runtime57. Only the native assertion testhosts use 62/69. Actual loaded owner/test/common/CoreLib/CoreCLR/hostpolicy identities and PIDs are retained separately; hostfxr65 is a loader, not the assertion runtime. Native testhost snapshots are bounded owner-load observations, not an exhaustive execution census.

## Failed attempts and constraints

- Both initial native builds failed for missing generated `Directory.Build.props`; only then generated private prerequisites.
- Both normal dependency-aware builds failed at the actual missing ANCM asset gate. Successful retries used only `/p:UseIisNativeAssets=false`; no JS/static-assets/analyzer exclusions.
- Common initial no-restore build failed for missing assets; only then restored and compiled once.
- Initial default native test **aborted before any case** for missing runtime69. Its failed zero-row TRX and both streams remain selected, not counted as passes. Only afterward privately copied the provided exact runtime69: all 198 file hashes match, including CoreLib `09dc73d8b850905f8250c160732cedeb532349827e59267bf04b0f59b0d55af8`. No machine install/auth detour/runtime override.

Both native projects are single-target `net12.0`; their normal `preview` language, nullable, unchecked and enabled analyzer defaults were preserved. `IDictionary.TryGetValue` already exists on the actual interface/implementation surface; no candidate was compiled. Relevant docs and `--follow` history are retained. Fresh default history is shallow, so its root-like add diffs do not establish introduction dates.

## Portable evidence and terminal state

Run `node .\audit.mjs` from any copied capsule. The read-only Node stdlib auditor uses **only capsule-relative selected inputs**: it freshly parses PE MVID/CodeView, portable PDB IDs/Documents/raw checksums and recursive XML; reconciles every TRX row and independent real `System.Xml` receipt; checks saved process identities, fixture equality, manifest/hash-list and every declared image union/difference key. It launches no child/.NET process, reruns no assertions, accesses no old graph and reads no counters.

Declared native/owner/common/runtime image inventories include **every file**, including helper/bootstrap and non-DLL names, with no prefix exemptions. Omitted bytes have saved hashes only: no fresh portable omitted-file rehash, full compiler-input attestation, runnable whole-image/execution closure or causal optimization pair is claimed. Selected raw Windows sources and Git/LF identities remain distinct. All selected PDB Documents are parsed; only selected raw documents have checksum associations.

All native .NET attempts retain argv/environment/PIDs/exits, completed root waits and both drained streams in `command-bundle.json.gz`; verbose native diagnostics are compressed losslessly. Early read-only shell inspections lack full OS-root receipts, explicitly disclosed in `context\instruction-observations.json`. `terminal-native-work.json` records awaited roots and fresh bounded checks of known children/hook processes, with no owned native work remaining. No remote helpers, agents or services were started.

The manifest/hash-list define the portable selection; the sibling `seal.json` records exact selected count/bytes/digests and awaited audit receipts. Selected files are read-only after sealing. **F169 and F170 remain PENDING for the coordinator; no performance decision is made here.**
