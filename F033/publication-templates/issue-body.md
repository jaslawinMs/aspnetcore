# F033 evaluation: synchronous HTTP.sys Write startup

Fork-only performance tracking, **not an upstream bug report or merge-ready
claim**. A compatible completed-success guard has scenario-specific supporting
evidence; the declared completed-callback primary remains mixed.

| Consumer | Attempt 1 less time | Attempt 2 less time | Attempt 3 less time |
|---|---:|---:|---:|
| Supporting no-callback 128B request | 8.23% | 11.47% | 19.10% |
| Declared completed-callback 128B primary | 3.75% | **-4.99%** | 0.54% |
| Completed-callback 4096B request | -1.57% | 3.62% | 1.15% |
| Unchanged async 128B control | -0.03% | 4.83% | -1.01% |
| Prepared already-started **zero-byte** sync write | 1.10% | 2.84% | 1.07% |
| Unchanged prepared zero-byte async control | -4.84% | 1.59% | 0.35% |

Positive favors the guard. All actual means, CVs, allocations and 288 raw result
samples are retained. The tiny prepared saving (about 0.22-0.58 ns) is not
nonzero network throughput or proof of the cause of the whole-request difference.
No structural allocation reduction; no-callback candidate allocation residuals
are higher in all three pairs. Shared non-isolated Windows VM, maximum CV 12.93%.

Only synchronous `ResponseStream.Write(byte[],int,int)` changes. Pending,
faulted and canceled start tasks still complete synchronously. Actual
OnStarting LIFO/errors/tokens, start-before-buffer-validation-before-default-IO
ordering, Flush/async/default/API/baselines are preserved.

Both native owning scopes pass 15/15 exact rows with zero skipped. Three
corrected images (original, identical-harness candidate, byte-exact independently
rebuilt relocated original) each pass 6 completed +22 additional actual producer/
data/argument/default/error contracts and six actual benchmark lifecycles.
Fifty-two concrete semantic observations match exactly across all three.
All 58 listeners have explicit disposal receipts and ten native PIDs were
observed absent. All three alternating comparisons are complete; **budget closed**.

Measured 186-file consumers differ only in tested HTTP.sys DLL/PDB: 184 unchanged
total includes the harness pair, leaving 182 other unchanged files. The live
audit rehashes 866 unique files/6386 bindings (744 consumer,5576 loaded runtime).
The portable audit checks copied textual evidence, not omitted native bytes.
Source/PDB identities are selected-document evidence, not complete compiler
provenance. Timed builds remain baseline37e809e plus uncommitted guard, not the
later publication source commit.

Retained limitations include the initial **untimed** wrong bounds-exception
assertion, unavailable public reported-runtime source commit(404), corrected null
listener aggregate, and stopped publication on advanced `main` followed by
16-file source/history parity on783dc047. No timing was added or reset.

Immutable evidence and runnable project:
https://github.com/jaslawinMs/aspnetcore/tree/@EVIDENCE_COMMIT@/F033

Exact actual commands/results:
https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F033/validation-commands.md

Source:
https://github.com/jaslawinMs/aspnetcore/commit/053d19c2a36d3402243016641f3907b834084137
