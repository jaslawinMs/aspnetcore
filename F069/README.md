# F069: index large Kestrel SNI wildcard configurations

**Disposition: qualified large-configuration lookup proposal.** The final
comparison shows68-96% lower warm selection time for64/512-pattern last/miss
cases, while preserving original option and real TLS/HTTP contracts.
It is not a handshake or HTTP-throughput result. Small timing non-wins and
extra constructor/index costs remain visible below.

All three allowed comparisons are closed. Each measured a distinct shipping
strategy against the same original and exact33-case harness. **The final
strategy has only one comparison, not three repetitions.** Earlier strategies
are preserved separately and never aggregated into final results.

## Actual owner and preserved selection

The actual `SniOptionsSelector` constructor consumes Kestrel's configured SNI
dictionary. `TlsConfigurationLoader.UseHttpsWithSni` constructs it and sets
`OnConnection=SniOptionsSelector.OptionsCallback` and `OnConnectionState`.
`HttpsConnectionMiddleware.ServerOptionsCallback` passes the runtime's real
ClientHello information and connection to that callback.

The proposal keeps constructor duplicate validation in the original
longest-first, ordinal-ignore-case SortedList. Above eight wildcard suffixes,
it also builds an ordinal-ignore-case dictionary of the same key/value
references. Large selection first checks the longest suffix, preserving the
best-case scan without hashing; remaining literal-dot suffixes are probed as
spans, longest candidate first. Small selection stays longest-first using
indexed SortedList access rather than an enumerator.

Exact-name lookup remains before the unchanged DNS-name guard. Literal-dot
boundaries, current raw Unicode/A-label distinctions, longest/full wildcard
priority, null/empty/fallback behavior, duplicate exception key/message,
SSL cache/clone identities, certificate/authentication callbacks, protocol
features and delayed-client-certificate flags remain unchanged.
Configuration state is constructor-owned; this is not a static metadata cache
or a new public API/access mechanism.

The independent dotnet/aspnetcore#69395 proposal canonicalizes IDN configuration
keys; this experiment does not mix in that behavior. The archived endpoint
documentation at `e0756e546e29be1ddba42d18bf130aaffae19c0d` documents exact,
longest wildcard and full wildcard precedence under "Configure SNI in
appsettings.json". Bounded owner/suffix history and existing-work records are
included, without claiming complete code-graph coverage.

## Faithful benchmark and real producer boundary

`harness/AutoPerf.Benchmarks.csproj` invokes actual shipping GetOptions through
a prepared typed delegate and the actual constructor through a compiled
expression. Reflection prepares those calls outside timing. There is no copied
matching loop, recording Moq loader or installed ASP.NET framework substitute.
The real CertificateConfigLoader receives null per-pattern CertificateConfig
and performs no certificate IO in the constructor benchmark.

Selection reuses a prepared DefaultConnectionContext, consumes the actual
selected SSL options and updates the real protocol feature. Its24 B/op includes
that owner behavior; the original scan already measured24 B/op. **No original
enumerator-allocation saving is claimed.** Callback profiles preserve their
actual clone/certificate work. The constructor benchmark uses a valid fallback
certificate callback, avoiding certificate-chain construction and IO; it is
not complete endpoint or application startup.

Separate real Kestrel loopback TCP/TLS/HTTP checks let Kestrel and SslStream
populate read-only callback state, observe exactly one actual TLS callback,
negotiate ALPN and assert HTTP version/body. No fabricated ClientHello event,
private setter or injected transport callback substitutes for the producer.
All17 canonical original rows and all29 complete option contracts match the
final frozen owner's outputs byte-identically.

On this runtime, Unicode and A-label URI targets both reach the real callback
as `client.m\u00fcnchen.sni.test` (escaped here;the u is U+00FC). The separate raw
`client.xn--mnchen-3ya.sni.test` diagnostic intentionally selects the catch-all,
while real TLS IDN decoding reaches the configured Unicode suffix. The raw
receipts preserve the actual Unicode string; no wire-representation inference
or configuration normalization is made. An IP target supplies absent SNI and
uses the full wildcard. Hosts, owned certificates and sockets are disposed.

## Frozen source, complete budget and validation

- Baseline actual main: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Two-file source/test proposal: [f01ba1e0475dc1c8f13c18f95fe90377b800e961](https://github.com/jaslawinMs/aspnetcore/commit/f01ba1e0475dc1c8f13c18f95fe90377b800e961), branch `autoperf/F069-sni-wildcard-selection`.
- Three serialized comparisons A/B,B/A,A/B;three shipping strategies,two source tunes,zero measured harness changes,no fourth comparison.
- Each role contains29 selection and4 construction cases across two full JSON reports. All198 actual outcomes/99 pairs/1584 samples and204 exact entrypoint/case owner markers are checked.
- Final strategy only:66 outcomes/33 pairs/528 actual samples. Neither earlier source strategy enters those33 pairs.
- Every recursive105-file DLL/JSON closure differs only in Kestrel.Core. The second build also changed the unchanged-source Kestrel DLL; its unmeasured build manifest/diff are preserved, that public-identical dependency was frozen to original, and real isolated TLS/HTTP contracts were revalidated before comparison2.
- Source, test and all measured harness code bytes are preserved. Nine actual portable-PDB SHA256 document identities bind all four owner versions, four canonical harness files and final tests to compiled code.
- Separate default/committed Git blobs and the two-file committed-source proof establish exact text. Git CRLF/LF canonicalization is disclosed, not falsely called raw equality.
- SDK12.0.100-alpha.1.26557.102;selected runtime12.0.0-alpha.1.26562.105;actual BDN runtime `.NET 12.0.0 (12.0.26.56305)`. BenchmarkDotNet0.13.0,C#13,concurrent server GC,in-process Short,three warmups/eight actual iterations/100ms target,no outlier removal.
- Shared Windows11 Enterprise10.0.26300 guest;BDN reports unknown processor. Prior bounded hardware observation:Xeon Platinum8473C,eight guest cores/16 logical processors/68,665,884,672 bytes RAM. Builds/tests/measurements serialized,builds-m:2;no power/affinity changes or dedicated-machine assumption.

## Every final paired outcome

Negative time change means proposed faster. This table is comparison3 only,
not an average across implementations. Exact FullName identities, all eight
samples, full statistics, allocation diagnostics and raw exports are retained.

| Case | Before ns/op | After ns/op | Time change % | Before B/op | After B/op | Max CV % |
|---|---:|---:|---:|---:|---:|---:|
| `Construct/1` | 215.71 | 206.69 | -4.18 | 1024.00 | 1032.00 | 6.62 |
| `Construct/512` | 75465.39 | 88388.82 | 17.12 | 209756.00 | 224541.00 | 5.67 |
| `Construct/64` | 7850.75 | 9765.49 | 24.39 | 26825.00 | 29009.00 | 4.92 |
| `Construct/8` | 906.94 | 916.30 | 1.03 | 3832.00 | 3840.00 | 3.11 |
| `CertificateSelector512` | 2214.25 | 217.87 | -90.16 | 578.00 | 576.00 | 10.31 |
| `Empty_Control` | 26.24 | 24.41 | -6.96 | 24.00 | 24.00 | 0.97 |
| `Exact1_Control` | 33.48 | 31.11 | -7.06 | 24.00 | 24.00 | 1.52 |
| `Exact512_Control` | 32.87 | 31.10 | -5.38 | 24.00 | 24.00 | 0.92 |
| `Null_Control` | 26.44 | 23.97 | -9.34 | 24.00 | 24.00 | 1.21 |
| `OnAuthenticate512` | 2062.62 | 123.79 | -94.00 | 184.00 | 184.00 | 1.32 |
| `Overlap2` | 56.81 | 57.18 | 0.65 | 24.00 | 24.00 | 10.57 |
| `Overlap64` | 55.21 | 55.11 | -0.18 | 24.00 | 24.00 | 0.60 |
| `Patterns1_Deep_Last` | 224.03 | 225.08 | 0.47 | 24.00 | 24.00 | 0.73 |
| `Patterns1_First` | 54.42 | 55.67 | 2.30 | 24.00 | 24.00 | 1.02 |
| `Patterns1_Last` | 54.36 | 59.57 | 9.58 | 24.00 | 24.00 | 2.93 |
| `Patterns1_Miss` | 58.60 | 58.89 | 0.50 | 24.00 | 24.00 | 0.76 |
| `Patterns2_Deep_Last` | 230.37 | 230.22 | -0.06 | 24.00 | 24.00 | 0.31 |
| `Patterns2_First` | 55.10 | 56.11 | 1.83 | 24.00 | 24.00 | 2.18 |
| `Patterns2_Last` | 61.98 | 62.22 | 0.38 | 24.00 | 24.00 | 1.02 |
| `Patterns2_Miss` | 62.40 | 63.01 | 0.97 | 24.00 | 24.00 | 1.02 |
| `Patterns512_Deep_Miss` | 2428.37 | 828.60 | -65.88 | 24.00 | 24.00 | 1.42 |
| `Patterns512_First` | 54.88 | 55.52 | 1.17 | 24.00 | 24.00 | 1.10 |
| `Patterns512_Last` | 2022.06 | 78.99 | -96.09 | 24.00 | 24.00 | 1.04 |
| `Patterns512_Miss` | 2297.46 | 108.66 | -95.27 | 24.00 | 24.00 | 1.07 |
| `Patterns64_First` | 54.55 | 55.26 | 1.29 | 24.00 | 24.00 | 1.19 |
| `Patterns64_Last` | 289.31 | 78.06 | -73.02 | 24.00 | 24.00 | 0.68 |
| `Patterns64_Miss` | 344.55 | 108.56 | -68.49 | 24.00 | 24.00 | 2.66 |
| `Patterns8_First` | 54.83 | 56.59 | 3.20 | 24.00 | 24.00 | 2.59 |
| `Patterns8_Last` | 86.19 | 92.57 | 7.40 | 24.00 | 24.00 | 0.88 |
| `Patterns8_Miss` | 89.84 | 98.21 | 9.32 | 24.00 | 24.00 | 0.94 |
| `RawALabelDistinct` | 64.58 | 63.63 | -1.47 | 24.00 | 24.00 | 1.24 |
| `TrailingDot_Control` | 27.28 | 24.85 | -8.91 | 24.00 | 24.00 | 1.93 |
| `UnicodeSuffix` | 126.00 | 125.60 | -0.32 | 24.00 | 24.00 | 1.06 |
### Interpretation and non-wins

Patterns64 last/miss reduce73.02%/68.49%;Patterns512 last/miss reduce96.09%/
95.27%, saving approximately1.94/2.19 microseconds for those512-pattern inputs.
Deep512 miss reduces65.88%. First64/512 costs are1.29%/1.17% higher.
OnAuthenticate512 reduces94.00%, with184 B/op unchanged;CertificateSelector512
reduces90.16%, with578->576 B/op drift not credited as a structural saving.

Ordinary selection remains24 B/op, exactly original. Small timing non-wins
remain:1-last+9.58%,8-last+7.40%,8-miss+9.32%;many other small profiles are
approximately unchanged or1-3% slower. The exact/null/empty/trailing-dot
controls improve5-9% despite not using the new wildcard lookup. Controls and
shared-process drift prevent a universal latency claim;1-first/last are
identical configured inputs but still give different observed timings.
FinalOverlap2 and CertificateSelector512 have maximum CV10.57%/10.31%;
full distributions are included.

Construct64/512 costs24.39%/17.12% more time and2184/14785 extra allocated
bytes. Large configurations retain both the original sorted index and a
second64/512-entry dictionary of shared suffix/options references. Those are
not duplicated SSL/certificate objects, and allocated bytes are not measured
retained bytes. Small constructors add8 B/op;1/8-pattern constructor time is
-4.18%/+1.03% in the final pair, not an attributed startup win.
This is a trade-off for configurations with many wildcard patterns, not a
reason to enable an index for every ordinary small endpoint.

## Earlier comparisons and preparation failures

Comparison1 used an all-size hash index.512 last/miss reduced96.26%/95.40%,
but1/2-pattern cases rose approximately27-79%,deep1/2 rose254%/245%,and
large first-match costs rose40-51%. Constructors were17-33% slower and
allocated more. The strategy was not selected.

Comparison2 retained the original scan below nine patterns and a first-suffix
fast path above it. Large lookup gains remained,but the small scan now added
56 B/op (24->80),with8-last/miss time more than doubled. This real non-win
motivated the final small indexed iteration. OriginalCertificateSelector512
has151.73% CV and an outlier-distorted8610.55ns mean;it is preserved,not used to
inflate the final callback claim. Both earlier full33-case comparisons remain
in `all-paired-outcomes.json` and their separate raw directories.

The initial pre-measurement harness had26 option/14 real TLS rows;three deep
cost controls expanded it to29 option/17 TLS rows before any benchmark launch.
Four archived preparation sources match their actual original portable-PDB
checksums. No measured budget was reset.

Preparation-only API/reference/loader issues, an actual Schannel ephemeral-key
failure and the first misplaced-helper compile error are retained in logs.
The owned generated certificate is reloaded through in-memory PKCS#12 for
Schannel;private-key bytes are not published. The misplaced-helper attempt
failed before test assertions and consumed no comparison. All actual benchmark
launches succeeded. No failing functional test is manufactured: this is a
performance-only proposal and original correctness is green.

## Requirement coverage and actual commands

| Requirement | Evidence |
|---|---|
| Literal-dot, deepest/shorter suffix, priority and unmatched name on small and indexed sets | All8 `MatchesWildcardSuffixesAtSuccessiveLabelBoundaries` rows pass expanded-original and both final candidates;certificate identity distinguishes Long,Short and catch-all. |
| Ordinal-ignore-case,raw Unicode/A-label and supplementary-character casing on both paths | All6 `WildcardSuffixMatchingPreservesOrdinalIgnoreCaseAndRawIdnNames` rows pass expanded-original/proposed2/proposed3. |
| Constructor-owned configuration and cached/fresh options after caller mutation | Both `ReconstructingSelectorUsesUpdatedSniConfiguration` rows pass expanded-original/proposed2/proposed3;existing selector retains original certificate/options,reconstructed selector uses updated certificate. |
| Existing exact/fallback/null/invalid/duplicate/SSL-clone/callback/protocol/client-mode contracts | All31 original `SniOptionsSelectorTests` rows remain green;29 full real-owner option contracts match,and17 real Kestrel/TLS/HTTP producer receipts are identical. |
| Normal/scaled costs and persistent evidence | All33 final pairs and both earlier definitions retained;105-file isolation,204 actual owner markers,nine PDB identities,two Git text identities and six reproducible JSON summaries. |

| Actual correctness phase | Passed | Failed | Skipped |
|---|---:|---:|---:|
| Original class |31|0|0|
| Original plus first preservation rows |39|0|0|
| First proposal |39|0|0|
| Original plus expanded small/indexed rows |47|0|0|
| Corrected second proposal |47|0|0|
| Final third proposal |47|0|0|

All250 actual rows pass. Every one of the16 expanded new rows is checked by
exact test-name identity against the original and both final candidates.
The final47-row test output loaded the exact measured final owner DLL.
Final source build and two scoped formats exit0;no shipping API/baseline,
global.json,package.json,package-lock or NuGet.config changes.

Every direct .NET shell first runs `. .\activate.ps1` from the repo root.
The final actual commands are:

```powershell
dotnet test src\Servers\Kestrel\Core\test\Microsoft.AspNetCore.Server.Kestrel.Core.Tests.csproj --no-restore -c Release --filter FullyQualifiedName~SniOptionsSelectorTests --logger 'trx;LogFileName=results.trx' --results-directory "$run\tests-proposed-3" -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false
dotnet build src\Servers\Kestrel\Core\src\Microsoft.AspNetCore.Server.Kestrel.Core.csproj -c Release --no-restore -m:2 -v minimal -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false
$env:UseIisNativeAssets='false'; $env:BuildNodeJS='false'; $env:CrossgenOutput='false'; $env:GenerateInstallers='false'
dotnet format whitespace src\Servers\Kestrel\Core\src\Microsoft.AspNetCore.Server.Kestrel.Core.csproj --no-restore --verify-no-changes --include src\Servers\Kestrel\Core\src\Internal\SniOptionsSelector.cs --verbosity quiet
dotnet format whitespace src\Servers\Kestrel\Core\test\Microsoft.AspNetCore.Server.Kestrel.Core.Tests.csproj --no-restore --verify-no-changes --include src\Servers\Kestrel\Core\test\SniOptionsSelectorTests.cs --verbosity quiet
dotnet build "$run\harness\AutoPerf.Benchmarks.csproj" --no-restore -c Release -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false
```

Results respectively:47 passed/0 failed/0 skipped;source build passed;owner
format passed;test format passed;final harness build passed with0 warnings/
0 errors. All exit0. Exact argument/result JSON and full logs are included.

```powershell
dotnet "$run\binaries\$snapshot\AutoPerf.Benchmarks.dll" --verify-contracts "$run\contracts-$role.json"
dotnet "$run\binaries\$snapshot\AutoPerf.Benchmarks.dll" --verify-tls "$run\tls-$role.json"
dotnet "$run\binaries\$snapshot\AutoPerf.Benchmarks.dll" --filter '*Sni*Benchmark*' --inProcess --exporters json csv --artifacts "$run\round-$round-$variant" --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
& "$assets\summarize.ps1" -RunRoot $assets
```

All canonical original/proposed protocol commands exit0,including revalidated
isolated second/final owners;all six benchmark launches exit0;the public
summarizer exits0 and regenerates six JSON files byte-identically.

## Reproduction and scope limits

Use the exact baseline and proposal revisions above in a separate checkout,
with the repository SDK/runtime activated. Build the source test project first,
then the external harness;for a fresh external project,restore its declared
BenchmarkDotNet dependency before `--no-restore` builds. Supply
`-p:AspNetCoreRoot=C:\src\aspnetcore` if needed rather than using an installed
ASP.NET framework. Root build/test commands are documented in BuildFromSource.

Freeze the baseline Release output in a new directory. Build proposed source,
copy baseline output into a second new directory,and replace only its actual
Kestrel.Core DLL/PDB with the proposed owner. Keep exact baseline harness,
runtime/dependency configurations and all non-owner DLLs. Verify the full
recursive DLL/JSON path/hash map before real option/TLS checks and paired
commands;the archived manifests/closure maps specify the actual inputs.
The unchanged Kestrel DLL's rebuild drift is not part of the optimization.
No raw binaries or generated private keys are published.

Raw code/project bytes,empty logs,all full JSON/CSV/HTML/Markdown reports and
each earlier source version are preserved. Public diagnostics redact only
personal/session paths and TRX user/machine identifiers;TRX redactions remain
valid XML. Git attributes preserve the resulting evidence bytes.

This validates warm actual owner selection and preserved real TLS/HTTP output
on this Windows runtime. Full handshake/request throughput,representative
production pattern distributions,other runtimes/architectures and NativeAOT
remain unverified. No further local comparison is permitted for this finding.
