# F210 / F211: bounded http2cat diagnostic assessment

**Source-only no material candidates, not measured no-gain.** Original `37e809ead5824bc753a1c3d56f11615bdb1296c5` and independently observed Default `d3483989953ae3cccd773aea5ea04cb0c7198531` retain the eager expressions. No sample, socket, test or candidate was executed.

The actual source producer registers one hosted service/scenario, connects once, runs the request/header/DATA/trailer diagnostic callback and stops the application. Neither retained site is in a request/frame stress loop. The samples README describes inner-loop, nonproduction apps; no performance conclusion is inferred from that label alone.

**F210:** the enum string argument is eager if the `TRACE`-conditional `Trace.Assert(bool,string)` call is compiled and reached. Actual compiler symbols, IL, listener behavior and enum conversion/allocation cost remain unobserved. Repeated assertions/conversions were not manufactured.

**F211:** the actual payload is **`Memory<byte>`, not `ReadOnlySequence<byte>`**. The receive helper first makes its separate owning copy before advancing the pipeline; the retained diagnostic then copies/decodes before string-taking `LogInformation`. Normal source adds Console, and declared `AddLogging` registers the Information default; a material discarded-Information workload was not established. The ordinary parser's 16 KiB acceptance bound is source-defined, not observed DATA size. No larger payload, disabled-logger setup, repeated exchange or isolated copy benchmark was introduced. A guard/span alternative is not declared universally useless.

[Assessment/limits](evidence/ASSESSMENT.json), [actual producer and declared dependency memberships](evidence/source-membership.json), whole source files, command streams, guidance and bounded history/search are retained. The whole sources at declared dependency revisions are **not selected logger/runtime/reference or evaluated TRACE evidence**.

No product edits, private graphs, native build/test/restore/runtime probe, performance authorization, PR/window, fixed historical `REPORT.md` edit or budget reopening follows. No tests were selected after the source gate; no runtime correctness or missing prerequisite is implied.

## Verify offline

```text
node verify.mjs .
```

Add `--require-seal` after publication. This verifies all copied bytes, raw Git memberships, declared external blob identities and exact source-only boundaries, not product execution or universal immateriality.
