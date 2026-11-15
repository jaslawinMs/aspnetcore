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
}
