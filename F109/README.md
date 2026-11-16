# F109: malformed Identity token Base64 preflight

**Conditional component win; not merge-ready or universally faster validation.**
The selected proposal avoids the decoder's internally caught `FormatException`
for malformed Base64 **without ASCII space/tab/CR/LF**, preserving the existing
false result and both provider/manager logs. Across the two final 33-case pairs,
the 13 targeted synthetic inputs take **70.48-98.23% less time**. This does not
measure their frequency, HTTP throughput, external-store latency or application
speedup. Whitespace-containing malformed text deliberately retains the original
decoder/catch path and is not included in that optimization claim.

The source branch is
[`autoperf/F109-token-base64-preflight`](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F109-token-base64-preflight),
commit `fca37ba6edb2eb6417df1680a269e4c352a42b71`. It adds eight lines to the
provider and one focused test class. No public API, default, dependency, target
framework or assembly-visibility change. All three allowed source comparisons
are complete and the budget is closed.

## Wins and costs

Positive time changes below mean slower; these are individual paired means,
not pooled estimates. See [all 99 pairs/198 outcomes](paired-outcomes.md) and
[audited arithmetic](measurement-audit.json).

| Selected case | Pair 2 time change | Pair 3 time change | Original B/op | Selected B/op |
|---|---:|---:|---:|---:|
| InvalidHeadSmall | -98.21% | -98.23% | 296 | 0 |
| InvalidTailLarge | -78.05% | -78.16% | 8680 | 0 |
| InvalidTailEnabled | -95.91% | -96.01% | 536 | 32 |
| ValidSmall | +0.57% | +1.08% | 1208 | 1208 |
| ValidLarge | +2.43% | +5.97% | 57674 | 57674 |
| ValidLargeWhitespace | +5.03% | -2.01% | 57675 | 57675 |
| Empty | +20.18% | +33.99% | 192 | 296 |
| WhitespaceOnly | +30.94% | +32.06% | 192 | 296 |
| UnprotectFailure | +9.71% | +7.89% | 808 | 808 |

**The remaining failure-path costs are material and intentionally not hidden.**
The original's independent process-wide empty/whitespace calipers also report
about 296 B/op, unlike its 192 B/op BDN result. No directly traced cause or pure
decoder/native-allocation attribution is claimed. The maximum retained timing
CV across all outcomes is 10.05%; all raw values and outliers remain available.

Comparison 1 used an unconditional `Base64.IsValid` preflight and made the
large whitespace-valid control about 20.85% slower. Candidate2 first detects
accepted ASCII whitespace and leaves such inputs on the existing path.
Comparison 2 tests that version; comparison 3 repeats the identical selected
owner with candidate-first/original-second order. The extra ASCII-whitespace
scan makes some malformed inputs slower than candidate1; those results remain
in the capsule. This is a bounded proposal for review, not a net production win.

## Faithful boundary and acceptance

The timed method returns the actual `Task<bool>` from public
`UserManager.VerifyUserTokenAsync`, its registered concrete
`DataProtectorTokenProvider`, and real persisted public Data Protection with an
explicit synchronous in-memory store. Normal tokens are created through actual
`GenerateUserTokenAsync`. The observed protector is
`Microsoft.AspNetCore.DataProtection.KeyManagement.KeyRingBasedSpanDataProtector`;
it is not an identity/mock unprotector.

Each setup verifies two complete runs outside timing: configured logger mode
and forced Debug-enabled semantic observation. These check true/false results,
ID/stamp/unprotect calls, actual first-chance exception type/count and exact
event ID/name/message/ordered structured fields/null exception state. The
enabled timed sink is deliberately a no-op; this is not logging-storage or
formatting throughput. DI, generation, assertions, first-chance observers and
calipers are excluded from the benchmark.

The [unchanged 33-case matrix](case-matrix.md) includes actual generated small,
large, padded, whitespace and no-stamp successes; malformed head/middle/end,
length, padding, non-ASCII and unused-pad-bit inputs; empty, whitespace and
null-outside-annotation controls; wrong purpose/user/stamp, expiration,
unprotect failure and actually protected truncated/trailing/invalid-UTF8/
malformed-reader payloads. A real reader `FormatException` remains and is not
misreported as removed decoder pressure.

**Requirement coverage**

- `ValidateAsyncAvoidsFormatExceptionsForMalformedTokens`: each of its four
  safe-label rows fails on the original specifically with expected0/actual1
  actual `FormatException`, then passes on the selected source.
- `ValidateAsyncPropagatesLoggingFailureOnceForMalformedToken`: the same logger
  exception escapes once on original and selected paths. New rejection logging
  remains outside the existing parser catch.
- `ValidateAsyncRejectsMalformedTokensWithWhitespace`: leading, embedded and
  trailing rows pass against the exact frozen original owner in an isolated
  complete test closure and on the selected source. They are preservation
  controls, not additional red performance tests.

Two existing dispatch/metrics Facts also pass:
`UserManagerTest.TokenMethodsThrowWithNoTokenProvider` and
`UserManagerTest.UserManagerWillUseTokenProviderInstance`.
The original selected run passes 2/2; the red run has exactly four expected
failures and three passes; candidate1 passes 7/7; supplemental original
whitespace controls pass 3/3; selected candidate2 passes **10/10**, zero skips.
All 29 executions have complete TRX definitions/entries/IDs/positive durations.
The first two-Fact test module was not preserved before rebuilding; its later
reexecuted controls and captured owner hashes are not mislabeled as that image.

The successful selected command, from the activated repository root, was:

```powershell
. .\activate.ps1
dotnet test src\Identity\test\Identity.Test\Microsoft.AspNetCore.Identity.Test.csproj --no-restore -c Release -m:2 -p:UseIisNativeAssets=false --filter 'FullyQualifiedName=Microsoft.AspNetCore.Identity.Test.UserManagerTest.TokenMethodsThrowWithNoTokenProvider|FullyQualifiedName=Microsoft.AspNetCore.Identity.Test.UserManagerTest.UserManagerWillUseTokenProviderInstance|FullyQualifiedName~Microsoft.AspNetCore.Identity.Test.DataProtectorTokenProviderTest' --logger 'trx;LogFileName=owning-candidate2-green.trx' --results-directory 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F109\tests\candidate2-green' -v:minimal
```

Result: **exit0; 10 passed, 0 failed, 0 skipped**. Exact historical commands and
outcomes, including all six BDN invocations and formatting, are indexed in
[validation-commands.md](validation-commands.md).

## Source, runtime and retained evidence

Twenty-one scoped current-default/baseline/working source identities agree
before the provider change. Current default was
`dd1062f94f356d6be59ad340e5aff2fd829165c6`; campaign baseline is
`37e809ead5824bc753a1c3d56f11615bdb1296c5`. Canonical Git bytes are separate
from raw source bytes. Owner history and dotnet/aspnetcore#10739 and
dotnet/aspnetcore#66586 are retained; bounded searches are not whole-repository
absence proofs.

The original and both candidate images each freeze 178 application files and
83 declared runtime assets. Every comparison uses the identical harness,
runtime/configuration, inputs and isolated synthetic keys; only the intended
Identity DLL/PDB differ. Twenty selected source/PDB associations are recorded,
not method coverage. Test-output identities are not in-test loaded-hash markers;
the real harness separately records actual loaded owner/harness hashes and PID.
Measured binaries were built from baseline plus captured source **before** the
later source commit; they are not relabeled as built from that commit.

The arithmetic audit checks **198 outcomes, 1584 result samples, 594 workload
warmups, 3655 actual overhead samples, 198 hash/PID setups, 396 input proofs,
792 complete contracts, 990 process-wide calipers, 29 test executions and
20 source/PDB associations**. Calipers use five 8192-operation samples after
2048 warmups per case; their enclosing BDN GC-helper totals and precise managed
allocation counts are both retained. They are not another source comparison.
Actual median-overhead subtraction, GC rounding, sample variance/SE,
R7-percentile and recorded confidence-bound arithmetic are reproduced.
Confidence critical values and omitted DLL/PDB/runtime bytes are not
independently recomputed/rehashable from this capsule.

SDK `12.0.100-alpha.1.26557.102`, runtime
`12.0.0-alpha.1.26562.105+dfd6ac738610ea05f42e704be82b386e71052e12`,
BDN0.13.0, net12/C#13, Release/x64/in-process, server/concurrent GC,
three warmups/eight retained results/requested100ms/DontRemove.
Shared Windows11 VM10.0.26300, independently recorded Intel Xeon Platinum8473C,
8 cores/16 logical processors and about 64GiB RAM. Raw BDN processor fields are
not replaced by this separate inventory. CPU-heavy work is serial/max two build
nodes; no power, priority, affinity or unrelated-process settings changed.

## Reproduction and private-fixture boundary

Run the portable arithmetic/source/contract audit without .NET or private keys:

```powershell
node .\reproduce-analysis.mjs 'C:\absolute\path\to\F109' --verify
```

Actual result on the copied capsule: **exit0, passed**. It verifies retained
bytes and arithmetic, not omitted executable/PDB/key bytes or a rerun of crypto.
`authoritative-copy-manifest.json` maps every retained original path, including
deduplicated exact JSON inputs; no inputs are regenerated during the audit.

For fresh performance reproduction, use the [BDN project](harness/AutoPerf.Benchmarks.csproj)
against each exact original/selected source checkout. Activate that checkout's
SDK; build its Identity tests Release first, then build this external project
with `-p:AspNetCoreRoot=C:\that\checkout`. Freeze the complete original harness
output, build the selected owner, and substitute only its DLL/PDB into a copy
of that output. Verify the frozen closure and complete contracts before timing.
The `historical-*.ps1` files contain literal original paths/guards and outcomes;
they are archives, not silently portable recipes.

Create **one fresh shared fixture** using the original image:

```powershell
dotnet C:\frozen\original\AutoPerf.Benchmarks.dll --create-fixture C:\isolated\F109-fixture
dotnet C:\frozen\original\AutoPerf.Benchmarks.dll --fixture C:\isolated\F109-fixture --variant original --artifacts C:\new\original-probe --characterize
dotnet C:\frozen\selected\AutoPerf.Benchmarks.dll --fixture C:\isolated\F109-fixture --variant candidate2 --artifacts C:\new\selected-probe --characterize
```

Then invoke each frozen image with the same fixture and
`--filter '*TokenValidationBenchmark*' --inProcess --exporters json csv
--job Short --warmupCount 3 --iterationCount 8 --iterationTime 100
--outliers DontRemove --artifacts <new-absolute-directory>`.
Those portable path examples are **not additional historical executions**.

Published inputs/ciphertexts are entirely synthetic. **Every private `keys`
directory, including the failed development generator's keys, is omitted.**
Only their recorded identities remain. The original shipped one-day token
lifetime is unchanged; historical inputs expire. Fresh replay regenerates one
shared fixture, not identical historical random ciphertext. Setups must fail
rather than benchmark expired false paths as valid cases.

The external BCL diagnostic compared actual span `Base64.IsValid` and actual
`Convert.FromBase64String` on 673963 bounded UTF16/padding/separator/seeded
inputs: 1835 accepted, 672128 rejected, zero predicate/decoded-length differences.
Its exact code/corpus identity is retained; this is not proof for every string
or runtime. Null remains outside that equivalence domain and reaches the
existing decoder/catch path.

Two development mistakes remain authoritative: initial fixture generation
incorrectly assumed nonzero unused pad bits were accepted; the actual pinned
decoder rejected them, so the pre-profile matrix was corrected with separate
valid padded/rejected-bit controls. The first arithmetic auditor used BDN's
shortened parameter display and failed; exact full-name identity fixes that
reader without raw-data changes or any benchmark/test rerun. All original
failure logs and executed sources are retained.
