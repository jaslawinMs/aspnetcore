# F015: pre-size the legacy managed encryption payload stream

**Qualified legacy allocation-improvement draft.** Real public-factory-created
managed encryption uses about **40% fewer managed bytes/op** at 64 KiB and 1 MiB.
64 KiB/SHA256 encryption takes **29.8-30.3% less time in every comparison**.
Small cases are not a universal win: SHA512/1 KiB is **15.14% slower in C3**
and **4.36% slower across the three profile means**. All results are retained.
**The modern NET implementation is unchanged and no modern-path speedup is claimed.**

Source branch: `autoperf/F015-managed-encryption-capacity`.
Source commit: `712d50cadb28c2bfe164495dfecdc7683f09d26c`.
Independent baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
The later additive [publication.json](publication.json) links the actual fork
draft and issue; the measured source/ref checks are in
[source-branch-publication.json](source-branch-publication.json).

## Change and scope

Three lines replace the non-NET branch's default-capacity `MemoryStream`
constructor: checked CBC/PKCS7 ciphertext size, checked total modifier/IV/
ciphertext/MAC size, and named initial capacity. Existing writes, CryptoStream,
HMAC, `ToArray`, algorithm selection, offsets, cleanup and branch structure stay.
The focused eight-row Theory adds 33 lines. Total shipping diff: **2 files,
36 additions, 1 deletion**. No API, default, dependency, TFM or visibility change.
F016 Decrypt is intentionally separate.

Actual product targets are net462, netstandard2.0 and net12.0. Only the first two
compile the changed branch. The historical finding's `tfm_sensitive:false`
is not an accurate description of this source; the inventory was not rewritten.
Upstream dotnet/aspnetcore#70146 already improves the modern direct-buffer path;
this is the remaining legacy stream seam, not a duplicate modern proposal.

Nineteen baseline/current-default/working source triples were captured before
implementation. The actual owner/factory/tests match default
`49147673007a4b1d676694e2c5f85b83ad76c36f`; only `eng\Versions.props` differs
among those selected files. This is not a full newer-SDK/dependency integration.
The [original acceptance](acceptance.json) remains intact. Its
[pre-timing Framework addendum](acceptance-addendum-framework-runtime.json)
upgrades measurement from compatibility-host execution to actual Framework.

## Real producer and measurement boundary

Actual `ManagedAuthenticatedEncryptorConfiguration`, `Secret.Random(64)`,
`ManagedAuthenticatedEncryptorDescriptor` and public
`ManagedAuthenticatedEncryptorFactory.CreateEncryptorInstance` produce the
backend. A strict Moq `IKey` supplies only its public Descriptor getter in
untimed setup, following the owning factory test; it is checked exactly once.
No copied encryptor, private invocation, new IVT/UnsafeAccessor, algorithm or
entropy substitute is used. The runtime backend type is asserted.

Each timed call is actual warm `IAuthenticatedEncryptor.Encrypt`, including its
real default per-operation randomness and real AES/MAC work; the returned
`byte[]` is consumed. Factory/descriptor/key/input construction, decryption and
validation are outside timing. Actual setup/cleanup roundtrips check expected
payload sizes, plaintext offset3, AAD offset5 and ciphertext offset4, and unchanged
whole input buffers. This is not key-ring/storage/serialization/network,
whole-application traffic or production-frequency evidence.

Actual measured host: **net472/x64 executable, real net462 product**, Windows
Framework CLR `4.0.30319.42000`, corelib `4.8.10008.0`, installed release534296.
BDN calls this .NET Framework4.8; actual versions/hashes are retained. The observed
GC is **concurrent workstation, not Server GC**. Earlier netstandard2.0-on-net12
preflights are separate untimed evidence, not the measured runtime.

## Every measured outcome

Percentages are `(candidate / original - 1) * 100`; negative is lower.
The table below averages the three independent per-profile means and B/op
values without pooling operations or weighting hypothetical application traffic.
See [analysis-table.md](analysis-table.md), [analysis.json](analysis.json)
and every [raw profile](measurements).

| Shape | Original us | Capacity us | Time change | Original B/op | Capacity B/op | Allocation change |
|---|---:|---:|---:|---:|---:|---:|
| Aes256Sha256_P0 | 103.956 | 103.172 | -0.75% | 2949.7 | 2747.7 | -6.85% |
| Aes256Sha256_P15 | 103.731 | 104.080 | 0.34% | 2951.0 | 2748.0 | -6.88% |
| Aes256Sha256_P16 | 103.919 | 105.227 | 1.26% | 3005.0 | 2820.0 | -6.16% |
| Aes256Sha256_P17 | 104.212 | 103.973 | -0.23% | 3004.7 | 2819.7 | -6.16% |
| Aes256Sha256_P191 | 104.080 | 104.544 | 0.45% | 3327.0 | 3302.7 | -0.73% |
| Aes256Sha256_P192 | 104.434 | 104.163 | -0.26% | 3895.0 | 3354.0 | -13.89% |
| Aes256Sha256_P193 | 105.290 | 104.841 | -0.43% | 3896.7 | 3350.7 | -14.01% |
| Aes256Sha256_P1024 | 107.853 | 105.815 | -1.89% | 8256.0 | 5850.3 | -29.14% |
| Aes256Sha256_P65536 | 326.346 | 228.552 | -29.97% | 331381.7 | 199651.0 | -39.75% |
| Aes256Sha256_P1048576 | 3110.408 | 2597.775 | -16.48% | 5250192.3 | 3151920.7 | -39.97% |
| Aes256Sha512_P0 | 108.693 | 111.681 | 2.75% | 3382.7 | 3214.3 | -4.98% |
| Aes256Sha512_P16 | 112.336 | 111.705 | -0.56% | 3439.3 | 3287.3 | -4.42% |
| Aes256Sha512_P1024 | 115.123 | 120.146 | 4.36% | 8688.7 | 6322.3 | -27.23% |
| Aes256Sha512_P1048576 | 4647.587 | 4106.303 | -11.65% | 5250705.3 | 3151461.3 | -39.98% |

| Shape | C1 time | C2 time | C3 time |
|---|---:|---:|---:|
| Aes256Sha256_P0 | -0.73% | -0.55% | -0.98% |
| Aes256Sha256_P15 | +0.50% | +0.40% | +0.11% |
| Aes256Sha256_P16 | +4.64% | -0.16% | -0.65% |
| Aes256Sha256_P17 | -0.55% | +0.83% | -0.95% |
| Aes256Sha256_P191 | +1.35% | +0.48% | -0.49% |
| Aes256Sha256_P192 | +0.56% | -0.01% | -1.30% |
| Aes256Sha256_P193 | -0.18% | -0.27% | -0.83% |
| Aes256Sha256_P1024 | -1.56% | -2.17% | -1.93% |
| Aes256Sha256_P65536 | -29.76% | -30.25% | -29.88% |
| Aes256Sha256_P1048576 | -10.87% | -19.04% | -19.07% |
| Aes256Sha512_P0 | -0.19% | +8.30% | +0.11% |
| Aes256Sha512_P16 | -0.87% | -0.59% | -0.25% |
| Aes256Sha512_P1024 | -1.83% | -0.38% | +15.14% |
| Aes256Sha512_P1048576 | -6.81% | -14.00% | -13.77% |

The adverse SHA512/empty C2 observation is 109.080 -> 118.129 us (**+8.30%**);
SHA512/1 KiB C3 is 116.268 -> 133.870 us (**+15.14%**). Those rows are not
discarded or causally explained as VM scheduling. Small-input latency
preservation and a universal throughput improvement are not established.
The repeated large-payload allocation reduction is the primary proposal.

Three slots used and permanently closed: C1 original/candidate, C2
candidate/original, C3 original/candidate. No tuning between comparisons.
**6 profiles, 84 successful reports, 672 raw actual workloads, 615 retained,
57 upper-filtered, 252 warmups, 1519 actual overhead iterations.**
Both roles share one exact Framework executable/PDB/dependency image; among91
image files per role, only owner DLL/PDB differ. Earlier compatibility images
have76 files per role with the same two-file difference.

BDN0.13.0, Throughput, requested100 ms iterations, 3 warmups/8 actuals, unroll1,
settings-preserving emitted executor and `Guid.Empty` power policy. Default
upper-only filtering remains enabled; raw discarded samples are also retained.
The two1MiB enum values have identical abbreviated `Parameters` display strings.
The extractor uses unshortened `FullName` plus ordered real native setup/cleanup
records, not the ambiguous display string.

Shared Hyper-V Windows VM; no dedicated-host claim. All168 actual per-case
before/after settings records agree with initial Normal process/thread priority
and affinity65535. No deliberate OS setting or unrelated-process changes.
BDN's attributed same-DLL GcStats source uses
`AppDomain.CurrentDomain.MonitoringTotalAllocatedMemorySize` on Framework, with
forced-GC accounting and midpoint-even B/op rounding. This is **AppDomain-inclusive
managed operation/diagnostic allocation**, not isolated MemoryStream bytes,
native allocation, peak memory or working set. The raw GC denominator is the
recorded diagnostic operation count, not eight times that count.

## Preservation and validation

Original and candidate each pass **39 net12 + 23 net472** owning rows, no skips:
**124 actual passing rows, including32 executions of the eight new Theory
payloads**. These are preservation tests, not a manufactured functional red/green
claim; the original/fixed difference is the measured allocation/time comparison.
Existing deterministic payload-vector tests remain. All three product TFMs build
with0 warnings/errors. The formatter selected exactly the two changed files and
changed0 of2. Actual enabled `dotnet pack --no-build --no-restore` APICompat
validation passes, and all three packed owner DLLs match the frozen products;
the existing released-package baseline version is unset, not newly supplied.

Four actual original/candidate compatibility/Framework preflights plus all six
timed profiles give **336 real roundtrip records, 12 input argument contracts,
20 PE/PDB witness records and110 selected source-document checks**.
All432 frozen files across the four contexts were rehashed before omission;
56 source snapshots are independently rehashed by the copied portable audit.
Selected source witnesses are not full compiler provenance or method coverage.
Integer/process/array limits near multi-gigabyte inputs were not physically
exercised; no exact inner-exception/allocation-timing equivalence is claimed.

Exact historical commands and observed exits/results:
[validation-commands.md](validation-commands.md). Preserved preparation failures
include legacy PowerShell's missing Get-FileHash, the first dual-target harness's
missing Newtonsoft reference, one intermediate CA1416 warning, and the extractor's
shortened-Parameters assumption. A later scope-annotation-only correction keeps
the earlier successful numeric extraction byte-for-byte; no timing was repeated.

## Reproduce without overwriting evidence

Keep this capsule outside an ASP.NET Core source checkout. Restore/build that
checkout using its documented Windows build prerequisites and local SDK.
The standalone [harness](harness) pins BDN0.13.0/Moq4.20.72/Newtonsoft.Json13.0.4,
C#13 and targets net472/net12.0. The net472 host references the actual net462
owner; net12 references actual netstandard2.0, not the modern net12 owner.
The latest dual-target net12 binary was built but not executed; its earlier
single-target compatibility predecessor was executed. Only Framework is timed.

From the capsule directory:

```powershell
# Does not execute a native profile. Uses the caller-selected source checkout.
.\F015-run-fresh.ps1 -AspNetCoreRoot C:\src\aspnetcore `
    -OutputRoot C:\benchmarks\F015-candidate-preparation -Mode Prepare
```

The helper activates `activate.ps1`, builds the external Framework project,
restores only after an actual missing-assets failure, and copies fresh source
and executable witnesses. For a new independent experiment, choose a new output
directory and explicitly use `-Mode Characterize` or `-Mode Measure`.
Build the baseline and source commit in separate source checkouts and compare
their outputs. Fresh PDB/MVID/informational-version identities can differ from
these measured pre-commit binaries; do not relabel old outputs as a fresh build.
This campaign's three comparisons are closed and are never overwritten.

Recompute copied historical results without any .NET build or timing:

```powershell
node .\F015-analyze.mjs . --verify
node .\F015-audit.mjs . --verify
```

These reparse all raw/report rows, overhead compensation, R7 upper filtering,
retained samples, means/sample variance/SD/SE/quantiles, CI-bound arithmetic,
raw GC rounding, copied source witnesses and actual TRX identities.
Student-t quantiles and host clock calibration are not independently reproduced.
DLLs/executables/PDBs/binlogs/packages/ephemeral restore trees are omitted with
exact hashes; portable verification does **not** reopen omitted binary bytes.
Do not run guarded `historical-*` drivers as a new experiment.
