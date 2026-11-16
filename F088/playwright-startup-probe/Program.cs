using System.Text.Json;
using Microsoft.Playwright;
using Microsoft.Playwright.TestAdapter;

PlaywrightSettingsProvider.LoadViaEnvIfNeeded();
var options = PlaywrightSettingsProvider.LaunchOptions;
if (options.Channel != "msedge" || options.Headless is not true)
{
    throw new InvalidOperationException(
        $"Actual adapter options are not the intended owned Edge configuration: {JsonSerializer.Serialize(options)}");
}

using var playwright = await Playwright.CreateAsync();
await using var browser = await playwright[PlaywrightSettingsProvider.BrowserName].LaunchAsync(options);
await using var context = await browser.NewContextAsync();
var page = await context.NewPageAsync();
await page.SetContentAsync("<button onclick=\"this.textContent='ready'\">start</button>");
await page.GetByRole(AriaRole.Button).ClickAsync();
var text = await page.GetByRole(AriaRole.Button).TextContentAsync();
if (text != "ready")
{
    throw new InvalidOperationException("The isolated real browser did not respond to the click.");
}

Console.WriteLine(JsonSerializer.Serialize(new
{
    boundary = "Actual pinned .NET adapter settings and real browser startup only, not Blazor or feature validation",
    channel = options.Channel,
    headless = options.Headless,
    browser_version = browser.Version,
    actual_click_text = text,
    driver_assembly = typeof(Playwright).Assembly.Location,
    adapter_assembly = typeof(PlaywrightSettingsProvider).Assembly.Location,
}));
