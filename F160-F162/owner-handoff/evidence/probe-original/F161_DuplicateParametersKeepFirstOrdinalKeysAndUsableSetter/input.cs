using Microsoft.AspNetCore.Components.AI;
[ToolBlock("parameters")] public partial class ParameterBlock : FunctionInvocationContentBlock
{
    [ToolParameter(Name = "key")] public string? First { get; set; }
    [ToolParameter(Name = "key")] public string? Second { get; set; }
    [ToolParameter(Name = "key")] public string? Third { get; set; }
    [ToolParameter(Name = "KEY")] public string? Case { get; set; }
    [ToolParameter] public string? Fallback { get; set; }
    [ToolParameter(Name = "Fallback")] public string? FallbackDuplicate { get; set; }
    [ToolParameter(Name = "")] public string? EmptyName { get; set; }
    [ToolParameter(Name = null)] public string? NullName { get; set; }
    [ToolParameter(Name = "setter")] public string? Unusable { get; }
    [ToolParameter(Name = "setter")] public string? Usable { get; set; }
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