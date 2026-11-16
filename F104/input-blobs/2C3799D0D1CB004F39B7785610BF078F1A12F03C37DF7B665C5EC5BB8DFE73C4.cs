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
        builder.MapGet("/same", () => 1).WithMetadata(new object());
        builder.MapGet("/same", () => 1).WithMetadata(new object());
    }
}
}
