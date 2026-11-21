# F192 / F193 / F196: bounded source-qualified materialization assessments

These are source-only **no-candidate** dispositions, not measured no-gain results or proof that every alternative is unhelpful. No product/test source, private graph, native workload, performance comparison or performance PR was created.

| Finding | Actual source boundary | Why no candidate was retained |
| --- | --- | --- |
| F192 | Normal enabled tracked installer GUID producers supply two or three scalar items under the captured definitions. This is not an evaluated MSBuild cardinality or observed task-host type. | Removing `ToArray` trades specialized known-count projection and exact-size array joining for iterator/builder joining. No useful improvement is established for those installer-only inputs. |
| F193 | The test-asset DELETE action joins request-header values. Array-backed `StringValues.ToArray()` reuses its array; scalar backing creates one element. The existing browser test configures two individual custom headers, but actual wire/header counts and normalization were not observed. | Scalar materiality is unestablished. `StringValues.ToString()` changes general empty/null multi-array delimiter semantics; that is source contract analysis, not a reproduced wire regression. Bare removal is not assumed to select an enumerable overload. |
| F196 | The test/sample owns 67 fixed tags. The existing Index source selects 20, 15 and 20; static consistency with the checked-in expected HTML was verified, not rendering or HTTP execution. | Enumerable joining has a different implementation path. A normalized array-range join is another source possibility, but neither establishes material justification on the real bounded scenario. No snapshot-mutation bug is claimed. |

Original is `37e809ead5824bc753a1c3d56f11615bdb1296c5`; independently observed upstream Default is `d3483989953ae3cccd773aea5ea04cb0c7198531`. The reserved checkout and fork main are not substituted for Default.

## Evidence and limits

- Complete owner handoffs: [F192](evidence/F192/HANDOFF.json), [F193](evidence/F193/HANDOFF.json), [F196](evidence/F196/HANDOFF.json).
- Assessments: [GUID producer/join paths](evidence/F192/source-analysis.json), [header producers and semantics](evidence/F193/PRODUCER-SEMANTICS.json), [tag producer, lifecycle and alternatives](evidence/F196/ANALYSIS.json).
- [Complete copied evidence inventory](evidence-index.json) includes failed interpreter launches, source/audit corrections, limitations, command streams, empty diffs and coordinator byte-integrity receipts.
- [Raw ASP.NET Core commit/tree/blob memberships](source-membership.json) bind complete captured source bytes. External dependency/reference source has separately verified content fingerprints, not an archived external commit/tree closure or an observed loaded image.

F192's MSBuild/runtime source is tied to captured installed-version metadata, **not an executed task host**. F193's dependency revisions are declared source pins, **not selected package/CLR observations**. F196's five supporting `dotnet/runtime` files are at observed main `1078913f561abffd961345666c3126b42f4afc68`, **not identified with the installed SDK or either executing source role**. None of these source records proves runtime cost, universal immateriality or output equivalence of a hypothetical candidate.

No automated test was scheduled after these source gates; no blocked prerequisite is represented as a passing test. The fixed historical `REPORT.md` is unchanged. No new browser window or comparison authorization follows.

## Verify offline

With Node.js, run from this directory:

```text
node verify.mjs .
```

Add `--require-seal` after publication. The verifier checks the complete copied inventories, owner seals, raw Git memberships, exact source captures, external-source fingerprints, source-check records and explicit no-candidate/no-native boundaries. It does not execute MSBuild, HTTP, Razor, a browser or product code.
