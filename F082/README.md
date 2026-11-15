# F082: MicrosoftAccount UTF8 user-info memory parsing

**Qualified fork draft, not merge-ready.** Valid UTF8 small/1 KiB/16 KiB/64 KiB
profiles improve 13.67%/23.68%/53.08%/80.41% median paired time. The 64 KiB case
saves 65673-65696 B/op. **Large malformed UTF8 is 20.36% slower and adds 16616 B/op
in every comparison; small malformed UTF8 has 3.21% median slowdown and 232 B/op
extra allocation.** These are retained costs, not discarded controls.

For nonempty canonical declared UTF8, ReadAsByteArrayAsync supplies an owned
array. Utf8.IsValid validates the complete bytes before the strict consumer;
exactly one UTF8 BOM is stripped before parsing ReadOnlyMemory<byte>.
JsonDocument retains this unchanged owned memory through the awaited
CreatingTicket event. Invalid UTF8, quoted/missing/other charsets, and empty
responses keep the original ReadAsStringAsync decoder. Malformed UTF8 first
copies bytes, then falls back; that extra copy is the measured allocation cost.

This removes the UTF16 bridge for selected valid inputs, not all materialization.
SendAsync still uses ResponseContentRead buffering. Owner request/response
disposal is unchanged. The fixture applies identical external cleanup in both
timing variants.

## All results and costs

[All 24 profiles](comparison.md) include three unchanged-strategy comparisons
in AB/BA/AB order. Percentages are medians of paired mean changes, not confidence
intervals or significance tests. [All raw arithmetic and sample variability](measurement-audit.json)
reproduce 144 outcomes, 72 pairs and 1152 actual Workload/Result measurements.
[All six exact commands](all-execution.json) retain the three-comparison budget,
which is closed 3/3. No different implementations are averaged together.

Valid UTF8 gains repeat in all three comparisons. Uppercase charset and
mail-present controls improve 10.49%/10.39% median time. BOM16KiB improves 48.29%
and saves 16512-16513 B/op. Unicode16KiB improves 54.56% but saves only 129 B/op:
its multi-byte UTF8 copy is not an ASCII-sized allocation saving.

Large UTF16 has 3.18% median slowdown; small UTF16 has 3.47%. Quoted UTF8 has 0.08%
median slowdown and unchanged allocation. Other legacy branches have variable
time movements, including one Latin1-large 20.35% slowdown. No fallback speedup
or harmless-noise claim is made. Every per-pair value/variability remains raw.
Empty JSON is 6.03% slower in median, with 72-624 B/op extra allocation; malformed/BOM
error paths also have differing allocations among launches. No JIT/GC/scheduling
cause is asserted for these error/control differences.

Payloads are explicit scaling inputs, not observed Microsoft Graph production
response sizes. No ordinary-login/production-throughput or universal benefit
is claimed from these microbenchmarks.

## Requirement coverage and actual producer

| Requirement | Evidence |
|---|---|
| Actual hosted challenge/correlation/state/callback, claims and document lifetime | UserInfoResponseEncodingPreservesClaims: all 18 rows pass in each original/selected 44/44 owning suite |
| UTF8/uppercase/UTF16/big-endian/UTF32/Latin1, quoted/missing charset, BOM and Unicode preservation | Explicit response bytes/headers traverse actual HttpClient and MicrosoftAccountHandler; all 18 named rows reach exact ticket/event assertions |
| Actual Bearer request and email fallback | UserInfoResponseEncodingPreservesClaims asserts Bearer/token, id, displayName and mail-null userPrincipalName fallback; MailPresent actual-owner profile checks direct-mail precedence |
| Large valid/BOM/invalidUTF8 reaches actual producer/consumer | Utf8Large, Utf8BomLarge and InvalidUtf8Large use 32768-character padding, assert resulting name/padding and exact claim values |
| Guard against raw-memory BOM/replacement incompatibility | Raw-memory prototype fails all 13 expected encoding/BOM/claim rows; InvalidUtf8 and InvalidUtf8Large fail with DecoderFallbackException at actual claim consumption |
| Full body/JSON rejection, status failures and async event lifetime | All 24 before/after owner contracts match; empty/BOM-only/double-BOM/trailing/malformed/failed-status controls reach their expected exceptions |
| Before/during/after-buffer cancellation | Twelve UTF8 small/large/BOM/invalidUTF8 producer contracts match; actual HttpContent writes cause cancellation |
| Legacy post-buffer success | All four AfterBuffer cases produce a ticket, one event and disposed JsonDocument with caller cancellation requested |
| Actual allocation effect and executing owner | All 144 outcomes/1152 samples and startup/setup owner markers match frozen/tested source/PDB identities; complete 262-file/116-runtime closure permits only MicrosoftAccount.dll/PDB differences |

The benchmark calls the real DI/options-initialized MicrosoftAccountHandler
through a test-only subclass exposing its existing protected method. It uses
real HttpClient.SendAsync and HttpContent buffering, claim actions and event/ticket
creation. Setup/cleanup assert request/bytes/claims/async document lifetime
and error outcomes outside timing; timed calls create and consume actual tickets.
No shipping visibility change is added.

## Preservation and negative evidence

[Raw-XML-derived correctness](correctness.json) accounts for 132 outcomes:
119 passes and 13 expected raw-memory prototype failures, no skips. The original
and selected owners each pass 44/44, including 18 safe-label encoding cases.
The raw prototype passes 31 and fails exactly 13. Preservation is green
before/after; this is not a claim that original functionality was broken.

The owned-array proposal corrects the raw shortcut's charset/BOM/replacement
trap, while explicitly retaining its malformed-byte copy cost. The exact
successful and expected-failing commands/results are in [validation-commands.md](validation-commands.md).
No failed or unreached assertion is described as passing validation.

## Identity and reproduction

[Before](before-manifest.json) and [after](after-manifest.json) owners are
frozen. Original/selected source/PDB, tested/executing owners and harness-source
PDBs match. Both closures contain 262 recursively hashed files and 116 declared
runtime assets; only MicrosoftAccount.dll/PDB differ. Harness DLL/runtime/deps
are identical. Sources, commands, raw reports/logs, prototype and native Git patch
are published; raw executables are not.

The [harness](harness/AutoPerf.Benchmarks.csproj) uses the actual in-tree owner
and tested dependencies, C#13, BDN0.13.0 and pinned net12 runtime. From the repository
root activate `. .\activate.ps1` before each dotnet command. Exact build/test
commands and results are in [validation-commands.md](validation-commands.md);
AspNetCoreRoot can be overridden for another checkout. New external manifest
creation justified the initial restore;no repository manifests changed.

Non-timing reproduction:

```powershell
node .\reproduce-analysis.mjs . --verify
```

This recomputes all raw result-sample arithmetic and TRX rows, checks complete
contracts/source/PDB/tested/executing owner/closure receipts, and verifies the
three-pair summary. It consumes no timing. Historical paths in command records
are provenance; the committed-source identity and native patch refer to the actual
fork source commit.

No external-provider/browser, other-platform/runtime, custom-encoding-provider,
network-streaming or production-throughput claim. CPU-heavy work was serialized
on a shared Windows host, two MSBuild workers, no power or affinity changes.
