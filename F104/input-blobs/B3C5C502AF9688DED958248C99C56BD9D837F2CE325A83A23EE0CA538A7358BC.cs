using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
namespace AutoPerfInput
{
public static class Control
{
    public static void Register(IEndpointRouteBuilder builder, IEndpointRouteBuilder other)
    {
        builder.MapGet("/same", () => 1);
        other.MapGet("/same", () => 1);
    }
}
}
