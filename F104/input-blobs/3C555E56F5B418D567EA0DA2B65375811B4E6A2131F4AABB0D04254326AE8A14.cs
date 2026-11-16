using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
namespace AutoPerfInput
{
public static class SecondBlock
{
    public static void Register(IEndpointRouteBuilder builder)
    {
        builder.MapGet("/different", () => 1);
    }
}
}
