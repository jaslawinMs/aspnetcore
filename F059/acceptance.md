# F059 acceptance before implementation

Baseline: freshly fetched `dotnet/aspnetcore` main, `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
The original owning Razor suite passed all 362 tests after restoring its actually missing assets.

| Requirement | Faithful evidence required |
|---|---|
| Actual section producer | Real `RazorPage.DefineSection`, then real `RazorView.RenderLayoutAsync` transfers the content page's original case-insensitive dictionary to the layout. Full-view cases use the production pooled view-buffer service and a fresh disposed request scope per operation. |
| Material output | Exact final rendered HTML, section callback counts, empty return tokens and body/section validation, not merely a copied hash-set loop. |
| Existing section state | Case-insensitive duplicates remain errors, including after removal from the previous dictionary and after delegate failure. Missing optional and required names remain unrecorded and can subsequently be defined/rendered. |
| Caller-owned dictionary precedence | A previously rendered section must still throw the original duplicate error before a custom dictionary/comparer's lookup, even when that lookup would throw. First lookup failures leave the section unrecorded. Reentrant custom lookup preserves the original callback/state behavior. |
| Safe measured prototype | Only exact built-in dictionaries with the original `StringComparer.OrdinalIgnoreCase` may reorder lookup and insertion; unknown implementations, subclasses and custom comparers retain the original ordering and ignored Boolean insertion result. Missing known-dictionary lookups still consult existing rendered state before selecting required/optional behavior. |
| Isolation | Immutable identical harness/dependency/runtime snapshots; only the owning Razor assembly differs. Full original contract verified twice before each benchmark process. No copied shipping helper, new IVT, UnsafeAccessor, source-cache changes or API changes. |
| Performance | At most three paired comparisons. Keep every target/control time, heap and variability row; a helper-only gain does not prove a view/request gain. Reject or mark no-gain without supported net benefit. |
| Validation/publication | Every original/prototype/restored test row and contract must be inspected. Keep initial missing-assets failure and actual successful restore/test commands. No source proposal until all gates pass; every newly created fork draft opens immediately. |

History: membership/duplicate exceptions reach `931d18b85148e634e5caa1083805f5297cdfd027` (2014).
Bounded GitHub `"renderedSections"` issue/PR search returned zero results; this is not exhaustive absence evidence.

Scope boundary: managed Razor page/view execution and its real registration/transfer/buffering mechanism. Page subclasses use generated-style execution hooks; this does not test the `.cshtml` compiler, HTTP hosting, browser behavior or concurrent page reuse.
