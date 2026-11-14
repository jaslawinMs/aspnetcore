# Rejected F009 prototype: comparison 1

This is **not the source proposed for merge**. The original source was changed
to create `new HashSet<ModelStateEntry>(entries)` at the fallback and use
`visitedEntries.Add(entry.Value)` instead of `!entries.Contains(entry.Value)`.
The original list, traversal and rendering order remained intact.

[All 17 cases](comparison.md) show large-case time falling about 90%, but
managed allocation growing from about 16.7 KB to 89.8 KB/op. Small fallback
cases slowed 33-73%. The membership set unnecessarily retained every newly
appended dictionary entry even though dictionary entries are unique.

The final proposal checks only the metadata-visited prefix and avoids a set when
that prefix has at most one entry. Its separately measured results are
[one directory up](../comparison.md). **Do not aggregate these different source
versions.** The harness was byte-identical across both comparisons.

These are complete original/changed raw reports in original/changed launch
order. The final run reversed launch order. This rejected prototype consumes
one of the maximum three comparisons allowed for F009.
