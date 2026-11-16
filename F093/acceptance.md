# F093 acceptance before candidate implementation

The reported wait is the public IDisposable compatibility boundary, not an
unnecessary pending operation. Actual CA2012 commit d86be87 explicitly replaced
direct incomplete ValueTask.GetResult with AsTask/GetResult. The normal
HttpResponse disposal callback prefers IAsyncDisposable and awaits it.

Current-default owner and five inspected context/response/TestHost/test
producers match the campaign baseline. This is scoped identity, not whole-branch
or runtime equivalence. Pinned non-generic ValueTask.AsTask returns cached
Task.CompletedTask for default successful completion; it differs from F092's
generic Task<int> wrapper. Do not assume allocation or normal-request gain.

| Requirement | Evidence to obtain before disposition |
|---|---|
| Actual owner and scope producer | Use DefaultHttpContext.RequestServices to create the public RequestServicesFeature and an actual Microsoft.Extensions.DependencyInjection scope, not a manually installed owner or mock scope. Resolve real disposable scoped services. |
| Completed disposal and task identity | Actual empty/synchronous/completed async/dual/IValueTaskSource-backed resources are disposed once, async is preferred for dual resources and source GetResult is consumed. The original non-generic returned task's identity and strict disposal-only allocation check must establish whether any wrapper allocation exists. |
| Pending caller contract | Dedicated synchronous caller actually waits before the real scoped async disposable's release. Async caller returns an incomplete value without waiting. On success clear request-service references only after completion; retain pending/faulted waiting and unwrapped exceptions. |
| Producer-owned normal response cleanup | Exercise actual TestServer/HttpClient, RegisterForDisposeAsync and the actual server's completed-response callback chain. An EOF response alone does not prove cleanup: await a callback registered before request services that runs after its real disposal. A gated actual async resource must prove that final callback cannot run prematurely. |
| Preservation and controls | Matching original/candidate actual functional observations and three exact existing DefaultHttpContext request-services test rows. Async owner and normal registered response methods remain timing/allocation controls. Missing factory/assigned provider are separately characterized, not silently treated as ordinary owned scopes. |
| Narrow source and fair execution | Candidate may only consume an already-successfully-completed non-generic disposal directly, retaining task conversion/wait for other states. No async body, visibility, API/default, scope clearing or dependency change. Identical harness/runtime/deps and complete owner-only DLL/PDB closure; actual source/PDB proofs and raw console/JSON/setup/test audits. |
| Honest disposition | At most three unchanged-strategy AB/BA/AB comparisons; all outcomes/controls/regressions retained. Resource checks can be green/green when original already allocates zero. Never invent a failing original assertion, claim pending wait removed, or propose a normal async-request gain from a sync-only method change. Publish no-gain if no supported material gain. |

Seven profiles: empty scope, synchronous1/16, completed-async1/16, dual1 and
completed source-backed1. Four methods: prepared sync owner lifecycle,
prepared async owner lifecycle, explicit sync disposal in a full public request,
and unchanged normal async registered full public request. Prepared methods
include real context/scope construction and resolution, not a hidden caliper.

All work is serial on the shared Windows machine. Builds use max2 nodes,
fresh dotnet shells activate the repository SDK, and power/affinity/unrelated
processes and repository dependency/SDK manifests remain untouched.
