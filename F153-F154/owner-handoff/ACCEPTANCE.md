# Bounded characterization acceptance

- Keep F153/F154 pending, unadopted and unmeasured; no replacement implementation.
- Pin original 37e809ead5824bc753a1c3d56f11615bdb1296c5 and freshly queried upstream main; preserve failures.
- Trace and exercise the real compiled TestServer / ClientHandler request producer, distinguish response direction and direct-context controls.
- Record default/explicit/feature-mutated sync gates, byte/bulk bytes/count/EOF/exceptions and validation order at the supported boundary.
- Compile one C#13 common verifier and reuse its closure where feasible; report blockers instead of substituting an old default/runtime.
- Parse every actual selected native test row from runner XML, including skips; do not infer rows from exit status.
- Preserve raw/Git-LF source identities, selected loaded PE/runtime identities, PE/PDB associations and all-image metadata catalogs.
- Freeze one small metadata-oriented payload, run a portable Node built-in auditor, and record terminal owned processes.

Non-goals: performance measurements, allocation measurements, hot-path promotion, candidates, overrides, permanent tests, shipping changes, policy/ledger/publication, full network/browser/IIS coverage, whole-compiler-input attestation.
