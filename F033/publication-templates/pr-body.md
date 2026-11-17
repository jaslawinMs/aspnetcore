# Guard completed HTTP.sys synchronous write startup

<!-- Thank you for submitting a pull request to our repo. -->

<!-- If this is your first PR in the ASP.NET Core repo, please run through the checklist
below to ensure a smooth review and merge process for your PR. -->

- [x] You've read the [Contributor Guide](https://github.com/dotnet/aspnetcore/blob/main/CONTRIBUTING.md) and [Code of Conduct](https://github.com/dotnet/aspnetcore/blob/main/CODE-OF-CONDUCT.md).
- [x] You've included unit or integration tests for your change, where applicable.
- [x] You've included inline docs for your change, where applicable.
- [x] There's an open issue for the PR that you are making. If you'd like to propose a new feature or change, please open an issue to discuss the change or find an existing issue.

<!-- Once all that is done, you're ready to go. Open the PR with the content below. -->

Guard already-completed synchronous HTTP.sys response start tasks.

## Description

**F033 fork-only, narrowly qualified draft; not merge-ready or an upstream
contribution/approval claim.** Retain the actual start task and skip
`GetAwaiter().GetResult()` only when `IsCompletedSuccessfully`. Pending,
faulted and canceled start tasks still finish synchronously before writing.
Only `ResponseStream.Write(byte[],int,int)` changes; Flush, async methods,
start/native-body producers, default synchronous-IO rejection, API/baselines
and argument/error ordering remain unchanged. No new public API or inline
documentation is needed for this internal implementation-only guard.

The supporting **no-callback 128-byte request** measured **8.23%,11.47%,19.10%
less time** across three alternating pairs. The **declared completed-callback
primary is mixed, including a 4.99% regression**; it is not relabeled a win.

| Profile | Attempt 1 less time | Attempt 2 less time | Attempt 3 less time |
|---|---:|---:|---:|
| Supporting no-callback 128B request | 8.23% | 11.47% | 19.10% |
| Declared completed-callback 128B primary | 3.75% | **-4.99%** | 0.54% |
| Completed-callback 4096B request | -1.57% | 3.62% | 1.15% |
| Unchanged async 128B control | -0.03% | 4.83% | -1.01% |
| Prepared already-started **zero-byte** sync write | 1.10% | 2.84% | 1.07% |
| Unchanged prepared zero-byte async control | -4.84% | 1.59% | 0.35% |

Positive favors the guard; negative is regression. Prepared zero-byte savings
are approximately **0.22-0.58 ns/op** after initial128B/header send, not nonzero
network throughput or proof that this local saving explains the full-request
difference. The full request includes real client/dispatch/registration/
ranged-write/native IO/complete byte checks and disposal. No general/default/
production application speedup or structural allocation claim. All higher
no-callback candidate allocation residuals and mixed/async controls remain.
Shared non-isolated Windows Hyper-V VM; maximum observed CV **12.93%**.

**Requirement coverage:** Both exact native functional scopes pass15/15rows,
zero skipped, including both Boolean theory values. The actual original,
identical-harness guard and independently built byte-exact relocated original
each pass6completed+22additional real public OnStarting/data/argument/default/
error contracts and6actual benchmark lifecycles. All52concrete semantic
observations match, including waiting server caller/incomplete wire before
producer release, callback LIFO/reference/token, ranged bytes/sentinels,
exact buffer error/parameter and default rejection precedence. These are
preservation checks, not a semantic bug-fix red/green claim.

**Validation:** Three complete alternating pairs;36rows/all288result samples
independently matched stdout/JSON and statistics recomputed;72before/after
settings observations unchanged. All58native listeners stopped/disposed and
all10recorded native PIDs observed absent. Every standalone build:0warnings/
0errors. One-file source formatting verified without edits. Existing integration
tests and additional real-host contract source are included in the companion
evidence, rather than adding framework tests that merely assert a perf-only
guard's unchanged semantics. Exact commands **and results** are recorded here:
https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F033/validation-commands.md

The measured consumers share exact harness DLL/PDB and184unchanged files total
(including that pair;182otherfiles);only tested HTTP.sys DLL/PDB differ.
Live audit:866unique files/6386bindings,744consumer/5576loaded-runtime.
The portable audit verifies copied text/receipts,not omitted binary bytes.
Selected source/PE/PDB identities are not full compiler provenance or coverage.
Actual timed build head remains37e809e plus the uncommitted guard;the later
source commit is independently LF-canonical-text-bound,not relabeled as the
historical build commit.

The initial untimed bounds-type assertion failure,public runtime-source404,
corrected null listener aggregate and changed-default publication stop are
retained. A fresh16-source/history check on783dc047found owning sources unchanged.
**All three comparison slots are closed;no extra tuning/timing.**

Immutable complete results,runnable BenchmarkDotNet project,raw reports and audit:
https://github.com/jaslawinMs/aspnetcore/tree/@EVIDENCE_COMMIT@/F033

Fixes jaslawinMs/aspnetcore#@TRACKING_NUMBER@
