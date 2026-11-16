# F105 preliminary public API assessment

**Verdict: Recommend not adding** the proposed struct-returning replacement
for the shipped public `GetEnumerator()` signature. This is a local design
assessment, not a decision or approval by the ASP.NET Core API review team.

## Need assessment

- **Scenarios and environment:** MVC server applications use validation state
  associated with actual model-object identities. The public dictionary also
  supports custom application/library consumers and ordinary managed tests.
  An enumeration optimization is not a browser/native feature. Production
  enumeration frequency, dominant framework access paths and AOT behavior
  have not yet been measured in this assessment.
- **Commonality:** model-validation state is the supported scenario;
  performance-sensitive concrete enumeration is an extensibility scenario
  until actual owning consumers demonstrate otherwise.
- **Target audience:** application/library authors supplying custom validation
  state, not a demonstrated new end-application capability.

Reducing a measured enumeration cost can be worthwhile, but does not by itself
justify replacing an existing public member's return contract. Investigate
compatible owning-call-site work before adding or breaking framework surface.

### Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidationStateDictionary

- Retain the shipped interface-returning `GetEnumerator()` signature.
- Do not substitute `Dictionary<object, ValidationStateEntry>.Enumerator`
  merely to change concrete `foreach` binding.
- Preserve the existing dictionary interfaces and reference-identity keys.

**Why:** Return type is part of the compiled member-reference contract.
Replacing it with a value type is not a compatible return-type-only overload.
It can also change the available source operations: callers currently receive
`IEnumerator<T>` and can use its inherited `Reset()` contract; the concrete
Dictionary enumerator implements Reset explicitly. This defeats compatibility
even if a standalone struct-enumerator benchmark is faster. An internal helper
cannot be exposed to a different framework assembly with new friend/private
access just to bypass this boundary.

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

This assessment used the actual existing type definition. It does not claim
that a modified shipping binary has been compiled or its compatibility failure
executed. Original allocation/real-producer behavior still requires faithful
measurement; a source-level boxing suspicion is not proof of warmed allocation.
