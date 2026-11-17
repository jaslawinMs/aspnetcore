using System;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Rendering;
namespace AutoPerfInput;
public sealed class Sample : ComponentBase
{
    private static void Use(params int[] values) { }
    protected override void BuildRenderTree(RenderTreeBuilder builder)
    {
        for (int i0 = 0; i0 < 3; i0++)
        {
        builder.AddAttribute(0, "onclick", EventCallback.Factory.Create<int>(this, () => Use(i0)));
        }
    }
}
