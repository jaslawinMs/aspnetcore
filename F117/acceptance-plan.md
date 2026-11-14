# F117 acceptance, defined before product edits

Independent baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`, freshly
fetched from upstream. Branch: `autoperf/F117-max-route-numeric-values`.

## Scope and prior evidence

`MaxRouteConstraint.Match` formats every non-null route value using invariant
`Convert.ToString`, then parses it as an invariant `long` with
`NumberStyles.Integer`. Only boxed `Int32` and `Int64` will gain direct
comparison with the existing `Max`. Preserve the explanatory `valueString`
and all other branches, guards, literal matching, signatures and defaults.
Do not broaden to decimal, floating point, unsigned values, enum storage or
custom conversion interfaces.

Same-area `IntRouteConstraint` and `LongRouteConstraint` already recognize
their exact boxed CLR integer types before fallback conversion. The maximum
constraint's current implementation and relevant history were inspected.
`f1cfa8ea0bd80096894dd210e754db4dafa83b62` / dotnet/aspnetcore#49622 shared the
constraint source with Components; the routing targets include this file.
Both compiled consumers must build and be validated.

Microsoft's routing documentation explicitly says constraints participate in
matching and link generation, use invariant culture, do not change route
values, and incoming URL values are strings:
https://learn.microsoft.com/en-us/aspnet/core/fundamentals/routing?view=aspnetcore-10.0#route-constraints

Therefore this is a typed route-value/link-generation component proposal,
not an incoming-string/parser or universal production-throughput improvement.
The original implementation must first produce the expected complete results
using the real classes/producers, not an extracted conversion expression.
Narrow upstream title/body searches found no MaxRouteConstraint proposal;
this is not exhaustive duplicate proof.

## Compatibility criteria

- Routing's actual public constraint preserves inclusive equality, just-over
  failures, negative comparisons, Int32/Int64 extremes and mixed-width bounds.
- Unchanged fallback preserves whitespace/signs, leading zeros, overflow,
  scaled decimal and exponential-format rejection, unsigned and enum behavior,
  invariant custom conversion/provider calls and propagated exceptions.
- Null/missing values, argument guards and literal-policy matching remain.
- Route dictionaries retain the same objects; constraints must not rewrite
  caller inputs.
- The Components-compiled copy has equivalent numeric/string/null behavior.
  Validate the actual managed constraint owner below the browser plus existing
  routing tests. No rendering/navigation/JS, browser-timing, new feature or
  behavioral-regression claim is being made.
- Real DI-resolved LinkGenerator, default max-policy activation and parsed named
  endpoints must produce the exact allowed path or rejected null for Int32 and
  Int64 inputs at/above the bound.

Permanent surfaces: existing Routing `MaxRouteConstraintTests` and a
type-focused `MaxRouteConstraintTests` in Components' established `test/Routing`
directory, with all parameter rows checked individually. Existing routing
tests validate surrounding consumers. No new shipping API or cache;
no Hot Reload handler, new IVT, UnsafeAccessor or cross-assembly access.

## Measurements and publication

Use a standalone pinned net12.0 / BenchmarkDotNet 0.13.0 project with actual
public MaxRouteConstraint matching, literal-policy controls and actual
DI-resolved named-link generation. Validate all 35 case setups against
independent expected complete booleans/paths before immutable A/B capture.
Only Routing DLL may differ in the benchmark executable/configuration closure;
reuse the exact harness after runtime/dependency configuration hash equality.
Verify the separate Components source-consumer test/build evidence.

At most three measured comparisons; eight retained measured samples per case,
no outlier removal, serial execution on the shared host. Stop after one if
the explicit clear-large-win rule is met; otherwise tune/rerun only within the
budget. Retain small cached-number cases, all fallback/literal controls and
actual full-link behavior, allocation regressions and non-wins.
Do not claim that every small numeric ToString necessarily allocates.

Publish a compatible supported gain as a fork-only draft with exact template,
source/project/results/provenance and limits; immediately open its URL and
verify it. Otherwise publish no-gain/rejected evidence and restore any rejected
shipping change. No more than three comparisons.

## First-run observation and single tune

The 10-line numeric-only prototype improves all 12 direct typed matches
69.73-94.17%, and the four actual named links 8.37-10.35%, but all six direct
string cases regress 4.52-26.09%. It is not the final proposal.
All 35 first-pair values and that exact source are retained separately.

Before further measurement, add a string-first branch that passes the existing
sealed string directly to unchanged `CheckConstraintCore`. This avoids both
extra numeric tests and the old interface conversion on the ordinary
string-input path, while retaining the fallback `valueString` local and all
other conversion/exception semantics. String cases are now intentionally
optimized parser controls rather than source-unchanged controls.
No new trimming/cache/API/browser behavior or new benchmark harness is added.
Validate the exact same 35 producers and both compiled source consumers again,
then compare the tuned snapshot within the remaining two-comparison budget.
