``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F032  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|               Method |            Profile | Mean | Error |
|--------------------- |------------------- |-----:|------:|
| FlushAndConsumeAsync | Live.Async.Started |   NA |    NA |

Benchmarks with issues:
  FlushBenchmarks.FlushAndConsumeAsync: SettingsPreserving-F032(OutlierMode=DontRemove, PowerPlanMode=00000000-0000-0000-0000-000000000000, Toolchain=SettingsPreservingEmitToolchain, IterationCount=8, IterationTime=100.0000 ms, RunStrategy=Throughput, UnrollFactor=1, WarmupCount=3) [Profile=Live.Async.Started]
