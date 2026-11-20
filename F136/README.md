# F136: conditional trigger writes in a test file provider

**Disposition: rejected without admitting a candidate or comparison.** Classification: **test-infrastructure micro-optimization with no established material workload**. This is not a measured no-gain result, a claim of zero cost, or proof that `Watch` is unused everywhere. The comparison budget is permanently closed at **0 of 3**.

The target is `TestFileProvider.Watch` in `Microsoft.AspNetCore.Components.Endpoints.Tests`, not a shipping request handler. The dictionary probe is real, but the unchanged-token path already performs only `TryGetValue`. Its following indexer is a **conditional write** for a missing or changed token, not another unconditional read. Simply removing it would lose the required replacement. The exercised actual endpoint/static-asset fixture performed a file lookup and did **not** call `Watch`; a material repeated-watch workload and compatible useful optimization remain unestablished.

## What the real producers establish

The provider owns an ordinal dictionary. Equal unchanged filters preserve token identity and the original filter object. The helper's public `TestFileChangeToken.HasChanged` setter is the exercised change producer: it is **not an operating-system or browser watcher**. Changing that state replaces the current entry while retained old tokens remain separately mutable. `AddChangeToken` can explicitly replace an unchanged entry.

`AddFile` and `DeleteFile` change file content/existence without signaling these tokens. `ActiveChangeCallbacks` is false, and registration returns a no-op disposable: registrations on old, new, and late-old tokens did not execute or reenter. Those observations must not be presented as working filesystem notifications.

The actual consuming setup used real `MapStaticAssets`, `MapRazorComponents`, and native options configuration, with an observing provider subclass delegating to the original operations. It produced `/f136` with `default.css` resource metadata. Its provider-operation sequence was exactly `GetFileInfo:TestApplication.modules.json`, with no `Watch` call. Bounded source/LSP tracing covered three local fixture setups; this is neither a universal caller census nor a hosted HTTP/browser result.

## Connected evidence

| Artifact | Result and boundary | Evidence |
|---|---|---|
| Original source graph | `37e809ead5824bc753a1c3d56f11615bdb1296c5`; own dependency-aware build | [Commands](owner-handoff/commands.md), [graph identities](owner-handoff/graph-identities.json) |
| Observed default source graph | `00560e2dd1954a2acf2bc54b35422b0f32484bf1`; independently queried and built | [Preparation facts](owner-handoff/README.md), [source identities](owner-handoff/source-identities.json) |
| Actual existing tests | **5 passed per role**, including the exact `/_framework/opaque-redirect` theory row; none of these selected cases was blocked before assertions | [All names, IDs and outcomes](owner-handoff/test-results.json), [Original TRX](owner-handoff/results/Original37-native.trx), [default TRX](owner-handoff/results/Default-native.trx) |
| Untimed real helper/consumer cases | **5 passed per role**: initial/repeated identity, public changed-state replacement, explicit replacement/ordinal filters, file mutation without signaling, and actual endpoint resource metadata | [Original execution](owner-handoff/evidence/Original37-verify.json), [default execution](owner-handoff/evidence/Default-verify.json) |
| Actual runtimes | SDK `12.0.100-alpha.1.26557.102`; Original tests and verifier on `12.0.0-alpha.1.26562.105`, default on `12.0.0-alpha.1.26568.110`; roll-forward disabled | [Exact commands/environment](owner-handoff/commands.json), [owner/runtime reports](owner-handoff/evidence) |
| Common consumer | One successful C# 13 compilation; identical DLL/PDB/deps/runtimeconfig reused across roles; initial failed artifact compilation retained | [Deployment](owner-handoff/common-deployment.json), [common source association](owner-handoff/common-source-association.json) |
| Provenance | Selected loaded PE CodeView GUID/stamp, portable PDB, raw document checksums, and separate physical/Git identities | [Copied capsule's auditor](owner-handoff/audit.py), [coordinator's independent original audit](coordinator-owner-audit.json), [copied acceptance](coordinator-acceptance.json) |
| Complete image comparison | **292 entries: 185 equal / 107 different**, no exemptions; **not a causal performance pair** | [Every comparison entry](owner-handoff/image-comparison.json), [inventories](owner-handoff/inventories) |
| Performance proposal | No candidate, benchmark, measured saving, performance PR, or new browser window | [Closed budget](closed-budget.json); additive issue/index linkage will be in `publication.json` |

Both characterized source snapshots have the same target Git blob, `6d161a062f4825d3c77fbfdae790cbe210fc888e`. The raw compiled Windows source SHA256 is `23fd815da7ff39bda843cf6e77ef877436dd88e78279cbcba70fd78b3f83e1cb`, distinct from the LF Git representation. All 62 selected repository source materializations match their LF Git identities after normalization; selected PDB checksums associate the **raw compiled bytes**. These checks are not complete compiler-input attestation. The publication-time target freshness check is file-identity-only, not a later full graph rebuild.

## Rechecking the historical capsule

The coordinator independently rehashed and deeply audited all **235 selected capsule files / 20,121,654 bytes**, including parsing selected PE/PDB/source associations and every saved native result row. The original manifest SHA256 is `E614D6939FBAF342933B3F624AE5B08C9563DF061A5C2ADE994A756CF80B19B2`. The copied capsule is preserved byte-for-byte; the copied deep audit is also executed before publication.

| Portable command | Observed result |
|---|---|
| `node .\verify.mjs` | Passed; selected copied bytes, saved facts, source identities, all image-comparison entries, budget, and publication seal when present. It does not freshly parse PE/PDB or XML. |
| `python -B .\owner-handoff\audit.py` | Passed; standard-library-only deep auditor freshly parses selected binary/source metadata and saved TRX. No .NET process, producer replay, or benchmark starts. |

Exact executed private interpreter paths, hashes, arguments, PIDs, exits, and fully drained outputs are retained in the acceptance receipts. These portable spellings do not install Python or imply that the Windows `python` alias works. Omitted graphs, complete output/runtime trees, packages, SDK, and private tooling have recorded inventories; the coordinator did **not** freshly rehash all those external trees. The Node verifier distinguishes historical deep-audit receipts from checks it performs itself.

Initial checkout/generated-task/assets and artifact-compilation failures remain in [commands](owner-handoff/commands.md) and [auxiliary attempts](owner-handoff/auxiliary-attempts.json). The pinned submodule's own long-path-aware tracked status was empty while ordinary superproject status reported `M`; neither observation is silently discarded. All recorded native roots, test hosts, and owned streams are terminal; historical initial-shell/compiler-child PID gaps remain explicit.

Intentionally excluded: concurrency, alternate virtual overrides, null/glob/path equivalence outside the exercised filters, complete test suites, real filesystem notifications, hosted HTTP, browser lifecycle, a universal caller census, candidate equivalence, and performance. No production feature or behavioral fix was implemented, so this study does not claim sample-to-browser or permanent E2E coverage.
