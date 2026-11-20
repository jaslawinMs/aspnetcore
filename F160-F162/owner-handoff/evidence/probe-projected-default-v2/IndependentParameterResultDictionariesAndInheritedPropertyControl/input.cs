using Microsoft.AspNetCore.Components.AI;
public class BaseBlock : FunctionInvocationContentBlock
{
    [ToolParameter(Name = "shared")] public string? Inherited { get; set; }
}
[ToolBlock("control")] public partial class ControlBlock : BaseBlock
{
    [ToolParameter(Name = "shared")] public string? Parameter { get; set; }
    [ToolResult(Name = "shared")] public string? ResultValue { get; set; }
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