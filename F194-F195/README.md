# F194/F195: embedded-manifest test-helper materialization

**Two rejected workload-gate findings, not measured no benefit.** Both intermediate arrays exist in `TestEntry.GetFiles`, a nonshipping test helper. The real test-assembly/manifest/provider path was reached and characterized, but no material fixture construction frequency or size was established. No candidate, benchmark, performance PR, or new browser window was authorized. Each original finding's budget is permanently closed **0 of 3**.

| Finding | Target | Classification |
|---|---|---|
| F194 | Direct-file `Where(...).ToArray()` before concatenation, `TestEntry.cs:34` | Validation infrastructure; material workload unestablished |
| F195 | Recursive-directory `SelectMany(...).ToArray()` before concatenation, `TestEntry.cs:35` | Validation infrastructure; material workload unestablished |

| Artifact | Direct evidence |
|---|---|
| Decision and individual budgets | [Acceptance](coordinator-acceptance.json), [two closed budgets](closed-budgets.json) |
| Exact unchanged source and actual producer consumer | [TestEntry](owner-handoff/documents/Original-Microsoft.Extensions.FileProviders.Embedded.Tests/008-TestEntry.cs), [TestAssembly](owner-handoff/documents/Original-Microsoft.Extensions.FileProviders.Embedded.Tests/009-TestAssembly.cs), [common consumer](owner-handoff/documents/Common-Consumer/001-Program.cs) |
| Native test names, every theory row, commands/results | [Selection](owner-handoff/evidence/NATIVE-SELECTION.json), [commands](owner-handoff/COMMANDS.json), [results](owner-handoff/RESULTS.json), [independent System.Xml reconciliation](coordinator-independent-system-xml.json) |
| Full source/image/runtime provenance | [Metadata and raw documents](owner-handoff/metadata.json), [input inventory](owner-handoff/input-inventory.json), [owner handoff](owner-handoff/HANDOFF.md) |
| Preparation failures and external sealing history | [Owner closing files](owner-closing), [external Node attempts](owner-node-attempts), [external sealing attempts](owner-seal-attempts), [original seal](owner-closing/SEALED-HANDOFF.json) |
| Fresh offline checks and copy bindings | [Verifier](verify.mjs), [reference audit](coordinator-portable-audit.json), [authoritative copies](authoritative-copies.json) |

The fork tracking issue and immutable evidence commit are recorded in `publication.json` after publication and linked from the campaign index. The nested handoff's `PENDING` values describe the owner's preparation stage, not this final coordinator decision. The fixed `REPORT.md` snapshot remains unchanged.

## What actually matters about the arrays

`GetFiles` returns no descendants for a file node. For a directory it currently returns a **fully eager array snapshot**, with direct files first in input order, then recursively flattened directories in directory input order. The snapshot retains references to the original file objects: replacing an input-array member does not replace a saved member, but changing that saved object's resource path is observable. The separately labeled deliberately invalid helper inputs throw before an enumerable is returned; these are not normal public-provider scenarios.

The actual `TestAssembly(TestEntry)` constructor first writes the XML manifest, then calls `GetFiles` and snapshots resource-path **strings**. Its XML retains the original child order, which differs from the flattening order. The real public `ManifestEmbeddedFileProvider` parses that manifest and opens the test assembly's actual resource streams. These streams are the native fixture's empty `Stream.Null` resources, not production embedded file contents.

Deleting one intermediate array is not asserted to preserve all this behavior or produce useful savings. Neither a changed implementation nor a representative material workload was tested.

## Requirement coverage

Both source roles passed these **12 common-consumer cases**, using one successfully compiled, unchanged common consumer DLL:

| Requirement | Evidence |
|---|---|
| File terminal, empty directory, singleton object identity | `helper-file-terminal`, `helper-empty-directory`, `helper-singleton` |
| Mixed files/directories, empty child, depth-three recursion and exact flattening/XML order | `helper-mixed-nested-order` |
| Eager shallow membership/reference snapshot | `helper-shallow-membership-snapshot` |
| Invalid direct-helper null-array, null-child and malformed-descendant exception timing | `helper-null-children-eager-exception`, `helper-null-child-eager-exception`, `helper-invalid-descendant-eager-before-any-result` |
| Actual TestAssembly constructor, manifest parse, public provider and real fixture streams | `provider-empty-root`, `provider-singleton-resource`, `provider-mixed-nested-manifest-and-resource-order` |
| Already-created XML and resource-string snapshots survive later public helper-input mutation | `provider-snapshot-after-helper-input-mutation` |

Two actual native TRXs passed **22 executions, 11 case-sensitive cases from 10 methods**. Each casing-theory row passed in both roles, independently reconciled through System.Xml definitions, execution IDs, entries, assembly paths, exact names and every counter:

```text
folder: "WWWROOT", file: "JQUERY.VALIDATE.JS"
folder: "WwWRoOT", file: "JQuERY.VALiDATE.js"
```

Original is `37e809ead5824bc753a1c3d56f11615bdb1296c5`; the whole independently observed entry default actually built/tested is `e26532d156ed19f66c88aca8f4374e081bcd5d72`. The target blob also matches coordinator observation `d3483989953ae3cccd773aea5ea04cb0c7198531`; no whole-later-default test is claimed. Assertion runtimes are Original **62.105** and Default **69.107**, distinct from SDK/VSTest **57.102** and sampled hostfxr **65.104**. These are source/runtime characterizations, not causal performance pairs.

## Provenance and limits

The permission-bounded offline audit freshly verifies **five PE/portable-PDB associations, all 70 selected raw document checksums, and 90 Git memberships through 75 raw objects**. The unchanged owner payload is **563 files / 173,003,876 bytes**; the enclosing capsule, including its two manifest files, is **565 files / 173,121,037 bytes**. The additional outer failed sealing/audit histories and coordinator observations are copied separately.

**Both native testhost exit hooks are absent and their exit codes remain unknown.** SDK runner exits and saved native XML do not substitute for those missing observations. Test/product MVIDs were freshly parsed from PE files and observed by managed reflection in the separately identified common consumers, not falsely attributed to the native testhost's early startup sample. Sixteen saved roots have actual exits and drained streams; 65 final observed PID/creation checks found no matching recorded owner. That is not exhaustive short-lived process history or unrelated-user inactivity.

Missing generated imports, targeting/prune metadata and initial common-consumer assets; the corrected PDB deterministic-checksum assumption; the zero-output Tee-Object/assembly failure; and external failed auditor/sealing attempts remain preserved. Native package/framework/project names were not migrated. `net472`, unselected native tests, production fixture prevalence, concurrency, candidate equivalence, allocation savings, performance, and complete SDK/compiler/runtime/OS replay closure are unverified.
