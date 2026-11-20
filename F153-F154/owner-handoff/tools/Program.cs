using System.Diagnostics;
using System.Reflection;
using System.Reflection.Emit;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

internal static class Program
{
    private const string ReadDenied = "Synchronous operations are disallowed. Call ReadAsync or set AllowSynchronousIO to true.";
    private const string WriteDenied = "Synchronous operations are disallowed. Call WriteAsync or set AllowSynchronousIO to true.";
    private static readonly byte[] Payload = [0, 127, 255, 42];
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
    private static readonly List<object> Rows = [];
    private static readonly List<object> Mechanisms = [];
    private static readonly Dictionary<short, OpCode> OpCodesByValue = typeof(OpCodes).GetFields(BindingFlags.Public | BindingFlags.Static)
        .Where(f => f.FieldType == typeof(OpCode)).Select(f => (OpCode)f.GetValue(null)!).ToDictionary(o => o.Value);

    public static async Task<int> Main(string[] args)
    {
        try
        {
            if (args[0] == "metadata")
            {
                WriteJson(args[1], Metadata(args[2], args[3], args[4]));
                return 0;
            }

            var failure = (Exception?)null;
            try
            {
                await RequestRow("default-policy", null, null, false);
                await RequestRow("explicit-disabled", false, null, false);
                await RequestRow("server-enabled", true, null, true);
                await RequestRow("feature-enable", false, true, true);
                await RequestRow("feature-disable", true, false, false);
                await RequestRow("binary-reader-enabled", true, null, true, binaryReader: true);
                await RequestRow("binary-reader-disabled", false, null, false, binaryReader: true);
                await RequestRow("stream-content-enabled", true, null, true, streamContent: true);
                await EmptyBodyRow();
                await DirectContextRow();
            }
            catch (Exception ex)
            {
                failure = ex;
            }

            var modules = Process.GetCurrentProcess().Modules.Cast<ProcessModule>().Select(m => FileIdentity(m.FileName)).ToArray();
            WriteJson(args[1], new
            {
                findings = new[] { "F153", "F154" },
                status = "PENDING",
                unmeasured = true,
                pid = Environment.ProcessId,
                runtime = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
                owner = AssemblyIdentity(typeof(TestServer).Assembly),
                common = AssemblyIdentity(typeof(Program).Assembly),
                rows = Rows,
                mechanisms = Mechanisms,
                loadedAssemblies = AppDomain.CurrentDomain.GetAssemblies().Where(a => !a.IsDynamic).Select(AssemblyIdentity).ToArray(),
                processModules = modules,
                failure = failure?.ToString(),
                completed = failure is null
            });
            return failure is null ? 0 : 1;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex);
            return 2;
        }
    }

    private static async Task RequestRow(string name, bool? serverPolicy, bool? featurePolicy, bool enabled, bool binaryReader = false, bool streamContent = false)
    {
        var operations = new List<object>();
        string? requestType = null;
        string? innerType = null;
        string? responseType = null;
        using var services = new ServiceCollection().BuildServiceProvider();
        using var server = new TestServer(services);
        Check(!server.AllowSynchronousIO, "default server sync policy is false");
        if (serverPolicy is { } policy)
        {
            server.AllowSynchronousIO = policy;
        }
        var application = new Application(async context =>
        {
            var body = context.Request.Body;
            requestType = body.GetType().FullName;
            Check(requestType == "Microsoft.AspNetCore.TestHost.AsyncStreamWrapper", "real ClientHandler wrapper selection");
            var inner = (Stream)body.GetType().GetField("_inner", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(body)!;
            innerType = inner.GetType().FullName;
            Check(body.CanRead && !body.CanWrite && !body.CanSeek, "real pipe request direction");
            var control = context.Features.Get<IHttpBodyControlFeature>()!;
            Check(control.AllowSynchronousIO == (serverPolicy ?? false), "server policy copied to context");
            if (featurePolicy is { } feature)
            {
                control.AllowSynchronousIO = feature;
            }
            Check(control.AllowSynchronousIO == enabled, "actual feature policy selected");
            responseType = context.Response.Body.GetType().FullName;
            Check(responseType == "Microsoft.AspNetCore.TestHost.ResponseBodyWriterStream", "response is a distinct stream owner");
            Check(body.GetType().GetMethod(nameof(Stream.ReadByte))!.DeclaringType == typeof(Stream), "ReadByte inherited from loaded BCL");
            Check(body.GetType().GetMethod(nameof(Stream.WriteByte))!.DeclaringType == typeof(Stream), "WriteByte inherited from loaded BCL");
            if (Mechanisms.Count == 0)
            {
                foreach (var method in new[]
                {
                    typeof(Stream).GetMethod(nameof(Stream.ReadByte))!,
                    typeof(Stream).GetMethod(nameof(Stream.WriteByte))!,
                    body.GetType().GetMethod(nameof(Stream.Read), [typeof(byte[]), typeof(int), typeof(int)])!,
                    body.GetType().GetMethod(nameof(Stream.Write), [typeof(byte[]), typeof(int), typeof(int)])!,
                    inner.GetType().GetMethod(nameof(Stream.Read), [typeof(byte[]), typeof(int), typeof(int)])!,
                    inner.GetType().GetMethod(nameof(Stream.Write), [typeof(byte[]), typeof(int), typeof(int)])!,
                    typeof(BinaryReader).GetMethod(nameof(BinaryReader.ReadByte))!
                })
                {
                    Mechanisms.Add(DescribeMethod(method));
                }
            }

            if (!enabled)
            {
                ExpectException(operations, "ReadByte", () => body.ReadByte(), typeof(InvalidOperationException), ReadDenied);
                ExpectException(operations, "bulk-read-invalid-buffer", () => body.Read(null!, -1, -1), typeof(InvalidOperationException), ReadDenied);
                ExpectException(operations, "WriteByte", () => body.WriteByte(77), typeof(InvalidOperationException), WriteDenied);
                ExpectException(operations, "bulk-write-invalid-buffer", () => body.Write(null!, -1, -1), typeof(InvalidOperationException), WriteDenied);
                if (binaryReader)
                {
                    using var reader = new BinaryReader(body, Encoding.UTF8, leaveOpen: true);
                    ExpectException(operations, "BinaryReader.ReadByte", () => reader.ReadByte(), typeof(InvalidOperationException), ReadDenied);
                }
                var bytes = new byte[Payload.Length];
                await body.ReadExactlyAsync(bytes);
                Check(bytes.SequenceEqual(Payload), "rejected sync operations do not consume request bytes");
                operations.Add(new { operation = "async-read-exactly-after-rejections", bytes });
                var eof = await body.ReadAsync(new byte[1]);
                Check(eof == 0, "async EOF after gate rejections");
                operations.Add(new { operation = "async-eof", count = eof });
                ExpectException(operations, "response-WriteByte", () => context.Response.Body.WriteByte(77), typeof(InvalidOperationException), WriteDenied);
            }
            else
            {
                if (binaryReader)
                {
                    using var reader = new BinaryReader(body, Encoding.UTF8, leaveOpen: true);
                    var first = reader.ReadByte();
                    var remainder = reader.ReadBytes(3);
                    Check(first == Payload[0] && remainder.SequenceEqual(Payload.Skip(1)), "BinaryReader exact request bytes");
                    operations.Add(new { operation = "BinaryReader.ReadByte+ReadBytes", first, remainder });
                    ExpectException(operations, "BinaryReader.eof", () => reader.ReadByte(), typeof(EndOfStreamException));
                }
                else
                {
                    var first = body.ReadByte();
                    var buffer = new byte[] { 19, 19, 19, 19 };
                    var count = body.Read(buffer, 1, 2);
                    var last = body.ReadByte();
                    Check(first == 0 && count == 2 && buffer.SequenceEqual(new byte[] { 19, 127, 255, 19 }) && last == 42, "mixed byte/bulk request reads");
                    operations.Add(new { operation = "ReadByte+bulk+ReadByte", first, count, buffer, last });
                }
                var end = body.ReadByte();
                var bulkEnd = body.Read(new byte[1], 0, 1);
                Check(end == -1 && bulkEnd == 0, "byte/bulk EOF");
                operations.Add(new { operation = "request-eof", readByte = end, bulkRead = bulkEnd });
                ExpectException(operations, "bulk-read-null-enabled", () => body.Read(null!, 0, 1), typeof(ArgumentNullException));
                ExpectException(operations, "request-WriteByte-enabled", () => body.WriteByte(77), typeof(NotSupportedException));
                ExpectException(operations, "request-bulk-write-enabled", () => body.Write(new byte[] { 77 }, 0, 1), typeof(NotSupportedException));
                control.AllowSynchronousIO = false;
                ExpectException(operations, "feature-disabled-even-at-eof", () => body.ReadByte(), typeof(InvalidOperationException), ReadDenied);
                ExpectException(operations, "feature-disabled-before-unsupported-write", () => body.WriteByte(77), typeof(InvalidOperationException), WriteDenied);
                control.AllowSynchronousIO = true;
                context.Response.Body.WriteByte(9);
                context.Response.Body.Write(new byte[] { 8 }, 0, 1);
                operations.Add(new { operation = "distinct-response-byte-and-bulk-write", bytes = new byte[] { 9, 8 } });
            }
            if (!enabled)
            {
                await context.Response.Body.WriteAsync(new byte[] { 9, 8 });
            }
            body.Close();
            body.Dispose();
            await body.DisposeAsync();
            operations.Add(new { operation = "wrapper-close-dispose-disposeasync", complete = true, innerOwnedBy = "HttpContextBuilder request pipe" });
        });
        await ((IServer)server).StartAsync(application, CancellationToken.None);
        using var client = server.CreateClient();
        using HttpContent content = streamContent ? new StreamContent(new MemoryStream(Payload, writable: false)) : new ByteArrayContent(Payload);
        using var request = new HttpRequestMessage(HttpMethod.Post, "/owned") { Content = content };
        using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
        await application.Disposed.Task.WaitAsync(TimeSpan.FromSeconds(20));
        Check(application.Failure is null, application.Failure?.ToString() ?? "application completed");
        using var responseStream = await response.Content.ReadAsStreamAsync();
        var clientByte = responseStream.ReadByte();
        var tail = new byte[2];
        var clientCount = responseStream.Read(tail, 0, tail.Length);
        var clientEof = responseStream.ReadByte();
        Check(clientByte == 9 && clientCount == 1 && tail[0] == 8 && clientEof == -1, "client exact response and EOF");
        operations.Add(new { operation = "client-response-read", type = responseStream.GetType().FullName, clientByte, clientCount, tail, clientEof });
        await ((IServer)server).StopAsync(CancellationToken.None);
        Rows.Add(new { name, serverPolicy, featurePolicy, enabled, binaryReader, streamContent, requestType, innerType, responseType, operations, passed = true, applicationDisposed = application.Disposed.Task.IsCompletedSuccessfully });
    }

    private static async Task EmptyBodyRow()
    {
        using var services = new ServiceCollection().BuildServiceProvider();
        using var server = new TestServer(services);
        string? selected = null;
        var application = new Application(context =>
        {
            selected = context.Request.Body.GetType().FullName;
            Check(selected != "Microsoft.AspNetCore.TestHost.AsyncStreamWrapper", "zero-length body does not select wrapper");
            return Task.CompletedTask;
        });
        await ((IServer)server).StartAsync(application, CancellationToken.None);
        using var client = server.CreateClient();
        using var content = new ByteArrayContent([]);
        using var response = await client.PostAsync("/empty", content);
        await application.Disposed.Task.WaitAsync(TimeSpan.FromSeconds(20));
        Check(application.Failure is null, "empty body application completed");
        await ((IServer)server).StopAsync(CancellationToken.None);
        Rows.Add(new { name = "zero-length-content-selection-control", requestType = selected, passed = true });
    }

    private static async Task DirectContextRow()
    {
        using var services = new ServiceCollection().BuildServiceProvider();
        using var server = new TestServer(services);
        using var supplied = new MemoryStream(Payload, writable: false);
        string? selected = null;
        var first = -2;
        var application = new Application(context =>
        {
            selected = context.Request.Body.GetType().FullName;
            first = context.Request.Body.ReadByte();
            Check(ReferenceEquals(supplied, context.Request.Body) && first == 0, "direct context uses caller body, not wrapper");
            return Task.CompletedTask;
        });
        await ((IServer)server).StartAsync(application, CancellationToken.None);
        var returned = await server.SendAsync(context => context.Request.Body = supplied);
        await application.Disposed.Task.WaitAsync(TimeSpan.FromSeconds(20));
        Check(application.Failure is null, "direct context application completed");
        returned.Response.Body.Dispose();
        await ((IServer)server).StopAsync(CancellationToken.None);
        Rows.Add(new { name = "TestServer.SendAsync-caller-stream-control", requestType = selected, first, defaultSyncPolicy = server.AllowSynchronousIO, wrapperProducerEvidence = false, passed = true });
    }

    private static void ExpectException(List<object> operations, string operation, Action action, Type expectedType, string? expectedMessage = null)
    {
        Exception? observed = null;
        try
        {
            action();
        }
        catch (Exception ex)
        {
            observed = ex;
        }
        operations.Add(new { operation, exception = observed?.GetType().FullName, message = observed?.Message, parameter = (observed as ArgumentException)?.ParamName });
        Check(observed?.GetType() == expectedType && (expectedMessage is null || observed.Message == expectedMessage), $"Unexpected exception in {operation}: {observed}");
    }

    private static object DescribeMethod(MethodInfo method)
    {
        var body = method.GetMethodBody();
        var il = body?.GetILAsByteArray() ?? [];
        var instructions = new List<object>();
        for (var position = 0; position < il.Length;)
        {
            var offset = position;
            short value = il[position++];
            if (value == 0xfe) { value = (short)(0xfe00 | il[position++]); }
            var code = OpCodesByValue[value];
            var operandStart = position;
            var size = code.OperandType switch
            {
                OperandType.InlineNone => 0,
                OperandType.ShortInlineBrTarget or OperandType.ShortInlineI or OperandType.ShortInlineVar => 1,
                OperandType.InlineVar => 2,
                OperandType.InlineI8 or OperandType.InlineR => 8,
                OperandType.InlineSwitch => 4 + 4 * BitConverter.ToInt32(il, position),
                _ => 4
            };
            string? resolved = null;
            if (size == 4 && code.OperandType is OperandType.InlineMethod or OperandType.InlineType or OperandType.InlineField or OperandType.InlineTok or OperandType.InlineString)
            {
                var token = BitConverter.ToInt32(il, position);
                try
                {
                    resolved = code.OperandType == OperandType.InlineString ? method.Module.ResolveString(token) : method.Module.ResolveMember(token)?.ToString();
                }
                catch (ArgumentException) { resolved = "unresolved"; }
            }
            position += size;
            instructions.Add(new { offset, op = code.Name, operand = Convert.ToHexString(il.AsSpan(operandStart, size)), resolved });
        }
        return new { type = method.DeclaringType!.FullName, method = method.ToString(), assembly = AssemblyIdentity(method.Module.Assembly), metadataToken = method.MetadataToken, rawIl = Convert.ToHexString(il), instructions };
    }

    private static object Metadata(string dll, string pdb, string sourceRoot)
    {
        using var stream = File.OpenRead(dll);
        using var pe = new PEReader(stream);
        var reader = pe.GetMetadataReader();
        using var pdbStream = File.OpenRead(pdb);
        using var provider = MetadataReaderProvider.FromPortablePdbStream(pdbStream);
        var symbols = provider.GetMetadataReader();
        var id = symbols.DebugMetadataHeader!.Id.ToArray();
        var guid = new Guid(id.AsSpan(0, 16)).ToString();
        var stamp = BitConverter.ToUInt32(id, 16);
        var codeView = pe.ReadDebugDirectory().Where(d => d.Type == DebugDirectoryEntryType.CodeView).Select(d =>
        {
            var cv = pe.ReadCodeViewDebugDirectoryData(d);
            return new { guid = cv.Guid.ToString(), stamp = d.Stamp, cv.Age, cv.Path, portable = d.IsPortableCodeView };
        }).ToArray();
        var documents = symbols.Documents.Select(handle =>
        {
            var doc = symbols.GetDocument(handle);
            var path = symbols.GetString(doc.Name).Replace('/', '\\');
            var checksum = Convert.ToHexString(symbols.GetBlobBytes(doc.Hash));
            var physical = path;
            if (!File.Exists(physical))
            {
                var marker = path.IndexOf("\\src\\", StringComparison.OrdinalIgnoreCase);
                if (marker >= 0) { physical = Path.Combine(sourceRoot, path[(marker + 1)..]); }
            }
            var rawHash = File.Exists(physical) ? Hash(physical) : null;
            return new { path, algorithm = symbols.GetGuid(doc.HashAlgorithm), checksum, physical, rawSha256 = rawHash, rawMatches = rawHash is not null && checksum == rawHash };
        }).ToArray();
        return new { dll = FileIdentity(dll), pdb = FileIdentity(pdb), mvid = reader.GetGuid(reader.GetModuleDefinition().Mvid), portablePdbGuid = guid, portablePdbStamp = stamp, codeView, pePdbMatch = codeView.Any(c => c.guid == guid && c.stamp == stamp), documents, fullCompilerInputAttestation = false };
    }

    private static object AssemblyIdentity(Assembly assembly) => new { assembly.FullName, path = assembly.Location, sha256 = string.IsNullOrEmpty(assembly.Location) ? null : Hash(assembly.Location), mvid = assembly.ManifestModule.ModuleVersionId };
    private static object FileIdentity(string path) => new { path, bytes = new FileInfo(path).Length, sha256 = Hash(path) };
    private static string Hash(string path)
    {
        using var stream = File.OpenRead(path);
        return Convert.ToHexString(SHA256.HashData(stream));
    }
    private static void WriteJson(string path, object value) => File.WriteAllText(path, JsonSerializer.Serialize(value, JsonOptions));
    private static void Check(bool condition, string message)
    {
        if (!condition) { throw new InvalidOperationException(message); }
    }

    private sealed class Application(Func<HttpContext, Task> process) : IHttpApplication<HttpContext>
    {
        public TaskCompletionSource Disposed { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public Exception? Failure { get; private set; }
        public HttpContext CreateContext(IFeatureCollection features) => new DefaultHttpContext(features);
        public Task ProcessRequestAsync(HttpContext context) => process(context);
        public void DisposeContext(HttpContext context, Exception? exception)
        {
            Failure = exception;
            Disposed.TrySetResult();
        }
    }
}
