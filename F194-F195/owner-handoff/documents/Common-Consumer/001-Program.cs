using System.Collections;
using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Runtime.Loader;
using System.Security.Cryptography;
using System.Text.Json;
using System.Xml.Linq;

public static class StartupHook
{
    public static void Initialize()
    {
        var root = Environment.GetEnvironmentVariable("F194_IDENTITY_ROOT");
        if (string.IsNullOrEmpty(root))
        {
            return;
        }

        Directory.CreateDirectory(root);
        using var process = Process.GetCurrentProcess();
        var id = $"{process.Id}-{process.StartTime.ToUniversalTime().Ticks}";
        WriteIdentity(Path.Combine(root, $"{id}-entry.json"), "entry");
        AppDomain.CurrentDomain.ProcessExit += (_, _) => WriteIdentity(Path.Combine(root, $"{id}-exit.json"), "exit");
    }

    public static object AssemblyIdentity(Assembly assembly)
    {
        try
        {
            var path = assembly.IsDynamic ? null : assembly.Location;
            return new
            {
                name = assembly.FullName,
                path,
                inProcessManagedMvid = assembly.ManifestModule.ModuleVersionId.ToString(),
                sha256 = string.IsNullOrEmpty(path) ? null : Hash(path),
                error = (string?)null
            };
        }
        catch (Exception exception)
        {
            return new { name = assembly.FullName, error = exception.ToString() };
        }
    }

    public static string Hash(string path) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path)));

    private static void WriteIdentity(string path, string phase)
    {
        try
        {
            using var process = Process.GetCurrentProcess();
            var managed = AppDomain.CurrentDomain.GetAssemblies().OrderBy(a => a.FullName, StringComparer.Ordinal).Select(AssemblyIdentity).ToArray();
            var sampledNative = new List<object>();
            foreach (ProcessModule module in process.Modules)
            {
                if (module.ModuleName is "coreclr.dll" or "hostpolicy.dll" or "hostfxr.dll" or "dotnet.exe")
                {
                    sampledNative.Add(new { path = module.FileName, sha256 = Hash(module.FileName), kind = "sampled-module-file-not-managed-reflection" });
                }
            }

            var document = new
            {
                phase,
                capturedUtc = DateTime.UtcNow,
                pid = process.Id,
                creationUtc = process.StartTime.ToUniversalTime(),
                creationTicks = process.StartTime.ToUniversalTime().Ticks.ToString(),
                processPath = Environment.ProcessPath,
                commandLine = Environment.CommandLine,
                framework = RuntimeInformation.FrameworkDescription,
                runtimeVersion = Environment.Version.ToString(),
                architecture = RuntimeInformation.ProcessArchitecture.ToString(),
                managed,
                sampledNative,
                limitation = "Loaded managed assemblies sampled at this event; native module hashes are file samples. Neither list proves compiler, runtime, native, or universal process closure."
            };
            File.WriteAllText(path, JsonSerializer.Serialize(document, new JsonSerializerOptions { WriteIndented = true }));
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine($"F194 identity receipt failure: {exception}");
        }
    }
}

internal static class Program
{
    private static readonly List<object> Cases = [];
    private static int _failures;

    private static int Main(string[] args)
    {
        if (args.Length != 3)
        {
            Console.Error.WriteLine("Expected: role native-test-assembly result-file");
            return 2;
        }

        var role = args[0];
        var testPath = Path.GetFullPath(args[1]);
        var directory = Path.GetDirectoryName(testPath)!;
        AssemblyLoadContext.Default.Resolving += (_, name) =>
        {
            var path = Path.Combine(directory, name.Name + ".dll");
            return File.Exists(path) ? AssemblyLoadContext.Default.LoadFromAssemblyPath(path) : null;
        };
        var assembly = AssemblyLoadContext.Default.LoadFromAssemblyPath(testPath);
        var producer = new Producer(assembly, directory);

        Run("helper-file-terminal", "direct-helper-valid-factory", () =>
        {
            var file = producer.File("standalone", "resource.standalone");
            var files = producer.GetFiles(file);
            Equal([], producer.Paths(files));
            return new { paths = producer.Paths(files), fileFactoryChildrenAreNull = producer.Children(file) is null };
        });
        Run("helper-empty-directory", "direct-helper-valid-factory", () =>
        {
            var root = producer.Directory("empty");
            var result = producer.GetFiles(root);
            Equal([], producer.Paths(result));
            return new { paths = producer.Paths(result), returnedType = result.GetType().FullName };
        });
        Run("helper-singleton", "direct-helper-valid-factory", () =>
        {
            var file = producer.File("single.txt", "resource.single");
            var root = producer.Directory("root", file);
            var result = producer.GetFiles(root);
            Equal(["resource.single"], producer.Paths(result));
            Check(ReferenceEquals(((IEnumerable)result).Cast<object>().Single(), file), "Singleton retains producer object identity");
            return new { paths = producer.Paths(result), retainsIdentity = true };
        });
        Run("helper-mixed-nested-order", "direct-helper-valid-factory", () =>
        {
            var root = producer.MixedTree();
            var result = producer.GetFiles(root);
            var expected = new[] { "r.root1", "r.root2", "r.z1", "r.z2", "r.deep", "r.a1" };
            Equal(expected, producer.Paths(result));
            Equal(expected, producer.Paths(result));
            var xml = producer.ToXElement(root);
            Equal(["z", "root1.txt", "empty", "root2.txt", "a"], xml.Elements().Select(e => (string)e.Attribute("Name")!).ToArray());
            return new { paths = producer.Paths(result), repeatedEnumerationSame = true, xml = xml.ToString(SaveOptions.DisableFormatting), directories = 5, files = 6, maximumDepth = 3 };
        });
        Run("helper-shallow-membership-snapshot", "direct-helper-public-input-mutation-diagnostic", () =>
        {
            var file = producer.File("before.txt", "r.before");
            var replacement = producer.File("replacement.txt", "r.replacement");
            var root = producer.Directory("root", file);
            var snapshot = producer.GetFiles(root);
            var children = producer.Children(root)!;
            children.SetValue(replacement, 0);
            producer.SetResourcePath(file, "r.changed");
            Equal(["r.changed"], producer.Paths(snapshot));
            Equal(["r.replacement"], producer.Paths(producer.GetFiles(root)));
            return new { retainedSnapshot = producer.Paths(snapshot), freshCall = producer.Paths(producer.GetFiles(root)), shallowObjectReferences = true };
        });
        Run("helper-null-children-eager-exception", "deliberately-invalid-direct-helper-not-public-provider", () =>
        {
            var root = producer.DirectoryWithArray("invalid", null);
            var observed = ObserveInvocation(() => producer.GetFiles(root));
            Check(observed.Exception is ArgumentNullException { ParamName: "source" }, "Null children throws ArgumentNullException(source) before an enumerable is returned");
            return new { observed.Returned, exception = observed.Exception?.GetType().FullName, parameter = ((ArgumentNullException)observed.Exception!).ParamName };
        });
        Run("helper-null-child-eager-exception", "deliberately-invalid-direct-helper-not-public-provider", () =>
        {
            var children = producer.EntryArray(1);
            var root = producer.DirectoryWithArray("invalid", children);
            var observed = ObserveInvocation(() => producer.GetFiles(root));
            Check(observed.Exception is NullReferenceException, "Null child throws synchronously");
            return new { observed.Returned, exception = observed.Exception?.GetType().FullName };
        });
        Run("helper-invalid-descendant-eager-before-any-result", "deliberately-invalid-direct-helper-not-public-provider", () =>
        {
            var root = producer.Directory("root", producer.File("valid.txt"), producer.DirectoryWithArray("invalid", null));
            var observed = ObserveInvocation(() => producer.GetFiles(root));
            Check(!observed.Returned && observed.Exception is ArgumentNullException, "Recursive failure occurs before any result is returned");
            return new { observed.Returned, exception = observed.Exception?.GetType().FullName, enumerationStarted = false };
        });
        Run("provider-empty-root", "real-testassembly-and-public-provider", () =>
        {
            var testAssembly = producer.TestAssembly(producer.Directory("unused"));
            var provider = producer.Provider(testAssembly);
            Equal([], producer.DirectoryNames(provider, "."));
            Check(producer.DirectoryExists(provider, "."), "Empty provider root exists");
            Equal([], producer.AssemblyFiles(testAssembly));
            return new { paths = producer.AssemblyFiles(testAssembly), directoryNames = producer.DirectoryNames(provider, "."), exists = true };
        });
        Run("provider-singleton-resource", "real-testassembly-and-public-provider", () =>
        {
            var testAssembly = producer.TestAssembly(producer.Directory("unused", producer.File("one.txt", "r.one")));
            var provider = producer.Provider(testAssembly);
            Equal(["r.one"], producer.AssemblyFiles(testAssembly));
            Equal(["one.txt"], producer.DirectoryNames(provider, "."));
            producer.CheckFile(provider, "one.txt", "one.txt");
            return new { paths = producer.AssemblyFiles(testAssembly), directoryNames = producer.DirectoryNames(provider, "."), streamLength = 0 };
        });
        Run("provider-mixed-nested-manifest-and-resource-order", "real-testassembly-and-public-provider", () =>
        {
            var testAssembly = producer.TestAssembly(producer.MixedTree());
            var provider = producer.Provider(testAssembly);
            Equal(["r.root1", "r.root2", "r.z1", "r.z2", "r.deep", "r.a1"], producer.AssemblyFiles(testAssembly));
            Equal(["z", "root1.txt", "empty", "root2.txt", "a"], producer.DirectoryNames(provider, "."));
            Equal(["z1.txt", "deep", "z2.txt"], producer.DirectoryNames(provider, "z"));
            Equal(["leaf.txt"], producer.DirectoryNames(provider, "z/deep"));
            Equal([], producer.DirectoryNames(provider, "empty"));
            foreach (var pair in new[] { ("root1.txt", "root1.txt"), ("root2.txt", "root2.txt"), ("z/z1.txt", "z1.txt"), ("z/z2.txt", "z2.txt"), ("z/deep/leaf.txt", "leaf.txt"), ("a/a1.txt", "a1.txt") })
            {
                producer.CheckFile(provider, pair.Item1, pair.Item2);
            }

            return new { files = producer.AssemblyFiles(testAssembly), rootOrder = producer.DirectoryNames(provider, "."), zOrder = producer.DirectoryNames(provider, "z"), verifiedResourceStreams = 6 };
        });
        Run("provider-snapshot-after-helper-input-mutation", "real-producer-snapshot-with-deliberate-public-helper-input-mutation", () =>
        {
            var file = producer.File("before.txt", "r.before");
            var root = producer.Directory("unused", file);
            var testAssembly = producer.TestAssembly(root);
            var provider = producer.Provider(testAssembly);
            producer.Children(root)!.SetValue(producer.File("replacement.txt", "r.replacement"), 0);
            producer.SetResourcePath(file, "r.changed");
            Equal(["r.before"], producer.AssemblyFiles(testAssembly));
            Equal(["before.txt"], producer.DirectoryNames(provider, "."));
            producer.CheckFile(provider, "before.txt", "before.txt");
            return new { files = producer.AssemblyFiles(testAssembly), names = producer.DirectoryNames(provider, "."), helperNow = producer.Paths(producer.GetFiles(root)) };
        });

        var output = new
        {
            role,
            consumer = StartupHook.AssemblyIdentity(typeof(Program).Assembly),
            nativeTestAssembly = StartupHook.AssemblyIdentity(assembly),
            framework = RuntimeInformation.FrameworkDescription,
            runtime = Environment.Version.ToString(),
            pid = Environment.ProcessId,
            cases = Cases,
            total = Cases.Count,
            passed = Cases.Count - _failures,
            failed = _failures,
            boundary = "Untimed producer correctness characterization. No candidate, comparison authorization, benchmark, or performance conclusion."
        };
        File.WriteAllText(args[2], JsonSerializer.Serialize(output, new JsonSerializerOptions { WriteIndented = true }));
        Console.WriteLine(JsonSerializer.Serialize(new { role, total = Cases.Count, failed = _failures }));
        return _failures == 0 ? 0 : 1;
    }

    private static void Run(string id, string boundary, Func<object> action)
    {
        try
        {
            var observed = action();
            Cases.Add(new { id, boundary, outcome = "Passed", observed, error = (string?)null });
            Console.WriteLine($"PASS {id}");
        }
        catch (Exception exception)
        {
            _failures++;
            Cases.Add(new { id, boundary, outcome = "Failed", error = exception.ToString() });
            Console.WriteLine($"FAIL {id}: {exception}");
        }
    }

    private static (bool Returned, Exception? Exception) ObserveInvocation(Func<object> operation)
    {
        try
        {
            _ = operation();
            return (true, null);
        }
        catch (TargetInvocationException exception)
        {
            return (false, exception.InnerException);
        }
    }

    private static void Equal(string[] expected, string[] actual) =>
        Check(expected.SequenceEqual(actual, StringComparer.Ordinal), $"Expected [{string.Join(", ", expected)}]; actual [{string.Join(", ", actual)}]");

    private static void Check(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    private sealed class Producer
    {
        private readonly Type _entry;
        private readonly Type _testAssembly;
        private readonly Type _provider;

        public Producer(Assembly tests, string directory)
        {
            _entry = tests.GetType("Microsoft.Extensions.FileProviders.Embedded.Manifest.TestEntry", throwOnError: true)!;
            _testAssembly = tests.GetType("Microsoft.Extensions.FileProviders.TestAssembly", throwOnError: true)!;
            var product = AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.Combine(directory, "Microsoft.Extensions.FileProviders.Embedded.dll"));
            _provider = product.GetType("Microsoft.Extensions.FileProviders.ManifestEmbeddedFileProvider", throwOnError: true)!;
        }

        public Array EntryArray(int length) => Array.CreateInstance(_entry, length);
        public object File(string name, string? resource = null) => _entry.GetMethod("File")!.Invoke(null, [name, resource])!;
        public object Directory(string name, params object[] children)
        {
            var array = EntryArray(children.Length);
            for (var index = 0; index < children.Length; index++)
            {
                array.SetValue(children[index], index);
            }

            return DirectoryWithArray(name, array);
        }

        public object DirectoryWithArray(string name, Array? children) => _entry.GetMethod("Directory")!.Invoke(null, [name, children])!;
        public Array? Children(object entry) => (Array?)_entry.GetProperty("Children")!.GetValue(entry);
        public object GetFiles(object entry) => _entry.GetMethod("GetFiles")!.Invoke(entry, null)!;
        public string[] Paths(object result) => ((IEnumerable)result).Cast<object>().Select(e => (string)_entry.GetProperty("ResourcePath")!.GetValue(e)!).ToArray();
        public void SetResourcePath(object entry, string path) => _entry.GetProperty("ResourcePath")!.SetValue(entry, path);
        public XElement ToXElement(object entry) => (XElement)_entry.GetMethod("ToXElement")!.Invoke(entry, null)!;
        public object TestAssembly(object root) => _testAssembly.GetConstructor([_entry, typeof(string)])!.Invoke([root, "Microsoft.Extensions.FileProviders.Embedded.Manifest.xml"]);
        public string[] AssemblyFiles(object assembly) => (string[])_testAssembly.GetProperty("Files")!.GetValue(assembly)!;
        public object Provider(object assembly) => _provider.GetConstructor([typeof(Assembly)])!.Invoke([assembly]);
        public object DirectoryContents(object provider, string path) => _provider.GetMethod("GetDirectoryContents")!.Invoke(provider, [path])!;
        public string[] DirectoryNames(object provider, string path) => ((IEnumerable)DirectoryContents(provider, path)).Cast<object>().Select(e => (string)e.GetType().GetProperty("Name")!.GetValue(e)!).ToArray();
        public bool DirectoryExists(object provider, string path)
        {
            var contents = DirectoryContents(provider, path);
            return (bool)contents.GetType().GetProperty("Exists")!.GetValue(contents)!;
        }

        public void CheckFile(object provider, string path, string name)
        {
            var file = _provider.GetMethod("GetFileInfo")!.Invoke(provider, [path])!;
            var type = file.GetType();
            Check((bool)type.GetProperty("Exists")!.GetValue(file)!, $"File exists: {path}");
            Check(!(bool)type.GetProperty("IsDirectory")!.GetValue(file)!, $"File not directory: {path}");
            Check((string)type.GetProperty("Name")!.GetValue(file)! == name, $"File name: {path}");
            using var stream = (Stream)type.GetMethod("CreateReadStream")!.Invoke(file, null)!;
            Check(stream.Length == 0 && stream.ReadByte() == -1, $"Real TestAssembly resource stream: {path}");
        }

        public object MixedTree() => Directory("unused",
            Directory("z",
                File("z1.txt", "r.z1"),
                Directory("deep", File("leaf.txt", "r.deep")),
                File("z2.txt", "r.z2")),
            File("root1.txt", "r.root1"),
            Directory("empty"),
            File("root2.txt", "r.root2"),
            Directory("a", File("a1.txt", "r.a1")));
    }
}
