using System.Diagnostics;
using BenchmarkDotNet.Engines;
using BenchmarkDotNet.Toolchains;
using BenchmarkDotNet.Toolchains.InProcess;
using BenchmarkDotNet.Toolchains.InProcess.Emit;
using BenchmarkDotNet.Toolchains.InProcess.Emit.Implementation;
using BenchmarkDotNet.Toolchains.Parameters;
using BenchmarkDotNet.Toolchains.Results;

namespace AutoPerf;

internal sealed class SettingsPreservingEmitToolchain() : Toolchain(
    nameof(SettingsPreservingEmitToolchain),
    new InProcessEmitGenerator(),
    new InProcessEmitBuilder(),
    new SettingsPreservingExecutor())
{
    public override bool IsInProcess => true;
    internal static object ReadSettings()
    {
        if (!OperatingSystem.IsWindows())
        {
            throw new PlatformNotSupportedException("This evidence captures Windows shared-machine settings.");
        }
        using var process = Process.GetCurrentProcess();

        return new { processPriority = process.PriorityClass.ToString(), threadPriority = Thread.CurrentThread.Priority.ToString(), affinity = process.ProcessorAffinity.ToInt64() };
    }

    private sealed class SettingsPreservingExecutor : IExecutor
    {
        public ExecuteResult Execute(ExecuteParameters parameters)
        {
            Evidence.Require(parameters.BenchmarkCase.Job.Infrastructure.Toolchain is SettingsPreservingEmitToolchain &&
                parameters.BenchmarkCase.Job.Environment.PowerPlanMode == Guid.Empty, "Only the explicit settings-preserving emitted job may run.");
            var before = ReadSettings();
            Evidence.Require(Evidence.Compact(before) == Evidence.Compact(Evidence.InitialSettings), "Process/thread settings changed before benchmark execution.");
            var label = parameters.BenchmarkCase.Parameters.Items.Single(item => item.Name == nameof(UrlBenchmark.Case)).Value.ToString();
            Evidence.Write("settings-before-" + label, before);
            var host = new InProcessHost(parameters.BenchmarkCase, parameters.Logger, parameters.Diagnoser);
            var assembly = ((InProcessEmitArtifactsPath)parameters.BuildResult.ArtifactsPaths).GeneratedAssembly;
            var exitCode = RunnableProgram.Run(parameters.BenchmarkId, assembly, parameters.BenchmarkCase, host);
            var after = ReadSettings();
            Evidence.Write("settings-after-" + label, after);
            Evidence.Require(Evidence.Compact(before) == Evidence.Compact(after), "Process/thread settings changed during benchmark execution.");
            if (exitCode != 0)
            {
                return new ExecuteResult(true, exitCode, default, [], []);
            }
            var lines = host.RunResults.GetMeasurements().Select(measurement => measurement.ToString()).ToList();
            if (!host.RunResults.GCStats.Equals(GcStats.Empty))
            {
                lines.Add(host.RunResults.GCStats.ToOutputLine());
            }
            if (!host.RunResults.ThreadingStats.Equals(ThreadingStats.Empty))
            {
                lines.Add(host.RunResults.ThreadingStats.ToOutputLine());
            }

            return new ExecuteResult(true, 0, default, lines.ToArray(), []);
        }
    }
}
