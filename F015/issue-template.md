## Scope

F015 independently evaluates the remaining default-capacity MemoryStream in the
non-NET `ManagedAuthenticatedEncryptor.Encrypt` path. The current modern NET
direct-buffer implementation is intentionally unchanged. F016 Decrypt is separate.
This is a fork-local performance tracking issue, not upstream approval.

The proposed checked CBC/PKCS7/header/MAC capacity preserves the existing
producer, algorithms, writes, ToArray and cleanup. Two source/test files change;
no public API, default, dependency, TFM or visibility changes.

## Measured outcome

Actual public-factory-created managed encryption on a real net462 product,
net472/x64 host and installed Windows Framework corelib4.8.10008:
39.7-40.0% less AppDomain-inclusive managed allocation for64KiB/1MiB;64KiB SHA256
takes29.8-30.3% less time in every comparison. All3 comparisons are closed.

Not a universal latency improvement: SHA512/1KiB C3 is15.14% slower and the
three-profile mean is4.36% slower; SHA512/empty C2 is8.30% slower. All controls,
raw workloads, retained/filtered samples and unfavorable outcomes are retained.
No modern-path, whole-application or production-frequency speedup is claimed.

## Evidence and preservation

[Immutable complete capsule](@EVIDENCE@/README.md):
84 actual successful BDN reports/6profiles;124 actual passing owning test rows
including32 executions of the8 new preservation payloads;336 real roundtrip
records; all3 product TFMs build; actual enabled package-validation gate passes.
Actual source/test/native image/source-witness/raw-math checks are retained,
along with failed untimed preparation and extraction attempts.

The capsule contains the standalone dual-target BDN project, a fresh-run helper,
all14 aggregate/per-round results, exact commands with outcomes, copied portable
verification and explicit omitted-file hashes/limitations. Historical source
and compiled bytes are not relabeled as a later build. This issue is intended
to accompany the independent fork draft, not to promise RTM/merge readiness.
