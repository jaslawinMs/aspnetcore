# F018: guarded UTF-8 Google user-info proposal

Track the independent `stream-materialized-before-stream-consumer` finding in
`GoogleHandler.CreateTicketAsync`. This is a **fork-only, not-merge-ready**
allocation/synthetic-scaling proposal; no external Google/login/production
speedup is established.

One actual original/candidate profile pair gives the ASCII 16 KiB-padding case
-50.86% time/-31.12% inclusive managed allocation and 64 KiB -80.09%/-32.75%.
The predefined >=50% large-case early-stop rule applies; all raw/native/source/
unit/formatter/package gates pass and the historical budget is closed after
one of three allowed comparisons.

The guarded owned-UTF8 path preserves charset/BOM/replacement decoding and
awaited-event document lifetime. It is not streaming and still copies bytes.
Invalid UTF8 16 KiB costs +15.19% time/+31.26% allocation; all 24 rows and
fallback/control non-wins are retained. Production input distributions are
unestablished, so the trade-off needs review rather than merging as-is.

Both actual Google suites pass 68/68, including every row of
`UserInfoResponseEncodingPreservesClaims` on both roles. Existing enabled
APICompat and actual package owner-byte comparison pass, without a released
baseline version. Initial ANCM/harness preparation failures and the exact
managed test boundary are disclosed.

Immutable evidence, runnable project, complete matrix, raw samples, native/
TRX/source audit, limits and commands: [F018 evaluation](@EVIDENCE@/README.md).
Source commit: `e4f8020ea7b3c6b5653ce3e277e1a8457aee1b0e`.
