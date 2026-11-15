# F084 acceptance: cumulative directory breadcrumbs

Fresh default main:37e809ead5824bc753a1c3d56f11615bdb1296c5.
Independent branch:autoperf/F084-directory-breadcrumb-path-allocation.
No shipping change or measured comparison exists when these criteria are set.

## Required original reproduction and preservation

Exercise actual DirectoryBrowserMiddleware path matching,virtual-provider
directory existence,HtmlDirectoryFormatter segment normalization andcomplete
UTF8 response output. Assert exact normalized breadcrumb href/text pairs,
path-base concatenation,empty/repeated separators,trailing slash,percent
literals,spaces/attribute characters,Unicode/unpaired UTF16,long/deep paths.
Keep title/table/file ordering,content type/length andHEAD's zero-body/
zero-enumeration behavior. Use the established StaticFiles.Tests unit project;
direct middleware invocation is not a hosted application test.

Preserve configurable encoders andEncode(string) virtual overrides/call
behavior. TextEncoder.Encode(string) is virtual according to official Microsoft
documentation;the writer/range overload is a separate virtual method.
An unconditional pre-encoded joined-path replacement must not assume that
arbitrary encoder overrides are equivalent. Establish original tests first,
and demonstrate the actual custom-override failure of a naive prototype.

## Proposed bounded default-only alternative

For the exact HtmlEncoder.Default singleton,encode each owned Split segment
once,join a single encoded normalized full path,andappend prefix ranges
directly to the main StringBuilder. The default scalar encoder's per-segment
output must match the existing full-prefix output,includinginvalid UTF16
replacement. Non-default encoders retain the existing string-concat/encoder
loop. Do not change title/table/file formatting,metadata exception handling,
directory redirect behavior,public APIs ordefaults.

The full response still contains all increasing breadcrumb prefixes:
its output-size cost is inherent. This proposal removes intermediate prefix
strings/encoding work,not the size of the final HTML orall allocation.
Do not replace output-fidelity evidence with a direct concat helper benchmark.

Freeze exact original/proposed source/PDB/tested/executing owners andidentical
complete execution sets. Benchmark the actual formatter response forordinary
root/single/two/eight-level paths,long/deep/escaped/Unicode paths,non-default
encoders,large file lists,HEAD andcontrol boundaries. Atmost3 measured paired
comparisons;retain all timing/heap non-wins andqualifya draft whennecessary.
No browser,production-traffic,middleware-throughput,oruniversal speedup claim.
Shared CPU-heavy work remains serialized,two MSBuild workers,no power/affinity
changes. Preserve completed F082 evidence andclosed3/3 budget.

## Independent history and available evidence

GitHub semantic search returned404;local C# symbol lookup found no owner.
Known exact scan paths andbounded StaticFiles subtree discovery found the
actual owner,middleware,helpers andestablished tests.
Six owner commits andfour path-related patches were inspected. The2023
dotnet/aspnetcore#46098 title saysSpan.Split,butthis owner actuallyonly switched
the separator-array overload tostring.Split(char);cumulative concat remains.
The2025 dotnet/aspnetcore#63393 directory accessibility markup is retained.
Eight-result owner PR anddirectory/breadcrumb issue searches both returned
empty lists;this isbounded absence,not exhaustive duplicate clearance.
