# F091 preimplementation acceptance

Recorded before editing shipping code. Campaign baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`; current upstream default head `b38e2847d9cda5fbba26177354ed11ede3f7dbfe`. Actual owner, Google options/challenge properties, OAuth owner, AuthenticationProperties producer and existing GoogleTests blobs are identical at both heads. Reproduction uses the pinned campaign checkout; the entire newer branch is not claimed byte-identical.

## Corrected premise and preserved contract

- The exact installed runtime's Boolean.ToString/provider overload returns existing True/False literals. Only subsequent lowercasing creates a new lowercase string; the scanner's two-string allocation premise is incorrect.
- The typed nullable property can produce true, false or null. Change only that formatter to choose the lowercase literals/null. Preserve generic selection, typed parameter precedence, verbatim Items fallback, null/absent omission or existing endpoint parameter, item removal before protected state, every other query parameter and ordinary challenge handling.
- Retain original surrounding branches and other invocations. Remove the now-unused CultureInfo import only if needed by the changed seam. No shipped API/default/cache/dependency/visibility change.
- The seam originates at `06c93669d617fec50bf411c0c53d672019adf9df` in March 2018. Bounded active owner/key/name PR searches yield no candidates, not an exhaustive absence-of-overlap claim.
- Google documents lowercase `include_granted_scopes=true` for incremental authorization. This work changes no protocol behavior or provider policy and makes no assessment beyond resource use and output preservation.
- Original-owner setup establishes that an existing endpoint query is repeated by the base/Google reconstruction. The endpoint control preserves that exact two-value output, rather than assuming a single value or changing unrelated behavior.

## Faithful evidence before retention

1. Run existing Google challenge/query/state preservation cases against the original and selected actual in-tree handler, with the repository SDK and dependency-aware build.
2. An external BDN project must exercise the compiled Google owner, not only Boolean casing. A thin external derived wrapper may invoke its existing protected BuildChallengeUrl after real public initialization; it must not reimplement or override that owner.
3. Also exercise the real registered Google handler through public request-scoped ChallengeAsync, with normal options and actual ephemeral PropertiesDataFormat protection. No persistent key-store mutation, external provider requests or dummy state formatter.
4. In unmeasured setup, assert complete query, output status, typed/default/Items precedence, actual protected-state round trip and item removal. Exercise typed true/false with PKCE on/off, typed null/absent, verbatim string Items, typed-over-Items and endpoint-query controls. Keep input/property/scope creation and completion observation identical across variants.
5. Retain actual owner/harness identities and portable-PDB/source checks. Freeze complete Release execution outputs; only owner DLL/PDB may differ, with identical harness/configuration/dependencies.
6. Compare actual resource use, not scan labels. Expected reached allocation saving is one lowercase string, not two strings; controls must remain explicit. Functional assertions are green/green preservation, not a manufactured correctness regression.

## Measurement/publication

- Shared Windows host, serialized CPU-heavy work, at most two MSBuild workers, no power/affinity or unrelated process changes.
- SDK/runtime pinned to the repository; BDN 0.13.0, Release, x64/in-process server GC, three warmups/eight result samples/100ms/DontRemove.
- At most three measured comparisons total, not per strategy. A large actual-owner win can close early; otherwise retain all rounds, regressions and control movement, then classify supported allocation/timing gains, no-gain or rejection honestly.
- Publish reproducible source/project, exact commands/outcomes and all raw results. Only a justified, preservation-checked proposal gets a fork-only draft, opened immediately and verified against immutable evidence/source/template.
- Excluded: network/remote Google interaction, complete browser authorization workflow, production challenge frequency, first startup, persistent key-store behavior, other runtimes/OS and universal throughput. This is an optional challenge parameter, not an established every-request hot path.
