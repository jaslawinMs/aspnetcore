# F016: legacy managed decryption capacity - measured trade-off, no PR

**No recommended shipping change or performance PR.** One compatible capacity candidate completed all three authorized comparisons. Large partial-block inputs consistently allocate about 40% less, and the 64 KiB+1 SHA256 case is 34-36% faster in every comparison. Those are real retained benefits, not erased by the `no-gain` campaign bucket. However, small/aligned controls and large-case latency reversals prevent the combined allocation/aggregate-latency acceptance gate from passing. SHA512 1 MiB+1 is 57.11% slower in comparison 3 and 8.91% slower in the non-pooled aggregate. No fourth run, tuning after the budget, or dismissal of that observation as noise.

The independent source branch remains at the unchanged baseline. The exact measured candidate and new passing preservation test remain in [candidate.patch](candidate.patch) and the frozen source snapshots. This is a conservative result for this experiment on this box, not proof every future design is impossible or that no allocation improvement exists.

## Finding and source scope

- Baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Captured current default: `49147673007a4b1d676694e2c5f85b83ad76c36f`.
- Fresh investigation captures 19 selected baseline/default/working source triples, owner/factory history, exact-symbol open-PR search, documentation and installed Framework facts. Only `eng\Versions.props` differs among those selected files. This is not a whole-current-default SDK/dependency build or repository-wide overlap search.
- The legacy non-`NET` branch of `ManagedAuthenticatedEncryptor.Decrypt` writes through the actual CryptoStream to a default-capacity MemoryStream, then returns ToArray. The modern branch already has a sized buffer and is not measured.
- The historical finding's `tfm_sensitive:false` and "exact plaintext length" wording are incorrect. Protected-payload layout gives the **padded-ciphertext upper bound**, not exact unpadded plaintext length. Original calls do not all necessarily resize.
- Merged dotnet/aspnetcore#70146 concerns the modern path; its measurements are not reused. The bounded open-PR search found dotnet/aspnetcore#66438 cross-version testing, not an already implemented legacy capacity change.

The sole owner statement changed during the experiment was:

```csharp
var outputStream = new MemoryStream(capacity: macOffset - ciphertextOffset);
```

It uses the same bounded byte count already passed to CryptoStream.Write, after existing payload processing and transform construction. Surrounding locals, reads/writes, finalization, ToArray, lifetime, exception processing, algorithms, public API and the entire Encrypt implementation were untouched. F015's independent Encrypt optimization is deliberately absent. The complete temporary diff is two files, +37/-1, including a 36-line preservation Theory; both files are now restored.

## All measured results

Negative change means lower candidate cost. Values below are the **unweighted arithmetic means of three per-profile means and B/op values**, not pooled samples or production-weighted application measurements. Every case and adverse result is retained.

{{AGGREGATE_TABLE}}

{{ROUND_TABLE}}

The SHA256 64 KiB+1 case changes from 282.168 to 182.555 us and 330896.3 to 199559.7 B/op in that aggregate: 35.30% lower time and 39.69% lower inclusive allocation. The SHA256 1 MiB+1 aggregate has 39.94% lower allocation but only 3.46% lower time; comparison 2 reverses to +3.47% time.

The SHA512 1 MiB+1 sequence is -9.19%, -16.36%, **+57.11%** time. Its last candidate profile has 18.80% within-profile CV, but that does not establish a cause or authorize dropping it. Its aggregate is 3326.249 to 3622.659 us (+8.91%) while allocation falls 39.95%. Small SHA256 aggregates are 4-16% slower; empty inputs also increase B/op. Aligned 64 KiB/1 MiB controls do not establish structural allocation savings. No universal improvement, causal explanation for control movement, or latency-preservation claim is made.

All three partial-large shapes pass the repeated material-allocation check. The additional check that every partial-large aggregate improves time fails. [The actual audit](measurement-audit.json) therefore records `performancePrJustified:false`, `proposalDisposition:no-gain-or-inconclusive`. This policy is not changed after seeing the unfavorable last profile.

## Actual producer, timing and accounting

The timed method calls actual public `IAuthenticatedEncryptor.Decrypt` and returns its real byte array for BDN consumption. Outside timing, the public managed configuration/descriptor, Secret.Random and factory create the actual managed backend; strict Moq supplies only public IKey Descriptor metadata. Actual public Encrypt produces the fixed payload with real default entropy outside timing. **Decrypt itself has no per-operation RNG claim.** No copied backend, private invocation, new framework visibility, replacement algorithm, mocked entropy or timed payload creation.

The 21 predeclared shapes cover SHA256 plaintext lengths 0/15/16/17/191/192/193/255/256/257/1024/1025/65536/65537/1048576/1048577 and SHA512 0/1024/1025/1048576/1048577. Actual plaintext/AAD/ciphertext offsets are 3/5/4. Full output equality, protected length, padding upper bound, whole input-buffer preservation and actual backend identity are checked outside timing.

Primary host is an actual **net472/x64 executable loading the real net462 product** on installed Framework: CLR `4.0.30319.42000`, corelib `4.8.10008.0`, release 534296, concurrent workstation GC. BDN labels it Framework 4.8. The project requests ServerGC, but that is not assumed to be the observed Framework mode. The untimed compatibility host is net12 loading real netstandard2.0, not the modern product. No net12-path throughput is claimed.

Shared Hyper-V Windows VM: Intel Xeon Platinum 8473C, 1 reported processor/8 cores/16 logical processors; Windows 10.0.26300; pinned SDK `12.0.100-alpha.1.26557.102`. The compatibility host runtime is `12.0.0-alpha.1.26562.105`. This is not a dedicated or isolated box.

- Three original/candidate comparisons, role order O/C, C/O, O/C; one unchanged source candidate, no diagnostic-only profile.
- Six complete 21-case profiles, **126 reports, 1008 raw actual samples, 952 retained, 56 upper-filtered, 378 warmups, 2256 actual overhead iterations**.
- BDN 0.13.0, throughput, requested 100 ms iterations, 3 warmups/8 actuals/unroll 1; settings-preserving emitted executor and Guid.Empty power policy.
- All 252 before/after settings records match Normal process priority, Normal thread priority and affinity 65535. No deliberate power/priority/affinity changes or unrelated-process termination.
- Paired Framework images have 91 files each; compatibility images have 77 each. Within each family, only actual owner DLL/PDB differ. The exact same compiled benchmark/PDB/config/nonowner dependencies are compared.

**Allocation boundary:** actual Framework BDN uses AppDomain.CurrentDomain.MonitoringTotalAllocatedMemorySize and forced-GC diagnostic accounting. B/op includes other managed activity in the same AppDomain, not isolated stream/owner bytes, native allocation or working set. Raw GC tuple denominators and midpoint-even rounding are checked; they are not multiplied by eight. Source attribution to BDN v0.13.0 is retained, not an independent full source-to-DLL rebuild.

## Preservation coverage and verification

**Requirement coverage**

- `Decrypt_BlockAndStreamBoundaries_PreservesPayloadAndInputs` checks actual Encrypt-produced payloads, exact Decrypt output and whole ciphertext/AAD/plaintext input preservation at nonzero offsets for all nine `(plaintextLength,expectedPayloadLength)` rows: `(0,80)`, `(15,80)`, `(16,96)`, `(17,96)`, `(255,320)`, `(256,336)`, `(257,336)`, `(65536,65616)`, `(65537,65616)`.
- Both original and candidate successfully run the exact owning command below for **each** `net12.0` and `net472`: 40 and 24 passed rows respectively, zero failed/skipped. All 36 new Theory executions are individually validated in actual XML-parsed TRX files, not inferred from a green summary. Preservation passes on both versions by design; this is not functional bug-fix red/green.

```powershell
. .\activate.ps1
dotnet test src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj -c Release -f net12.0 --no-restore -m:2 -v:minimal --filter 'FullyQualifiedName~ManagedAuthenticatedEncryptorTests|FullyQualifiedName~ManagedAuthenticatedEncryptorFactoryTest' --logger 'trx;LogFileName=focused-net12.0.trx'
```

**Result:** original 40 passed; candidate 40 passed. The actual `-f net472` executions pass 24 rows per role. Full exact historical arguments, including result directories and binlogs, and observed exits are in [validation-commands.md](validation-commands.md).

Both roles build actual product `net462;netstandard2.0;net12.0` with zero warnings/errors. The standalone dual-target project builds cleanly. The scoped formatter selects exactly two files and changes 0/2. Candidate pack actually runs enabled APICompat successfully with zero warnings/errors; all three packed owner DLLs match frozen products. The released-package baseline version is unset, so no released-baseline comparison is claimed.

Four actual untimed host/role contexts pass 252 real roundtrip records and 12 argument contracts, including default segments and empty AAD. Six profiles add 252 setup/cleanup roundtrip records. The independent live audit rehashes **406 frozen files**, 28 source snapshots and reconciles **20 actual PE/PDB witness records/110 selected source documents, 504 real roundtrip records, 128 owning TRX rows and 252 settings records**.

Raw readers recompute all workloads, median overhead compensation, R7 upper filtering, retained values, mean/N-1 variance/SD/SE/quantiles, CI-bound arithmetic and raw GC tuple/denominator/rounding. Student-t quantiles and host clock calibration are not independently reproduced. Selected source witnesses are not complete compiler provenance or method coverage.

## Reproduction and immutable evidence

The original branch is `autoperf/F016-managed-decryption-capacity` at the unchanged baseline. [candidate.patch](candidate.patch) applies exactly there and includes the measured owner change plus new test. Owner/test source snapshots and every raw console/JSON/CSV/HTML/TRX result remain in this capsule. Source restoration does not claim another test run.

[harness\AutoPerf.Benchmarks.csproj](harness/AutoPerf.Benchmarks.csproj) is standalone C#13 with explicit actual legacy product references. [F016-run-fresh.ps1](F016-run-fresh.ps1) supports Prepare, Characterize and explicitly requested future Measure modes. It requires a new output directory outside the source checkout, records the actual checkout revision **and tracked patch**, copies source/runtime images, and never rewrites historical results.

Relocated project preparation was actually exercised on both original and candidate: both build/restore successfully and prepare 91-file Framework images in **Prepare mode only**. No native executable or new timing was run. Historical comparison budget remains permanently 3/3 closed.

Example for a separate future reproduction, **not additional historical campaign execution**:

```powershell
# From an independent baseline checkout; $capsule is this downloaded directory.
. .\activate.ps1
& "$capsule\F016-run-fresh.ps1" -AspNetCoreRoot C:\src\aspnetcore -OutputRoot C:\temp\F016-original-new -Mode Characterize
git apply "$capsule\candidate.patch"
& "$capsule\F016-run-fresh.ps1" -AspNetCoreRoot C:\src\aspnetcore -OutputRoot C:\temp\F016-candidate-new -Mode Characterize
```

A separate future owner can explicitly choose Measure instead; that is not a fourth authorized historical run here. Hardware/OS/runtime and fresh key/payload instances can differ, so exact historical timing is not promised.

Copied portable checks:

```powershell
node .\F016-analyze.mjs . --verify
node .\F016-audit.mjs . --verify
```

**Both exit 0** in the copied capsule. They recheck recorded samples/source/native/TRX consistency, not deliberately omitted binary/PDB/binlog/package/runtime-image bytes. Those omitted files are hashed in the omission manifest. Raw evidence is copied byte-for-byte, never normalized to silence whitespace checks.

Unverified boundaries include multi-gigabyte/int/process/array limits, other Framework/runtime/algorithm/host distributions, actual production input frequency, complete current-default SDK/dependency integration, application/key-ring/serialization/storage/network behavior and cause of adverse timing. No API/default/dependency/TFM changes, repository package-manifest changes or new visibility were retained.
