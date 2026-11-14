# Rejected prototype: payload-sized UTF8 array

Comparison 1 measured this replacement in `ConvertToTargetType`:

```csharp
var utf8Json = JsonSerializer.SerializeToUtf8Bytes(value, serializerOptions);
return JsonSerializer.Deserialize(utf8Json, targetType, serializerOptions);
```

It removed DOM parsing and lowered affected-case CPU time, but introduced a new
payload-sized array. At size 4,096, `ConvertObject` allocation grew
58,833 to 82,211 B/op, `CopyObject` 58,954 to 82,335, and `CopyArray`
49,938 to 69,207. That roughly 40% heap growth was rejected rather than hidden.

[All 18 cases](comparison.md), both raw reports and the frozen manifest are
preserved. The unchanged assignable control also had a large inter-launch
difference; it is not evidence that the changed conversion code improved that
fast path. These results are **not aggregated with rounds 2/3's pooled code**.
