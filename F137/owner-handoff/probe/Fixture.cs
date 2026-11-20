using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.Razor.Hosting;

#if HIGH
[assembly: RazorCompiledItem(typeof(AutoPerf.F137.View), "mvc.1.0.view", "/Views/Home/Index.cshtml")]
[assembly: RazorCompiledItem(typeof(AutoPerf.F137.UniqueView), "mvc.1.0.view", "/Views/Unique.cshtml")]
#elif EXACT
[assembly: RazorCompiledItem(typeof(AutoPerf.F137.View), "mvc.1.0.view", "/Views/Home/Index.cshtml")]
#elif CASE
[assembly: RazorCompiledItem(typeof(AutoPerf.F137.View), "mvc.1.0.view", "/views/home/index.cshtml")]
#elif SLASH
[assembly: RazorCompiledItem(typeof(AutoPerf.F137.View), "mvc.1.0.view", @"Views\Home\Index.cshtml")]
#elif SAMEPART
[assembly: RazorCompiledItem(typeof(AutoPerf.F137.View), "mvc.1.0.view", "/Views/Home/Index.cshtml")]
[assembly: RazorCompiledItem(typeof(AutoPerf.F137.UniqueView), "mvc.1.0.view", "/views/home/index.cshtml")]
#elif EMPTYID
[assembly: RazorCompiledItem(typeof(AutoPerf.F137.View), "mvc.1.0.view", "")]
#elif NULLID
[assembly: RazorCompiledItem(typeof(AutoPerf.F137.View), "mvc.1.0.view", null!)]
#elif WRONGTYPE
[assembly: RazorCompiledItem(typeof(string), "mvc.1.0.view", "/Views/Home/Index.cshtml")]
#elif TURKISH
[assembly: RazorCompiledItem(typeof(AutoPerf.F137.View), "mvc.1.0.view", "/Views/I.cshtml")]
[assembly: RazorCompiledItem(typeof(AutoPerf.F137.UniqueView), "mvc.1.0.view", "/Views/ı.cshtml")]
#endif

namespace AutoPerf.F137;

public sealed class View : RazorPage<object>
{
    public override Task ExecuteAsync()
    {
#if HIGH
        WriteLiteral("FIRST");
#else
        WriteLiteral("LATER");
#endif
        return Task.CompletedTask;
    }
}

public sealed class UniqueView : RazorPage<object>
{
    public override Task ExecuteAsync()
    {
        WriteLiteral("UNIQUE");
        return Task.CompletedTask;
    }
}
