# F180 / F204: diagnostic sample workload not established

**Disposition: rejected at the scope/workload gate, not measured no benefit.** Both findings are in the unchanged `IISSample.Startup` diagnostic sample. Its [own documentation](owner-handoff/entry/samples-README.md) describes the samples as non-production inner-loop feature exercises. No material application workload was established that would justify a performance proposal for this sample. Each comparison budget is permanently closed **0 of 3**; no candidate, allocation/timing measurement, performance PR or browser window.

| Finding | Concern | Faithful behavior established | Connected evidence |
|---|---|---|---|
| F180 | Environment keys are enumerated, case-insensitively sorted, then used for dictionary lookups. | Real OS snapshots with 0, 1 and 5 explicitly supplied variables produce complete, value-paired `OrdinalIgnoreCase` output without mutating that child environment. | [Actual native owner](owner-handoff/entry/original-git-Startup.cs), [six process results](owner-handoff/results-index.json), [source and raw Git proofs](owner-handoff/git-proofs.json) |
| F204 | The Debug message is concatenated before the logging extension can filter it. | A real `LoggerFactory` suppresses the disabled record and emits exactly one enabled record, including the existing dynamically concatenated `{OriginalFormat}` state. | [Same compiled consumer](owner-handoff/common-049/Program.cs), [actual saved audit](coordinator-portable-audit.json), [publication / tracking linkage](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F180-F204/publication.json) |

`RequestPipeline_DebugDisabled` and `RequestPipeline_DebugEnabled` each execute the real native `Startup.ConfigureServices` / `Startup.Configure`-built `RequestDelegate`. The six owned processes are Original-source and Default, each with empty/singleton/mixed environment fixtures. The 12 rows passed **144 checks**: 11 disabled-mode and 13 enabled-mode checks per fixture. They check actual plain-text response sections, public request/connection/user/header inputs, sorted environment output and unchanged environment. Enabled and disabled response bodies agree after excluding the variable greeting timestamp.

**Logging explanation.** The collecting provider's own `IsEnabled` always returns true; it is the real factory filter that suppresses Debug. Enabled output is `Received request: POST /probe/request`, category `Requests`, level Debug, event ID0, null event name/exception, and a single state pair whose `{OriginalFormat}` is that full dynamic string. A structured template is therefore not silently treated as equivalent state. No conditional-guard candidate was implemented or equivalence-tested, and no discarded-string allocation was measured.

## Source, build and observation boundaries

The target blob is `b70eccbc0a5358e5b3368f9752adefcd2e25a06d` at both Original37 `37e809ead5824bc753a1c3d56f11615bdb1296c5` and independently observed Default `d3483989953ae3cccd773aea5ea04cb0c7198531`.

- **Original-source:** an inherited actual native sample image, with its PE/PDB association and all four actual raw source documents checked. This is **not a fresh Original37 build**, nor a reconstructed historical compiler command or complete dependency-source cohort.
- **Default:** a fresh whole native sample/dependency build at pinned d348. Native missing-import, incorrect bootstrap, insufficient bootstrap and missing-assets attempts are retained before successful generation/restore/build. The successful bootstrap alone did not generate the imports. There are eight native preparation command roots, one successful common C#13 compilation and six actual common execution processes.
- One common consumer DLL is reused unchanged across roles, MVID `2336b301-bd59-4768-ad2e-2df556a56904`. Actual consumer runtimes are Original62.105 / Default69.107, not the SDK/compiler57 requested configuration.
- The frozen capsule has 745 payload files / 162,473,920 bytes, plus its manifest. Offline parsing verifies three selected PE/PDB associations, all nine selected raw documents, 233 actual compiler reference images, 81 distinct observed managed-image files, and 16 source memberships through 21 raw Git objects.

No parent/host environment dump was copied or cleared: only explicit allowlisted owned-child environments were supplied. This is the native request-delegate/response/logging/OS-environment boundary, **not** Kestrel HTTP transport, Azure deployment, IIS hosting, the sample `Main`, or browser execution.

Managed-image snapshots precede final Console JSON serialization; they are not managed-exit/native-module or compiler/runtime/OS closure inventories. Selected compiler files/configuration do not establish its actual managed runtime. Root exits and drained streams do not prove a universal descendant census or unrelated shared-host inactivity. Inner activation redirections do not byte-exact retain every Console/`Write-Host` message. See [explicit limits](owner-handoff/limits.json) and [coordinator acceptance](coordinator-acceptance.json).

## Verification and artifacts

The [frozen standalone audit](owner-handoff/Audit.mjs) was actually executed successfully with capsule-only filesystem permission and no child/write/native execution. The [exact parent audit exit/identity receipt](coordinator-audit-053/exit.json), [entry plan](owner-handoff/entry/entry-plan.json), [all native commands/failures](owner-handoff/), [raw copied-source inventories](authoritative-copies.json) and [closed budgets](closed-budgets.json) are retained.

From this directory, the portable check is:

```powershell
node .\verify.mjs --require-seal
```

The publication check verifies copies and starts only a fresh permission-bounded JavaScript audit of the saved capsule; it does not rerun native code. Later [publication.json](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F180-F204/publication.json) additively connects immutable evidence and the closed fork tracking issue. The fixed classified report remains unchanged.
