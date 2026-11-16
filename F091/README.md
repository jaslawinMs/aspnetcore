# F091: Google Boolean query formatting

**Allocation-only proposal, not merge-ready. No repeatable speedup is established.**
All three comparisons are retained; the budget is closed at 3/3.

The real compiled Google challenge owner avoids approximately one 32-byte
lowercase string when the nullable typed parameter is true or false. BDN
reports 31-33 B/op reductions in all 36 targeted pairs, including public
request-scoped challenges and PKCE on/off. This reduces complete owner/request
allocations by only **0.16-0.26%**. Null/absent/Items controls retain their
allocations apart from one-byte reporting noise.

The scanner's two-allocation premise was wrong: the exact installed runtime's
Boolean.ToString/provider overload returns existing True/False literals.
Only lowercasing allocates. The candidate selects `"true"`, `"false"` or null
without changing the surrounding generic selection or state/query construction.

## Timing qualifications and all results

Target timing changes range from **2.98% faster to 5.18% slower**.
Four cases are slower in every pair: `PreparedOwner/TrueOverridesItem`,
`PreparedOwner/TypedFalse`, `PreparedOwner/TypedFalseNoPkce` and
`PublicChallenge/TypedFalse`. These regressions are not discarded.
Unchanged controls move from 11.19% faster to 4.73% slower. The first
`PreparedOwner/Absent` control is nonstationary in every launch; maximum
within-launch CV is **34.48%**. No causal explanation, statistically established
throughput improvement, or production-frequency claim is made.

Do not advance this draft as a speedup. The small allocation benefit has to be
weighed against retained timing regressions and uncertainty. No fourth campaign
comparison will be run.

[All 78 paired results, control rows and variability](comparison.md).
[All 156 raw outcomes](raw-outcomes.json).
[Exact raw console warmups/results/GC accounting](console-measurement-receipts.json).
[Actual setup receipts](setup-correctness.json).
[Complete reproducible audit](measurement-audit.json).

## Faithful producers and preserved requirements

`PreparedOwner` initializes a thin external subclass through the normal public
handler initialization and invokes the existing protected Google owner.
It does not override or reimplement BuildChallengeUrl. `PublicChallenge`
creates and disposes a real request scope/context, invokes the registered actual
GoogleHandler through public ChallengeAsync, and observes its redirect Location.
Both include real property construction, query construction, PKCE where enabled,
and actual ephemeral PropertiesDataFormat state protection. No dummy state
formatter, persistent key-store mutation, remote provider request or browser
workflow is used.

Untimed setup executes two actual captures for every case. All 156 measured
cases have matching actual setup identities and complete query/state assertions.

| Requirement | Evidence |
|---|---|
| Typed true/false, with PKCE on/off | `PreparedOwner` and `PublicChallenge`: `TypedTrue`, `TypedFalse`, `TypedTrueNoPkce`, `TypedFalseNoPkce`; exact lowercase output and actual PKCE verifier/challenge relationship checked |
| Typed-over-Items selection and nullable/absent behavior | Both methods: `TrueOverridesItem`, `FalseOverridesItem`, `TypedNull`, `Absent`; actual output and consumed-item removal checked |
| Verbatim Items and typed-null fallback | Both methods: `ItemTrue`, `ItemFalse`, `ItemVerbatim`, `NullKeepsItem`; exact decoded values, preserved payload/return URI and real protected-state round trip |
| Existing endpoint query and complete ordinary output | Both methods: `EndpointDefault`; preserves the existing two-value endpoint-query repetition, complete query/state key sets and actual public redirect/registered handler |
| Existing Google behavior remains intact | Actual original 50/50 and selected 50/50 tests; every exact case name/definition/outcome/duration in [actual-test-audit.json](actual-test-audit.json), including `ChallengeWillSetDefaultScope`, `ChallengeWillUseAuthenticationPropertiesParametersAsQueryArguments`, `ChallengeWillUseAuthenticationPropertiesItemsAsQueryArgumentsButParametersWillOverwrite` and `VerifySignInSchemeCannotBeSetToSelf` |
| Real resource benefit, without manufactured correctness regression | All 36 typed-target pairs save reported 31-33 B/op; all untouched resource controls remain within one-byte rounding. Functional tests are green/green preservation, not a functional red/green claim |

## Source, runtime and immutable execution identity

Campaign baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Current default branch inspected before editing:
`b38e2847d9cda5fbba26177354ed11ede3f7dbfe`.
Owner, Google options/challenge properties, OAuth owner,
AuthenticationProperties and existing GoogleTests blobs match at those heads.
The whole newer branch is not claimed byte-identical.
The actual historical seam-introduction diff is retained in
[seam-introduction-diff.txt](seam-introduction-diff.txt).
Bounded active PR searches yielded no candidates, not proof of exhaustive absence.

The source diff changes one file, six additions/two deletions: the Boolean
formatter and its directly unused CultureInfo import. No API shape/default,
generic branch, other invocation, cache, dependency or shipping visibility
change is made. [Exact committed source identity](committed-source-identity.json).

The final original/selected frozen execution closure has **127 files and 49
declared runtime assets**. Only Google owner DLL/PDB differ. The original
unchanged harness is explicitly retained after recompilation; both frozen
owners pass all 26 full-contract checks. Actual original-host portable-PDB
checks prove owner and caliper source identity. See
[execution-closure.json](execution-closure.json),
[original owner proof](owner-pdb-before.json),
[selected owner proof](owner-pdb-after.json) and
[harness proof](harness-pdb-before.json).
Raw binaries/PDB bytes are deliberately omitted: the public auditor checks
published source, receipts, raw arithmetic and recorded hashes, **not omitted
binary/PDB bytes**.

SDK `12.0.100-alpha.1.26557.102`; runtime
`.NET 12.0.0 (12.0.26.56305)` / pack
`12.0.0-alpha.1.26562.105`; BDN `0.13.0`; C# 13; Release/x64,
in-process concurrent server GC. Three warmups/eight retained result iterations,
100 ms requested iteration time, DontRemove. Launch order: AB, BA, AB.
[Actual runtime and shared-host inventory](environment.json).
The BDN host report could not identify the processor; the separate read-only
Windows inventory is retained rather than filling that field speculatively.
CPU-heavy commands are serialized, builds request at most two workers,
and the agent changes no power/affinity or unrelated processes.

## Reproduction, exact commands and limits

From the ASP.NET Core root, activate `. .\activate.ps1` before each fresh
.NET shell. The external [harness](harness/AutoPerf.Benchmarks.csproj) references
actual in-tree projects and pins package/runtime versions. Set `AspNetCoreRoot`
if the checkout is elsewhere. For a fresh external restore, supply the
repository's unchanged NuGet.config using `--configfile`.

Build/capture the original owner from the baseline, then apply only the
[selected source](source-after.cs) and build/capture the candidate. Freeze
identical harness/configuration/dependency bytes and validate both before
benchmarking. Each launch uses the exact explicit `--artifacts` directory
for its own actual setup receipts. Manual `--verify` requires an explicit
`AUTOPERF_F091_STATE_DIR`.

[Every historical exact command and outcome](validation-commands.md).
`node .\reproduce-analysis.mjs . --verify` passes all 156 outcomes/setups,
1,248 console-linked results, 468 actual console warmups, GC totals/rounding,
source/PDB-record agreement and preserved control/query/state evidence.
Scoped source whitespace, diff and committed-source checks pass.

Preparation failures are preserved, not claimed as successful assertions:
missing explicit source-consumer references, original endpoint-query
single-value assumption and BDN 0.13 ParamsSource field declaration.
The BDN declaration failure occurred before workload timing; it consumed
no measured comparison. Original source was restored byte-for-byte before
rebuilding the corrected common harness. No measured output was overwritten.

Excluded/unverified: complete hosted HTTP pipeline, browser/remote Google
authorization, production challenge frequency, startup, persistent key-store
behavior, other runtimes/OS, trimming/AOT and universal application throughput.
The optional typed Boolean is not an established every-request hot path.
Google's documented lowercase include_granted_scopes protocol behavior is
preserved; no provider behavior change is proposed.
