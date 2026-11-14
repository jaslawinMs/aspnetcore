# F025 first prototype: pool-only BSON serialization

Round 1 uses the proposed pooled stream with the original shared helper. It is
retained completely and is **not mixed with the final rounds 2-3**.

Large text cases improve time and allocation, but all six numeric-array cases
increase allocation. Five of those arrays and several small/mixed cases also
increase time. See [the complete first-pair table](comparison.md) and
[machine-readable results](comparison.json).

The real BSON 1.0.2 writer emits markers and terminators through `BinaryWriter`.
The installed runtime's inherited `Stream.WriteByte` has a `newarr System.Byte`
instruction. The final source adds a small override that reuses the existing
span-based `Write` path; no extra comparison is run outside the three-pair budget.

[source.patch](source.patch) preserves the pool-only production changes.
[shared-helper-source.json](shared-helper-source.json) pins the original helper
to baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`;
[after-manifest.json](after-manifest.json) is the original immutable capture,
not rewritten to the later source commit.
