# F057 acceptance before the throwaway source experiment

Baseline: current upstream main37e809ead5824bc753a1c3d56f11615bdb1296c5.
The retained high-confidence/confirmed boxing claim is a candidate,not a
validated allocation defect. ParameterView supplies already-object-valued
frames; CascadingValue<TValue> supplies genuine typed arguments only when
the real renderer has registered a non-fixed subscriber.

| Requirement | Acceptance evidence |
|---|---|
| Establish current owner/history/prior work | Read ChangeDetection,ParameterView.DefinitelyEquals,CascadingValue.SetParametersAsync,Components instructions and relevant guidance;retain bounded history and actual prior-work search hit. |
| Preserve null/default/type/equality/conservative behavior | Fixed38-case real-owner corpus: typed immutable values,nullable null/zero transitions,references,unknown128-byte struct,enum,mixed helper-only instantiation and actual object-valued ParameterView. Original capture twice;same full contracts checked on every measured setup. |
| Prove real generic producer reachability | Real Renderer/parent/CascadingValue<T>/consumer creates a live non-fixed subscription;observe actual subscription count,consumer parameter/update deltas,latest original value identity and render batches. No callback/subscription injection or growing recorded batch history. |
| Distinguish generic IL boxing from actual JIT/heap cost | Actual owning method's IL and JIT disassembly plus full-method resource observations outside timed comparisons. Never attribute Equals/GetType/producer boxing to the two null checks without native evidence. |
| Isolate A/B source | Freeze freshly tested original owner/full harness closure;after changes only owning DLL/PDB,all original runtime/dependency/harness/oracle bytes reused. Preserve explanatory locals/branches and immutable cache/hot-reload hookup. |
| Honor measurement budget | At most three serialized identical-config BenchmarkDotNet comparisons;all38 cases/controls/outliers/directions retained. No fourth pair or unsupported tune. |
| Validate scoped contracts | Existing CascadingParameterTest/ParameterViewTest baseline95/95 complete parsed rows. Same scoped tests after experiment;no newly invented red functional defect or irrelevant permanent tests for a rejected throwaway experiment. |
| Publication gate | No shipping source commitment or PR from source-level boxing alone. Unsupported result: restore only own source experiment,publish no-gain evidence/receipt. Supported shipping result:complete applicable Components sample/browser/selected permanent coverage and bootstrap prerequisites before draft/browser publication. |

**Boundary fields:** behavior owner ChangeDetection and managed rendering;
production producer real renderer-generated ParameterView/object frames and
CascadingValue<T> with actual consumer registration; final observable managed
subscription propagation/consumer identity/render-batch changes and allocation.
Selected permanent surface is undecided because this is an explicitly
throwaway managed-owner comparison,not shipping implementation.
Helper-only delegate calls cannot establish that the renderer registered a
subscriber;the actual renderer corpus must establish that precondition.

The first-build sentinel and JavaScript bundles were absent. Only the narrow
managed-owner test/build path is being used for this prototype;full bootstrap,
sample/browser,E2E,Server/WebAssembly/Auto hosts,Native AOT/trimming,hot-reload
deltas,cold/pressure and production throughput are not claimed validated.
The Components prototype/design-research exception applies until a shipping
proposal is justified. No browser-owned timing/DOM/interop change is proposed.
The existing metadata cache and its hot-reload clearing are untouched.

Before edits,the original native resource probe exposed Tier0 minopt code:
two fresh int boxes immediately precede the two null comparisons;the third
box is the later Equals argument. Full int calls observed about72 B/op.
Nullable early-return cases observed0. This does not establish warmed Tier1
costs,and the tiered BenchmarkDotNet outcomes remain decisive.

Planned two-line experiment revised using that baseline evidence: check
non-nullable value-type kind before each actual value's null test,using
typeof(T).IsValueType and Nullable.GetUnderlyingType. Unlike a default(T)
guard,this does not introduce another generic value boxing expression.
Retain original locals and surrounding type/immutability/equality branches.
Do not add a cache;retain lookup costs/reference/nullable controls explicitly.
This may simply duplicate a warmed JIT optimization,which is valid no-gain.
