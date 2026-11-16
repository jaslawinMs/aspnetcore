using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
namespace AutoPerfInput
{
public static class Registration0009
{
    public static void Register(IEndpointRouteBuilder builder)
    {
        builder.MapGet("/p0000", () => 1);
        builder.MapGet("/p0000", () => 1);
        builder.MapGet("/p0001", () => 1);
        builder.MapGet("/p0001", () => 1);
    }
}
}
