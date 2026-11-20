# Explicit runtime correction before producer execution

The initial source-build setup explicitly selected `12.0.0-alpha.1.26562.105`. Offline restore failed with NU1102 because this also selected `Microsoft.NET.ILLink.Tasks` 26562, absent from the cached local source; only 26557 was cached. The exact failed command/log and old driver are preserved.

To honor the no-install requirement, the next lower-boundary characterization explicitly selects **`12.0.0-alpha.1.26557.102`** for both roles. Its runtime and ILLink package already exist. This is not a silent fallback and is not the declared 26568 runtime. The SDK remains `12.0.100-alpha.1.26557.102`. Every producer test will assert the actual loaded Core runtime directory equals this explicit version.

The private F145 `runtime-default\dotnet.exe` and its `12.0.0-alpha.1.26568.110` directory were observed read-only. No assumption is made that 268 exists in either graph's SDK root; it has not been invoked or copied.
