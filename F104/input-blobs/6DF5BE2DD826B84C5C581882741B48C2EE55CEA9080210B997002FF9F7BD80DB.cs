using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
namespace AutoPerfInput
{
public static class Control
{
    public static void Register(IEndpointRouteBuilder builder)
    {
        if (DateTime.UtcNow.Ticks > 0)
        {
        builder.MapGet("/same", () => 1);
        }
        else
        {
        builder.MapGet("/same", () => 1);
        }
    }
}
}
