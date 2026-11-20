# F213: fixed encoding-table cleanup is not an established performance improvement

**Disposition: rejected as an unsubstantiated informational performance cleanup.**
This is not a measured no-gain result, a correctness fix, or a claim that list
indexing has no CPU cost. No candidate or performance PR was produced.

The original `fixed-size-positional-list` finding correctly identifies a private,
static, four-element `List<Encoding>` containing UTF8, Unicode, ASCII, and Latin1.
An array could express that fixed table. The finding itself classifies the
expected impact as informational.

## Source qualification

The complete [helper](source/MediaTypeHelpers.cs) has the same Git blob
`656d264b3eead6818e74571a2f4ed730352d2027` at Original
`37e809ead5824bc753a1c3d56f11615bdb1296c5` and observed Default
`d3483989953ae3cccd773aea5ea04cb0c7198531`.
The table is initialized statically, not constructed for every request.
Its `Count` and indexer still execute on a selected path: after a media-type
match, a non-null resolved header encoding is checked against at most four table
entries. A null resolved encoding returns the configured fallback before that
loop. This distinction does not depend on assuming that every request omits a
charset, or that a static list eliminates all per-request CPU work.

The real callers are [request-body logging setup](source/HttpLoggingMiddleware.cs)
and [response-body logging on first write](source/ResponseBufferingStream.cs).
They do not construct this table for each body chunk.
[MediaTypeOptions](source/MediaTypeOptions.cs) also documents and implements the
UTF-8 fallback when a configured content type does not specify a charset.
The [source manifest](source-manifest.json) binds these complete copied files to
the public repository. [History and search qualification](source-history.json)
records a bounded lookup, not an exhaustive issue or PR search.

## Decision and limits

There is no demonstrated representative end-to-end benefit that warrants a
performance candidate for this tiny, statically retained table. Changing the
container solely because it matches a card would be representational cleanup,
not an evidence-backed optimization. The campaign therefore stops at this
source gate rather than commissioning another bespoke benchmark harness.

No allocation count, throughput change, benchmark, candidate equivalence, or
zero-cost claim is established here. Earlier private correctness preparation is
not republished or promoted into performance evidence. The
[assessment](assessment.json) and [closed budget](closed-budgets.json) permanently
close this finding at **0 of 3 authorizations**.

Run `node verify.mjs . --require-seal` from this case directory after publication
to check the copied source, bounded source assertions, decision, budget, and seal.
The auditor does not execute framework tests or performance measurements.
