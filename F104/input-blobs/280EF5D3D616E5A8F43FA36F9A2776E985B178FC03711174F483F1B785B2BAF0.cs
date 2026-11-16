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
        var path = "/same";
        builder.MapGet(path, () => 1);
        builder.MapGet(path, () => 1);
    }
}
}
