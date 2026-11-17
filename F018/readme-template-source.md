# F018: guarded UTF-8 Google user-info parsing

**Qualified allocation/synthetic-scaling draft, not merge-ready.** In one actual
paired profile, the 64 KiB ASCII-padding case falls from 102.074 to 20.325 us
(-80.09%) and 200,622 to 134,921 inclusive managed B/op (-32.75%). The 16 KiB
case improves time by 50.86% and allocation by 31.12%. These are warm,
in-memory owning-handler observations, **not an 80% faster Google login,
network result, or established production workload**.

The predefined 50% large-case early-stop rule was met after all correctness,
identity, raw-sample, runtime, formatter and package gates passed.
**One of three allowed comparisons was used; the historical budget is permanently
closed.** This is one original/candidate pair, not three repetitions or evidence
of repeatability across machines.

## Scope and compatibility

Original ID F018, card `stream-materialized-before-stream-consumer`, identifies
`GoogleHandler.CreateTicketAsync` parsing a decoded string. `SendAsync` already
uses ResponseContentRead and buffers the body. The proposal therefore removes
one selected UTF-16 bridge; it **does not stream the network response, avoid all
buffering, or remove all copies**.

Only a nonempty, valid, canonically declared UTF-8 body takes the owned-byte path.
Case-insensitive `UTF-8` works, and exactly one UTF-8 BOM is stripped. Missing,
quoted or other charsets and empty content retain the original string decoder.
Invalid UTF-8 retains replacement decoding, but incurs an extra attempted byte
copy and validation. That adverse cost is measured, not hidden.

The JsonDocument and owned bytes remain alive through the awaited event and are
disposed after it. Existing request/response ownership, protected/public
signatures, defaults, challenge construction, other providers, dependencies,
target framework and both API baseline files are unchanged. The two-file diff
adds 143 lines and removes one, including an 18-row hosted callback Theory.
F091's separate Google challenge-formatting proposal is not included.

- Baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Published source: `e4f8020ea7b3c6b5653ce3e277e1a8457aee1b0e`,
  branch `autoperf/F018-google-userinfo-utf8`, inside `jaslawinMs/aspnetcore`.
- Measured binaries were built from the baseline plus the exact retained
  [source patch](source.patch), before that source commit; do not infer identical
  later build metadata or binary hashes.
- Captured current default: `49147673007a4b1d676694e2c5f85b83ad76c36f`.
  Among 18 selected baseline/default/working triples, only `eng\Versions.props`
  differs on default. This is not a full build/test of the current-default SDK.
- Guarded parsing follows independently inspected F082 source-pattern prior art.
  **No F082 timings are used here.**

## Actual measured boundary

The standalone C#13/net12 project executes the real DI/options-initialized Google
handler via a test-only wrapper around its existing protected method. Real
HttpClient and a producing HttpContent perform response serialization/buffering,
followed by real claim actions, the event, and returned ticket consumption.
Neither handler logic nor a parser surrogate is copied into the timed method.
Each operation includes identical external request/response cleanup.

DI setup, test payload construction, yielding-event assertions and source
witnessing are outside timing. The non-yielding event path is timed; yielding
event lifetime is explicitly validated before/after timing and in hosted tests.
There is no external network, browser, full authentication callback, or provider
production response distribution in the timed boundary.

`16K`/`64K` denote padding characters, not exact JSON sizes. The actual ASCII
payloads are 16,549 and 65,701 bytes; the small payload is 165 bytes.
Unicode, legacy identifier, alternate/missing/quoted charset, malformed JSON,
invalid byte, empty/BOM, and HTTP-failure controls remain in the full matrix.

## Complete result matrix

{{AGGREGATE_TABLE}}

Numbers are unweighted arithmetic means of the actual per-profile means and
B/op (one pair here), not pooled samples or independent application trials.
For the primary 16 KiB case, original/candidate CV is 4.21%/2.74%; for 64 KiB it
is 8.83%/1.38%. Raw iterations, retained values, CVs and GC tuples are in
[analysis.json](analysis.json).

**Trade-offs are material.** Invalid UTF-8 with 16 KiB padding is 15.19% slower
and allocates 31.26% more. Invalid small input is 8.32% slower/+6.42% B/op.
UTF-16 16 KiB is 7.40% slower with unchanged allocation; missing/quoted charset
and other controls include time non-wins. Unicode16K improves time but has only
0.23% allocation reduction. Empty JSON adds 72 B/op. These observations prevent
a universal win or merge-readiness claim; their cause is not dismissed as noise.

## Correctness, identity and statistics

`GoogleTests.UserInfoResponseEncodingPreservesClaims` runs all 18 safe-labeled
rows on both actual owner variants. The real TestServer challenge/state/
correlation/callback flow verifies exact name/id/given/surname/email/padding,
one genuinely awaited yielding event, post-event document disposal, and the
subsequent authentication cookie at `/me`. Both filtered Google suites pass
68/68: 136 actual outcomes, including 36 new Theory executions, zero skips or
failures. These are preservation tests that pass on both versions, not a
functional bug-fix red/green claim.

Native characterization checks all 24 actual timed-wrapper return values in
each role, plus 48 setup/cleanup profile contracts and 12 real-producer
cancellation contracts per role. Before-request and during-buffer cancellation
prevent a ticket/event. After-buffer cancellation actually returns a ticket on
**both** original and candidate; this is observed, not an assumed cancellation
contract. The two measured profiles add another 96 setup/cleanup contracts.

The live/portable audit accounts for 192 profile contracts, 24 cancellation
contracts, 48 wrapper preflights, 192 unchanged settings observations, 96 per-case
executing-owner records, 12 actual PE/PDB witness records and 32 selected source
document checks. All 290 frozen context files were rehashed before omission;
each 124-file prepared image differs only in the Google DLL/PDB. Harness and
other image bytes, preservation test source and API/build inputs are identical.
Selected source witnesses do not establish full compiler provenance, test-PDB
source binding, or method coverage.

The independent reader validates 48 reports, all 384 raw workload iterations,
144 warmups and 940 actual overhead iterations. Median-overhead compensation,
R7 upper-only filtering and all 357 retained values (27 upper-filtered) are
recomputed, along with mean, N-1 variance, SD, SE, R7 quantiles, reported CI-bound
arithmetic, raw GC counts/denominator and midpoint-even B/op rounding. It does
not independently derive the Student-t quantile or host clock calibration.

Actual runtime: `12.0.0-alpha.1.26562.105`, commit
`dfd6ac738610ea05f42e704be82b386e71052e12`, x64/server GC, BDN0.13.0.
The settings-preserving emitted executor requests no power-plan change and
observes unchanged Normal process/thread priority and affinity. This is a
shared Windows Hyper-V VM, not isolated hardware.

The [attributed BDN0.13 source](investigation/bdn-memory-accounting/GcStats.cs)
uses precise process-wide `GC.GetTotalAllocatedBytes(true)` on this modern
runtime. Allocation is inclusive managed diagnostic-operation accounting,
not isolated string/owner allocation, native memory or working set. Its raw
diagnostic operation count is not multiplied by eight. Source attribution
does not independently prove source-to-BDN-binary equivalence.

## Validation and retained failures

Both original and candidate net12 products build cleanly. The scoped formatter
changes 0 of 2 files. Existing enabled APICompat package validation actually
passes with zero warnings/errors; the packed net12 owner equals the frozen,
tested candidate. The Release products were emitted into a Debug-named package
directory; this is not a Debug-product claim. No released baseline version is
configured, so no released-package baseline comparison is claimed.

The initial default owning-test build stops on the unrelated ANCM native asset
prerequisite before assertions. The successful managed TestServer mode keeps
project-reference builds enabled, using `UseIisNativeAssets=false`,
`BuildNodeJS=false`, `CrossgenOutput=false`, `GenerateInstallers=false`.
Native ANCM integration and the whole authentication area are not validated.
An initial harness compile error from an unnecessary Newtonsoft import was
resolved with existing System.Text.Json, not a new serializer dependency; the
failed inputs/logs are retained. The unexecuted package-check PowerShell parse
failure is preserved explicitly as a transcribed diagnostic and original
driver, corrected before execution, and consumes no timing slot.

All exact commands, exits and hashes, including failed attempts, are retained;
see [validation-commands.md](validation-commands.md). Copied portable checks
actually pass:

```powershell
node .\F018-analyze.mjs . --verify
node .\F018-audit.mjs . --verify
```

Binary/runtime/test images, packages and binlogs are deliberately omitted and
individually hashed in [omitted-file-manifest.json](omitted-file-manifest.json).
Portable checks do not reopen those omitted bytes.

## Run a fresh independent project

Keep the capsule outside the source checkout. Restore the repository per its
BuildFromSource instructions and use PowerShell7 on Windows. The helper activates
the repository SDK and accepts `-AspNetCoreRoot`; no repository manifests are
edited. Use a new output directory every time.

```powershell
.\F018-run-fresh.ps1 -AspNetCoreRoot C:\src\aspnetcore `
    -OutputRoot C:\temp\F018-fresh-candidate -Mode Prepare
```

The relocated **candidate** Prepare invocation was actually exercised: exit0,
124 image plus 9 source files, no native execution or additional timing.
This is not a second measured comparison or a relocated original validation.
`-Mode Characterize` explicitly runs the untimed native contracts;
`-Mode Measure` explicitly performs a new independent 24-case profile of the
selected source checkout. Use separate original/candidate checkouts/revisions
and output directories to compare them; fresh observations must not overwrite
or be relabeled as this closed historical comparison.

External Google/network/browser behavior, provider production sizes/frequency,
custom encoding-provider substitutions, other OS/runtime configurations and
deployment-wide effects remain unverified.
