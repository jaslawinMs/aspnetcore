# F194/F195 bounded preparation handoff

Owner: `bb4c15c7-3a8e-4145-b72f-7da74cfea243`. Both findings remain **PENDING**.
Comparison authorizations: **0**. No candidate or performance decision is included.

## Reached boundary

The real unchanged `TestEntry.GetFiles`, `TestAssembly(TestEntry)`, manifest parser,
and public `ManifestEmbeddedFileProvider` were exercised. Each source role passed
**11 selected native cases**, including both individual casing-theory rows, and
**12 untimed supplemental contract cases**. Native XML is reconciled by test ID,
execution ID, definition, entry, full method/case name, source assembly path, outcome,
and every counter—not merely process exit status.

| Role | Exact built Git commit | Actual assertion runtime |
|---|---|---|
| Original | `37e809ead5824bc753a1c3d56f11615bdb1296c5` | `12.0.0-alpha.1.26562.105` |
| Default | `e26532d156ed19f66c88aca8f4374e081bcd5d72` | `12.0.0-alpha.1.26569.107` |

Default was independently observed with `git ls-remote` at entry. The closing
observation is retained in `evidence\closing-head.json`; drift never retargets these
results. The SDK and VSTest CLI run on `12.0.0-alpha.1.26557.102`, not either
assertion runtime. The sampled hostfxr is `12.0.0-alpha.1.26565.104`.
Different source/runtime characterizations are **not causal performance comparisons**.

## Producer and data contract

F194 is the direct-file `Where(...).ToArray()` at `TestEntry.cs:34`; F195 is
the recursive-directory `SelectMany(...).ToArray()` at line 35. They are unchanged
at both exact roles. `TestEntry` is test support, not shipping file-provider code.
The source trace has one nonrecursive caller: the real `TestAssembly(TestEntry)`
constructor, which consumes file resource paths. `GetFiles` also calls itself once
for each traversed directory child. Source/history records and exact Git
commit/tree/blob proofs are included.

Observed with the actual factories, without private-state seeding or synthetic callbacks:

- A file node produces no descendants. Empty directories produce an empty result;
  singleton directory results preserve the original file-object identity.
- At each directory, direct files come first in their input order, followed by
  child-directory results in directory input order, recursively applying that rule.
- The six-file, five-directory mixed cohort includes an empty directory and
  nested depth three. Its flattening is
  `r.root1, r.root2, r.z1, r.z2, r.deep, r.a1`.
- The existing final array eagerly snapshots membership. Repeated enumeration does
  not revisit the input child array in these cases. The snapshot is shallow:
  subsequent public helper-input array changes do not replace saved members, but
  resource-path changes on an already saved file object are visible.
- Deliberately invalid direct-helper null-array, null-child, and malformed-descendant
  diagnostics throw synchronously before an enumerable is returned. These are
  explicitly **not legal normal public-provider scenarios**.
- `TestAssembly` writes the XML manifest first, preserving the original XML child
  order, then snapshots the flattened resource-path **strings**. The public provider
  parses that XML; its root order is
  `z, root1.txt, empty, root2.txt, a`, not the flattening order. All six resource
  streams were opened through the real provider and real test assembly.
- Public-provider empty/singleton/nested scenarios and the producer's already-created
  XML/string snapshots remain stable after the separately labeled deliberate
  mutation of public helper inputs.

These are bounded source/contract observations. Broader workload size, frequency,
production relevance, time and allocation effects, and whether either intermediate
materialization should change are **unestablished**. No measured zero-cost or no-gain
claim is made.

## Selection, commands and preserved failures

`evidence\contract-checklist.json` freezes all ten native method names, both exact
theory rows, twelve supplemental cases, expected boundaries and exclusions before
the first C# compilation. `evidence\NATIVE-SELECTION.json` records the exact filter.
Every exact repository command, including activation and environment guards, is in
`attempts\<id>\command.ps1`; raw streams and real process receipts are beside it.
`COMMANDS.json` indexes the commands and identities.

The native project is
`src\FileProviders\Embedded\test\Microsoft.Extensions.FileProviders.Embedded.Tests.csproj`,
configuration `Release`, selected target `net12.0`. Its pinned packages, native test
framework/Moq conventions, target detection and source files were not migrated or
edited. Actual native dependencies are xUnit `2.9.2`, Moq `4.20.72`, and
Microsoft.NET.Test.Sdk `18.0.1`; the VSTest adapter reports `3.1.3`.
These distinct versions are not relabeled as one framework/runtime.
`net472` and unselected cases were not executed.

Preserved prerequisite failures:

1. Both selected no-restore builds failed `MSB4019` on missing native generated imports.
2. Both first native GenerateFiles attempts failed `NETSDK1226` because copied SDK
   infrastructure did not yet include targeting-pack/prune data.
3. The first common-consumer no-restore build failed `NETSDK1004` on absent assets.
4. After those failures, installed targeting packs were copied from the attributed
   donor, native templates generated their imports, and native restore/build succeeded.
   No framework source, package manifests or global configuration was patched.
5. The first metadata probe incorrectly compared the PE deterministic PDB checksum
   to the raw PDB file hash. Its source, assertion failure and both hashes are retained.
   The corrected parser verifies that checksum with the 20-byte PDB content ID zeroed,
   while independently hashing the untouched complete PDB.
6. The first capsule assembly failed because PowerShell's zero-output `Tee-Object`
   had not created an empty diff file. Exact Git diff stdout/stderr and the true exit
   were recaptured; no empty result was fabricated. Its failed assembler attempt is retained.
7. An unavailable Python read, missing instruction-path probes, a wrong-graph Git
   object read, and a tool-denied variable-PID closure call are retained honestly,
   including where an exit identity/code was not captured.

One unchanged common consumer was successfully compiled once. Its exact same DLL is
used for both role executions and native identity hooks. There were no C# revisions,
different-source wrappers, candidate implementations, test-body edits or selection
changes. Reflection invokes the real internal helper's existing public factories
and methods; public-provider scenarios use the real TestAssembly constructor.

## Byte provenance and limits

`metadata.json` selects five actual PE/portable-PDB pairs: both native test assemblies,
both native product assemblies, and the unchanged common consumer. All **70** selected
PDB document rows have copied, freshly checksum-verified raw bytes, including common
`Program.cs`, generated documents, and the native test-SDK package document.
Embedded/generated/external documents are labeled; they are not falsely attributed
to repository Git membership. Raw compiler CRLF/BOM bytes are separate from Git LF
blob bytes. `git\proofs.json` links tracked sources and build inputs through raw
commit/tree/blob objects at their exact built roles.

`input-inventory.json` and raw identity receipts distinguish:

- Actual in-process managed MVID reflection from loaded-assembly samples.
- Freshly parsed MVIDs from copied PE files.
- Sampled native module file hashes, not managed reflection observations.
- Copied SDK/compiler tool files, not complete compiler-process closure.

The native testhost startup hook observes its entry runtime and early assemblies.
Its exit hook did **not** run. Therefore native selected test/product MVIDs are PE
file samples at that boundary, while their actual managed MVID reflection was
observed in the separately identified common-consumer processes. Testhost exit
codes are **unknown**, never normalized to zero. The real runner root exits,
sampled child PID-plus-creation identities and later OS absence checks are separate
receipts. They establish only the observed identities, not universal process closure.
Some early source-preparation Git/tool reads did not capture owned process identities;
their logs are not promoted into native-root terminal receipts.
The owned common-compilation server was stopped only by its specific observed PID
after matching its creation identity and executable path; that attempt is preserved.

No shipping code, repository worktree, donor, other owner's graph, public result,
campaign status, policy, budget or admission control was changed. Only the two
registered private role graphs and this exclusive output root were written.
Initial HOLD was not released until the explicit registered coordinator GO.

## Offline audit

From any copied capsule directory, with a compatible Node supporting permission mode:

```powershell
node --permission --allow-fs-read=<capsule> --no-addons <capsule>\Audit.cjs
```

Replace both `<capsule>` occurrences with the same absolute Windows directory.
The auditor reads only copied capsule bytes, has no filesystem-write or child-process
permission, and performs no native re-execution. It rehashes every declared payload
file, freshly parses PE CodeView/PDB GUID/stamp association and deterministic
checksum, all selected raw document checksums, raw Git membership proofs, actual XML
identities and supplemental results. It fails closed on omissions or mismatches.

`MANIFEST.json` and `MANIFEST.sha256` are the two **envelope**, not payload, files.
The manifest and final seal report payload and enclosing capsule counts separately.
Audit attempts are outside the frozen payload; final native root/observed-child
closure is frozen inside it. The external `SEALED-HANDOFF.json` records the final
auditor's real PID/creation, exit and fully drained streams.

The coordinator must independently audit this capsule and decide any subsequent
outcome. This handoff does not mark the overall campaign complete.
