# Rejected first prototype

Round 1 used eager count eligibility and had no known-invalid ModelState
safeguard. Its real large-case gains are preserved, but its sparse invalid
submissions increased heap approximately 42-45% and its empty control regressed
26.8%. These statistics do not describe the final proposal.

Apply [source.patch](source.patch) to baseline
`37e809ead5824bc753a1c3d56f11615bdb1296c5` to reproduce the original shipping
experiment. The byte-level source reconstruction is checked against the
original measured [after manifest](after-manifest.json).
The harness is identical to the final proposal's harness.

[Original pair table](comparison.md) and [machine-readable values](comparison.json)
preserve every timing/allocation result.
Full raw exports remain in [round-1-before](../round-1-before) and
[round-1-after](../round-1-after).
The final implementation's table uses only rounds 2-3.
