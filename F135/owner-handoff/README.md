# F135 — historical evidence selection

**Disposition: PENDING.** Preparation007 was accepted; this capsule only selects and audits its evidence. No source edit, useful-gain gate, PR, performance conclusion or final disposition is adopted. The fixed classified `REPORT.md`, campaign state and original38648-file seal were not changed.

## Recorded facts

| Boundary | Original37e809 | Observed main00560 | Evidence |
|---|---:|---:|---|
| Real registered output-cache middleware, policy, key, store and response reuse | 27 passed | 27 passed | [Original rows](facts/rows-original.json), [main rows](facts/rows-main.json), [consumer source](consumer/Program.cs) |
| Three exact existing xUnit tests | 3 passed on runtime62 | 3 passed on runtime68 | [Original console](runs/tests-original/stdout.txt), [main console](runs/tests-main/stdout.txt), [exact names/results](facts/existing-tests.json) |
| Actual existing-test host resolution | `12.0.0-alpha.1.26562.105` | `12.0.0-alpha.1.26568.110` | [Original host](runs/tests-original/host-resolution.txt), [main host](runs/tests-main/host-resolution.txt) |
| Both real middleware producer probes | Runtime68 | Runtime68 | [Original host](runs/producer-original/host-resolution.txt), [main host](runs/producer-main/host-resolution.txt) |
| Whole consumer image inventory | 193 entries | 193 entries | [Every entry and comparison inputs](facts/images-original-main.json) |

The source pins are `37e809ead5824bc753a1c3d56f11615bdb1296c5` and `00560e2dd1954a2acf2bc54b35422b0f32484bf1`. “Main” means the exact upstream revision observed during preparation007, not a new freshness assertion. [Detached HEAD copies](pins/original-head.txt), [main HEAD](pins/main-head.txt), [captured upstream identity](facts/main-recheck.json), [physical/Git associations](facts/source-associations.json) and selected physical/Git source copies connect these identities.

The actual producer is `UseOutputCache` → middleware policies → genuine `VaryByValuePolicy` → `OutputCacheKeyProvider.CreateStorageKey` / `TryAppendVaryByKey` → `HasVaryByValues`. A forwarding decorator observes the real default store; responses are cached and replayed through TestServer HTTP requests. Read-only diagnostic reflection observes the owned backing dictionary; it does not call the key helper.

Default uninitialized storage is kept distinct from deliberately initialized-empty and populated-then-cleared **public-policy controls**. The latter are not claims about default-producing behavior. The remaining profiles cover real nonempty dictionaries, sorted two-value keys, duplicate overwrite, repeated/different keys and values, value case and empty values.

## Image and runtime limits

The final common consumer DLL/PDB/deps/runtimeconfig hashes are [byte-identical across roles](facts/common-consumer.json). The original copied image also has [193-entry equality to the executed input image](facts/image-original-copy.json). There are **69 original/main image differences**, including nonowner differences: these two source-characterization images are **not an isolated causal performance pair**. No fixture-prefix exclusion is used. [Gate controls](facts/image-controls.json) retain expected rejection of an added fixture-prefixed file and a missing owner.

Static inspection of the **actually selected loaded `System.Linq` image** records an `ICollection<T>.Count` fast path, and the genuine owned `Dictionary<string,string>` implements that interface. [Selected-image identity and decoded IL](facts/runtime-any-il.json) connect to both probes’ loaded-assembly records. This is static image/type evidence, **not** an empirical no-gain, zero-cost, allocation or JIT-equivalence observation. **Residual cost remains unmeasured.** The attempted public runtime-source lookup returned [HTTP404](facts/runtime-source-404.json); it was not silently treated as a successful source association.

The original existing tests used runtime62, while main existing tests and **both middleware probes** used runtime68. These are not interchangeable. The SDK was `12.0.100-alpha.1.26557.102`. The private runtime68 installation was a runtime prerequisite, not an SDK, and the coordinator-backed SDK root did not contain runtime68.

## Validation and failures

- [Exact historical command/result table](commands.md), with all18 command records and original stdout/stderr. These executions were **not rerun** during packaging.
- [All54 middleware rows](facts/rows-original.json) / [main counterpart](facts/rows-main.json); six exact existing-test executions are real console outcomes, **not manufactured XML**.
- [Preserved failed prerequisites](facts/failed-prerequisites.json), including missing generated import, the failed diagnostic-policy prototype, unavailable requested runtimes, public-source404 and missing Python. [Prototype source](failures/prototype-Program.cs) is retained; the original prototype binaries are omitted with their exact original hashes.
- Runner `--help` produced no tests and is not counted. Ordinary tool/runner duration text is preserved verbatim in logs, not analyzed or adopted as performance data.
- [Recorded terminal-process audit](facts/terminal-processes.json): all18 owned .NET roots terminal. Packaging starts **no new .NET build, test or host**, performs metadata-only Node/PowerShell work and does not change the original evidence.
- The [explicit HOLD receipt](packaging/hold-001.json) is preserved. Metadata-only completion resumed after the [explicit RELEASE](packaging/release-001.json).

## Portable historical audit

Requires an existing modern Node.js with built-in modules only. It works from any current directory, without the original checkout, Windows paths, SDK, runtime or producer:

```text
node audit.cjs
node audit.cjs --self-test
```

| Metadata-only packaging command already executed | Result |
|---|---|
| `node packaging/assemble.cjs` | [PASS:184 copied files, original seal checked](packaging/selection.stdout.txt) |
| `node audit.cjs --prepare-report` | [PASS:54 rows and six exact test executions](packaging/audit-001.stdout.txt), [exit0](packaging/audit-001.result.json) |
| `node audit.cjs --prepare-report` after RELEASE, including all118 loaded-association checks | [PASS](packaging/audit-002.stdout.txt), [exit0 and terminal PID](packaging/audit-002.result.json) |

The auditor verifies every selected copied hash and checks selected original inventory entries against the immutable original manifest; independently reconstructs all27 expected rows per pin; checks each of the six exact console outcomes and actual host selections; checks all118 recorded loaded-assembly associations, physical/Git bytes and source-owner PE/PDB receipts; recomputes all193-entry image comparisons and common-image identities; and verifies the small capsule’s exact file inventory. Self-tests reject a changed response and runtime62/runtime68 conflation. [Stored deterministic facts audit](audit-result.json) and [capsule handoff](handoff.json) summarize the result.

**Historical boundary:** PE/PDB, image and runtime binary identities are recorded sealed receipts. Binaries are intentionally not copied or freshly parsed/rehash-attested by this portable audit. `fullCompilerInputAttestation` remains **false**. Kestrel/TCP/IIS, concurrency, expiration/eviction, error/cancellation paths, workload frequency and performance remain excluded.

## Selection, omissions and integrity

- [Selection map](selection.json): copied relative paths, original paths, lengths and hashes.
- [Original complete38648-file manifest](manifests/preparation-007.json), [separate original digest](manifests/preparation-007.sha256), [original verification receipt](manifests/preparation-007-verification.json).
- [Exact omissions and external prerequisites](omissions.json): the full original manifest retains every omitted hash; the omitted-set digest is independently recomputed. Relevant omitted owner/consumer/test/prototype PE/PDB hashes are also singled out. No whole clone, `obj`, package cache, SDK or binary payload is copied.
- [Small capsule manifest](manifest.json) covers every copied/created file except the manifest and its own [separate digest](manifest.sha256). It does not recursively freeze private scratch or external graphs.
- Publish bytes unchanged. The capsule-local [Git attributes](.gitattributes) disable newline conversion so recorded physical-source and native-log hashes remain portable.

The proposed source fast-path edit, useful gate and PR remain **unadopted**, and all original [exclusions](facts/preparation-handoff.json) remain in force.
