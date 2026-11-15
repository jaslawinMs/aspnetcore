using System.ComponentModel.DataAnnotations;
using System.Runtime.CompilerServices;

namespace AutoPerf.HotReload;

public sealed class ChangingUnion : IUnion
{
    private int _calls;

    [MaxLength(5)]
    public object? Value
    {
        get
        {
            _calls++;
            return "abcd";
        }
    }

    public int ReadCalls() => _calls;

    object? IUnion.Value => new InvalidCase();

    private sealed class InvalidCase : IValidatableObject
    {
        public IEnumerable<ValidationResult> Validate(ValidationContext context)
        {
            yield return new ValidationResult("Updated union case.");
        }
    }
}
