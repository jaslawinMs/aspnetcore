# F070 acceptance, recorded before owner implementation

- Independent source baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`, still current upstream main at intake. Owner: `src/Components/Web/src/Routing/NavLink.cs`.
- Original `NavLinkTest`: all seven discovered rows passed, including all five relative-URI rows. The initial managed repository build was attempted with two workers and failed on missing unrelated restore assets and ReadyToRun prerequisites. No successful initial-build marker was fabricated. Scoped unit restore and build passed.
- History: the custom lowercase-character comparer was introduced in dotnet/aspnetcore#59903. Do not substitute ordinal-ignore-case semantics for the existing lowercase-character equivalence. The proposed seam is only `x == y ||` before the existing comparison; differing characters and hash behavior remain unchanged.
- Preserve actual href resolution through `NavigationManager.ToAbsoluteUri(...).AbsoluteUri`, special one-way trailing-slash equivalence, prefix separators, missing href, default query/fragment stripping, and the process-initialized query/fragment compatibility switch.
- No new public API, package/configuration changes, cross-assembly access mechanism, process-wide metadata cache, or Hot Reload lifecycle change.

## Faithful boundary and coverage

| Field | Selected boundary |
|---|---|
| Behavior owner | Shipping `NavLink` parameter, `ShouldMatch`, `LocationChanged`, and render paths. |
| Production producer | Real URI resolution and real navigation notifications; a canonical interactive-server sample additionally exercises actual browser navigation and circuit updates. |
| Final observable | Active CSS and `aria-current`, retained interactive component state, and measured elapsed/allocation costs. |
| Permanent surface | Existing Components routing Selenium cases plus focused `NavLinkTest` preservation cases where needed. |
| Lower-boundary limitation | Managed navigation cannot establish browser/circuit transport, route interception, or user-visible DOM updates; the canonical sample must establish those separately. |

Use `BlazorWebAppGlobal` with explicit `InteractiveServer` for retained-router navigation. Keep the diagnostic page in its Client project, where all global-sample routable pages belong. Prove interactivity with a counter action and preserve an instance token across real navigations. Observe exact/mixed case, late mismatch, prefix separator, query/fragment, trailing slash, encoded Unicode, and missing-href states. Check framework assets, current-page errors, and the server WebSocket. Remove only this item's temporary page and two render-mode edits after the selected boundary is covered.

Browser-tool prerequisite update, before owner implementation: no Playwright MCP is exposed; Python is a Store alias; Node Playwright is missing. The configured package feed returns E401 and both Node and native certificate-validated requests to the official public registry fail TLS handshakes. Do not change credentials, feeds, TLS validation, or machine configuration. Use the existing Edge browser through dependency-free Node CDP for the same real input/DOM/circuit assertions, and label it CDP rather than claiming Playwright passed. The first original CDP counter check failed after observing only a WebSocket connection; that milestone alone does not prove that a component's event handlers are installed. Preserve that failure without claiming its cause verified; use the actual EventDelegator-installed click handler as the observable readiness gate and assert trusted input.

| Runtime/lifecycle | Required scope |
|---|---|
| CLR .NET 12, original/proposed component | Actual owner matching, actual initialized components, and managed 8/64-link navigation/render updates. |
| Interactive Server, retained global router | Original/proposed real-browser sample and selected owning Selenium cases when prerequisites permit. |
| Query/fragment switch false/true | Separate untimed processes; switch must be set before first `NavLink` use. Default false is the timed job. |
| Static SSR, WASM, Auto, trimming/AOT | Not a performance claim; no new metadata/lifetime boundary. Explicitly disclose unverified runtime coverage. |

## Measurement/publication gate

- External BenchmarkDotNet harness must call actual compiled owner methods on components initialized through a real renderer, not copy the character loop or seed private href fields. Prepare reflection/delegates/URI state outside timing.
- Include same-case, mixed-case, early/late mismatch, lengths, trailing slash, query/fragment, prefix and missing-href controls, plus real managed menu notifications/rendering. State clearly which jobs time only prepared matching versus managed navigation; neither is browser/network throughput.
- Immutable original/proposed snapshots: identical harness/settings and recursive dependency closure differing only in the actual owner DLL. Record loaded owner identity and source/PDB identity.
- Maximum three measured comparisons total, alternating order. Large credible gains around 50% may stop after one comparison; smaller/uncertain gains permit up to three. Preserve every measured strategy, non-win, regression, and raw result. F070 currently has zero measured comparisons.
- No functional-red claim for preservation tests: they must remain green on original and proposal. The performance comparison is the proposed benefit.
- Publish only if the applicable correctness boundary and supported measurements pass. Otherwise record no-gain/rejection or a precise blocked boundary. Inspect and preserve the fork PR template, create an originating issue, open every new draft immediately, and verify immutable remote evidence and receipt metadata.
