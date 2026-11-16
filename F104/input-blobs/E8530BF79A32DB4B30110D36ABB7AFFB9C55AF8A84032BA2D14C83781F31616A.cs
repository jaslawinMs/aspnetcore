// Distinct source locations and compilation lifetime.
// Distinct source locations and compilation lifetime.
// Distinct source locations and compilation lifetime.
using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
namespace AutoPerfInput
{
public static class Anchor
{
    public static void Register(IEndpointRouteBuilder builder)
    {
        builder.MapGet("/anchor", () => 1);
        builder.MapGet("/anchor", () => 1);
    }
}
}
