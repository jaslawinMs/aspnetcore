# F136 — preparation only; official finding stays pending

**No benchmark, candidate, shipping/permanent-test edit, performance verdict, API proposal, publication, or ledger change.**

## Revisions and ownership

- Original37: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Fresh upstream default, queried through `gh api` at preparation start: `00560e2dd1954a2acf2bc54b35422b0f32484bf1`; raw responses retained. This revision is pinned, not a moving-default claim.
- Target: `src\Components\Endpoints\test\Builder\TestFileProvider\TestFileProvider.cs`, `Watch`, lines 91–100. The target and inspected consuming test files are unchanged between these revisions.
- This is **test infrastructure**. The present code already uses `TryGetValue`; it conditionally follows that lookup with an indexer **write**, only for missing/changed tokens. The unchanged branch does not write.
- History: copied from MVC in `c283d05c`; CA1854 commit `983ca238` changed `GetFileInfo`, not `Watch`.

## Observed behavior and actual consumers

The instance owns an ordinal dictionary. New tokens retain their filter object; equal unchanged repeats retain the token/filter. `AddChangeToken` replaces even an unchanged entry. Retained old tokens remain independently mutable.

The helper's public `TestFileChangeToken.HasChanged` setter is the exercised producer, **not an OS/browser watcher**. `AddFile`/`DeleteFile` do not signal tokens. `ActiveChangeCallbacks` is false; registration returns a no-op disposable without retaining/invoking callbacks. Old/new/late-old registrations did not run or reenter.

Bounded LSP/source tracing found three local owning fixture setups: builder, hot-reload, and endpoint-data-source tests. They seed `site.css` but do not directly call this helper's `Watch`, `AddChangeToken`, or setter. Their hot-reload endpoint token is a different mechanism.

The artifact observes public virtual operations, delegating to the original helper. Real `MapStaticAssets`/`MapRazorComponents` and native options configuration produced `/f136` with `default.css` resource metadata. Provider operations were exactly `GetFileInfo:TestApplication.modules.json`, with **no Watch call in this setup**. This is not a universal caller census or hosted CSS/HTTP/browser claim.

## Validation

| Requirement | Evidence, passed on both roles |
| --- | --- |
| Initial missing/equal-repeat token and filter identity | `MissingAndRepeatPreserveIdentity` |
| Public changed-state producer, replacement, retained old/new callbacks | `PublicChangedStateReplacesWithoutCallbacks` |
| Explicit replacement and ordinally distinct filters | `ExplicitReplacementAndOrdinalFilters` |
| Real file content replacement/deletion without token signaling | `FileMutationDoesNotProduceTokenChanges` |
| Actual managed consuming fixture and material resource metadata | `RealEndpointFixtureReadsFilesWithoutWatch` |

Both own source/reference graphs built successfully with the exact repository SDK `12.0.100-alpha.1.26557.102`. Original ran on exact runtime `12.0.0-alpha.1.26562.105`; Default on exact `12.0.0-alpha.1.26568.110`. Roll-forward was disabled. The common C# 13 verifier had **one successful compilation**, reused byte-identically as DLL/PDB/deps/runtimeconfig in both full own-role images; its earlier failed artifact compilation is retained.

Existing native cases passed **5/5 per role**, including the sole `MapRazorComponents_CanAddConventions_ToBlazorWebEndpoints` theory row (`/_framework/opaque-redirect`). Exact names and all actual TRX rows are in `test-results.json`. **No selected test remains blocked before assertions.**

**[commands.md](commands.md)** contains the exact command/PID/exit table; `commands.json` records environments. Initial task/assets, checkout, and artifact-compile failures are retained; see `auxiliary-attempts.json`. Native source was not repaired. The submodule's pinned revision matches and its own long-path-aware tracked status is empty, while ordinary superproject status reports it `M`: both observations are retained, not a pristine-checkout claim. Missing Python was supplied privately, without machine-wide installation.

## Provenance and portable audit

Run `python -B audit.py` from this capsule; `--external` additionally rehashes the pinned omitted trees where available. The auditor starts no .NET process or tests.

`manifest.json` and `CHECKSUMS.sha256` cover the selected payload. Proof includes loaded owner/runtime paths, SHA256/MVID, independently parsed PE CodeView GUID/stamp and portable-PDB identities, eight selected raw document associations per native role, and the common Program.cs association. All 62 selected repository files' raw materializations differ from their Git blob identities; all 62 match after CRLF-to-LF normalization. PDB checksums associate the **raw compiled bytes**, not the LF Git bytes. **Selected document checksums are not full compiler attestation.**

All **292 image files** are compared without exclusions: **185 equal, 107 different**; common DLL/PDB/deps/runtimeconfig are identical. Different dependencies/runtimes mean **not a future causal performance pair**. No `CollectionsMarshal`/`TryAdd` compatibility or optimization claim is made.

Inventories/hash lists cover omitted graphs, images, compiler outputs, private packages/tools, exact runtime trees, and SDK. Reparse targets/Git alternate stores remain external. Restore assets pin NuGet archive identities; the whole global package cache was not rehashed. No complete clone/obj/packages/runtime tree is sealed.

All 16 wrapper-started native roots and both VSTest hosts have terminal exits; source/materialization streams are terminal, including one explicitly stopped early history query. Initial shell/compiler-child PID gaps are documented in `auxiliary-attempts.json`. Metadata receipts accompany this capsule. No known owned child/stream remains running.

Unverified/intentionally excluded: concurrency, virtual overrides other than observation, null/glob/path equivalence outside exercised filters, full test suites, real filesystem notifications, hosted HTTP, browser lifecycle, candidate equivalence, and performance. A compatible worthwhile optimization remains unestablished; the coordinator owns any verdict.
