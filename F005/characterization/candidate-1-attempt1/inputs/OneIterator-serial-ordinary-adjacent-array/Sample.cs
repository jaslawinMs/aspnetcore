using System;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Rendering;
namespace AutoPerfInput;
public sealed class Sample : ComponentBase
{
    private static void Use(params int[] values) { }
    protected override void BuildRenderTree(RenderTreeBuilder builder)
    {
        for (int i = 0; i < 3; i++) { }
        builder.AddAttribute(0, "value", new int[] { 1, 2 });
    }
}
