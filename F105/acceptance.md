# F105 acceptance, recorded before implementation

Finding: `custom-collection-interface-foreach-enumerator` in the shipped
`ValidationStateDictionary.GetEnumerator()` contract. A source-level struct
boxing suspicion is not proof of warmed managed allocation or an ordinary
MVC validation-path enumeration.

## Investigation and compatible scope

- Capture the current default revision and exact current/baseline/working
  source/Git identities, existing public API baseline, owning lookup/validation
  producers, existing selected control definitions and project configuration.
- Inspect the bounded actual owner history and related proposal70210 at its
  captured head. A lazy dictionary-storage proposal is not automatically the
  same as replacing the public enumeration contract. Searches are bounded.
- Keep the public interface-returning GetEnumerator, dictionary interfaces,
  reference-identity keys, observable independent enumerator/Reset/mutation/
  empty behavior and existing validation-state overrides. No new public API,
  return-type substitution, friend/private cross-assembly access, dependency,
  TFM or visibility change is authorized by the scanner finding.
- Record a precise API assessment. A hypothetical incompatible replacement
  may be rejected before source comparisons; do not claim its binary was run
  if only its proposed signature/source consequences were examined.

## Faithful original reproduction

Use the real in-tree public ValidationStateDictionary and its real generic/
non-generic enumeration paths, completing the actual key/value traversal and
returning a checksum for0/1/16/128-entry inputs. Record exact input identities,
checksums, enumerator representation and the existing public Reset consumer.
Do not substitute a private Dictionary benchmark for the wrapper's cost.
Add four explicitly retained-IEnumerator caller profiles at these sizes.
They deliberately keep the real returned interface after complete traversal;
they characterize an escaping consumer, not ordinary MVC visitor frequency.

Separately resolve the actual IObjectModelValidator through public
AddMvcCore/AddDataAnnotations DI registration. Complete real validation of a
Required-property model with null/empty/suppressed/remapped/16-entry/128-entry/
metadata-override/strategy-override validation state. Use the actual public
DefaultModelBindingContext factory to produce that dictionary; population and
the explicit null-state control remain caller-owned. Assert exact ModelState
keys/errors, suppression and actual property-getter/strategy reachability.
The24 profiles comprise16 complete traversals and8 validation-service cases.
This is a warmed managed validation-service
boundary, not a hosted HTTP request or proof that this visitor enumerates the
state dictionary. Inspected lookup source uses TryGetValue.

Preserve reference-equal versus value-equal keys, independent interleaved
enumerators, live views, public Reset and add-invalidated enumeration controls.
Run ten exact existing DefaultObjectValidatorTests Facts with actual TRX IDs,
durations, skips and output owner/source/PDB identities. They are owning
validation controls, not pre-existing dedicated dictionary-enumerator tests.
There is no baseline ValidationStateDictionaryTest in this checkout.

## Measurement and disposition

Freeze the original harness/config/dependency image and actual owner identities.
Include precise process-wide warmed resource calipers outside timing. Confirm
every case's real producer and final observable before starting BDN.
BenchmarkDotNet0.13.0/net12/C#13,Release/x64,in-process,server/concurrent GC,
requested100ms,3 warmups,8 results,DontRemove. A baseline-only profile is
pressure characterization, not an optimization saving.

Only implement a minimal compatible root-cause proposal if the real evidence
justifies it. At most three measured source comparisons, each paired with a
fresh exact original; stop early for a clear compatible approximately50% gain.
If the warmed original already avoids the alleged allocation or the only
evaluated boxing-removal strategy breaks the shipped contract, close honestly
as no-gain/rejected rather than inventing a change. Do not equate different
contracts, helper-only gains or production-frequency assumptions with a fix.

Publish exact sources/commands/outcomes/raw samples/GC/actual overhead/setup/
source-PDB/input/test records, every regression and material limitation.
Preserve failed development attempts and raw bytes; independently verify the
portable capsule and actual fork refs/blobs before finalizing the ledger.
Use the repository PR template and immediately open only a justified fork
draft. No upstream PR or API approval claim.

Shared Windows machine: serialize CPU-heavy work/max2 build nodes,activate the
local SDK in each fresh dotnet shell,preserve unrelated source/reports,
processes,power,priority and affinity. Do not rerun finalized F104.
