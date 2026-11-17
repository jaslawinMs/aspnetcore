using System;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Rendering;
namespace AutoPerfInput;
public sealed class Sample : ComponentBase
{
    private static void Use(params int[] values) { }
    protected override void BuildRenderTree(RenderTreeBuilder builder)
    {
        for (int i = 0, p0 = 0, p1 = 0, p2 = 0, p3 = 0, p4 = 0, p5 = 0, p6 = 0, p7 = 0, p8 = 0, p9 = 0, p10 = 0, p11 = 0, p12 = 0, p13 = 0, p14 = 0, p15 = 0; i < 3; i++)
        {
        builder.AddAttribute(0, "onclick", EventCallback.Factory.Create<int>(this, () => Use(i)));
        builder.AddAttribute(0, "onclick", EventCallback.Factory.Create<int>(this, () => Use(p0, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15)));
        p0++;
        p1 += 1;
        p2++;
        p3 += 1;
        p4++;
        p5 += 1;
        p6++;
        p7 += 1;
        p8++;
        p9 += 1;
        p10++;
        p11 += 1;
        p12++;
        p13 += 1;
        p14++;
        p15 += 1;
        p0++;
        p15 = 7;
        builder.AddAttribute(0, "onclick", EventCallback.Factory.Create<int>(this, () => Use(p0, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15)));
        }
    }
}
