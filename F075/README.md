# F075: Typed component parameter JSON roundtrip

**Duplicate of active existing work in dotnet/aspnetcore#68295.** Its immutable
head `9ca33ec5b0caa8ad1fd6e8b6ecddfe5671bc52dd` removes the explicit
JsonElement-to-string intermediate at this exact typed-parameter seam.
The proposal is OPEN, not merged. This disposition is not a claim that the
allocation removal has shipped or that the entire proposal is approved.

No proposed source change, new benchmark project or additional draft was
manufactured. **Zero new measured comparisons.** F074 measurements are not
reused as evidence for a different typed-parameter path.

## Exact scope and source evidence

The current upstream default branch was verified as
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
In `ComponentParameterDeserializer.TryDeserializeParameters`, the non-null
typed branch takes an existing JsonElement and calls:

```csharp
parameterValue = JsonSerializer.Deserialize(
    value.GetRawText(),
    parameterType,
    ServerComponentSerializationSettings.JsonSerializationOptions);
```

The active proposal at the frozen head instead calls:

```csharp
var typeInfo = _jsonOptions.GetTypeInfo(parameterType);
parameterValue = JsonSerializer.Deserialize(value, typeInfo);
```

That is the same explicit intermediate-allocation opportunity identified by
retained finding F075. It is not the top-level SerializedRenderFragment F074
branch: the active upstream owner still contains GetRawText at that branch.
F076 concerns a different shared nested-attribute seam.

[Current-main owner](baseline-owner.cs),
[actual upstream owner](upstream-owner.cs),
[scoped existing diff](upstream-owner-diff.txt),
[retained finding](finding.json),
[owner history](owner-history.txt),
[immutable identities](provenance.json).
The actual API blob response is retained; decoded source bytes reproduce its
Git blob SHA as well as the recorded SHA256. Native Git stdout supplies the
current-main snapshot without line-ending conversion.

The existing PR diff base is `66e8a029d94b5ce2af03c2c8f8023aba1f39a093`,
not the current-main snapshot above. Independent full source snapshots
establish the named seam on both. All 77 changed-file entries were retrieved
on the bounded API page; only this owner/seam was assessed for F075.

## Limitations and validation

This is a source-only existing-work disposition. It does not assert a speedup,
allocation count, full behavior equivalence, API approval or merge readiness.
The broader proposal also changes serializer metadata/options ownership.
Those changes are not proposed or endorsed by this evaluation. Reassess this
disposition if that active work is closed without being merged.

The independent tracking branch
`autoperf/F075-typed-parameter-deserialization-overlap` points at the unchanged
baseline. It contains no source proposal and therefore no invented PR diff.

```powershell
node .\reproduce-overlap.mjs . --verify
```

Passed, exit 0. The executable audit reproduces source/API Git blob identity,
finding ID/path, the exact typed seam and the distinct retained F074 string
intermediate. [Derived source audit](source-audit.json).
No new .NET test or timing was run for this duplicate disposition; it does not
provide behavioral or performance validation of the upstream proposal.
