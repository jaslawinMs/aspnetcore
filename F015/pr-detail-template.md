Pre-size the existing **non-NET** managed encryption stream from the checked
CBC/PKCS7 ciphertext and modifier/IV/MAC sizes. Existing writes, CryptoStream,
ToArray and cleanup remain. The modern NET branch and F016 Decrypt are untouched.
Shipping diff: **2 files,+36/-1**, including one eight-row preservation Theory;
no API/default/dependency/TFM/visibility change.

**Qualified legacy allocation improvement, not a universal latency win.**
Actual net472/x64 host and real net462 product on Windows Framework
corelib4.8.10008, **concurrent workstation GC**:
large payloads use about40% fewer AppDomain-inclusive managed bytes/op, and
64KiB/SHA256 encryption takes29.8-30.3% less time in all three comparisons.
SHA512/1KiB is **15.14% slower in C3 /4.36% slower across profile means**;
SHA512/empty C2 is **8.30% slower**. These are retained, not dismissed as noise.
No modern-path, whole-app or production-frequency speedup is claimed.

### Complete results

Percentages are `(candidate / original - 1) * 100`; negative is lower.
Aggregate values are unweighted means of the three per-profile means and B/op,
not pooled operations or hypothetical traffic-weighted application results.

@AGGREGATE_TABLE@

@ROUND_TABLE@

### Faithful boundary and limits

Actual public managed configuration/descriptor, Secret.Random and
`ManagedAuthenticatedEncryptorFactory` produce the real backend. Strict Moq
supplies only public IKey Descriptor metadata outside timing, as in the owning
factory test. Timed calls execute actual Encrypt, real default entropy and
real algorithms and return the actual consumed byte[]. No copied owner,
private invocation, new IVT/UnsafeAccessor or replaced entropy/algorithm.
Setup/cleanup checks actual roundtrips, payload lengths, all offsets and whole
input preservation. Key-ring/storage/network and factory construction are excluded.

Three comparison slots permanently closed, no source tuning:
6profiles/84reports/672raw actuals/615retained/57upper-filtered/252warmups/
1519actual overhead iterations. Same compiled Framework executable/PDB/dependencies;
only owner DLL/PDB differ among91 image files per role. BDN0.13.0,
Throughput100ms requested,3warmups/8actuals,unroll1,settings-preserving emitted
executor and Guid.Empty power policy. All168 settings records agree.
Shared VM, no isolation or OS-setting-change claim.

Allocation uses Framework's attributed AppDomain-inclusive diagnostic counter,
not isolated MemoryStream bytes, native bytes or working set. All raw/report/
retained mappings, R7 upper filtering, overhead compensation and GC denominator/
midpoint-even rounding are checked. Student-t quantiles and host clocks are not
independently reproduced. Near-int/process/array limits were not physically exercised.

### Preservation and actual validation

Original/candidate each: **39net12+23net472 passed,0skipped**;124rows total,
including32 actual executions of every new8-row Theory. These are preservation
checks, not a functional bug's manufactured red/green claim. Existing payload
vectors remain; all3 product TFMs build. Actual enabled APICompat package
validation passes and all3 packed owner bytes match frozen products;
existing released-package baseline version is unset.

@COMMANDS@

Actual full commands/outcomes, including all six native profile commands and
retained untimed failures: [validation-commands.md](@EVIDENCE@/validation-commands.md).
The fresh standalone relocation probe builds successfully without native timing.
No fourth campaign comparison is authorized.

### Reproduction and immutable evidence

[Complete source/project/raw-result capsule](@EVIDENCE@/README.md),
[standalone BDN project](@EVIDENCE@/harness/AutoPerf.Benchmarks.csproj),
[fresh-run helper](@EVIDENCE@/F015-run-fresh.ps1),
[independent audit](@EVIDENCE@/measurement-audit.json).

**@FILE_COUNT@ immutable files**, byte-verified on the fork. The copied portable
audit rehashes56 source snapshots/110 selected source witnesses and matches all
124 actual TRX rows;336 real roundtrips/12contracts/20PEPDB observations are retained.
All432 frozen files were rehashed before omission. Binary/PDB/binlog/package
images are omitted with hashes; portable verification does not reopen omitted bytes.
Actual failures and earlier harness versions remain, including a display-name
extractor repair and scope-annotation-only correction with unchanged numeric data.

Measured baseline-plus-patch bytes precede source commit
`@SOURCE_COMMIT@`; they are not relabeled as a build of that later commit.
Selected source witnesses are not whole compiler provenance. Captured default
`49147673007a4b1d676694e2c5f85b83ad76c36f` matches the selected owner/factory/tests,
but not the entire newer SDK/dependency configuration. Upstream
dotnet/aspnetcore#70146 addresses the separate modern path.

Fork-only draft for review; no upstream pull request is created.
