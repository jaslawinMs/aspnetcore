# F131 source-only tuning criteria

Written after the first complete comparison and before tuning production code.
Keep the initial frozen experiment, source, immutable manifests, all 29 raw
pairs and compatibility/storage/producer outcomes under prototype-1.

The frozen prototype has common-method regressions in this comparison:
Get_Method +6.73%, Try_Method +16.33%, Contains_Method +23.64%,
SetRead_Method +21.10%. Other affected paths improve, and all five full
UseOwin pipeline cases improve 4.64-9.73%. These are observations, not a
diagnosis of the frozen implementation or an explanation of control variance.

Use one source-only tune: make the private lookup field an IReadOnlyDictionary
backed by a once-built ordinal Dictionary. Preserve the original immutable
ordering/copy map, same FeatureMap references, all existing branches, the three
lookup seams, no post-construction mutation, and no public exposure of the
index. The extra application-lifetime storage trade-off remains.

The original timing harness/DLL/PDB/configuration must remain byte-identical;
do not edit it to accommodate this representation. Its --verify-storage flag
was specific to the first frozen prototype. Use a separate untimed storage
check project for the tuned read-only-interface/private-dictionary identity,
ordinal comparer, public copy order and per-context isolation. No reflection,
mock or diagnostic instrumentation in the measured execution.

Run the same original/final owning tests and all 29 ordinary complete producer
checks. Capture after-2 with the original timing harness. Compare final
implementation in remaining pairs 2 and 3; never aggregate pair 1 with a
different representation or exceed the total three-comparison cap.
Do not claim cold-map construction, initialization footprint, network or
production-throughput benefits.
