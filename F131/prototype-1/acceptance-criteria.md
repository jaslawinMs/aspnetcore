# F131 acceptance before product edits

Independent fresh upstream baseline:
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Branch: `autoperf/F131-owin-feature-map`.

The original private 25-entry ImmutableDictionary is stable and read many
times by OwinEnvironment. Its enumeration order is observable through the
public environment/Keys/CopyTo and mutable FeatureMaps copy. Do not replace
that ordering with FrozenDictionary's ordering.

Experiment: retain the original immutable map, initialization, enumeration,
counts and context-copy source exactly. Add one private ordinal FrozenDictionary
lookup index referencing the same FeatureMap objects; use it only for the three
stable-map TryGetValue/ContainsKey probes. Retain every per-context dictionary,
deleted-key guard, response-body closure, public member and existing branch.
The index adds one app-lifetime read-only map; that storage/first-use trade-off
must be explicit, not presented as reduced initialization work.

Preserve actual HttpContext feature production, values/setters, ordinal case
equality, null-key errors, missing-feature Items fallback, duplicate Add errors,
per-request removal and customization, default versus copied-map order, clear
behavior and context-specific response-body replacement. Test both default and
public FeatureMaps-materialized paths. No public signature/default/convention,
dependency, metadata/cache invalidation, assembly-access or sibling optimization.

Run all added focused rows against original code first, then the same owning
Owin suite against original/final. These are compatibility checks, not functional
bug-fix red/green. Inspect actual private storage in untimed diagnostics only:
25 original maps, optional frozen index references/comparer, and public copy
order against the retained original map. No private reflection in timing.

Benchmark complete public OwinEnvironment operations over actual
DefaultHttpContext/Http feature state and actual default UseOwin pipelines.
Cover hot hits, missing feature/unknown/Items/case variants, context-dependent
body, deleted and customized controls, actual environment enumeration/copy,
warm construction and common pipeline reads. Consume real results and verify
complete producer/status/header/body behavior outside timing. Do not claim
production/network throughput from dictionary-loop timing.

Use identical frozen harness/PDB/runtime/configuration; only Owin DLL may differ.
At most three measured comparison pairs in alternating order, tuning only when
justified. A clear large gain permits early stop. Retain all small-workload,
allocation and unchanged-path regressions; no material supported win means
no-gain instead of a speculative PR. First-use/static-index construction,
concurrency, other runtimes and hosted HTTP are unverified unless faithfully
measured; warm per-request constructor cases are not cold-map evidence.

Relevant history: dotnet/aspnetcore#58917 (commit
`fd3fe12cec7cc0b8b820e414a39fd5cae10abcc2`) removed per-request feature-map
rebuilding while preserving FeatureMaps/customization/removal/clear behavior.
Existing OwinEnvironmentBenchmark already exercises actual UseOwin no-op,
ports and header reads; use those owning-component boundaries as prior art.
Microsoft Learn's OWIN overview is context, not proof that this map is slow.
