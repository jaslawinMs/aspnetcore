# F216: header hash-combiner benefit lacks an established workload

**Disposition: rejected for unestablished material workload, not measured no gain.**
The informational card correctly identifies XOR field combination in
`NameValueHeaderValue.GetHashCode`. No candidate, performance PR, zero-cost claim,
or equality defect is established.

## What is actually qualified

The complete [owner](source/NameValueHeaderValue.cs) has the same Git blob
`7114047673982d17065fd5c2ff7d58d3988bbfed` at Original
`37e809ead5824bc753a1c3d56f11615bdb1296c5` and observed Default
`d3483989953ae3cccd773aea5ea04cb0c7198531`.
Names and unquoted values use ordinal-ignore-case hashing; quoted values follow
a separate case-sensitive branch. Absent and empty values return the name hash.
XOR can produce collisions; collisions between unequal values do not violate
the equal-objects/equal-hashes contract.

Real immediate callers do exist: [media-type](source/MediaTypeHeaderValue.cs) and
[content-disposition](source/ContentDispositionHeaderValue.cs) hashes call the
owner's parameter-list hash routine. That proves hash-code production, not a
material hash-table workload or a representative collision distribution.
Their parameter equality calls
[HeaderUtilities.AreEqualCollections](source/HeaderUtilities.cs), whose default
path performs nested list matching and tracks matched positions; it is not a
hash-set lookup. This is a bounded immediate-consumer review, not a complete
repository call graph or a claim that external users cannot use these public
objects as dictionary keys.

## Decision and limits

Neither the original card nor subsequent qualification established a material
production hash-table consumer, its frequency, or representative data for
which changing this combiner would improve useful work. Constructing a private
hash table or manufacturing XOR-cancelling pairs would not establish that
missing workload. Earlier private parser/equality correctness preparation is
preserved but is not republished or promoted into performance evidence here.

The campaign rejects an unsupported performance candidate rather than treating
an informational pattern match as a measured optimization. No candidate
equivalence, allocation reduction, throughput change, or universal absence of
benefit is claimed. [Source qualification](source-gate.json), the
[complete-source manifest](source-manifest.json), and the
[closed budget](closed-budgets.json) permanently close **0 of 3 authorizations**.

After publication, run `node verify.mjs . --require-seal` in this directory.
The portable audit checks source identities, bounded assertions, decision and
budget integrity; it does not run framework tests or performance measurements.
