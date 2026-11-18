## F041: boundary-preserving rejection, not measured no-gain

The static-SSR registry really reads an initialized property bag before
inserting its registry on a miss. However, the actual public sealed
EditContextProperties belongs to Components.Forms and exposes no semantic
single-probe get-or-add to the Components.Web owner. Its concrete dictionary
is private. No public API, assembly redesign, friend grant, UnsafeAccessor,
replacement bag or second registry cache is introduced just for this matcher.

An uninitialized bag does not hash a failed lookup; a real initialized public
bag miss/set hashes the diagnostic counting key twice. Registry creation
occurs once per EditContext, not once for every input. Exact actual Type-key
probe cost/count and production frequency are not measured.

**No source change, optimized candidate or performance PR.** The independent
fork branch `autoperf/F041-field-registry-get-or-create` remains at unchanged
baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
This rejects the forced local replacement within the preserved boundary, not
every future independently reviewed optimization.

**Actual validation:** 21 existing InputBase tests pass, zero skipped. Ten
real HtmlRenderer/EditForm/InputText/ClientValidationData/public-observer
characterizations and six untimed lifecycles pass in the original and an
independently built byte-exact relocated seven-file project. Both 131-file
consumers differ only in rebuilt harness DLL/PDB. The combined live audit
rehashes 354 unique physical files and 248 loaded-assembly bindings; eight
selected source documents per image check are bound to owning PDB receipts,
not complete compiler provenance.

**One original-only BDN invocation:** six whole-render profiles / 48 retained
observations; zero source comparisons. Cold/Warm are the same original code,
not A/B variants. Cold/1 has mean 41.205 us, SD 8.264 us, CV 20.06%, and is
slower than Cold/8. Every result/outlier is retained; no causal explanation,
isolated lookup cost or optimization percentage is inferred. Historical
timing is permanently closed; relocation performs no additional timing.

Captured current default c5baf473 has 12/13 complete selected files identical;
InputBase's complete first-initialization block matches baseline while later
parsing recovery differs. No full-current-default/toolchain or newer recovery
validation, browser/client-side validation execution or application
performance is claimed. Shared Windows Hyper-V VM, not isolated; process/thread
settings are observed unchanged by the settings-preserving executor.

[Immutable evidence, runnable project and all limitations](https://github.com/jaslawinMs/aspnetcore/blob/__EVIDENCE_COMMIT__/F041/README.md) /
[exact commands and results](https://github.com/jaslawinMs/aspnetcore/blob/__EVIDENCE_COMMIT__/F041/validation-commands.md).
