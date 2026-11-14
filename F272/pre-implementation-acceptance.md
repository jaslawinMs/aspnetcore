# F272 acceptance defined before production edits

- Independent fresh default37e809ead5824bc753a1c3d56f11615bdb1296c5,
  not F295's character-buffer implementation.
- Finding is informational descriptor-setup work. Actual source calls casing
  only for lowercase chars after capitalization triggers and for an initial
  uppercase char when Pascal=false, not for every input character.
- Replace exactly char.ToUpper(c, CultureInfo.InvariantCulture) and
  char.ToLower(c, CultureInfo.InvariantCulture) with documented equivalent
  char.ToUpperInvariant(c)/char.ToLowerInvariant(c). Preserve result growth,
  branches, loops, comments, locals, flags and invariant casing semantics.
- Microsoft Learn explicitly documents both equivalences:
  https://learn.microsoft.com/en-us/dotnet/api/system.char.toupperinvariant
  https://learn.microsoft.com/en-us/dotnet/api/system.char.tolowerinvariant
- Keep actual formatter exact-output tests covering all four flag combinations,
  Unicode/surrogates, digits, periods, separators and trailing marker.
  Turkish-culture fixture must prove current culture and stable invariant output.
  Actual generated protobuf body field/property/repetition/value selection
  remains compatible. Run each new row on original and candidate source.
- Real-owner standalone harness: retain F295's actual formatter and real
  complete descriptor producer, independently compiled/captured. Add three
  lower-branch cases (single ASCII/acronym/Unicode uppercase with Pascal=false)
  and repeated-word-start ASCII/Greek uppercase-casing cases before first run.
  Fixed27case matrix, two real complete body descriptors, three untouched
  controls, exact expected outputs, no copied formatter.
- Cached reflection/delegate/expression bridges and descriptor setup outside
  timing; actual compiled formatter or complete descriptor lookup/result timed.
  No new shipping dependency/cache/assembly boundary/public API shape.
- Freeze original harness/PDB/deps/runtime and recursive closure; only owner DLL
  may differ. All27actual receipts must match before/after and every launch.
- At most three serialized measured pairs on shared host, N>=8, memory
  diagnostics, DontRemove outliers. Stop early only for clear large gain;
  otherwise use remaining budget and retain all regressions/variance.
  Unsupported net gain is no-gain, never a speculative optimization PR.
- Preserve full original/final TRX, all case outcomes/raw reports and exact
  commands/results; red/green functional bug-fix claim is not appropriate.
- No full startup/hosted HTTP or production throughput, cold-runtime,
  concurrency or different-runtime/architecture claim. No composition with F295.
- Restore only our build-generated suppression XML BOM changes and exact
  speculative source if no-gain; preserve unrelated/untracked reports.
- Publish branch, benchmark/evidence, honest disposition. Only a justified
  optimization receives fork-only draft; open newly created draft immediately
  and verify source/body/files/state/remote report blob before closing item.
