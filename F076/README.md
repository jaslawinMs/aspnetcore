# F076: Nested render-fragment attribute JSON roundtrip

**Duplicate of active existing work in dotnet/aspnetcore#68295.** Its immutable
head `9ca33ec5b0caa8ad1fd6e8b6ecddfe5671bc52dd` removes the explicit
JsonElement-to-string intermediate in this exact nested-fragment switch arm.
The proposal is OPEN, not merged. This does not mean the removal has shipped
or the broader proposal is approved.

No proposed source change, new benchmark project or additional draft was
manufactured. **Zero new measured comparisons.** F074 owner/materialization
measurements do not prove this different nested component-attribute case.

## Exact scope and source evidence

The actual current upstream default branch was verified as
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
In shared `RenderFragmentSerializer.DeserializeAttributeValue`, a serialized
RenderFragment-valued attribute selects:

```csharp
JsonElement je => JsonSerializer.Deserialize<SerializedRenderFragment>(je.GetRawText(), jsonOptions),
```

The active proposal at the frozen head selects:

```csharp
JsonElement je => JsonSerializer.Deserialize(
    je,
    jsonOptions!.GetTypeInfo(typeof(SerializedRenderFragment))) as SerializedRenderFragment,
```

The same explicit intermediate identified by retained F076 is absent in the
proposed arm. Both snapshots retain the already-materialized
`SerializedRenderFragment sf => sf` arm. This is distinct from F075's typed
component parameter conversion and F074's top-level fragment owner.

[Current-main owner](baseline-owner.cs),
[actual upstream owner](upstream-owner.cs),
[scoped existing diff](upstream-owner-diff.txt),
[retained finding](finding.json),
[owner history](owner-history.txt),
[immutable identities](provenance.json).
The API blob response is retained; decoded source bytes reproduce its Git
blob SHA and recorded SHA256. Native Git stdout supplies baseline bytes
without line-ending conversion.

The existing diff base is `66e8a029d94b5ce2af03c2c8f8023aba1f39a093`,
not the current-main snapshot above. The two full snapshots independently
establish this named seam. All 77 changed-file entries were retrieved on the
bounded API page; this evaluation is not a review of all those changes.

## Limitations and validation

This is source-only overlap, not a benchmark win, behavioral equivalence proof,
API approval or merge-readiness recommendation. The broader proposal also
changes JsonTypeInfo/options handling, including the option access shown above.
No assertion is made that those changes are equivalent to a minimal one-argument
optimization. Reassess if the active upstream work is closed without merge.

The independent tracking branch
`autoperf/F076-nested-render-fragment-deserialization-overlap` points at the
unchanged baseline. It contains no proposed source diff.

```powershell
node .\reproduce-overlap.mjs . --verify
```

Passed, exit 0. The executable audit reproduces source/API Git blob identity,
finding ID/path, the exact nested JsonElement arm and unchanged direct-DTO arm.
[Derived source audit](source-audit.json).
No new .NET tests or timing were run for this duplicate disposition; there is
no behavioral or performance validation claim for the upstream proposal.
