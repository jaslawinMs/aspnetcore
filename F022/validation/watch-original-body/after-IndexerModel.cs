using System.Runtime.CompilerServices;

public sealed class IndexerModel
{
    [IndexerName("Item")]
    public IndexedValue this[int index] => new() { Name = "after" };

    public IndexedValue Lookup(int index) => new() { Name = "control" };
}

public sealed class IndexedValue
{
    public string Name { get; set; } = string.Empty;
}
