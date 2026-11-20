using Microsoft.AspNetCore.Components.AI;
[ToolBlock("results")] public partial class ResultBlock : FunctionInvocationContentBlock
{
    [ToolResult(Name = "key")] public string? First { get; set; }
    [ToolResult(Name = "key")] public string? Second { get; set; }
    [ToolResult(Name = "key")] public string? Third { get; set; }
    [ToolResult(Name = "KEY")] public string? Case { get; set; }
    [ToolResult] public string? Fallback { get; set; }
    [ToolResult(Name = "Fallback")] public string? FallbackDuplicate { get; set; }
    [ToolResult(Name = "")] public string? EmptyName { get; set; }
    [ToolResult(Name = null)] public string? NullName { get; set; }
    [ToolResult(Name = "setter")] public string? Unusable { get; }
    [ToolResult(Name = "setter")] public string? Usable { get; set; }
}
public static class GeneratedConsumer
{
    public static object Create()
    {
        var options = new Microsoft.AspNetCore.Components.AI.UIAgentOptions();
        Microsoft.AspNetCore.Components.AI.GeneratedToolBlockRegistrations.AddGeneratedToolBlocks(options);
        Microsoft.AspNetCore.Components.AI.GeneratedToolBlockRegistrations.AddGeneratedToolBlocks(options);
        return options;
    }
}