# F197: bounded generated-file verification assessment

**Source-only no material candidate, not measured no-gain.** The flagged array is real: `BaselineTest.Template_Produces_The_Right_Set_Of_FilesAsync` materializes `Directory.EnumerateFiles(...)` before one `foreach`. No candidate, private graph, native workload or comparison was created.

The source path first initializes the template engine, creates a uniquely named project/output path, invokes the actual `dotnet new` command, awaits exit and checks success. The test then enumerates output files, checks expected names and reads C# namespace declarations. Removing the array would interleave enumeration with those checks, rather than finish enumeration first; no bug or universal equivalence claim follows.

The captured JSON defines **75 scenarios with 2-136 listed expected names**, identically in Original `37e809ead5824bc753a1c3d56f11615bdb1296c5` and independently observed Default `d3483989953ae3cccd773aea5ea04cb0c7198531`. These are **not observed generated-file counts**: project/build/solution and `bin`/`obj` files are filtered later, and no generated directory was inspected. Earlier typed-theory and repeatedly consumed expected-file arrays are different sites.

This test-only verification step has no demonstrated material performance need. A fabricated large tree or repeated enumeration would not establish one. [Assessment and limits](evidence/ASSESSMENT.json), [source facts](evidence/source-facts.json), [raw Git memberships](evidence/source-membership.json), bounded history/search results and navigation/import-path read failures are preserved with the complete evidence.

The owning test, `Templates.Test.BaselineTest.Template_Produces_The_Right_Set_Of_FilesAsync`, was **not scheduled** after the source gate; no generated-application, package, CLR, allocation or performance result is claimed. Repository guidance requires the real matching producer/package/runtime graph before generated-application validation; its availability was not assumed.

No performance PR, browser window, fixed historical `REPORT.md` edit or budget reopening follows.

## Verify offline

```text
node verify.mjs .
```

Add `--require-seal` after publication. This checks complete artifact hashes, raw commit/tree/blob memberships, both exact retained source sites, source-defined scenario/name counts and source-command terminal records. It does not execute product code or generated applications.
