## Candidate and actual behavior

F050 from the retained, deduplicated AutoPerf campaign targets `AcceptHeaderParser.TryParseValue`, which catches parser exceptions and recovers at the next comma. The real exception-producing numeric subcase is `MediaType.CreateMediaTypeSegmentWithQuality` calling `double.Parse` for invalid `q` values; many malformed type/subtype inputs already return default without throwing.

On fresh upstream main `37e809ead5824bc753a1c3d56f11615bdb1296c5`, six actual-parser rows each recover `text/plain` while producing exactly one real first-chance `FormatException`. Empty `q=` at end of input instead publicly throws `ArgumentOutOfRangeException("index")` before numeric parsing; that distinct fallback remains.

## Measured proposal and tradeoffs

The independent [source proposal](https://github.com/jaslawinMs/aspnetcore/commit/d16c7fc5d6fbcfaebac99940070f123b67fd5ddf) shares the existing media-type parser through an internal non-throwing numeric path. The public wrapper still calls `double.Parse` for the invalid numeric segment, preserving its observed exception type/message. Public API signatures/defaults and Accept recovery/catch structure remain unchanged.

Final original/proposed coverage: 164 tests, with 158 original passing controls/seven public-contract rows and exactly six expected exception-count failures; proposed164/164 passes/all13 new rows have unique report identities. Real parser/formatter-selector oracles preserve headers, offsets, qualities, formatter/content-type decisions and measured public error details.

All three permitted comparisons are consumed. Only round3 uses the final source and corrected index-based checksum harness. All17 malformed-quality parser/selector targets improve70.71-95.73% with lower heap. Actual `DefaultOutputFormatterSelector` with32 invalid values and a following valid value is94.73% faster,16060 to1464 B/op.

This is **not a universal net-performance win**: final public valid factory controls are8.73-25.28% slower, and public invalid quality is16.23% slower with168 additional B/op. Other control shifts and both discarded prototypes remain visible. Whether those tradeoffs are acceptable needs review.

[Complete benchmark projects, all234 outcomes/producer receipts, all39 final cases, source snapshots, red/green/preparation evidence and commands](https://github.com/jaslawinMs/aspnetcore/tree/autoperf-results/F050) are published separately. No HTTP/network throughput, cold/JIT, concurrency, other-runtime or native-code attribution claim.

The inspected dotnet/aspnetcore#70166 changes StringValues boxing/list growth/formatter enumeration, not this quality exception seam. This is a fork-only parked experiment, not an unsolicited upstream proposal or a blanket confirmed scan defect.
