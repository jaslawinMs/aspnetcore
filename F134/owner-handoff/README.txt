F134-006: untimed TestHost producer verification and future-consumer preparation

This capsule is separate from all worker-a accepted archives and campaign policy.
It does not implement, time, publish or finalize an optimization.

Fresh verified result
---------------------
The new common consumer compiled ONCE and ran in verify-only mode:
Original 10/10 passed; Default 10/10 passed; zero skipped; identical observations.
All six existing repository test rows passed individually, with both TRX reports
parsed (the initial five rows plus the corrected missing subprotocol test).
The rejected-mode invocation returned the required exit code 2 before hosting.
No new consumer/source-owner compilation was repeated after the successful build.

All four common DLL/PDB/deps/runtimeconfig files are byte-identical across the
two actual run images. The complete image audit hashes 62 files in each image
and correctly FAILS the future owner-only identity gate on 47 non-owner file
differences. This is behavioral Original/default verification, NOT a valid
owner-only performance pair. No candidate patch or gain conclusion is delivered.

See evidence\verify-only-comparison.json, evidence\existing-test-outcomes.json,
evidence\image-pair-audit.json, logs\commands.json and logs\process-terminal.json.
All 11 observed owned PIDs are terminal. No owned service survives.

Identity and context
--------------------
Original: 37e809ead5824bc753a1c3d56f11615bdb1296c5
Accepted observed default: ae89581dfd24c6277b4267a9779d05f7b9f047f1
Local origin/main still names that default. No new GitHub/network default
observation is claimed: this assignment forbids GitHub access.

The target source is byte-identical between these pins. The constructor creates
the get-only IList<string> as List<string>. The Any guard runs once per connection,
not per message. Pinned modern runtime source already uses ICollection<T>.Count.
the selected installed runtime's exact PE was also inspected as metadata without
starting a CLR child or executing Any. Its IL tests ICollection<T> at offset 11,
calls get_Count at 21, compares with zero, and returns at 29 before the fallback.
No material improvement follows from these source/IL facts.

Source:
https://github.com/dotnet/aspnetcore/blob/37e809ead5824bc753a1c3d56f11615bdb1296c5/src/Hosting/TestHost/src/WebSocketClient.cs#L79-L95
https://github.com/dotnet/aspnetcore/blob/ae89581dfd24c6277b4267a9779d05f7b9f047f1/src/Hosting/TestHost/src/WebSocketClient.cs#L21-L39
https://github.com/dotnet/aspnetcore/blob/ae89581dfd24c6277b4267a9779d05f7b9f047f1/src/Hosting/TestHost/src/WebSocketClient.cs#L79-L109
https://github.com/dotnet/aspnetcore/blob/ae89581dfd24c6277b4267a9779d05f7b9f047f1/src/Hosting/TestHost/src/TestServer.cs#L190-L197
History:
https://github.com/dotnet/aspnetcore/commit/af8d35dba62f91a74b416a96822b1ec5152b6f3b
The 2019 change introduced the Any guard and subprotocol array forwarding together.
https://github.com/dotnet/aspnetcore/commit/3ea008c80d5cc63de7f90ddfd6823b7b006251ff
The bounded accepted follow-history ends with internal/private sealing work; no
new source-history or overlap conclusion is claimed.
Modern runtime reference (not proof of the installed runtime):
https://github.com/dotnet/runtime/blob/4cc1155e6af3a6f0b733b8900bf2f0d1495be7e0/src/libraries/System.Linq/src/System/Linq/AnyAll.cs#L11-L21
Exact selected installed System.Linq.dll:
SHA256 3ABB77BBE12F449B1EB633F8B772E4858D4CEBE3DD98AC9C669FF0C2A3849501
Product version 12.0.0-alpha.1.26565.104+8fc142ba6d733754f83a1e9a9b87cad5de06b650
Full metadata-only decoded IL: evidence\installed-linq-static-il.json.
Derived source link from that product version (not fetched in this task):
https://github.com/dotnet/runtime/blob/8fc142ba6d733754f83a1e9a9b87cad5de06b650/src/libraries/System.Linq/src/System/Linq/AnyAll.cs

Acceptance and genuine producer
-------------------------------
acceptance.json was written before the new consumer. Ten stable case IDs cover
actual TestServer.CreateWebSocketClient -> ConnectAsync -> actual server
acceptance or rejection -> TestWebSocket pairs. Successful cases verify header
presence, offered order, chosen protocol, binary payload, and two-sided close.
Failure cases observe the real endpoint and exact ConnectAsync exceptions.
ConfigureRequest is exercised only as an actual product feature, not as a
substitute event/producer. No handwritten emptiness microloop is used.

The accepted Original and Default stages already passed their unchanged three
producer rows each: F134.empty, F134.one, F134.several (zero skips).
Those results are inherited, not newly executed here. The new ten-row matrix and
the six existing repository test cases must not be reported passed until their
fresh outputs and reports are parsed.

The selected existing repository tests are:
Microsoft.AspNetCore.TestHost.Tests.WebSocketClientTests.CanAcceptWebSocket
Microsoft.AspNetCore.TestHost.TestClientTests.WebSocketSubProtocolsWorks
Microsoft.AspNetCore.TestHost.Tests.WebSocketClientTests.ConnectAsync_ShouldSetRequestProperties
  Three existing InlineData rows: localhost, localhost:80, localhost:81.
Microsoft.AspNetCore.TestHost.Tests.WebSocketClientTests.VerifyWebSocketAndUpgradeFeatures
The copied existing test project uses its established xUnit binaries unchanged.
No new repository unit test or test framework dependency is introduced.
The inherited proposal incorrectly inserted ".Tests" in TestClientTests'
namespace. The initial fresh run passed the other five rows but did not discover
that misqualified row; the parser rejected the incomplete run. Its actual pinned
namespace is Microsoft.AspNetCore.TestHost. A targeted follow-up runs only that
missing test; both raw reports remain preserved. See failed-preparations.json.

Executable contract
-------------------
Run-VerifyOnly.ps1 is explicitly gated by native-release.json and the
-NativeWorkReleased switch. The file records scoped F134 authorization:
the peer explicitly clarified that its entry hold applied to F146 only and was
not authority to impose a global/F134 hold. No F134 coordinator hold was issued.
The initial conservative pause is recorded honestly; no F146 release is claimed.
Honor any actual subsequent F134/coordinator hold before another native child.

After this capsule is sealed, DO NOT run builds or mutable commands in it.
For a future authorized continuation, copy the authored scripts, acceptance file,
and consumer Program.cs into a NEW capsule, rerun initialize.cjs and
Freeze-OwnerProof.cjs there, create the read-only toolchain junction there, and
record an actual coordinator release in the new native-release.json. Retain the
common-once rule. The future commands, relative to that new capsule, are:
  .\Run-VerifyOnly.ps1 -NativeWorkReleased
  node .\Compare-VerifyOnly.cjs
  .\Read-ExistingTestResults.ps1
  node .\Audit-ImagePair.cjs

Audit-ImagePair.cjs returns 3 when any non-owner file differs. For Original vs
Default this can be an EXPECTED FAILURE of the future owner-only performance
identity gate; it does not turn equal behavioral observations into a valid
candidate experiment. Inspect the emitted report rather than ignoring the exit.

SDK 12.0.100-alpha.1.26557.102 was verified by the new --version execution
(immutable .dotnet junction, read-only reuse). All five separately recorded
selected toolchain file hashes remained unchanged afterward.
Managed owner executions explicitly select installed runtime
12.0.0-alpha.1.26565.104, also observed from both producer processes and the
host-resolution trace. Declared 12.0.0-alpha.1.26568.110 is not installed.
The script activates . .\activate.ps1 from the copied matching repository root
before every dotnet invocation and sets all required managed-only flags.
Caches, scratch, source, obj/bin and logs remain inside this new capsule.
The test runner gets a new PRIVATE OUTPUT runtimeconfig selecting the installed
runtime. The copied immutable input closure and repository configs remain intact.

Fresh graph and exact images
---------------------------
The accepted owner/dependency PEs and owner portable PDB/source bytes are copied
into inputs\, with before/after hashes. No accepted closure is compiled into or
changed in place. The fresh compilation graph contains ONLY the new consumer.
No ASP.NET Core installed shared-framework owner is substituted.

The common consumer is compiled ONCE against the Default input closure. Both run
images receive the exact same common DLL/PDB/deps/runtimeconfig. Variant copies
then receive their respective accepted owner/dependency closure, without changing
those inputs. Each execution must verify loaded owner hashes, PE/PDB GUID+stamp,
PDB document checksum, and equality of physical source to the pinned Git text.
A binary-reference/closure incompatibility must fail rather than be hidden by
recompiling the common harness independently for the second variant.

The full image audit hashes EVERY regular file, including all common-prefixed
files. Only Microsoft.AspNetCore.TestHost.dll and
Microsoft.AspNetCore.TestHost.pdb can differ in a future owner-only pair.
Source equality is never accepted as image equality.
Static metadata inspection found all 44 copied assembly identities compatible
between Original and Default, but 35 PE file hashes differ, including TestHost.
Thus these inputs are already known NOT to form a future owner-only image pair.
That difference is not a producer failure or an empirical no-gain result.

Unadopted future study suggestions; NOT sealed
--------------------------------------------
No candidate source patch was manufactured. There is no adopted primary,
control, gain threshold, budget, or performance conclusion.
If separately authorized and grounded later, a possible primary is repeated
real F134.HandshakeEmpty connections with the actual owning producer; nearest
controls are F134.HandshakeOne and F134.HandshakeSeveral. Inputs would be fixed
before measurement, not tuned. Any owner-only pair must use the SAME base source,
dependency closure, common binaries, installed runtime, and physical machine,
and must pass the complete image gate first. The gain threshold remains UNSET.
Original vs Default here is NOT such an owner-only pair.

Boundaries and exclusions
------------------------
No browser, TCP listener, remote helper, concurrent-mutation, broad invalid
protocol/URI matrix, cancellation race, throughput or allocation claim.
No source branch/commit/PR, GitHub operation, ledger/policy/budget write, machine
install/config/certificate change, timing, allocation counter or benchmark.
Standard SDK/test-runner logs contain their normal execution durations; they
are not collected or interpreted as performance evidence.
Any build/setup failure and individual existing test outcomes belong in the
final handoff evidence, not inferred from the prepared source.
