# F060: duplicate of F059 Razor section membership

**Disposition: duplicate.** F060 and F059 identify the same
`_renderedSections.Contains(sectionName)` followed by `Add(sectionName)` in
`RazorPage.RenderSectionAsyncCore`, not two independently fixable mechanisms.
F059 covers the complete producer, compatibility constraints and measurements.

| Identity | F059 | F060 |
|---|---|---|
| Card | `hashset-contains-before-add` | `hashset-contains-before-add` |
| Owning source | `src/Mvc/Mvc.Razor/src/RazorPage.cs` | Same |
| Scan range | 153-163 | 155-163 |
| Method and collection | `RenderSectionAsyncCore`, `_renderedSections` | Same |
| Proposed seam | Found-section membership/insertion probe | Same |

Freshly fetched upstream main is `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
The full actual original owning file is byte-identical to F059's frozen original,
SHA-256 `0173067DDEB3B959BDA6D8FBC6369CD65A8E6EE9D124EC6F9B884B1182CE76A8`.
The current method was read directly: one Contains-before-lookup/one Add pair
exists in the reported ranges. Different snippet formatting and incomplete
compatibility metadata do not make F060 a separate defect.

The independent `autoperf/F060-razor-section-duplicate` branch remains exactly at
that baseline. No second shipping change, harness, test suite, measurement or
empty draft PR is manufactured. F060 consumes **zero new comparisons**; F059's
three-pair budget stays closed.

Canonical proposal: [jaslawinMs/aspnetcore#65](https://github.com/jaslawinMs/aspnetcore/pull/65),
source commit `9c7435c42aec11fa09b4252a979919a5bfe0bd35`.
The actual open draft/head was re-read before this disposition.

Canonical immutable evidence:
[F059 complete report](https://github.com/jaslawinMs/aspnetcore/blob/9f58f7ba49aebb530b3c6dad7c2b3e484ae6bfda/F059/README.md),
[BenchmarkDotNet project](https://github.com/jaslawinMs/aspnetcore/blob/9f58f7ba49aebb530b3c6dad7c2b3e484ae6bfda/F059/harness/AutoPerf.Benchmarks.csproj),
and [all 110 source/test/raw/derived assets](https://github.com/jaslawinMs/aspnetcore/tree/9f58f7ba49aebb530b3c6dad7c2b3e484ae6bfda/F059).

Those reused observations are not newly collected F060 results: three pairs,
26 cases/156 outcomes/78 ratios/156 original contracts/312 workloads and the
139-file owner-only closure; final 371/371 and four individually expected unsafe
guard-removal failures. F059's unchanged no-sections improvement, volatile helper
case, ordinal fallback costs, no structural heap-saving claim and shared-machine
attribution limits remain applicable. The duplicated source signal does not
provide additional independent confidence.
