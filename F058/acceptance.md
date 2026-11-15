# F058 acceptance before the throwaway null-validator experiment

Fresh main: 37e809ead5824bc753a1c3d56f11615bdb1296c5. Independent
autoperf/F058-header-collection-null-boxing; F057 source/evidence closed.

The source claim is not established by an unconstrained `item == null`.
The bounded Headers source inventory contains three StringSegment collection
construction sites,all using CacheControlHeaderValue.CheckIsValidTokenAction.
Default validator users in actual source use NameValueHeaderValue or
RangeItemHeaderValue reference types. MediaType copies also use reference
elements. An isolated value-type default validator is not the shipped producer.
LSP returned only seven same-file references,not complete repository evidence;
the bounded source inventory/actual delegate observations must establish reachability.

| Requirement | Acceptance evidence |
|---|---|
| Inspect current source/history/prior work | Preserve fresh default revision,all15 ObjectCollection source hits across five files,actual class definitions,custom token validator and its precise exception contracts. Follow history reaches strongly typed headers commit4fb21644fc3b2387e07e3622f2361652d4598c1f. Bounded GitHub ObjectCollection search returns0,not exhaustive proof. |
| Verify actual producer/default/custom distinction | Public CacheControl NoCacheHeaders/PrivateHeaders and real parser produce StringSegment collections;observe actual private delegate identity outside timing,never replace it. Default class collections produced by MediaType/ContentDisposition/Range/CacheControl extensions remain labelled reference-type controls. |
| Preserve full contracts | Fixed22-case corpus includes real public creation/add/parse/deep-copy/read-only boundaries and explicit helper-only/default value-type/null/nullable/indexer/read-only diagnostics. Original capture twice and full identical contracts on each setup:protocol,collection values/order/element identity,read-only state,actual validator identity and exact exceptions/parameter/message. No helper-only result counts as public producer proof. |
| Preserve isolated owning code | Freeze freshly tested owner/original complete harness. Substitute only Headers DLL/PDB;runtime/dependencies/harness/oracles remain identical. One-line guard preserves nullable null throwing and non-nullable default acceptance;no API,cache or other source change. |
| Scope actual allocations/JIT | Record actual owning CheckNotNull IL/native and untimed complete-workload resources separately;do not equate boxing IL or Tier0 observations with warmed allocations or attribute custom-validator work to the default validator. |
| Honor bounded rejection/budget | At most3 serialized A/B comparisons. When no actual shipped value-type default-validator producer is established,one diagnostic comparison is sufficient for rejection regardless of isolated gains;do not fabricate a shipping PR or waste additional comparisons on a rejected premise. Retain every actual/control outcome. |
| Preserve tested behavior and restore | Run scoped Headers package test suite before/prototype/restored,parse every outcome. For rejected throwaway experiment,no irrelevant permanent tests;restore exact source/tested owner and publish immutable evidence/receipt. |
| Publish honestly | Record unsupported source premise,all raw/source/harness/JIT/resource/test evidence and exact commands. No shipping source commitment or draft from synthetic value-type helper cases;no other-runtime/cold/pressure/application-throughput claim. |

The experiment changes only the default null test to bypass an actual null
comparison for non-nullable value types. Nullable<T> and references retain
their exact check/exception. No static cache is introduced.
Source-level private reflection/delegate binding is confined to the benchmark
harness;no shipping IVT,UnsafeAccessor,API surface or state injection.

Before source edits,the actual original native probe recorded Tier0 minopt
CheckNotNull<int> as a9-byte return and CheckNotNull<StringSegment> as a10-byte
return,with no allocation/null comparison. Nullable<int> checks HasValue
directly. All seven nonthrowing diagnostic resource cases observed0 B/op;
the real custom NoCache Add_2 control observed272 B/op. Thus even the isolated
default value-type premise is not an observed allocation on this runtime.
One throwaway comparison can characterize guard overhead;it cannot justify
a shipping optimization from this unproduced/optimized-away boxing claim.
