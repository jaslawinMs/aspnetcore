# F061 acceptance before implementation

Fresh default branch: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Shared source: `src/Shared/ChunkingCookieManager/ChunkingCookieManager.cs`.
Three inspected shipping consumers compile it: Authentication.Cookies (`SECURITY`,
public type), Mvc.Core and Components.Endpoints (internal type). No assembly
boundary or public API change is intended.

| Requirement | Faithful acceptance evidence |
|---|---|
| Actual precondition producer | Original `ChunkingCookieManager.AppendResponseCookie` creates the chunk marker/subcookies; real Set-Cookie parsing creates browser-style request Cookie input; real RequestCookiesFeature parses it during DeleteCookie. Fresh contexts and immutable inputs per operation. |
| Reached filtered response path | Existing response Set-Cookie values must be nonempty, produced by real append operations for normal cases. The current repository microbenchmark clears response headers and never reaches the disputed inner scan; it is an untouched control, not proof of F061. |
| Complete protocol result | Exact ordered retained and newly expired Set-Cookie values, original request-cookie state, exception type/message and partial headers on expected caller-input failures. UnixEpoch expiry, MaxAge null, options/extensions remain unchanged. |
| Prefix equivalence | Ordinal-ignore-case base names and canonical contiguous `C1`...`Cn` names only. Do not parse the first equals as the whole name when the caller key itself contains equals. Leading-zero, plus-sign, overflow, missing-equals and near-miss chunk names remain unmatched. |
| Retained chunk boundary | Preserve missing/empty first/middle stopping and the original `chunks + 1` probe: a present extra probe can be removed without gaining a corresponding emitted expiration entry. |
| Attribute behavior | Preserve literal ordinal-ignore-case domain-before-path precedence and substring matching. Do not silently introduce stricter parsed attribute semantics. |
| Caller diagnostics | Label invalid/empty supplied names, raw null/malformed Set-Cookie and noncanonical inputs as caller-owned diagnostics, not ordinary append-produced cookie claims. Exercise the actual public delete/append error producer and compare complete original state. |
| Small-workload controls | Keep empty response, unchunked, one unrelated header and ordinary small chunk counts; retain every time/heap/variance result. No extra index or source tune without evidence. |
| Correctness surfaces | Existing CookieChunkingTests compile a linked copy in CookiePolicy.Test; run them but do not confuse them with the shipping owner. Actual public Authentication.Cookies harness and all three shipping consumer builds cover that false-pass risk. Add focused preservation rows in the existing class. |
| Measurement isolation | Same frozen harness/oracle/runtime/config and recursive DLL/JSON closure; only actual Authentication.Cookies owner differs. At most three paired comparisons. Verify every original contract twice before each process; no copied shipping algorithm/new IVT/UnsafeAccessor. |
| Publication | Exact measured source/test shape, per-row validation, all raw/control/correction evidence, immutable remote blobs, original template, actual fork issue/draft, immediate browser request and verified receipt/count. Do not publish unsupported benefit. |

## Permanent-test boundary

- **Behavior owner:** shared ChunkingCookieManager.DeleteCookie; deterministic managed response-header filtering and expiration emission.
- **Production producer:** real AppendResponseCookie/ResponseCookies and RequestCookiesFeature, plus explicitly labelled caller-owned HeaderDictionary diagnostics.
- **Final observable:** complete ordered Set-Cookie protocol output and expected exception/partial-state behavior.
- **Selected permanent surface:** existing `src/Security/CookiePolicy/test/CookieChunkingTests.cs`; shipping-owner harness and all three consumer builds in addition to its linked source copy.
- **Lower-boundary false-pass risk:** a copied membership loop or the legacy empty-response benchmark never executes the changed producer/path; the linked test copy alone cannot prove the shipping assemblies consume the updated source.

No browser/DOM/Blazor renderer, JS interop, DI-lifecycle or cross-runtime behavior
is claimed. The final observable is fully owned below the browser, not browser
cookie-jar acceptance or application/authentication-handler throughput.

## History and preparation

Prior dotnet/aspnetcore#31508 and #31625 optimized outer enumeration and grouped
cookie append in 2021, not the still-present inner keys.Any prefix scan.
Current code retains the 2024 MaxAge-null correction (#55169).
Microsoft Learn documents expiration and deletion of matching request chunks.
The original scan's card-package metadata identifies version 1.0.24; its old
machine temp card path is absent here. This continues the retained source
candidate/implementation workflow, not a new scan or telemetry publication.
The first narrow original test attempt genuinely failed NETSDK1004 on missing
CookiePolicy.Test assets; restore is allowed only after that recorded failure.
