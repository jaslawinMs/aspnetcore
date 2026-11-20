# F147 / F149: allocation removal observed; qualification inconclusive

**No performance PR.** Both independent one-line candidates removed a temporary
byte-array copy in the WebTransport interactive **sample**, and both recorded
substantial allocation reductions. However, the unchanged direction's elapsed
control drifted beyond the frozen acceptance range. Each budget is permanently
closed at **1 of 3 authorizations**. No default-owner performance comparison,
retry, retuning, combined patch, source commit or browser window followed.

The campaign's `no-gain` bookkeeping bucket includes these **inconclusive
measurements**; it does not mean that no allocation improvement was observed.

## What changed, and why the operations remain equivalent

| Finding | Independent experimental change | Preserved work |
|---|---|---|
| F147 | Unidirectional `Encoding.Default.GetString(memory[..length].ToArray())` to `Encoding.Default.GetString(memory.Span[..length])` | Same encoding, exact valid length, independent materialized string before the await, exact commands and console-string receipt |
| F149 | Bidirectional `Encoding.Default.GetString(outputMemory.ToArray())` to `Encoding.Default.GetString(outputMemory.Span)` | Same decoding and commands before await; the original buffer is still reversed, written with an await, then fully cleared |

These are **separate candidates**, never a combined performance patch. The
4096-byte buffer allocated once per handler is unchanged; pooling that buffer is
the separate F148 question. The decoded string is still allocated. This does not
add a stateful decoder or repair existing split-UTF8 behavior.

## Observed Original37 measurements

Every ratio is candidate / baseline. These are observations, **not qualified
throughput claims**.

| Finding | Primary allocation ratio | Mean bytes saved / observation | Primary elapsed ratio | Unchanged-control allocation ratio | Unchanged-control elapsed ratio |
|---|---:|---:|---:|---:|---:|
| F147: unidirectional | 0.672849 | 8,435,738.29 | 0.689049 | 0.999929 | **1.136694: failed** |
| F149: bidirectional | 0.749478 | 8,439,353.14 | 0.736686 | 1.000216 | **1.299399: failed** |

Both allocation primaries favored the candidate in **7 of 7 pairs** and passed
the predeclared ratio, absolute-saving and primary-elapsed gates. But the
unchanged-control elapsed range was **0.90 to 1.10**, not an optional diagnostic:
the observed controls were 13.67% and 29.94% slower. The cause of that drift is
**not established**; neither external noise nor cross-case runtime interaction
is asserted as its explanation. The result cannot be rescued by substituting
an allocation-only acceptance rule after seeing it.

Each observation completed 128 operations of 65,536 bytes on already-established
real managed HTTP/3/WebTransport streams. Each fresh variant process first ran
16 warmup operations in each direction. Seven pairs alternated variant order;
primary/control order also alternated. `GC.GetTotalAllocatedBytes(precise:true)`
includes whole-process framework/background allocations. `Stopwatch` measured
the same completed work. This was **not BenchmarkDotNet**.

## Source, correctness and identity boundaries

- Original source: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
  Independently built default sample source:
  `90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d`.
- Both sample owners used their own source/reference/restore graph. All six
  functional images shared **one successfully compiled C# 13 fixture** and the
  identical Original Kestrel/runtime `12.0.0-alpha.1.26557.102` producer.
  `CurrentDefault` therefore means **default sample owner under that common
  producer**, not full stock-default framework/runtime validation.
- **120 actual untimed native passes:** 20 per image across baseline/F147/F149
  and both source roles. Every XML result/definition/execution ID was reconciled,
  including all six valid/invalid/receipt-gated split-UTF8 theory values per
  image, commands, stream ownership, 9000-byte reads and exact echo/output.
  Bidirectional non-ASCII cases assert original-byte reversal/echo and ordinary
  command handling, not a decoded string that this path does not log.
- The additional **28 measured native Fact executions** all passed and fully
  drained their native output streams. Independent real XML parsing recomputed
  the two seven-pair decisions without remeasurement.
- All four within-source causal pairs enumerate **156 sample-image files**;
  only the owner DLL/PDB differ. The complete **224-file common output** and
  **197-file runtime** were frozen and checked, with no fixture/shared/bootstrap
  prefix exemptions. Seven selected PE MVID/CodeView/PDB associations and their
  actual raw-source Document checksums were freshly parsed.
- Every authorized pair ran on the same physical shared Windows host and exact
  runtime. Actual preparation owners acknowledged terminal native work, drained
  streams and stopped heavy IO. The unchanged global mutex/lease gateway
  serialized the comparisons. This is not dedicated isolation, arbitrary
  third-party inactivity, sample-time Normal priority or uninterrupted 24/7 work.

## Connected artifacts

The closed tracking issue and immutable evidence commit are recorded in
[publication.json](publication.json) after remote verification.

| Artifact | Direct link |
|---|---|
| Frozen acceptance, defined before candidates/counters | [Acceptance](study/acceptance.json) |
| Complete source pins and declared runtime boundary | [Source graphs](study/source-graphs.json) |
| All six functional XML reports and image receipts | [Study files](study) |
| Fresh selected PE/PDB/raw-source and 120-row acceptance | [Native identity audit](study/evidence/native-identity-acceptance-011.json) |
| F147 plan, paired samples, native observations, decision, closed budget | [F147 evidence](measurements/F147) |
| F149 plan, paired samples, native observations, decision, closed budget | [F149 evidence](measurements/F149) |
| Independent parsing/arithmetic of all 28 measured XML rows | [Independent measurement audit](independent-measurement-audit.json) |
| Actual owner HOLDs, local quiescence, gate terminal/release receipts | [Coordination](coordination) |
| Earlier immutable compiled-producer preparation, separate from the new comparison fixture | [Earlier preparation](owner-preparation) |
| Exact unchanged copied-file identities and private-to-portable mapping | [Authoritative copies](authoritative-copies.json) |
| Outcome, intentional exclusions and target-only closing freshness | [Coordinator acceptance](coordinator-acceptance.json) |
| Executed comparison/native/audit/publication drivers | [Executed drivers](executed-drivers) |

`node .\verify.mjs` is a read-only, capsule-relative audit: it checks all selected
bytes, freshly parses selected PE/PDB Documents, reparses native XML and
recomputes the observed decision. No .NET, native target, counter or benchmark
is started. Omitted full image/SDK/package/source trees are **saved inventory
receipts**, not freshly rehashed omitted bytes or full compiler-input
attestation. Initial missing prerequisite/build attempts remain retained.

Native QUIC/MsQuic, TLS, physical network, browser, full sample startup and its
certificate setup, physical-console costs, general EOF/cancellation/fault
changes, long-run stream churn and pooled-buffer economics are outside this
study. No claims are made for those boundaries.
