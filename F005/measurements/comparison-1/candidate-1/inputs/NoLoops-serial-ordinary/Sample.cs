using System;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Rendering;
namespace AutoPerfInput;
public sealed class Sample : ComponentBase
{
    private static void Use(params int[] values) { }
    protected override void BuildRenderTree(RenderTreeBuilder builder)
    {
        builder.AddContent(0, "no loop");
    }
}
