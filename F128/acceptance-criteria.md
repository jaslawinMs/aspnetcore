# F128 acceptance before product edits

Fresh upstream/baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Independent branch: `autoperf/F128-owin-accept-pattern`.
Scope: capture the already-tested WebSocketAcceptAlt value with a declaration
pattern in WebSocketAcceptAdapter.AdaptWebSockets; no other source change.

The card is textually confirmed, not proof of redundant native work or a
runtime loss. Adaptation is registered by default by UseOwin. OwinEnvironment's
actual IHttpWebSocketFeature map produces the exact Func<WebSocketAcceptContext,
Task<WebSocket>> delegate only for a WebSocket request. Use that real producer,
including absent/nonrequest and materialized/dynamic environment variants.
Do not benchmark an extracted cast or manufacture a hot-loop performance claim.

Preserve missing/null/wrong delegate guards, original environment identity,
next invocation/await/exception identity, response status, options/native
context identity, subprotocol, cancellation token, actual callback, binary
frame output and real WebSocket cleanup. Include one actual UseOwin pipeline
test proving default registration, not only manually wrapped callbacks.
Use real ManagedWebSockets over in-memory streams for frame/cleanup evidence;
this is not hosted HTTP upgrade/negotiation or network-throughput coverage.
Moq is permitted for the actual feature provider, not as a replacement for the
OwinEnvironment mapping or adapted component.

Run all focused rows against original code before the two-line experiment,
then the same containing Owin suite on both sides. Passing compatibility tests
are not functional bug-fix red/green. Same exact BenchmarkDotNet harness/PDB/
runtime/configuration and immutable A/B closure; only Owin DLL may differ.
Include full adapted calls, typed/no-upgrade, real feature-map producer,
wrong/missing controls and full UseOwin/real frame lifetime cases. Keep all
raw outcomes, controls and variance.

At most three measured comparisons, tuning only when justified. A clear large
gain may stop early; if none is supported, publish no-gain rather than a
style-only optimization PR. No source/public signature/default/convention
change is otherwise allowed. No cache/Hot Reload state, new IVT/UnsafeAccessor,
host setting, manifest or unrelated cleanup changes. Preserve explanatory
locals, aliases, async/control structure and all other statements exactly.
Existing formatter/diff checks, exact per-row outcomes, owner loads/source
hashes and recursive DLL/configuration identity must pass.

Documentation: Microsoft Learn OWIN overview notes adapters have a performance
cost and aren't needed for ASP.NET-Core-only apps. That is context, not evidence
that this particular cast costs runtime work. Local reference lookup returned
only the declaration; actual UseOwin registration and OwinEnvironment source
were separately read, not inferred as repository-complete graph evidence.
