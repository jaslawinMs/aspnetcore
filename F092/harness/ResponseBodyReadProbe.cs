using System.Text.Json;

internal static class ResponseBodyReadProbe
{
    private static readonly byte[] Payload = [11, 12, 13, 14, 15, 16, 17, 18, 19];

    public static void Verify(string artifacts, bool requireZeroWrapper)
    {
        var observations = new List<object>();
        VerifyPending("Data", Payload.Length, observations);
        VerifyPending("Zero", 0, observations);
        VerifyPending("Eof", Payload.Length, observations);
        VerifyPending("Abort", Payload.Length, observations);
        VerifyValidation(observations);
        VerifyPreviousAbort(observations);
        VerifyCancellation(observations);
        VerifyDisposed(observations);
        File.WriteAllText(Path.Combine(artifacts, "functional-probe.json"),
            JsonSerializer.Serialize(observations, new JsonSerializerOptions { WriteIndented = true }) + Environment.NewLine);

        var benchmark = new ResponseBodyReadBenchmark { Profile = "Uncached9" };
        try
        {
            benchmark.Prepare(nameof(ResponseBodyReadBenchmark.PreparedSync));
            for (var i = 0; i < 3000; i++)
            {
                benchmark.PreparedSync();
                benchmark.PreparedMemoryAsync();
            }
            const int operations = 5000;
            var before = GC.GetAllocatedBytesForCurrentThread();
            for (var i = 0; i < operations; i++)
            {
                if (benchmark.PreparedSync() != Payload.Length)
                {
                    throw new InvalidOperationException("Resource assertion did not read the actual nine-byte response.");
                }
            }
            var syncBytes = GC.GetAllocatedBytesForCurrentThread() - before;
            before = GC.GetAllocatedBytesForCurrentThread();
            for (var i = 0; i < operations; i++)
            {
                if (benchmark.PreparedMemoryAsync() != Payload.Length)
                {
                    throw new InvalidOperationException("Resource control did not read the actual nine-byte response.");
                }
            }
            var memoryBytes = GC.GetAllocatedBytesForCurrentThread() - before;
            var extraBytes = syncBytes - memoryBytes;
            var receipt = new
            {
                assertion = "Completed actual synchronous read has no additional task-wrapper allocation over the completed memory-read control.",
                operations,
                sync_bytes = syncBytes,
                memory_bytes = memoryBytes,
                extra_bytes = extraBytes,
                extra_bytes_per_read = (double)extraBytes / operations,
                passed_zero_wrapper = extraBytes == 0,
                requirement_enforced = requireZeroWrapper,
                boundary = "Real public TestServer response and actual application BodyWriter; diagnostic resource assertion, no latency measurement.",
            };
            File.WriteAllText(Path.Combine(artifacts, "resource-check.json"),
                JsonSerializer.Serialize(receipt, new JsonSerializerOptions { WriteIndented = true }) + Environment.NewLine);
            Console.WriteLine(JsonSerializer.Serialize(receipt));
            if (extraBytes < 0 || (requireZeroWrapper && extraBytes != 0))
            {
                throw new InvalidOperationException($"Zero-wrapper resource assertion failed: extra {extraBytes} bytes for {operations} real completed reads.");
            }
        }
        finally
        {
            benchmark.Cleanup();
        }
    }

    private static void VerifyPending(string action, int count, List<object> observations)
    {
        using var response = new LiveResponse(Payload);
        var buffer = Enumerable.Repeat((byte)255, Payload.Length + 4).ToArray();
        var completion = new TaskCompletionSource<ReadOutcome>(TaskCreationOptions.RunContinuationsAsynchronously);
        var worker = new Thread(() =>
        {
            completion.SetResult(Read(() => response.Stream.Read(buffer, 2, count)));
        })
        {
            IsBackground = true,
            Name = $"F092-{action}-actual-sync-read",
        };
        worker.Start();
        try
        {
            if (!SpinWait.SpinUntil(() => completion.Task.IsCompleted ||
                (worker.ThreadState & ThreadState.WaitSleepJoin) != 0, TimeSpan.FromSeconds(10)) ||
                completion.Task.IsCompleted)
            {
                throw new InvalidOperationException($"The actual {action} read did not enter the owner wait before release.");
            }
            var observedState = worker.ThreadState.ToString();
            switch (action)
            {
                case "Data":
                case "Zero":
                    response.Produce();
                    break;
                case "Eof":
                    response.Finish();
                    break;
                case "Abort":
                    response.Context.Abort();
                    break;
                default:
                    throw new ArgumentException(nameof(action));
            }
            var result = completion.Task.WaitAsync(TimeSpan.FromSeconds(10)).GetAwaiter().GetResult();
            if (action == "Abort")
            {
                if (result.ExceptionType is not ("System.IO.IOException" or "System.OperationCanceledException"))
                {
                    throw new InvalidOperationException($"Actual pending abort did not propagate a supported IO/cancellation failure: {result}");
                }
            }
            else
            {
                var expected = action == "Data" ? Payload.Length : 0;
                if (result.ExceptionType is not null || result.Count != expected ||
                    (action == "Data" && !buffer.AsSpan(2, Payload.Length).SequenceEqual(Payload)) ||
                    (action != "Data" && buffer.Any(value => value != 255)))
                {
                    throw new InvalidOperationException($"Actual pending {action} bytes or completion differ: {result}");
                }
                if (action == "Zero")
                {
                    if (response.Stream.Read(buffer, 2, Payload.Length) != Payload.Length ||
                        !buffer.AsSpan(2, Payload.Length).SequenceEqual(Payload))
                    {
                        throw new InvalidOperationException("The actual pending zero-byte read consumed response data.");
                    }
                }
                if (action == "Eof")
                {
                    if (response.Stream.Read(buffer, 2, Payload.Length) != 0)
                    {
                        throw new InvalidOperationException("Repeated actual EOF differs.");
                    }
                }
            }
            if (!worker.Join(TimeSpan.FromSeconds(10)))
            {
                throw new InvalidOperationException("The owned synchronous-read worker did not exit.");
            }
            observations.Add(new { scenario = $"Pending{action}", observed_state_before_producer = observedState, completed_before_producer = false, actual_producer = action, result, bytes = buffer });
        }
        finally
        {
            if (worker.IsAlive)
            {
                response.Context.Abort();
                if (!worker.Join(TimeSpan.FromSeconds(10)))
                {
                    throw new InvalidOperationException("Owned pending-read cleanup did not exit.");
                }
            }
        }
    }

    private static void VerifyValidation(List<object> observations)
    {
        using var response = new LiveResponse(Payload);
        response.Produce();
        foreach (var test in new[]
        {
            (Name: "NegativeOffset", Buffer: new byte[8], Offset: -1, Count: 1),
            (Name: "NegativeCount", Buffer: new byte[8], Offset: 0, Count: -1),
            (Name: "OffsetBeyondEnd", Buffer: new byte[8], Offset: 9, Count: 0),
            (Name: "CountBeyondEnd", Buffer: new byte[8], Offset: 4, Count: 5),
            (Name: "NullNonempty", Buffer: (byte[])null!, Offset: 0, Count: 1),
            (Name: "NullEmpty", Buffer: (byte[])null!, Offset: 0, Count: 0),
            (Name: "Empty", Buffer: Array.Empty<byte>(), Offset: 0, Count: 0),
        })
        {
            var result = Read(() => response.Stream.Read(test.Buffer, test.Offset, test.Count));
            var empty = test.Name is "NullEmpty" or "Empty";
            if ((empty && (result.ExceptionType is not null || result.Count != 0)) ||
                (!empty && result.ExceptionType != "System.ArgumentOutOfRangeException"))
            {
                throw new InvalidOperationException($"Actual {test.Name} validation differs: {result}");
            }
            observations.Add(new { scenario = test.Name, result });
        }
        var actual = new byte[Payload.Length];
        if (response.Stream.Read(actual, 0, actual.Length) != actual.Length || !actual.SequenceEqual(Payload))
        {
            throw new InvalidOperationException("Invalid or empty actual read consumed response data.");
        }
        observations.Add(new { scenario = "ValidationDoesNotConsume", actual_bytes = actual });
    }

    private static void VerifyPreviousAbort(List<object> observations)
    {
        using var response = new LiveResponse(Payload);
        response.Context.Abort();
        var result = Read(() => response.Stream.Read(new byte[16], 0, 16));
        if (result.ExceptionType != "System.IO.IOException" ||
            result.InnerType != "System.OperationCanceledException" ||
            result.InnerMessage != "The application aborted the request.")
        {
            throw new InvalidOperationException($"Previous actual application abort differs: {result}");
        }
        observations.Add(new { scenario = "PreviousApplicationAbort", result });
    }

    private static void VerifyCancellation(List<object> observations)
    {
        using var response = new LiveResponse(Payload);
        using var cancellation = new CancellationTokenSource();
        var pending = response.Stream.ReadAsync(new byte[16].AsMemory(), cancellation.Token);
        if (pending.IsCompleted)
        {
            throw new InvalidOperationException("The actual async cancellation control was not pending.");
        }
        cancellation.Cancel();
        var result = Read(() => pending.AsTask().WaitAsync(TimeSpan.FromSeconds(10)).GetAwaiter().GetResult());
        var next = Read(() => response.Stream.Read(new byte[16], 0, 16));
        if (result.ExceptionType is not ("System.OperationCanceledException" or "System.Threading.Tasks.TaskCanceledException") ||
            next.ExceptionType != "System.IO.IOException" || next.InnerType != "System.OperationCanceledException")
        {
            throw new InvalidOperationException($"Actual async cancellation or subsequent sync failure differs: {result}/{next}");
        }
        observations.Add(new { scenario = "ActualAsyncCancellationThenSync", result, next });
    }

    private static void VerifyDisposed(List<object> observations)
    {
        using var response = new LiveResponse(Payload);
        response.Stream.Dispose();
        var result = Read(() => response.Stream.Read(new byte[16], 0, 16));
        if (result.ExceptionType != "System.IO.IOException" || result.InnerType != "System.IO.IOException" ||
            result.InnerMessage != "The client aborted the request.")
        {
            throw new InvalidOperationException($"Actual disposed response read differs: {result}");
        }
        observations.Add(new { scenario = "DisposedResponse", result });
    }

    private static ReadOutcome Read(Func<int> operation)
    {
        try
        {
            return new ReadOutcome(operation(), null, null, null, null, null);
        }
        catch (Exception exception) when (exception is IOException or OperationCanceledException or ArgumentException or InvalidOperationException)
        {
            return new ReadOutcome(null, exception.GetType().FullName, exception.Message,
                (exception as ArgumentException)?.ParamName, exception.InnerException?.GetType().FullName,
                exception.InnerException?.Message);
        }
    }

    private sealed record ReadOutcome(int? Count, string? ExceptionType, string? Message,
        string? ParamName, string? InnerType, string? InnerMessage);
}
