# F084: default-encoder directory breadcrumb allocation

**Qualified allocation/scaling proposal; NOT MERGE-READY.** The selected
default-encoder strategy reduces observed complete-response time by
22.66%/32.96% for 32/64 ASCII segments, 38.92% for 64 escaped segments and
41.26% for 64 Unicode segments. However, HEAD controls are 52.86%/49.41%
slower in the selected comparisons; ordinary two-segment GET is 4.12% slower
and the custom-override 64-segment control is 8.59% slower. These observations
remain unresolved, not dismissed as harmless noise.

Baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Branch: `autoperf/F084-directory-breadcrumb-path-allocation`.
Actual source/test scope: two files, 190 additions/7 deletions, including the
163-line `HtmlDirectoryFormatterTests.cs`.

## Selected proposal and what it does not remove

Only the exact `HtmlEncoder.Default` singleton with more than two normalized
segments uses the new path. Encode each owned `Split` segment once, join an
encoded normalized full path, and append successive prefix ranges directly
to the existing response `StringBuilder`. The original concat/`Encode(string)`
loop remains for zero/one/two segments and every configured/custom encoder.
No public API, default, convention, dependency or shipping visibility change.

An unconditional version breaks both actual custom `Encode(string)` override
rows: an override may depend on the entire prefix. That unmeasured prototype
is rejected, with its source, commands and two exact failure rows retained.
The default-only guard preserves both cases. Default scalar encoding also
preserves Unicode and invalid UTF16 replacement, tested at the actual encoder
and middleware response boundary rather than assumed from a concat helper.

The full HTML still contains every increasingly long breadcrumb href.
Its output-size growth is inherent. `Split` strings/array, the joined
intermediate/full encoded path, the complete HTML string and the UTF8 response
byte array still allocate. This removes intermediate cumulative-prefix strings
and repeated encoding/formatting work, not all buffering or the HTML's growth.

Title uses the original raw `PathBase + Path`, not the normalized link path.
Table/accessibility markup, file/directory ordering, metadata handling,
content type/byte length, redirect behavior and HEAD semantics are unchanged.

## Measurements, tuning and retained costs

The **3/3 comparison budget is closed**. There are two measured strategies:
round 1 uses the default-only path without a depth gate; rounds 2 and 3 use
the unchanged selected gate, in BA/AB order. Do not average these strategies.
The [selected comparison](comparison.md) uses only rounds 2/3.
Its median is the midpoint of two paired mean percentage changes, not a
confidence interval or statistical significance test.

| Selected profile | Paired-median time change | Bytes saved per response in rounds 2/3 |
|---|---:|---:|
| Depth32 | -22.66% | 13280 / 13280 |
| Depth64 | -32.96% | 55135 / 55136 |
| EscapedDepth64 | -38.92% | 120437 / 120447 |
| UnicodeDepth64 | -41.26% | 108569 / 108551 |
| Depth128 | -10.59% | 225523 / 225586 |
| EscapedEight | -26.75% | 1712 / 1712 |
| UnicodeEight | -18.98% | 1600 / 1600 |
| LongEight1K | -3.45% | 41309 / 41342 |
| ManyFiles64Depth64 | -8.98% | 55143 / 55150 |

The first strategy added 32 B/op at root, 16 B/op for ordinary two segments
and **2048 B/op with a 14.26% slowdown for long two-segment paths**.
The selected gate removes these shallow-path extra allocations. This is a
measured cost-based gate, not proof of a globally optimal two-versus-three
timing crossover. Timing for three through seven segments is not measured;
three-segment functional boundaries are exercised by PathBase, Unicode and
UnpairedSurrogates unit rows.

**Retained selected HEAD cost:** Depth64 HEAD moves from 36.53/35.37 ns
to 54.48/55.38 ns, +49.13%/+56.59%. Root HEAD moves from 37.26/36.70 ns
to 53.79/56.69 ns, +44.35%/+54.47%. Both remain zero-allocation and return
before breadcrumb construction; no cause for the timing difference is
established. Report both relative and absolute costs.

Ordinary Two is +2.40%/+5.84%, with unchanged 13624 B/op. Custom override64
is +10.42%/+6.77%, with essentially unchanged heap and original override
call behavior. Eight is -16.24%/+1.61%, so its -7.31% median does not establish
an improvement in both comparisons. LongSingle/LongTwo/Root/configured
controls also move in both directions; do not claim their median movements
are optimization benefits.

The unselected first configured64 control is +50.83%, with original/proposed
RSD 42.85%/30.10%; its selected comparisons go in the opposite direction.
Every original/selected outcome, allocation, pair and RSD is retained in
[measurement-audit.json](measurement-audit.json). No JIT, GC, scheduling,
machine-load or other causal explanation is asserted for control movements.

All **144 measured outcomes, 72 pairs and 1152 actual Workload/Result samples**
are published. The selected strategy contributes 96 outcomes/48 pairs/768
samples. All 150 startup/setup executing-owner markers match the frozen
source/PDB/tested owner for their actual snapshot.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Actual path matching and directory producer, not a concat-only proxy | `HtmlDirectoryFormatterTests` invokes real `DirectoryBrowserMiddleware` with a virtual provider; its next delegate throws if formatter production is bypassed |
| Exact normalized href/text, root/repeated/trailing/path-base behavior | `GenerateContentAsync_DefaultEncoderPreservesBreadcrumbs`: all 16 named rows pass in original, first guarded and selected 98/98 suites |
| Spaces, attribute characters, percent literals, Unicode/invalid UTF16, long/deep inputs | Same test's Spaces, Attributes, PercentLiteral, Unicode, UnpairedSurrogates, LongSegment and ManySegments rows assert every actual decoded breadcrumb |
| Adjacent depth-gate functional boundary | Two has two segments; PathBase, Unicode and UnpairedSurrogates have three; the same exact-output test passes on both sides |
| Preserve configured encoders | `GenerateContentAsync_PreservesConfiguredEncoder` asserts actual configured Unicode link href/text and byte length |
| Preserve virtual string-encoder output/calls | `GenerateContentAsync_PreservesStringEncoderOverride`: Two and ManySegments both fail for the unguarded prototype and pass for original/guarded/selected; exact prefix/text and `13 + 2 * depth` calls are asserted |
| HEAD zero body/zero enumeration | `GenerateContentAsync_HeadDoesNotEnumerateContents` asserts empty bytes, no ContentLength, expected ContentType, zero contents enumeration and one provider lookup |
| Original title, directory/file encoding/order, UTF8 headers/length | All 16 default rows assert raw combined-path title, encoded rows/order and exact byte length; all 24 complete response contracts/captures match across all three owners |
| Full actual response and encoder fidelity outside timing | `DirectoryFixture.CaptureContract` verifies provider/formatter reachability, every raw encoded prefix/text, title, rows, headers, output length and full body SHA256; 72 actual HTML byte captures are retained |
| Actual allocation/timing and source identity | Raw-derived audit verifies all 1152 samples, executing markers, owner/harness/test source-PDB identities and both complete 149-file/68-runtime-asset closures |

All **392 TRX outcomes** are parsed as XML: 390 passes and exactly two
expected unguarded-prototype failures, no skips. Each original/first-guarded/
selected owner passes 98/98, including all 20 new rows and 78 existing
directory-browser cases. The prototype passes 96 and fails both custom rows.
Original functionality was already green; this is a performance proposal,
not a claim that the original formatter's output was broken.

The benchmark runs actual `DirectoryBrowserMiddleware` matching/provider
existence, actual formatter construction/encoder/prefix logic, file/directory
rows and complete UTF8 response generation. Virtual file metadata and an
identical counting stream avoid physical filesystem/network I/O. Setup and
cleanup capture/verify full output outside timing; timed operations still
allocate the actual complete HTML and UTF8 bytes and write to the same sink.
This direct middleware boundary is not a hosted application/browser test.

## Exact validation and identity

[validation-commands.md](validation-commands.md) contains every exact original,
prototype and selected owning command with its result, plus actual builds,
contract runs, focused whitespace and all source/PDB commands.
All successful commands exited 0. The prototype's actual test command exits 1
for the two expected custom-override failures.

The first packaging audit rejected a summary lookup for abbreviated long
parameter labels. The verifier now uses the full benchmark identity and
requires exactly one matching row. The failed packaging log is retained;
timings/raw reports were not rerun or changed. The follow-up package audit
passed.

All source and raw reports/logs are copied without transformation, including
the native [source.patch](source.patch) and all three measured snapshots'
source/manifest/PDB receipts. Actual committed source/test blobs match the
selected source after normal Git line-ending canonicalization.

Both recursive execution comparisons contain exactly 149 copied files and
68 declared runtime/native/runtimeTargets assets. Only
`Microsoft.AspNetCore.StaticFiles.dll` and its PDB differ. Harness DLL/PDB,
runtime and deps are identical. The actual runtime/deps JSON is archived.
All three owner PDB documents, all three harness documents and the current
20-case test-source PDB document match their actual source bytes. Raw
executables are not published; closure and identity receipts are.

SDK `12.0.100-alpha.1.26557.102`, .NET12 runtime `12.0.26.56305`,
BDN0.13.0, authored C#13, X64 in-process, concurrent server GC,
3 warmups, 8 result iterations, 100ms target, DontRemove outliers.
Shared Windows host; CPU-heavy commands serialized, two MSBuild workers,
no power/affinity or unrelated-process changes.

## Reproduction

Raw arithmetic/contracts/TRX/source/closure audit, with no timing or build:

```powershell
node .\reproduce-analysis.mjs . --verify
```

This was run successfully against the prepared package. It independently
recalculates every mean from the eight actual measurements, verifies the
two-pair midpoint, parses each XML test row and hashes all 72 response files.
Portable-PDB receipts are archived rather than claiming a fresh rebuild.

For a separate local remeasurement, use clean original and proposed worktrees.
Copy only `source-tests.cs` into the original worktree's established unit
path to provide identical preservation checks. Activate each checkout from
its root with `. .\activate.ps1`, run the exact owning command from
validation-commands.md (perform focused restore only after an actual
missing-dependency failure), then build the external harness against that
checkout with `-p:AspNetCoreRoot=<absolute checkout path>`, Release, `-m:2`
and the recorded disabled native/Node/crossgen/installer flags.

Freeze each complete build output before changing source. Use the identical
harness DLL/PDB/runtime/deps in both outputs, differing only in owner DLL/PDB.
The recorded measured commands in all-execution.json contain the exact BDN
filter/job/export/warmup/iteration/outlier settings. Historical helper scripts
preserve the actual original Windows layout; they are not advertised as
portable without path adaptation. SDK/runtime availability and a fresh
cross-machine rebuild are not verified by the archived audit.

No physical filesystem, hosted server/browser, production path-depth
distribution, production-throughput, universal speedup or other-runtime/
platform/custom-encoder-family claim. History/active-work searches were
bounded, not proof of exhaustive duplicate absence.
