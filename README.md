# ASP.NET Core AutoPerf evaluations

This branch contains the candidate inventory, reproducible benchmark projects,
and raw results for independently evaluated optimizations. Code proposals live
on separate branches and are submitted as draft PRs **inside this fork**, not
against dotnet/aspnetcore.

The [complete candidate inventory](findings.md) preserves all 358 remaining
findings and their original IDs. Eleven exact overlaps with existing work from
dotnet/aspnetcore#70219 were excluded. Pending findings are not confirmed defects
or measured regressions.

**Progress: 60/358 finalized**: 43 drafts, 8 no-gain, 5 rejected and 4 duplicates;
298 findings remain unfinished.

Each item receives at most three measured before/after comparisons. A clear
large win can stop early; non-improving items are marked `no-gain`, not published
as speculative optimization PRs. Incompatible replacements are marked
`rejected` even when individual benchmarks improve. Correctness, actual owning-component behavior,
small-workload controls, allocations, and measurement limitations matter as
well as the largest speedup.

## Evaluations

| Candidate | Disposition | Evaluation |
|---|---|---|
| F003 | [Draft jaslawinMs/aspnetcore#39](https://github.com/jaslawinMs/aspnetcore/pull/39); modest gains, no structural heap saving, custom variance and all control/non-win outcomes retained | [Guarded protobuf ListValue construction](F003/README.md) |
| F009 | Draft proposal | [Validation-summary metadata membership](F009/README.md) |
| F021 | Draft proposal | [Enum conversion during select rendering](F021/README.md) |
| F025 | Draft proposal; workload trade-offs and unstable case retained | [Pooled BSON TempData buffers](F025/README.md) |
| F027 | Draft proposal; unstable control disclosed | [Pooled JSON Patch conversion](F027/README.md) |
| F034 (also F119) | No-gain; duplicate consolidated | [Concrete Rewrite condition enumeration](F034/README.md) |
| F045 | Draft proposal; unstable control disclosed | [Single validation-message ModelState lookup](F045/README.md) |
| F048 | [Draft jaslawinMs/aspnetcore#47](https://github.com/jaslawinMs/aspnetcore/pull/47); common non-file gains, empty-filename allocation/time regressions and file/control non-wins retained | [Multipart file-section conversion](F048/README.md) |
| F049 | [Draft jaslawinMs/aspnetcore#49](https://github.com/jaslawinMs/aspnetcore/pull/49); ordinary-file gains, star-only fallback allocation/time regressions and valid-form/control non-wins retained | [Multipart form-section conversion](F049/README.md) |
| F050 | [Draft jaslawinMs/aspnetcore#51](https://github.com/jaslawinMs/aspnetcore/pull/51); malformed-quality gains, public factory time/heap costs and all control outcomes retained | [Accept numeric quality parsing](F050/README.md) |
| F051 | [Draft jaslawinMs/aspnetcore#53](https://github.com/jaslawinMs/aspnetcore/pull/53); all disabled/default targets lower heap, modest timing gains, mixed target timings and enabled/no-update control costs retained | [Guarded streamed UIAgent diagnostics](F051/README.md) |
| F052 | [Draft jaslawinMs/aspnetcore#55](https://github.com/jaslawinMs/aspnetcore/pull/55); repeated disabled/default heap reduction, modest/mixed timings, enabled costs and volatile no-response target retained | [Guarded mapping-pipeline diagnostics](F052/README.md) |
| F053 | [Draft jaslawinMs/aspnetcore#57](https://github.com/jaslawinMs/aspnetcore/pull/57); all13 reached targets lower heap, modest/mixed timing, recorded/enabled costs and ten unreached controls retained | [Guarded active-handler diagnostics](F053/README.md) |
| F054 | [Draft jaslawinMs/aspnetcore#59](https://github.com/jaslawinMs/aspnetcore/pull/59); all16 reached targets lower heap, six repeatable timing wins, unstable first-case/control costs and failed broad-allocation probe retained | [Guarded function catch-up diagnostics](F054/README.md) |
| F055 | [Draft jaslawinMs/aspnetcore#61](https://github.com/jaslawinMs/aspnetcore/pull/61); all18 filtered-reason targets faster/lower heap in both final pairs, five higher enabled medians and three repeated literal-control costs retained | [Guarded explicit-failure reason diagnostics](F055/README.md) |
| F056 | [Draft jaslawinMs/aspnetcore#63](https://github.com/jaslawinMs/aspnetcore/pull/63); all22 filtered-unmet targets faster/lower heap in all three pairs, all15 higher control medians and five repeated control costs retained | [Guarded unmet-requirement diagnostics](F056/README.md) |
| F057 | No-gain; all114 warmed heap pairs unchanged, no target faster every pair, Tier0 resource savings and nullable-control regressions retained; source restored | [Generic component null-check boxing](F057/README.md) |
| F058 | Rejected; shipped value-type collections select a different validator, original Tier0 default checks already allocate zero; all22 heap pairs unchanged and public/control timing differences retained; source restored | [Default header collection null check](F058/README.md) |
| F059 | [Draft jaslawinMs/aspnetcore#65](https://github.com/jaslawinMs/aspnetcore/pull/65); eight repeated normal-view timing wins, untouched no-sections improvement, volatile helper-long case and ordinal fallback costs retained; no structural heap saving | [Guarded Razor rendered-section membership](F059/README.md) |
| F060 | Duplicate of F059; same method and probe pair, exact fresh original source identity; canonical measurements reused, zero new comparisons or second draft | [Razor section semantic alias](F060/README.md) |
| F061 | [Draft jaslawinMs/aspnetcore#67](https://github.com/jaslawinMs/aspnetcore/pull/67); scaled 53-69% repeated timing wins, all114 reached heap pairs lower, default-size mixed timings and first-case/control volatility retained | [Chunk-cookie response prefix matching](F061/README.md) |
| F062 | [Draft jaslawinMs/aspnetcore#69](https://github.com/jaslawinMs/aspnetcore/pull/69); scoped cleanup and 52-95% large prepared-stop medians, ordinary latency unsupported; first harness artifact and both cold single-GC residuals retained | [SPA proxy cancellation lifetime](F062/README.md) |
| F068 | Draft proposal | [ModelState breadth-first enumeration](F068/README.md) |
| F069 | [Draft jaslawinMs/aspnetcore#71](https://github.com/jaslawinMs/aspnetcore/pull/71); large warm lookup gains68-96%, small timing non-wins and extra startup/index costs retained; final strategy measured in one pair only | [Large SNI wildcard selection](F069/README.md) |
| F070 | [Draft jaslawinMs/aspnetcore#73](https://github.com/jaslawinMs/aspnetcore/pull/73); 64-link menu gains67-69%, fully mixed prepared60-111% and trailing180% regressions retained; qualified trade-off, explicitly not merge-ready | [NavLink common-prefix casing](F070/README.md) |
| F071 | [Draft jaslawinMs/aspnetcore#75](https://github.com/jaslawinMs/aspnetcore/pull/75); exact long/vendor gains54-68%, JSON fallback costs22-26%, unchanged heap and unstable first-row observations retained; qualified trade-off, explicitly not merge-ready | [FormatFilter first-match parsing](F071/README.md) |
| F072 | [Draft jaslawinMs/aspnetcore#77](https://github.com/jaslawinMs/aspnetcore/pull/77); null-query gains55-90%, larger real metadata9.79%, typical metadata non-win and wildcard-only10.47% cost retained; two strategies/three pairs, qualified trade-off, not merge-ready | [OutputFormatter unconstrained metadata parsing](F072/README.md) |
| F073 | [Draft jaslawinMs/aspnetcore#79](https://github.com/jaslawinMs/aspnetcore/pull/79); exact-owner gains68-85%, actual exact/default-declared selection38-39%, parameter6.07% cost and unresolved large client-suffix transient retained; two strategies/three pairs, qualified trade-off, not merge-ready | [OutputFormatter exact result negotiation](F073/README.md) |
| F074 | [Draft jaslawinMs/aspnetcore#81](https://github.com/jaslawinMs/aspnetcore/pull/81); large escaped fragments save 19544B/op, long text improves 36.82%, full escaped descriptor median is 20.28% slower; all three pairs and control costs retained, allocation-focused qualified draft, not merge-ready | [Render-fragment parameter JSON string allocation](F074/README.md) |
| F075 | Duplicate of active dotnet/aspnetcore#68295 at frozen head9ca33ec5; typed JsonElement intermediate already removed in that proposal, not merged; source-only overlap, no new benchmark or draft and no full-proposal equivalence/approval claim | [Typed parameter existing-work overlap](F075/README.md) |
| F076 | Duplicate of active dotnet/aspnetcore#68295 at frozen head9ca33ec5; nested fragment JsonElement intermediate already removed in that proposal, not merged; independent source-only overlap, no new benchmark or draft and no full-proposal equivalence/approval claim | [Nested fragment existing-work overlap](F076/README.md) |
| F077 | Rejected; three public conversion contracts change despite large-case gains | [Newtonsoft JSON Patch token bridge](F077/README.md) |
| F079 | Draft proposal; unchanged SetCookie control regressions retained | [CookieHeaderValue span concatenation](F079/README.md), [draft](https://github.com/jaslawinMs/aspnetcore/pull/24) |
| F080 | [Draft jaslawinMs/aspnetcore#83](https://github.com/jaslawinMs/aspnetcore/pull/83); ordinary bulk glob/cache fills improve21-22%, long direct78.52%, all reached direct allocations removed; rejected unmeasured buffer prototype and volatile bypass/identity controls retained, three-comparison budget closed | [Extensionless globbing path comparison slices](F080/README.md) |
| F081 | [Draft jaslawinMs/aspnetcore#85](https://github.com/jaslawinMs/aspnetcore/pull/85); selected large UTF8 saves 20-118.6 KB/op and 64 KiB improves 68.38%; small/typical UTF8 remains 11.72%/12.57% slower and large UTF16 14.02% slower; two strategies, 3/3 budget closed, qualified allocation/scaling draft, **not merge-ready** | [Large Facebook UTF8 payload decoding](F081/README.md) |
| F082 | [Draft jaslawinMs/aspnetcore#87](https://github.com/jaslawinMs/aspnetcore/pull/87); valid UTF8 small/1 KiB/16 KiB/64 KiB improves 13.67%/23.68%/53.08%/80.41%; malformed UTF8 large remains 20.36% slower with 16616 B/op extra; one strategy, 3/3 budget closed, qualified allocation/scaling draft, **not merge-ready** | [MicrosoftAccount owned UTF8 memory parsing](F082/README.md) |
| F083 | Draft proposal | [Bounded invariant-lowercase rewrite-map lookup](F083/README.md) |
| F085 | No-gain; all heap unchanged, tiny lookup differences and actual parser/control non-wins retained | [Inline known HTTP method record experiment](F085/README.md) |
| F090 | Draft proposal | [Literal validation-message Boolean strings](F090/README.md) |
| F106 | Draft proposal; workload trade-offs retained | [Per-call enum-name reverse lookup](F106/README.md) |
| F108 | No-gain; array already reused, all fourteen affected cases slower in all three pairs and 64-65 extra B/op retained | [Kestrel cookie enumerable-join experiment](F108/README.md) |
| F110 | Draft proposal; heap trade-offs and non-steady indexer control disclosed | [Caller-provided select-value membership](F110/README.md) |
| F117 | Draft proposal; full-link non-wins, fallback trade-offs and unstable control retained | [Maximum route constraint fast paths](F117/README.md), [draft](https://github.com/jaslawinMs/aspnetcore/pull/26) |
| F107 | Draft proposal; empty concrete convention changes, nonempty/control regressions retained | [Empty form-file query results](F107/README.md), [draft](https://github.com/jaslawinMs/aspnetcore/pull/29), [convention proposal](https://github.com/jaslawinMs/aspnetcore/issues/28) |
| F127 | Draft proposal | [Rewrite equality-only string comparisons](F127/README.md) |
| F128 | No supported material win; small gains and control regressions retained | [OWIN alternate accept delegate capture](F128/README.md) |
| F130 | No supported net win; experiment retained | [Fixed input-type membership trade-offs](F130/README.md) |
| F131 | [Draft jaslawinMs/aspnetcore#31](https://github.com/jaslawinMs/aspnetcore/pull/31); small/mixed pipeline effects, extra app-lifetime index and unstable case disclosed | [Private OWIN feature-map lookup index](F131/README.md) |
| F171 | Rejected; caller Items setter exception changes and all existing-key cases add 24 B/op | [OWIN cancellation-default TryAdd experiment](F171/README.md) |
| F172 | Rejected; caller version setter exception changes, all allocations unchanged and single-pair variance retained | [OWIN version-default TryAdd experiment](F172/README.md) |
| F181 | [Draft jaslawinMs/aspnetcore#35](https://github.com/jaslawinMs/aspnetcore/pull/35); three repeatable complete-build targets, small-workload regressions and grouped variance retained | [DFA complex-literal pair enumeration](F181/README.md) |
| F228 | Rejected; removed current consumer, all affected diagnostic heap counts increase and invalid live template retained | [Dormant gRPC query-descriptor membership](F228/README.md) |
| F241 | [Draft jaslawinMs/aspnetcore#33](https://github.com/jaslawinMs/aspnetcore/pull/33); larger discovery gains, extra heap and small/fallback regressions retained | [Bounded view-component discovery membership](F241/README.md) |
| F272 | No supported net win; complete descriptor/word-start results mixed, direct lower-branch gain and control/heap variance retained | [Invariant gRPC character casing](F272/README.md) |
| F295 | [Draft jaslawinMs/aspnetcore#37](https://github.com/jaslawinMs/aspnetcore/pull/37); complete body-descriptor gains, tiny/no-output time regressions and large no-output heap boundary retained | [Bounded gRPC name formatting](F295/README.md) |
| F301 | [Draft jaslawinMs/aspnetcore#45](https://github.com/jaslawinMs/aspnetcore/pull/45); full-generation gain, small/control regressions and variance retained | [Complete Kestrel header code generation](F301/README.md) |
| F319 | No supported net startup win; helper gains, mixed real startup/control outcomes, heap direction reversal and failed attribution hypothesis retained | [gRPC service-descriptor PropertyInfo cache](F319/README.md) |
| F320 | [Draft jaslawinMs/aspnetcore#41](https://github.com/jaslawinMs/aspnetcore/pull/41); named full binding heap consistently lower, smaller/mixed timing and volatile startup/control results retained | [Skip unused gRPC body-property metadata](F320/README.md) |
| F321 | [Draft jaslawinMs/aspnetcore#43](https://github.com/jaslawinMs/aspnetcore/pull/43); actual wildcard overload failure fixed, stable component heap saving, mixed full-parse timing and startup/control non-wins retained | [Skip unused wildcard request metadata](F321/README.md) |

Measurements were collected serially on a shared Windows machine. They are
microbenchmark observations, not production throughput or universal performance
guarantees. Raw exports retain uncertainty and outliers.
