# F107 acceptance before product edits

Baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`, freshly fetched.
Independent branch: `autoperf/F107-form-file-empty-results`.
Scope: only `FormFileCollection.GetFiles`.

The current method creates a List before checking any names. Preserve the
declared read-only snapshot result, ordinal-ignore-case comparisons, original
file references/order, per-query snapshots, every Name getter invocation,
exception identity and enumeration mutation detection. Preserve the existing
fresh mutable List implementation for nonempty results. Do not cache input
collections or names, add static metadata caches, or modify GetFile/indexer.

Test the original code with the new compatibility tests before changing product
code. A before/after compatibility pass is not functional bug-fix red/green.
Use the real public query on actual FormFiles; include collections produced by
actual Request.ReadFormAsync/FormFeature multipart parsing. Validate full file
identity/order/name/filename/length/body and source/result snapshot independence
outside timing. No directly injected FormFeature output is producer evidence.
Moq getter/error probes are untimed and cover the actual query enumeration.

Compare identical BenchmarkDotNet harness/runtime/dependency configurations and
immutable original/changed binaries. Only Microsoft.AspNetCore.Http.dll may
differ; preserve original capture state plus final source hashes. Include empty,
no-match, first/last/mixed/all matches, small/large and parsed collections, plus
unchanged GetFile controls. Preserve all regressions and unexplained variance.
At most three measured pairs, tuning between comparisons when justified; stop
early for a clear large gain. No supported gain or a compatibility failure means
no-gain/rejected rather than a manufactured optimization PR.

Formatting, all focused rows and the containing Http suite must pass. Only the
source and directly related tests may be committed. No host setting, SDK/Node/
NuGet manifest, new framework IVT/UnsafeAccessor or unrelated cleanup changes.
Default MVC/minimal-API consumer coverage is not inferred from an incomplete
reference index: claim only the actual query and parsed-file boundary, not
hosted HTTP, multipart parser throughput or production no-match frequency.

## Public surface judgment

**Looks good as proposed**: retain the existing declared shape, no API added.

**Need assessment:** server-rendered/server API apps query uploaded files by
field name from multipart Content-Disposition. Optional/missing fields are a
valid end-app use; their frequency is workload-dependent, not demonstrated here.
The method is also directly callable in library/console tests; it does not
itself provide browser uploads or networking. Existing happy-path read-only
query surface is justified; no new overload/configuration/extensibility surface
is needed for allocation behavior.

### Microsoft.AspNetCore.Http.FormFileCollection

No declared shape changes.

```diff
 public class FormFileCollection : List<IFormFile>, IFormFileCollection
 {
     public IReadOnlyList<IFormFile> GetFiles(string name);
 }
```

The interface documentation explicitly returns IReadOnlyList, not a mutable
List. Shared empty storage follows that declared contract. However, a no-match
result would change from a fresh mutable List to a shared empty array: runtime
type, object identity and unsupported mutable downcasts differ. This boundary
must be reported and is deliberately excluded from "identical concrete result"
claims; nonempty mutable List results remain unchanged. Do not silently change
the signature or characterize arbitrary downcasting callers as validated.
