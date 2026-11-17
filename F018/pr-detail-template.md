**Fork-only allocation/synthetic-scaling draft, not merge-ready.**

Avoid one UTF-16 bridge in `GoogleHandler.CreateTicketAsync` only for nonempty,
valid, canonically declared UTF-8. Preserve other/missing/quoted charset
decoding, replacement decoding for invalid UTF8, exactly-one-BOM behavior,
existing cancellation outcomes, awaited-event/document lifetime and request/
response ownership. This is not streaming: ResponseContentRead still buffers,
and the selected path makes an owned byte copy.

The exact two-file diff is +143/-1, including the 18-row
`UserInfoResponseEncodingPreservesClaims` hosted challenge/callback/cookie test.
No public/protected signature, default, challenge formatting, API baseline,
dependency, target framework, visibility grant or other provider is changed.

### Actual measured result and limits

One paired original/candidate profile of the actual DI/options-initialized
handler with real HttpClient/producing HttpContent, real claim actions and ticket
consumption. No copied owner/parser surrogate or external network/browser/full
callback is timed. DI, payload construction and yielding-event assertions are
outside timing; the non-yielding event path and equal external cleanup are timed.
`16K`/`64K` mean ASCII padding: actual JSON byte lengths 16,549/65,701.

The 16 KiB case is 50.86% lower time/31.12% lower inclusive managed B/op; 64 KiB
is 80.09%/32.75% lower. **One of three allowed comparisons was used**, because
the predefined >=50% large-case early-stop criterion and all semantic/identity
gates passed. Budget permanently closed; this is not three repetitions.
Warm C#13/net12/x64/serverGC, BDN 0.13.0, runtime 12.0.0-alpha.1.26562.105;
shared Windows Hyper-V VM, unchanged observed Normal process/thread/affinity
settings, no requested power-plan change.

{{AGGREGATE_TABLE}}

**Retained adverse results:** invalid UTF8 16 KiB is 15.19% slower/+31.26% B/op;
invalid small is 8.32% slower/+6.42% B/op. UTF16 16 KiB is 7.40% slower with
unchanged allocation; missing/quoted charset and other controls have non-wins.
Unicode16K has only 0.23% allocation reduction despite lower time. No universal
win, default-login gain, provider production-size/frequency, or merge-readiness
claim. One large warm in-memory observation is not an 80% faster Google login.

Source: `@SOURCE_COMMIT@`, built/measured as the baseline plus exact retained
patch before that commit. Current default `49147673007a4b1d676694e2c5f85b83ad76c36f`
was captured; only Versions.props differs among 18 selected source triples, not a
full current-default SDK integration claim. F082 was source-pattern prior art,
not reused measurement data; F091's independent Google challenge change is absent.

### Validation and evidence

Both actual Google suites pass 68/68, including all 18 safe-labeled rows per role
and exact decoded claims, awaited yielding event, post-event document disposal
and persisted authentication cookie. Native audits establish 48 wrapper
preflights, 192 profile contracts and 24 actual-producer cancellation contracts.
Before/during-buffer cancellation prevents a ticket; actual after-buffer
cancellation returns a ticket on both versions. No functional bug-fix red/green
claim: preservation tests intentionally pass on original and candidate.

All 290 frozen files rehashed; paired 124-file images differ only in Google DLL/PDB,
with identical harness and all other images. 12 actual PE/PDB witness records/
32 selected document checks are not complete compiler provenance or test-PDB
source binding. Independent reader verifies 48 reports/384 workloads/357 retained/
27 upper-filtered/144 warmups/940 overheads, median overhead, R7 filtering/
statistics, reported CI-bound arithmetic and raw GC tuple/denominator/rounding.
No independent Student-t quantile/host-clock derivation. Attributed precise
process-wide managed GC allocation, not isolated string/native bytes.

Initial default test build is blocked before assertions by ANCM native assets;
successful managed TestServer mode still builds actual references and does not
validate native ANCM integration. Initial unnecessary Newtonsoft-import compile
failure is retained; final harness uses existing System.Text.Json. Actual
enabled APICompat pack passes and packed net12 owner equals frozen candidate;
released baseline version unset. Exact historical commands/results:

@COMMANDS@

The relocated candidate-only fresh helper Prepare build actually passes,
124 image + 9 source files; no extra native execution/timing or historical budget
reopening. Both source variants' actual native preflights are separately retained.

**[@FILE_COUNT@ immutable evidence files](@EVIDENCE@/README.md):** complete
matrix, runnable standalone project/helper, exact patch, raw logs/exports,
actual TRX rows, source/runtime witnesses, independent portable audit and every
failed preparation attempt. Binary/binlog/package images are omitted with
hashes; portable checks do not reopen them. External Google/network/browser,
production input distribution, custom encoding-provider substitutions,
other OS/runtime and deployment-wide effects remain unverified.
