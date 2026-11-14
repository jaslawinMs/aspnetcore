## Background and Motivation

<!--
We welcome API proposals! We have a process to evaluate the value and shape of new API. There is an overview of our process [here](https://github.com/dotnet/aspnetcore/blob/main/docs/APIReviewProcess.md). This template will help us gather the information we need to start the review process.
First, please describe the purpose and value of the new API here.
-->

This **fork-only convention proposal** accompanies AutoPerf F107; no new
signature or public type is requested. GetFiles currently returns a fresh
mutable List even when no multipart field name matches. The existing declared
IReadOnlyList result can instead use shared empty array storage, avoiding one
32-byte allocation per missing-name query. The review question is whether to
accept that empty-result runtime type/identity/mutability change, not whether
to add another query API. Nonempty results remain fresh mutable Lists.

**Inputs**

- [x] Originating issue: [jaslawinMs/aspnetcore#27](https://github.com/jaslawinMs/aspnetcore/issues/27), complete body and all zero comments read.
- [x] Implementation: [1dad2006f241e932236425bd869293a2156e348a](https://github.com/jaslawinMs/aspnetcore/commit/1dad2006f241e932236425bd869293a2156e348a), three files +215/-2; all public/convention changes accounted for below.
- [x] Implementation draft: [jaslawinMs/aspnetcore#29](https://github.com/jaslawinMs/aspnetcore/pull/29), remotely verified OPEN/draft with that exact source, description and three-file scope.

The existing API serves server apps querying multipart-upload field names;
optional/missing fields are valid but their production frequency is unknown.
Six measured setups use actual Request.ReadFormAsync/FormFeature-produced
collections. Query/setup evidence is not multipart-parser or hosted HTTP
throughput. In one 23-case/N=8 pair, four tiny empty/one-file-miss queries improve
60.78-65.00%, and all nine no-match cases remove 32 B/op. Eleven nonempty and two
source-unchanged control regressions remain in the
[pinned full report](https://github.com/jaslawinMs/aspnetcore/blob/ee72732230d406cf9364ce6e98ebb421e7639a7d/F107/README.md).

Proposed champion: **jaslawinMs**, the fork/campaign owner. Meeting attendance
is not confirmed; no upstream review or team notification is scheduled.

## Usage Examples

<!--
Please provide code examples that highlight how the proposed API additions are meant to be consumed.
This will help suggest whether the API has the right shape to be functional, performant and useable.
You can use code blocks like this:
```csharp
// some lines of code here
```
-->

Consumption of the declared read-only query remains unchanged:

```csharp
var form = await httpContext.Request.ReadFormAsync(cancellationToken);
IReadOnlyList<IFormFile> attachments = form.Files.GetFiles("attachments");
foreach (var attachment in attachments)
{
    using var body = attachment.OpenReadStream();
    await body.CopyToAsync(destination, cancellationToken);
}
```

An absent field yields zero items on both sides. Code depending on a mutable
List downcast or a fresh empty object is deliberately not an equivalence claim.

## Proposed API

<!--
Please provide the specific public API signature diff that you are proposing. For example:
```diff
namespace Microsoft.AspNetCore.Http;

public static class HttpResponseWritingExtensions
{
+    public Task WriteAsync(this HttpResponse response, StringBuilder builder);
}
```
You may find the [Framework Design Guidelines](https://github.com/dotnet/runtime/blob/main/docs/coding-guidelines/framework-design-guidelines-digest.md) helpful.
-->

The ref-assembly diff has **no signature additions/removals**; unchanged
affected surface is shown as context. No PublicAPI.Unshipped entry is added.

```diff
 namespace Microsoft.AspNetCore.Http;

 public interface IFormFileCollection : IReadOnlyList<IFormFile>
 {
     IFormFile? this[string name] { get; }
     IFormFile? GetFile(string name);
     IReadOnlyList<IFormFile> GetFiles(string name);
 }

 public class FormFileCollection : List<IFormFile>, IFormFileCollection
 {
     public FormFileCollection();
     public IFormFile? this[string name] { get; }
     public IFormFile? GetFile(string name);
     public IReadOnlyList<IFormFile> GetFiles(string name);
 }
```

The sole convention change is for zero matching files: fresh mutable List
becomes a shared empty array. Exact actual runtime-type/identity/IsReadOnly
probes are [published](https://github.com/jaslawinMs/aspnetcore/blob/ee72732230d406cf9364ce6e98ebb421e7639a7d/F107/empty-result-convention.json).
Original file references/order, case-insensitive name matching, getter/error/
mutation detection, read-only snapshot contents and nonempty List behavior
remain covered by 15 new passing original/final rows.

## Alternative Designs

<!--
Optional. Were there other options you considered, such as alternative API shapes?
How does this compare to analogous APIs in other ecosystems and libraries?
Use N/A when there are no alternative designs to document.
-->

Keep fresh empty Lists to preserve the concrete convention, retaining the
allocation. A shared mutable List is inappropriate because a caller could
alter future missing-name query results. An opt-in overload/policy could
preserve the old convention, but would introduce new surface outside this
small implementation proposal. If concrete-empty compatibility is required,
decline this optimization rather than silently change the signature.

## Risks

<!--
Optional. Please mention any risks that to your knowledge the API proposal might entail, such as breaking changes, performance regressions, etc.
Use N/A when there are no risks to document.
-->

Callers depending on the old runtime List type, mutable downcasts, or distinct
empty-object identities can observe a change despite the unchanged declared
read-only contract. Do not describe those callers as validated. Nonempty Lists
remain fresh/mutable and their source/result isolation is tested.

This is one pair on a shared Windows host: eleven nonempty cases are
0.29-3.18% slower and unchanged GetFile controls are +22.89%/+4.36%; no cause
or repeatability is asserted. Production miss frequency and complete hosted
throughput are unmeasured. Five pre-existing Unix-socket rows are Windows-
skipped, not passing F107 evidence.

This fork proposal is **not api-approved**, does not authorize an RTM release,
and is not an upstream submission. Before RTM inclusion, an issue champion
must drive the upstream API/convention process and obtain approval covering
the final result convention; no api-ready-for-review/team notification is
being applied by this draft campaign.

## Source justifications

Fresh empty allocation: "FormFileCollection.GetFiles eagerly creates a List even when no names match." (originating issue)

Purpose/inputs: "Uploaded file names come from multipart Content-Disposition; optional/missing-name queries are valid, but their production frequency is unknown." (originating issue)

Measured benefit: "Four constructed/actually parsed empty or one-file-miss queries improve 60.78-65.00%. All nine no-match results remove 32 B/op (32 -> zero)." (originating issue)

Empty convention: "the actual no-match result changes fresh mutable List -> shared empty array." (originating issue)

Declared/nonempty shape: "Read-only snapshot contents, original file identity/order, ordinal-ignore-case comparisons, getter/errors/mutation detection and fresh mutable nonempty Lists are retained." (originating issue)

Concrete alternative: "keep fresh empty Lists to preserve the concrete convention (but retain the allocation)" (originating issue)

Mutable alternative: "share a mutable empty List (would allow result mutation to corrupt future empty queries)" (originating issue)

Opt-in alternative: "add an opt-in overload/policy (new API surface, outside this three-line optimization)" (originating issue)

Validation: "Original/final Http: 346 passed/five same existing Windows-skipped Unix socket rows; all 15 new focused rows individually pass." (originating issue)

Limits: "No hosted HTTP, multipart-parser, MVC/minimal-API default-path, browser or production prevalence claim." (originating issue)

Champion: "Proposed convention-review champion: jaslawinMs, the fork/campaign owner; meeting attendance is not confirmed and no upstream review is scheduled." (originating issue)

Implementation: `List<IFormFile>? files = null;`, `files ??= new List<IFormFile>();`, `return files is not null ? files : Array.Empty<IFormFile>();` (implementation commit)
