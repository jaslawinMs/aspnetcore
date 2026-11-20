# F129: keep the attribute snapshot - unbuffered replacement rejected

**No shipping change, optimization PR or measured performance claim.** The dictionary is not simply redundant materialization: in the supplied-href branch it also snapshots attribute pairs before rendering converts object values to strings. Replacing it with an unbuffered filter changes actual HTML or throws for the concrete inputs below.

This is **observable-behavior preservation**, not a claim that the API documents snapshot guarantees or that such reentrant values are common. Only the single unbuffered recommendation is rejected; buffered list/array/pooling/constructor alternatives have not been established or measured here.

## Why the copy matters

An application supplies href, an object-valued data-trigger attribute and data-after="before". The real RenderTreeBuilder.AddAttribute(object) invokes that object's ToString; the object updates its own supplied dictionary to data-after="after". The existing FileDownload has already copied every pair, so the real HTML retains **before**. The lazy-filter prototype reads the later changed source pair and renders **after** instead.

When the same real conversion adds a new source key instead, the existing copy finishes rendering; the lazy prototype reports **InvalidOperationException: Collection was modified**. Neither probe invokes ToString or BuildRenderTree directly, fabricates renderer events, or relies on a browser scheduler.

The input is deliberately reentrant. It establishes a real difference at the managed HTML/exception boundary, **not normal application frequency or a current product defect**.

## Connected artifacts

| Artifact | Link | Meaning |
|---|---|---|
| Current shipping code | [Baseline source](https://github.com/jaslawinMs/aspnetcore/blob/37e809ead5824bc753a1c3d56f11615bdb1296c5/src/Components/Media/src/FileDownload.cs), [tested snapshot](images/Original/source/src/Components/Media/src/FileDownload.cs) | Unchanged; no source branch or performance PR published |
| Actual-default source | [Snapshot](images/Default/source/src/Components/Media/src/FileDownload.cs), [complete default observations](validation/default-characterize-001/observations.json) | Genuine default dependency graph at ae89581dfd24c6277b4267a9779d05f7b9f047f1, not substituted baseline owners |
| Rejected source | [Actual compiled prototype](images/Prototype/source/src/Components/Media/src/FileDownload.cs), [raw source delta](prototype.patch) | Only the href-present branch uses lazy ordinal filtering; not a proposed fix |
| Acceptance and baseline | [Sealed plan](plan.json), [seal](plan-seal.json), [passing baseline](baseline-completed.json) | Defined before prototype edits, with nine profiles and three repetitions each |
| Actual producer | [Media parameter assignment](images/Original/source/src/Components/Media/src/MediaComponentBase.cs), [builder conversion](images/Original/source/src/Components/Components/src/Rendering/RenderTreeBuilder.cs), [probe](harness/Program.cs) | Actual FileDownload, normal parameters, actual object-value conversion and real HTML/exception |
| Every observed profile | [Readable table](semantic-results.md), [matrix](semantic-matrix.json), [prototype raw rows](validation/prototype-characterize-001/observations.json) | Both href-present mutator profiles change in all repetitions; nearest-opposite and ordinary controls retained |
| Existing correctness coverage | [Exact commands/results](validation-commands.md), [test source](images/Original/source/src/Components/Media/test/FileDownloadTest.cs), [XML parser](F129-audit-trx.ps1) | 28 passing historical XML executions; no hidden failed or skipped discovered test |
| Runnable private characterization | [Project](harness/AutoPerf.Characterization.csproj), [C# source](harness/Program.cs), [two input hashes](common-inputs.json) | C# 13 and real source-built owners, not a copied render loop or performance benchmark |
| Fresh exact-input reconstruction | [Verified result](reconstruction-001/verified-reproduction.json), [copied project](reconstruction-001/project/AutoPerf.Characterization.csproj), [metadata correction](reconstruction-001/manifest-size-correction.json) | Actual restore/build and both original/prototype reexecutions reproduce the distinction; no timing |
| Outcome | [Decision](decision.json), [closed budget](diagnostic-budget.json), [closure](budget-closure.json) | Rejected before timing; all three unused authorizations permanently closed |
| Independent audit | [Portable verifier](F129-verify.mjs), [full live-image audit](audit-summary.json), [raw audit output](live-audit.stdout.txt) | 162 real render rows, 72 runtime assembly records, 30 selected PE/PDB/source associations and every individual XML result |
| Evidence integrity | [Authoritative copies](authoritative-copies.json), [omitted files](omitted-file-hashes.json), [sealed hashes](capsule-file-hashes.json) | Binary/build outputs are individually inventoried, not shipped |

Closed fork tracking and the late publication receipt are added only after the immutable core is remotely verified. The additive publication.json and live root index connect that issue without rewriting this core.

## Boundary and controls

Original, actual default, restored original and rebuilt original each satisfy all 27 original-behavior rows. Both prototype executions fail exactly six rows: the two changed profiles repeated three times. **162 renders are repeated executions of nine profiles**, not 162 unique tests. The seven existing tests pass with either implementation, so they cannot by themselves justify this optimization.

Without supplied href, both implementations still use direct source enumeration: replacing the later value renders after, and adding a key throws. ChildContent bypasses conversion entirely; the uppercase-href/source-comparer behavior is unchanged. All raw control observations are retained.

The 30-file original/prototype images differ only in the actual Media DLL/PDB. The other **28 files include the identical common harness DLL/PDB**. The restored original reproduces all 30 original image files byte for byte. The independent two-input rebuild replaces only its new harness DLL/PDB; the other 28 files in each corresponding source consumer are preserved.

Five selected source documents per execution match actual loaded PE/PDB identities and the copied physical source. This is **selected provenance, not complete compiler provenance**. Pinned Microsoft.NETCore.App assemblies keep their actual runtime paths and hashes; they are not relabeled source-built ASP.NET Core owners.

The behavior owner is FileDownload.BuildRenderTree plus actual RenderTreeBuilder object conversion. The producer is normal component parameter assignment followed by actual ToString dispatch; the final observable is real HTML or a renderer exception. This lower managed boundary is faithful for the claim. No browser/download, JS, DOM/layout, Server/WASM/Auto lifecycle, general throughput or allocation claim is made. A later shipping implementation would still need the Components sample and permanent coverage workflow.

## Verification and reproduction

From this directory on Windows with Node.js and PowerShell 7:

```powershell
node .\F129-verify.mjs . --require-seal
```

The recorded live audit passed with the private compiled images; the sealed portable audit additionally checks the immutable published file hashes. It reparses actual XML, all raw semantic rows, command receipts and snapshot checksums. Historical PE/PDB binaries are omitted: portable audit verifies their recorded associations and authoritative hashes, not a newly rebuilt historical binary.

To reexecute rather than audit, use an isolated checkout at the recorded baseline and its documented activated SDK build/test commands in [validation-commands.md](validation-commands.md). Build the two-input project with ReferencePathRoot set to that built Media.Tests output (or the retained private original consumer). A consumer directory must contain the compiled output and have its corresponding source snapshot directory beside it, because the probe checks loaded-owner PDBs against those sources. The actual [fresh-project commands and results](reconstruction-001/verified-reproduction.json) demonstrate both roles. Raw observations are written to the explicit second application argument; prototype preservation checks deliberately exit 2. This is a characterization, not a benchmark.

SDK 12.0.100-alpha.1.26557.102; runtime 12.0.0-alpha.1.26562.105, x64; C# 13. Zero timing comparisons, retuning or machine setting changes.

## History and related work

The copy is present in the [original introduction](research/original-introduction.stdout.txt), before the [package rename](research/renamed-history.stdout.txt). All eleven selected original/default inputs match in Git text. [Attribute-splatting docs](research/attribute-splatting-docs.stdout.txt) describe the application-supplied object-valued dictionary; they do not establish a documented snapshot guarantee.

The three open-PR search leads were resolved against complete changed-path lists: [dotnet/aspnetcore#69687](https://github.com/dotnet/aspnetcore/pull/69687) changes a trimming annotation on OnClickAsync ([actual hunk](research/upstream-pr-69687-FileDownload.patch)); [dotnet/aspnetcore#68300](https://github.com/dotnet/aspnetcore/pull/68300) changes component descriptors ([paths](research/upstream-pr-68300-changed-paths-002.txt)); [dotnet/aspnetcore#68672](https://github.com/dotnet/aspnetcore/pull/68672) rewinds the source stream on click ([actual hunk](research/upstream-pr-68672-FileDownload.patch)). None is this attribute-copy optimization. [The existing media API issue](https://github.com/dotnet/aspnetcore/issues/66391) is context, not approval of any proposed change. No global or external caller census is claimed.
