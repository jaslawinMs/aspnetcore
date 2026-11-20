using Microsoft.AspNetCore.Components.AI;
[ToolBlock("tool")] public partial class FirstBlock : FunctionInvocationContentBlock { }
[ToolBlock("tool")] public partial class SecondBlock : FunctionInvocationContentBlock { }
[ToolBlock("tool")] public partial class ThirdBlock : FunctionInvocationContentBlock { }
[ToolBlock("Tool")] public partial class CaseBlock : FunctionInvocationContentBlock { }
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