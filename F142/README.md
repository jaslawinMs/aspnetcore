# F142: parameter-array reuse - inconclusive measurement isolation

**Inconclusive, not a verified optimization or performance PR.** The fixed primary shows **168 B/op (7.3943%) less reported allocation** in all three comparisons: 2272.00768 -> 2104.00768. However, the final image audit found that the common measurement DLL/PDB differ despite identical source inputs. The pre-timing verifier incorrectly excluded all AutoPerf.F142.* files from the identity comparison, missing this required common-harness check. **Full qualification fails.** This is recorded as `no-gain` / `measurement-identity-inconclusive`, not proof that the proposed optimization has no benefit.

The [final identity adjudication](final-qualification.json) supersedes only the earlier numerical qualification, not its raw observations. Paired elapsed differences are **3.6334% / 4.6695% / 4.4260%**, median **4.4260%**. The numerical allocation alternative passes, the 10% time gate fails and all six numerical controls pass. **No performance PR; the three-authorization budget remains permanently closed.** A later untimed common-harness reconstruction cannot repair the historical timing.

## Connected artifacts

| Artifact | Link | Meaning |
|---|---|---|
| Exploratory source, not a performance proposal | [Exact final commit](https://github.com/jaslawinMs/aspnetcore/commit/81222347869a8c7dcd504f22b2234f9a126265f4), [fork branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F142-reuse-xml-operation-method-parameters) | Parent 37e809; one local array plus lookup-receiver replacement, and 17 mechanically dependent golden snapshots |
| Shipping seam | [Emitter](https://github.com/jaslawinMs/aspnetcore/blob/81222347869a8c7dcd504f22b2234f9a126265f4/src/OpenApi/gen/XmlCommentGenerator.Emitter.cs), [measured/final source identity](source-qualification.json) | Measured c663c44; final commit changes only expected test snapshots, not the measured emitter |
| Actual document producer | [Fixture](harness/owner/DocumentFixture.cs), [seven exact assertions](harness/probe/Program.cs) | Real generated AddOpenApi, endpoint/ApiExplorer, registered document provider and fully awaited serialization |
| Runnable benchmark source | [Project](harness/measurement/AutoPerf.F142.Measurement.csproj), [measurement/verification](harness/measurement/Program.cs), [actual captured workload](harness/measurement/OperationWorkload.cs) | Warm real generated transformer, not a handwritten reflection substitute |
| Acceptance and image-check defect | [Pre-timing plan](plan.json), [plan seal](plan-seal.json), [historical accepted images](accepted-images.json), [final image audit](final-qualification.json) | 133 non-fixture dependencies identical, but broad fixture exclusion missed different common measurement DLL/PDB |
| All measurements | [Historical numerical decision](measurement-decision.json), [first](comparisons/001/result.json), [second](comparisons/002/result.json), [third](comparisons/003/result.json) | 42 serialized native measurement children, 15 samples each: all 630 raw observations retained, not an owner-isolated verified gain |
| Correctness and exact commands | [Original](canonical-preflight-005/Original/commands.json), [default](canonical-preflight-005/Default/commands.json), [candidate](canonical-candidate-001/Candidate/commands.json), [validation guide](validation-commands.md) | Seven full documents and seven untimed setup rows on each source role; no skipped profiles |
| Existing source-generator suite | [Exact XML row audit](existing-tests/exact-row-verification.json), [expected snapshot changes](existing-tests/snapshot-update-001/update.json) | Same 25 exact tests pass on original/candidate; all 17 initial snapshot-only failures retained |
| Fresh untimed reconstruction | [Receipt](reconstruction-paired-001/verified-reproduction.json), [exact copied project](reconstruction-paired-001/project/AutoPerf.F142.Measurement.csproj), [parameterized helper](executed-drivers/F142-reconstruct-untimed.ps1) | Three identical common-project inputs rebuilt; both measured owner images verified, seven rows each; zero extra timing |
| Exclusive timing/lifecycle | [Actual gate events](actual-exclusive-gateway-events.json), [worker hold/process audit](local-quiescence-001.json), [native reader correction](lease-interop-probe-001/result.json) | Both local workers held; all known native children terminal; global named mutex and retained lease; no overlapping benchmark |
| Failure history and copies | [Original failed preparation](canonical-preflight-003/Original/commands.json), [input seal](harness/input-seal.json), [copied authority](authoritative-copies.json), [omissions](omitted-file-hashes.json) | Earlier failed setup remains; binary/restore graphs hashed, not shipped |
| Portable historical audit | [Auditor](F142-verify.mjs), [XML parser](F142-audit-trx.ps1), [immutable core manifest](capsule-file-hashes.json) | Rechecks copied bytes, raw arithmetic, fixed gates and every existing test row without timing |
| Tracking issue and inconclusive disposition | [Additive publication record](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F142/publication.json) | Added after the immutable core is verified remotely; no PR or new browser window for this unqualified result |

## Correctness boundary of the exploratory change

The original generated loop calls GetParameters for every XML parameter comment, then SingleOrDefault scans the resulting complete array by name. The change obtains that same method's array once **inside the existing nonempty-comment guard** and preserves the exact predicate, name/alias handling, ignored-parameter checks, request-body fallback, examples and all other branches. No dictionary, changed name comparer, global reflection cache or cross-transform metadata lifetime is introduced. Undocumented and zero-comment paths still avoid this new local array.

The original card is informational and lives in a generated test snapshot. This study follows that snapshot back to its actual emitter and executes the emitted runtime transformer. F143/F144 were already finalized as exact aliases in the separate [alias capsule](../OpenApiXmlCommentAliases); this canonical result is one finding, not three new improvements.

## All secondary outcomes

These are retained numerical observations, not owner-isolated verified gains. They are medians of the three **paired** percentages, not percentages computed from separately aggregated elapsed medians. Negative less-time means slower.

| Profile | Original B/op | Candidate B/op | Paired median less-time | Interpretation |
|---|---:|---:|---:|---|
| Undocumented | 1280 | 1280 | -0.7749% | No allocation change; slight adverse elapsed observation retained |
| Zero | 824 | 824 | -0.9650% | Guard remains empty |
| One | 1104.00384 | 1104.00384 | -0.1132% | No repeated array to remove |
| Aliased | 1296 | 1296 | +0.2323% | Existing model-name alias preserved |
| Ignored | 1712.01824 | 1672.01824 | +1.9534% | 40 B/op saved; CancellationToken still omitted, no manufactured body |
| Body | 1696.0192 | 1696.0192 | +1.6386% | Real request-body documentation preserved |

The third Ignored comparison's +12.3760% is a secondary observation, not the primary or a substituted qualification. No specific JIT/environmental explanation is assigned to variability.

## Environment and limits

- Original 37e809ead5824bc753a1c3d56f11615bdb1296c5; live default checked before implementation ae89581dfd24c6277b4267a9779d05f7b9f047f1. Default emitter Git text matched original.
- SDK 12.0.100-alpha.1.26557.102; actual measured x64 runtime 12.0.0-alpha.1.26565.104; C# 13. Both versions ran on the same coordinator hardware/runtime/inputs, orders O->C, C->O, O->C.
- Process-only tiered-compilation disabling was pinned before first timing for both roles. No machine-wide setting, power, affinity or priority change. Shared Windows environment, not a dedicated isolated benchmark machine.
- Per child: 20,000 warmups, 15 retained samples, 50,000 synchronously completed actual transforms per sample; Stopwatch timestamps and same-thread allocated-byte counts. Full producer setup/hash checking and final operation checks are outside the measured loop.
- The workload retains an actual operation/context from one real provider execution, then invokes the actual emitted transformer. The affected code uses its description/metadata, not a disposed service scope. This is a warm isolated-transformer boundary, **not** repeated whole-document generation.
- Existing source-generator XML tests requested installed runtime 12.0.0-alpha.1.26562.105. Their known helper does not fully await one provider path; the separate canonical checks do and assert all seven documents. Do not equate 25 green snapshot tests with extra end-to-end coverage.
- Selected source/image/runtime identities are retained; this is not full compiler-input or loader attestation. Fresh reconstruction rebuilds the exact common harness and reuses measured generated-owner/dependency images. Turnkey byte-identical fresh-clone rebuilding is not promised.
- Both 144-file measured images were independently rehashed. Six files differ: generated-owner DLL/PDB, characterization DLL/PDB and measurement DLL/PDB. Identical measurement source does not establish identical measured harness bytes. The earlier broad fixture exclusion was an acceptance-check defect, not permission to relax the frozen requirement after timing. No post-timing rerun, source tuning or primary substitution is allowed.
- Failed preparations include command/reference setup and initially private handlers omitted by the actual generator visitor. Fixture accessibility was corrected before candidate/timing; assertions were not weakened. Native lease-reader interoperability was fixed and checked before any comparison authorization.
- No AOT/trimming, declared runtime 12.0.0-alpha.1.26568.110, native/browser, deployment/packaging, cold-start, broad workload frequency or merge-readiness claim. No new public/protected framework API.

## Run and audit

The projects require an already built matching source dependency closure, the repo-local SDK/runtime and an isolated fresh output path. `harness\Invoke-Characterization.ps1` accepts explicit source root/revision/dependency closure and `-PrepareMeasurement`; it rebuilds the generator and executes **verify only**. See its actual recorded commands and [validation guide](validation-commands.md).

The parameterized reconstruction helper consumes complete prepared attempts; omitted compiled images must be supplied or rebuilt. Historical `executed-drivers` preserve the exact host-specific commands, not a promise that their original absolute paths work on another machine.

```powershell
node .\F142-verify.mjs . --require-seal
```

Requires Node and PowerShell 7 for XML parsing. This audits the historical capsule without restoring an SDK or measuring again. **Never reopen or replay the consumed three-authorizations budget.** The classified root REPORT.md remains its fixed 118-finalized snapshot.
