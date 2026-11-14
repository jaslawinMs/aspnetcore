# F003 current-default activation acceptance

Fresh independent main37e809ead5824bc753a1c3d56f11615bdb1296c5.
Before shipping edits, the existing real ListValue root/nested serializer tests
passed2/2. Source history is unchanged since introduction in dotnet/aspnetcore#40242.
The actual well-known converter factory chooses generic converters by protobuf
descriptor full name, not CLR identity: custom-generated canonical ListValue
messages must remain supported. Do not assume every consumer is the Google CLR type.

Pinned Google.Protobuf3.33.6/v33.6 MessageParser documents factory delegates over
generic new, but CreateTemplate is internal. No private parser-field access,
dynamic constructor compilation, extra metadata cache, new IVT/UnsafeAccessor,
package/global configuration changes or broad converter refactor.
https://github.com/protocolbuffers/protobuf/blob/v33.6/csharp/src/Google.Protobuf/MessageParser.cs

Candidate: only replace the ListValueConverter.Read message initializer with an
exact typeof(TMessage)==typeof(Google.Protobuf.WellKnownTypes.ListValue) guarded
direct constructor and original new TMessage fallback. Retain the existing local,
PopulateList, descriptor lookup, return, Write and constructor/factory unchanged.
No Value/Struct converter optimization or combination with F295/F272/F228.
No public framework API, process-wide metadata cache or Hot Reload state change.

- Preserve complete generated protobuf values/order, fresh messages/collections,
  nested arrays/objects/null, root-null preemption, error exception type and
  custom canonical generated ListValue CLR fallback through the real factory.
- Existing Grpc.Tools generates a minimal canonical Struct/Value/ListValue schema
  with a different C# namespace under established Proto test assets; no hand-made
  IMessage, direct converter injection or reflection-only synthetic descriptor.
- Initial custom-fixture comparisons failed before the ASP.NET serializer:
  Google JsonParser treated the noncanonical generated file name as an ordinary
  message and expected an object. Retain both failed test rows. Before capture/
  timing, an explicit canonical ProtoRoot attempt was rejected by pinned
  Grpc.Tools' standard import shadowing. Retain that actual compiler failure.
  Do not reorder global tool imports: keep the generated canonical field schema/
  full names with a noncanonical file name, and use an independent standard
  Google JsonParser result transferred via protobuf wire parsing into the custom
  CLR type as the oracle. The actual ASP.NET factory must still select/deserialize
  the custom type; no claim that Google's own JSON parser accepts this file.
- Focused tests in existing JsonConverterReadTests, original/prototype suites and
  all individual rows required. Compare actual JSON results with Google JsonParser.
  A/B timing must establish any performance gain; passing compatibility tests
  alone are not a reproduced/fixed functional defect.
- Fixed21case actual serializer matrix before timing: six root string sizes
  (empty/single/mixed/32/256/1024), three UTF8 cases, three nested-empty-list sizes
  (8/64/256), Value/Struct nested64, three custom-generated cases, null-list,
  Value scalar, Struct flat and ListValue write controls.
- Actual JsonContext/DescriptorRegistry and JsonConverterHelper serializer-options
  producer; no copied constructor/PopulateList loop. Options/descriptors/payloads
  warm outside timing. Per-case converter/type receipts, complete output values,
  mutation/freshness and independent protobuf JSON oracle assertions.
- Same original harness/PDB/runtime/deps, only source-built owner DLL different,
  recursive DLL/JSON hashes, actual owner loads/MVIDs and all receipts retained.
- Serial shared-box .NET12/BDN0.13/inProcess/serverGC, eight measured iterations,
  three warmups/DontRemove. Maximum3pairs; clear large gain may stop at1, otherwise
  consume at most3 without cherry-picking. No unsupported repeatability claim.
- Publish every case/raw variance/test outcome/failure/prerequisite. Only supported
  meaningful gains with compatibility green get a fork-only template draft and
  immediate browser opening/remote verification; otherwise restore shipping code
  and publish tests-only no-gain/rejected disposition and diagnostic experiment.
- Cold converter construction, hosted HTTP throughput, other runtimes/platforms,
  concurrency, composition with other proposals unverified unless exercised.
