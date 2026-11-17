## Retained finding F028

`SignInManager<TUser>.GetExternalLoginInfoAsync` enumerates external schemes to resolve one known provider's display name. **Correction to the scan wording:**the default `AuthenticationSchemeProvider` already reuses its all-schemes snapshot;this is filter/scan work,not snapshot reconstruction.

Proposal:use the existing ordinal dictionary only when manager and provider are both exact default types. Preserve the original virtual sequence path for every custom/derived type,default null/empty/whitespace semantics,first matches,live registration changes and exact result properties/tokens.

Source:[@SOURCE_COMMIT@](https://github.com/jaslawinMs/aspnetcore/commit/@SOURCE_COMMIT@).

Measured evidence:[immutable F028 capsule](https://github.com/jaslawinMs/aspnetcore/tree/@EVIDENCE_COMMIT@/F028).

One predeclared comparison:four-scheme tail237.50->180.25ns/op,576->472B/op;explicitly synthetic128scheme tail1340.29->182.30ns/op. **Derived-manager/provider controls regress5.7%/6.5%;this is a qualified draft,not merge-ready or an all-caller recommendation.** All20warm rows and4first observations are retained. Stop rule>=50%in a declared primary was met;remaining slots are permanently closed.

Actual owner tests121existing passed;corrected expanded original137passed plus one specific resource red55832=55832;selected138passed,0skipped. Both frozen consumers and a physically relocated fresh build pass10public wrappers/20value contracts/18additional producer contracts. Prepared synchronous authentication-result seam,not full login/cookie/HTTP/network/async-authentication throughput or application-frequency evidence. Initial fixture confound and missing standalone dependency failure remain preserved,not relabeled passed.

No public API change. Fork-only campaign tracking;no upstream request or universal/application speedup claim.
