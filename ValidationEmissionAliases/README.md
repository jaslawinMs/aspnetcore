# Validation findings: source-emission aliases

**Twenty-three retained findings are repeated emission sites of three still-pending owner studies, not twenty-three fixes or measured improvements.** All26 original records, including their original descriptions, ranges and abbreviated snippets, remain available. Different fixtures are not redundant tests.

The generator embeds seven source resources and inserts their class bodies into each generated resolver. The repeated parameter-reflection, interface-discovery and property-reflection findings therefore need an owner decision, not a separate fix in every checked-in snapshot.

## Classification and owner map

| Canonical study | Alias findings finalized as duplicates | Original concern | Actual resource owner |
|---|---|---|---|
| F343 **pending** | F346, F349, F353, F356, F359, F364, F368 | Parameter validation attributes are reflected through the runtime resolver. | [RuntimeValidatableParameterInfoResolver](source-proof/source/Original/006.cs) |
| F344 **pending** | F347, F351, F354, F357, F362, F366 | The validatable-type constructor discovers implemented interfaces. | [ValidatableTypeInfo](source-proof/source/Original/010.cs) |
| F345 **pending** | F348, F350, F352, F355, F358, F360, F361, F363, F365, F367 | The private property accessor looks up declared public instance property metadata. | [ValidatablePropertyInfo](source-proof/source/Original/009.cs) |

Classification: **generated-source ownership consolidation**. This says where a future justified fix belongs, not whether reflection is expensive enough to change, whether caching is correct, or whether any fix is advisable. The three canonical studies and their budgets remain untouched.

## Connected artifacts

| Artifact | Evidence |
|---|---|
| Scope frozen before classification | [Acceptance plan](source-proof/analysis-plan.json), [SHA256 seal](source-proof/plan-seal.json) |
| All26 exact retained findings | [Unchanged input records](source-proof/retained-findings.json) |
|44 complete source snapshots,35 raw Git objects,44 path memberships | [Original paths, short local filenames and full immutable Git proofs](source-proof/source-manifest.json) |
| Actual resource composition | [Project embeds, rather than compiles, templates](source-proof/source/Original/003.csproj), [resource reader and indentation](source-proof/source/Original/002.cs), [main emitter](source-proof/source/Original/001.cs), [native generator registration](source-proof/source/Original/011.cs) |
| Complete per-ID, per-role reported-range and whole-resource proof | [52 mapped observations, three groups and five controls](source-proof/alias-observations.json) |
| Actual source capture | [Executed capture source](source-proof/tools/Validation-capture-alias-source-080.mjs), [root receipt](execution/capture.exit.json), [stdout](execution/capture.stdout.txt), [all51 Git/GitHub command arguments and raw streams](source-proof/git-native) |
| Actual analyzer execution | [Executed source](source-proof/tools/Validation-analyze-alias-source-080.mjs), [runner](execution/analyze.executed-command.ps1), [receipt](execution/analyze.exit.json), [stdout](execution/analyze.stdout.txt), [stderr](execution/analyze.stderr.txt) |
| Independent read-only verification | [Different mapping/Git verifier](source-proof/tools/Validation-verify-alias-source-080.mjs), [runner](execution/verify.executed-command.ps1), [receipt](execution/verify.exit.json), [stdout](execution/verify.stdout.txt), [stderr](execution/verify.stderr.txt), [public verifier](verify.mjs) |
| Narrow decision and alias-only budgets | [Decision](alias-decision.json), [23 permanently closed zero-authorization budgets](closed-alias-budgets.json) |
| Preservation, complete copies and publication | [Before snapshot](source-proof/preservation-baseline.json), [canonical-budget baseline](canonical-budget-preservation.json), [authoritative copies](authoritative-copies.json), [immutable core seal](capsule-file-hashes.json), [tracking/publication receipt](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/ValidationEmissionAliases/publication.json) |

## Why these are the same owner concern

Original is `37e809ead5824bc753a1c3d56f11615bdb1296c5`; the independently observed default was `d3483989953ae3cccd773aea5ea04cb0c7198531`. Each source is bound to the exact commit through raw commit/tree/blob objects, not a mutable checkout.

The actual helper reads each embedded UTF8 resource, normalizes CRLF to LF and prefixes every nonempty line with exactly four spaces. It does not rewrite the class body. Each accepted snapshot contains the **entire corresponding resource exactly once** after only that documented projection. The original reported range must also identify the precise reflection seam: the parameter-attribute expression, the interface assignment, or the two-line property declaration/lookup. Both revisions pass, and each family's complete resource body is identical across both revisions.

The matched resource body excludes terminal line breaks; raw file bytes retain separate hashes. No class-body whitespace or tokens are normalized.

Several scanner snippets are human abbreviations. For example, `private PropertyInfo Property => ...` is not the literal fully qualified, two-line declaration with its exception expression. Those inputs were preserved, not silently rewritten into supposed literal matches. F343's original range crosses part of another method; the proof is of its complete resource and reported reflection expression, not a falsely claimed single containing method.

The analyzer and a separate read-only verifier both reject a changed body, duplicate resource, wrong reported member and wrong card. Unrelated fixture trivia outside the resource still maps, deliberately illustrating the limited claim.

## Execution and limits

The source capture, frozen analyzer and independent verifier actually exited0. The independent audit matched all52 role observations and repeated all five synthetic mapping controls. These are source-analysis checks, **not native generator execution, product tests, runtime equivalence or measurements**. Source history is retained with the captured Git command streams. There is no claimed complete-fixture equivalence, runtime dispatch, allocation reduction, startup/request-path benefit or generated-assembly behavior.

Each alias is permanently closed with zero of three comparison authorizations used. No candidate, shipping source/config change, permanent product test, performance PR or browser window was created. The fixed classified report is unchanged.

From this directory on a Windows machine with Node26:

```powershell
node .\verify.mjs . --require-seal
```

The immutable core predates the additive publication receipt and campaign-index linkage.
