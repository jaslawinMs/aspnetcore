# F146 executable continuation 007

The explicit continuation authorizes local Original/default managed-producer builds/tests. It corrects the interpretation of the prior conditional hold. F146-006 and all its historical failures/interpretations remain unchanged.

## Fixed inputs and boundaries

- Original `37e809ead5824bc753a1c3d56f11615bdb1296c5`; observed default `ae89581dfd24c6277b4267a9779d05f7b9f047f1`. The live default is read separately; it never replaces either pin.
- Fresh source/output graphs only below this 007 directory. Read-only repository/toolchain/package-cache inputs; no source patch application, shipping edits, commits, installs or measurements.
- SDK `12.0.100-alpha.1.26557.102`. Explicit first-choice test runtime `12.0.0-alpha.1.26562.105` from the existing SDK-root runtime inventory. This is a lower-boundary runtime selection, not the declared unavailable-in-that-root `12.0.0-alpha.1.26568.110`. The private F145 268 runtime is separately available read-only, not silently installed into or inferred present in the SDK root.
- Activate the respective checkout before every dotnet command; set the required certificate/global-tools/node-reuse safeguards and managed build flags.
- Native QUIC, TLS, browser, full sample startup and the compiled sample assembly remain excluded.

## Green requirements

1. Both fixed source pins are independently materialized, with archive/source-input hashes.
2. Both Kestrel managed producer owners are source-built in their own output graphs; loaded owner path/hash and actual Core runtime-directory assertions execute inside every test.
3. Each role produces exactly the three prepared `F146ManagedProducerTests` TRX rows and each passes. No passing process exit may substitute for discovered-row evidence.
4. Receipt assertions observe actual bytes/string output from the exact source-extracted sample method after real managed HTTP/3 stream-type/session-ID parsing and real WebTransport session acceptance.
5. Explicitly label the extracted handler as code compiled into the test assembly, **not the compiled sample owner**. Report this managed transport boundary and the native exclusions.
6. Preserve every setup/build/test failure, exact command/exit code, compiler-input or harness-only correction, owner/runtime/output-image hash, and terminal owned PID.
7. Freeze a new handoff, with no candidate applied/executed, no performance claim and no campaign verdict. Any exact prerequisite failure is a valid bounded result, but static-only success is not producer proof.

The Original/default test builds are characterization variants, not a future candidate performance pair. Common-once image equality is not claimed for these independently built test assemblies.
