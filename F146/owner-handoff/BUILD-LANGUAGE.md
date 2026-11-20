# Build language boundary

The first cached-runtime-57 source build failed CS9260 in the unmodified pinned `src\Http\Http\src\HttpContextAccessor.cs`: its existing null-conditional assignment requires C# 14. A global C# 13 override cannot compile that unchanged source.

The correction does not edit pinned shipping code or its configuration. Unmodified dependency projects retain the repository's declared `LangVersion=preview`. The artifact-only `F146.Producer.targets` now selects C# **13.0 only for the existing InMemory.FunctionalTests project**, including all newly authored F146 test code. The exact failed global-C#13 driver/targets and compiler failure remain in `failed-attempts` and `logs`.

The second build showed that setting this property at the early custom-target import was overwritten by a later repository import. Its explicit language guard failed before test compilation. The third attempt sets the same test-only property inside the `BeforeTargets=CoreCompile` target; dependency-project defaults remain unchanged.
