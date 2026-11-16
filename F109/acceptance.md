# F109: malformed Base64 token-validation pressure

Status: acceptance recorded before shipping implementation or source comparisons.
Independent source baseline:37e809ead5824bc753a1c3d56f11615bdb1296c5.
Scanner severity/confidence/frequency labels are provenance,not a verified defect or workload-frequency measurement.

## Required boundary

Inspect the captured current default,actual owner history,related proposals and existing tests before choosing a change. Retain canonical Git bytes separately from raw working bytes. Create a separate baseline branch;preserve unrelated untracked reports and all finalized findings.

Exercise the real DataProtectorTokenProvider.ValidateAsync and Convert.FromBase64String producer of the disputed FormatException. Use real UserManager GenerateUserTokenAsync/VerifyUserTokenAsync and real public Data Protection for normal/protected-input controls;do not substitute an identity unprotector for valid-token timing. Instrument only outside timing to prove actual returned values,store/protector calls,exact provider and manager logs,and first-chance exception type/call counts.

Malformed input is an explicit caller-provided fixture or a declared mutation of an actual generated token,not a claim about its frequency. No hosted request/reset-password throughput or external-store I/O claim. Keep raw tokens/keys entirely synthetic and isolated from real identities or application key directories.

## Compatibility and correctness gates

- Preserve signatures/defaults/options/payload encoding,purpose/user/stamp comparisons,timestamp handling,complete parsing,Task behavior and all existing observable outcomes. No public API/default/convention/dependency/TFM changes,new shipping IVT or UnsafeAccessor.
- Preserve the exact existing Debug/UnhandledException event6/name/message/exception-state contract for malformed Base64. Do not silently return false. A throwing logger must still escape once,not be newly caught/retried/suppressed by the parser catch. Place any new logging outside that existing catch boundary.
- Observe original FormatException before changing the source. New focused malformed-input rows must each fail for the expected exception-count reason on the original and each pass with a candidate;ordinary false-returning tests alone cannot prove this optimization.
- Preserve whitespace-accepted Base64,valid padding and noncanonical unused-pad-bit behavior. Characterize the chosen BCL predicate against the actual Convert decoder using bounded,recorded exhaustive UTF-16 substitution/padding/whitespace/random-seed probes before selecting it. Keep this framework-equivalence diagnostic in the external harness,not a shipping unit test of framework internals.
- Cover malformed character/head/middle/end,length,padding,non-ASCII,empty/whitespace and null-outside-the-annotation controls. Also cover actual generated valid tokens,larger valid values,accepted ASCII whitespace,wrong purpose/user/stamp,expired lifespan,valid-Base64 unprotect failure,and actually protected truncated/trailing/malformed-reader payload controls. Publish the exact finalized case matrix before the first profile.
- Where a real protected fixture must be shared between frozen original/candidate processes,use one isolated generated synthetic key directory and identical input bytes for that comparison. Do not publish private key bytes. Record their identities and the replay/regeneration/expiry boundary explicitly;do not claim a portable rehash of omitted keys.
- Run source-defined existing non-skipped owning controls and narrowly scoped new tests;parse complete TRX rows/IDs/durations and verify every parameterized row. Preserve all prerequisite/build/report failures and exact command outcomes.

## Measurement and publication

Use the established Release/x64/net12/C#13/in-process BDN0.13 harness,server/concurrent GC and actual in-tree owner binaries. Freeze/hash the complete declared execution closure and source-PDB associations;keep runtime/setup/PID/input witnesses. Same harness/runtime/config/fixture bytes across variants;only intended owner differences. Do not time DI/fixture generation,assertions,first-chance listeners,serialization or manual calipers as the token-validation benchmark.

Serialize CPU-heavy work,max2 build nodes on this shared Windows machine. Activate the repository SDK in every fresh dotnet shell. Do not change power,priority,affinity or unrelated processes. Never edit global.json,package.json,package-lock.json or NuGet.config.

Maximum3 measured source comparisons,retaining every actual result/warmup/overhead/GC/resource sample and all regressions/control variation. Stop after1 only for a clear compatible roughly50percent targeted improvement with acceptable normal-input tradeoffs;otherwise tune/retest at most3. A decoder-only win is not owning-pipeline evidence. Honest no-gain/rejection is acceptable.

Publish exact sources,commands with actual outcomes,inputs/raw results/portable arithmetic/limits to the fork results branch. Verify actual staged/remote blobs and source ref before finalizing counts. For a justified change,create only a fork draft using the repository template and open it immediately;do not manufacture a PR for no-gain/rejected results. Overall358-finding campaign remains incomplete.
