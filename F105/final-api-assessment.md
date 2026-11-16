# F105 final local API assessment

**Verdict: Recommend not adding** the struct-returning replacement. The
original allocation pressure was measured, but replacing the shipped public
return contract is not an acceptable performance-only implementation.
This is a local assessment, not formal ASP.NET Core API review approval.

## Need assessment

MVC server applications carry validation-state overrides associated with
actual model-object identities. The public dictionary also supports custom
application/library enumeration. The inspected real validation visitor uses
TryGetValue, not enumeration; this is a bounded source-path fact rather than
repository-wide absence or measured production-frequency evidence.

The original24-profile component experiment reports56B for nonempty concrete/
generic/retained complete traversals and0B for empty traversal. Non-generic
iteration has higher size-dependent costs. Separate warmed concrete16/128
calipers can report near-zero values; all conflicting observations are retained,
and no runtime cause was directly traced. A possible enumeration saving does
not demonstrate that changing the framework's common contract is justified.

The audience for a differently shaped enumeration API would be performance-
sensitive custom application/library consumers, not a demonstrated missing
capability for ordinary server developers. No browser, AOT or whole-application
benefit was established. No compatible implementation or new API is selected.

### Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidationStateDictionary

- Keep the existing public IEnumerator-returning GetEnumerator and dictionary
  interfaces unchanged.
- Decline the proposed concrete Dictionary.Enumerator return substitution.
- Preserve reference-identity keys, independent enumerators, the public Reset
  consumer, live views and actual dictionary mutation behavior.

**Why:** Return type participates in compiled member references; replacing the
nonvirtual public member with a struct-returning member is not a return-type-
only compatible overload. Existing source can also call Reset on the returned
interface. The real original Reset consumer was executed successfully; the
concrete Dictionary enumerator exposes Reset explicitly through its interface.
No modified shipping binary or modified-binary compatibility failure was run.
New friend/private cross-assembly access would not be a suitable bypass.

**Existing repo API to recommended API: no API added, removed or changed.**

```diff
 namespace Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

 public class ValidationStateDictionary :
     IDictionary<object, ValidationStateEntry>,
     IReadOnlyDictionary<object, ValidationStateEntry>
 {
     public IEnumerator<KeyValuePair<object, ValidationStateEntry>> GetEnumerator();
 }
```

Original-only characterization is complete. Zero source comparisons were
performed; three allowed comparisons are intentionally unused. This rejects
the evaluated incompatible design, not every possible future redesign.
