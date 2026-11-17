using System;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Rendering;
namespace AutoPerfInput;
public sealed class Sample : ComponentBase
{
    private static void Use(params int[] values) { }
    protected override void BuildRenderTree(RenderTreeBuilder builder)
    {
        for (int i = 0; i < 3; )
        {
        builder.AddAttribute(0, "onclick", EventCallback.Factory.Create<int>(this, () => Use(i)));
            break;
        }
    }
}
