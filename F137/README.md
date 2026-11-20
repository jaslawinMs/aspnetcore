# F137: informational precompiled-view initialization modernization

**No performance proposal admitted; zero comparisons and no source change.** The `ContainsKey` followed by `Add` in `RuntimeViewCompiler` is a real repeated dictionary probe. It occurs while the retained runtime compiler initializes precompiled views, **not on each rendering operation**. Replacing it with the existing `TryAdd` API is a possible cold-initialization modernization, but this study did not establish a material startup/resource workload or measure a benefit.

Classification is `rejected` / `cold-initialization-modernization-unestablished`: an admission/prioritization outcome, **not a false-positive mechanism, measured no-gain, zero-cost or proof that `TryAdd` cannot help**. Keep-first precedence and key-comparer behavior are contract-sensitive; no substitution was applied or claimed verified.

## Connected artifacts

| Artifact | Link | Outcome / scope |
|---|---|---|
| Coordinator scope/disposition | [Acceptance](coordinator-acceptance.json), [closed zero-comparison budget](closed-budget.json) | Original 3,998-file / 364,216,896-byte payload independently rehashed; no candidate or timing |
| Actual completed owner envelope | [Final additive handoff](owner-handoff/seal-finalization-002/handoff.json), [full original manifest](owner-handoff/seal-finalization-002/frozen-files.json), [owner verification](owner-handoff/seal-finalization-002/verification.json), [independent coordinator verification](coordinator-whole-payload-verification.json) | Exact final manifest `62e19cad...`; earlier failed aggregate-byte seal preserved, not repaired in place |
| Real producer, source, lifecycle and exclusions | [Original handoff](owner-handoff/handoff.json), [acceptance](owner-handoff/acceptance.json), [requirements](owner-handoff/evidence/requirement-coverage.json), [failed attempts](owner-handoff/evidence/failed-attempts-and-boundaries.json) | Registered metadata/feature/provider/compiler path and actual Razor view rendering; constructor initialization is not per-render insertion |
| All real accepted contract cases | [Original main observations](owner-handoff/results/original-complete/producer.json), [default main observations](owner-handoff/results/default-complete/producer.json), [Original supplemental edge](owner-handoff/results/original-empty-edge/producer.json), [default edge](owner-handoff/results/default-empty-edge/producer.json) | 17 original probe rows pass plus one supplemental passing edge per role: **18 accepted cases / 101 valid checks per role**, not 18 original passes |
| Existing exact repository theory rows | [Original XML](owner-handoff/results/original/existing.trx), [default XML](owner-handoff/results/default/existing.trx), [Original parsed identities](owner-handoff/results/original/existing-tests-parsed.json), [default identities](owner-handoff/results/default/existing-tests-parsed.json), [independent XML parser](audit-native-xml.ps1) | Ten exact passed rows per pin, all theory parameter values reconciled by name and execution/test IDs |
| Complete image and common-once evidence | [All image maps and gate/self-tests](owner-handoff/evidence/complete-image-audit.json), [all 3,592 individually hashed omitted image files](omitted-image-hashes.json) | 28 shared consumer/fixture/edge/overlay files unchanged; **367 non-owner differences plus runtime mismatch reject causal pairing**, no fixture-prefix exception |
| Selected loaded owner provenance | [Original selected identities](owner-handoff/results/original-complete/producer.json), [default identities](owner-handoff/results/default-complete/producer.json) | Four actual loaded owner PE/PDB/raw-source associations per role; selected historical receipts, not complete compiler-input attestation |
| Exact native commands and terminal state | [Historical command helper](owner-handoff/commands/Common.ps1), [all 65 native-command receipts and 444 process observations](owner-handoff/evidence/native-process-terminal-audit.json), [host/runtime audit](owner-handoff/evidence/native-host-resolution-audit.json) | All observed owned native work terminal; observer does not claim exhaustive discovery of transient children |
| HOLD/RELEASE and failed seal | [Actual hold](owner-handoff/evidence/hold-F145-001.json), [release](owner-handoff/evidence/release-F145-001.json), [sealing attempts](owner-handoff/seal-finalization-002/sealing-attempts.json), [unchanged failed first seal](owner-handoff/frozen-files.json) | No native work after hold/release; finalization metadata-only, failure not waived |
| Copy integrity, audit and final linkage | [Copied hashes](authoritative-copies.json), [portable historical auditor](verify.mjs), [immutable core](capsule-file-hashes.json), [additive verified publication](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F137/publication.json) | Closed tracking issue; no performance PR/new window; fixed classified report unchanged |

## What the real producer establishes

Assembly `RazorCompiledItem` attributes reach `CompiledRazorAssemblyPart` / `RazorCompiledItemLoader`, the registered `ApplicationPartManager` feature provider, real `CompiledViewDescriptor`, registered `RuntimeViewCompilerProvider`, compiler constructor, `CompileAsync` and real `RazorView` rendering. No private dictionary field injection is used.

The observations establish unique views, exact/case/slash-normalized duplicate precedence and reverse-order winners, survival of unrelated views, Turkish-culture ordinal-ignore-case behavior, same-part duplicate rejection, invalid metadata rejection, wrong-page-type rejection and compile-path argument behavior. Null descriptor/null-path controls use a registered **custom public feature provider**, not ordinary assembly metadata; they are labeled separately.

The original main probe incorrectly expected the empty compile path to fail in normalization. `EmptyCompilePath_NormalizerRejects` remains a failed row and its exit 1 is retained. A separately compiled-once additive `EmptyCompilePath_RealProjectFileSystemRejectsEmptyPath` reaches real registration and the Razor project filesystem and passes five checks per role. We do not rewrite the wrong probe or count its assertion as valid: 97 original checks + 5 supplemental checks - 1 invalid assertion = **101 valid checks**.

Original source `37e809ead5824bc753a1c3d56f11615bdb1296c5` ran runtime `12.0.0-alpha.1.26562.105`; observed default `00560e2dd1954a2acf2bc54b35422b0f32484bf1` ran `12.0.0-alpha.1.26568.110`. Roll-forward was disabled. These are separately identified functional characterizations, **not baseline/candidate measurements**.

## Audit and limits

With existing Node.js and PowerShell 7 (`pwsh`), run:

```powershell
node .\verify.mjs . --require-seal
pwsh -NoLogo -NoProfile -File .\audit-native-xml.ps1 -Root .
```

**Passed:** selected copied metadata/source hashes; reconciliation of the independently verified complete original payload; both actual native XML reports including every theory row; the preserved wrong probe and corrective edge; all 3,592 original image-hash entries and 28 common-once file associations; correct rejection of the 367-non-owner-difference/runtime-mismatched pair; selected source/PDB receipts and terminal work. These commands start no .NET build/test/host or benchmark. The raw original image binaries are deliberately omitted; portable historical checking is not fresh PE/PDB re-parsing.

The five constructor-null guards are source-audited only. Fixture metadata/page classes were not generated by Razor SDK from `.cshtml`. Dynamic Razor recompilation/checksum invalidation, HTTP/browser behavior, workload frequency and actual startup/allocation/whole-application improvement remain unverified. Missing generated inputs/dependencies, initial consumer-closure failure, unavailable Python, long-path Git diagnostics and the failed first seal are retained.

No material performance proposal is established for this cold initialization seam; the zero-of-three comparison budget is permanently closed. This does not turn the real repeated-probe idiom into an empirical no-gain result.
