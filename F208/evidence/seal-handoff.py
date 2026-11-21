import hashlib
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)
ORIGINAL = Path(r"C:\src\ap-F208-o193")
DEFAULT = Path(r"C:\src\ap-F208-d193")
BASELINE = "37e809ead5824bc753a1c3d56f11615bdb1296c5"
DEFAULT_PIN = "d3483989953ae3cccd773aea5ea04cb0c7198531"
CHANGED = [
    r"src\Middleware\Spa\SpaServices.Extensions\src\Npm\NodeScriptRunner.cs",
    r"src\Middleware\Spa\SpaServices.Extensions\test\Microsoft.AspNetCore.SpaServices.Extensions.Tests.csproj",
    r"src\Middleware\Spa\SpaServices.Extensions\test\NodeScriptRunnerTests.cs",
    r"src\Middleware\Spa\SpaServices.Extensions\testassets\NodeScriptRunner\run",
]
TEST = (
    "Microsoft.AspNetCore.SpaServices.Extensions.Tests.NodeScriptRunnerTests."
    "AttachToLogger_FiltersAndNormalizesRealNodeOutput"
)


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def write(name, value):
    path = Path(name)
    with path.open("x", encoding="utf-8", newline="\n") as output:
        json.dump(value, output, indent=2)
        output.write("\n")


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def git(graph, *arguments, allow_missing=False):
    result = subprocess.run(
        ["git", "--no-optional-locks", "-C", str(graph), *arguments],
        capture_output=True,
        check=False,
    )
    if result.returncode and not allow_missing:
        raise RuntimeError(result.stderr.decode("utf-8", errors="replace"))
    return result.stdout.decode("utf-8").strip() if result.returncode == 0 else None


def rows(attempt):
    path = ROOT / attempt / "TestResults" / "rows.trx"
    if not path.exists():
        return []
    document = ElementTree.parse(path)
    return [
        {
            "testName": item.attrib["testName"],
            "testId": item.attrib["testId"],
            "executionId": item.attrib["executionId"],
            "outcome": item.attrib["outcome"],
            "failureMessage": next(
                (node.text for node in item.iter() if node.tag.endswith("}Message")),
                None,
            ),
        }
        for item in document.iter()
        if item.tag.endswith("}UnitTestResult")
    ]


if (ROOT / "HANDOFF.json").exists():
    raise RuntimeError("Handoff is already sealed; refusing overwrite.")

commands = []
for directory in sorted(ROOT.iterdir()):
    record_path = directory / "record.json"
    if not directory.is_dir() or not record_path.is_file():
        continue
    record = read(record_path)
    assert record["root"]["terminal"]
    assert record["stdoutTerminal"] and record["stderrTerminal"]
    assert record["allObservedOwnedNativeTerminal"]
    assert record["performanceAuthorizations"] == 0
    number = int(next(part for part in directory.name.split("-") if part.isdigit()))
    wrapper = (
        "red-005-native\\inputs\\invoke-native.ps1"
        if number <= 5
        else "red-006-filter-boundary\\inputs\\invoke-native.ps1"
        if number <= 10
        else "default-011-red-cached-runtime\\invoke-native.ps1"
    )
    if record.get("runnerSha256"):
        assert sha(ROOT / wrapper) == record["runnerSha256"]
    commands.append(
        {
            "attempt": directory.name,
            "record": str(record_path.relative_to(ROOT)),
            "recordSha256": sha(record_path),
            "host": record["hostPath"],
            "workingDirectory": record["graph"],
            "arguments": record["arguments"],
            "environment": record["environment"],
            "exitCode": record["exitCode"],
            "root": record["root"],
            "observedChildCount": len(record["observedChildren"]),
            "observedChildrenTerminal": True,
            "redirectedStreamsTerminal": True,
            "wrapper": wrapper,
            "wrapperSha256": sha(ROOT / wrapper),
            "applicationRuntime": record.get("applicationRuntime"),
            "actualRows": rows(directory.name),
        }
    )
assert len(commands) == 15
write("COMMANDS.json", commands)

proof = []
all_rows = {}
for role, red, green in [
    ("original", "red-006-filter-boundary", "original-014-final-green"),
    ("default", "default-011-red-cached-runtime", "default-015-final-green"),
]:
    red_rows = rows(red)
    green_rows = rows(green)
    assert len(red_rows) == 4 and len(green_rows) == 18
    assert all(item["outcome"] == "Passed" for item in green_rows)
    all_rows[role] = {"baseline": red_rows, "candidate": green_rows}
    for level in ["Information", "Error", "Critical", "None"]:
        identity = f"{TEST}(minimumLevel: {level})"
        before = next(item for item in red_rows if item["testName"] == identity)
        after = next(item for item in green_rows if item["testName"] == identity)
        if level in ["Critical", "None"]:
            assert before["outcome"] == "Failed"
            assert "Collections differ" in before["failureMessage"]
            assert "progress\\rfirst error" in before["failureMessage"]
        else:
            assert before["outcome"] == "Passed"
        proof.append(
            {
                "role": role,
                "testName": identity,
                "baselineTestId": before["testId"],
                "candidateTestId": after["testId"],
                "testIdUnchanged": before["testId"] == after["testId"],
                "baselineExecutionId": before["executionId"],
                "baselineOutcome": before["outcome"],
                "candidateExecutionId": after["executionId"],
                "candidateOutcome": after["outcome"],
                "baselineAttempt": red,
                "candidateAttempt": green,
            }
        )
write("test-rows.json", all_rows)
write("red-green-row-proof.json", proof)

collection_attribute = "[Collection(nameof(NodeScriptRunnerTests))]\n"
collection_definition = (
    "    [CollectionDefinition(nameof(NodeScriptRunnerTests), DisableParallelization = true)]\n"
    "    public sealed class ConsoleCollection\n"
    "    {\n"
    "    }\n\n"
)
fixture_proof = []
changed_index = []
for role, graph, pin, baseline_input in [
    ("original", ORIGINAL, BASELINE, ROOT / "red-006-filter-boundary" / "inputs"),
    ("default", DEFAULT, DEFAULT_PIN, ROOT / "default-010-red-native" / "inputs"),
]:
    assert git(graph, "rev-parse", "HEAD") == pin
    final_test = (graph / CHANGED[2]).read_text(encoding="utf-8-sig")
    baseline_test = (baseline_input / "NodeScriptRunnerTests.cs").read_text(
        encoding="utf-8-sig"
    )
    assert (
        final_test.replace(collection_attribute, "", 1).replace(
            collection_definition, "", 1
        )
        == baseline_test
    )
    baseline_source = (baseline_input / "NodeScriptRunner.cs").read_text(
        encoding="utf-8-sig"
    )
    expected_source = baseline_source.replace(
        "StdErr.OnReceivedLine += line =>\n"
        "        {\n"
        "            if (!string.IsNullOrWhiteSpace(line))",
        "StdErr.OnReceivedLine += line =>\n"
        "        {\n"
        "            if (!string.IsNullOrWhiteSpace(line) && logger.IsEnabled(LogLevel.Error))",
        1,
    )
    assert (graph / CHANGED[0]).read_text(encoding="utf-8-sig") == expected_source
    fixture_proof.append(
        {
            "role": role,
            "baselineFixtureSha256": sha(baseline_input / "NodeScriptRunnerTests.cs"),
            "finalFixtureSha256": sha(graph / CHANGED[2]),
            "identicalProducerAndAssertions": True,
            "onlyFixtureDifference": "Named nonparallel collection metadata isolates Console.SetOut.",
            "shippingSourceOnlyOneGuardChanged": True,
        }
    )
    files = []
    for relative in CHANGED:
        path = graph / relative
        files.append(
            {
                "path": relative,
                "baselineGitBlob": git(
                    graph,
                    "rev-parse",
                    f"{pin}:{relative.replace(chr(92), '/')}",
                    allow_missing=True,
                ),
                "candidateRawSha256": sha(path),
                "candidateRawGitBlob": git(
                    graph, "hash-object", "--no-filters", "--", relative
                ),
                "bytes": path.stat().st_size,
            }
        )
    changed_index.append(
        {
            "role": role,
            "graph": str(graph),
            "sourceCommit": pin,
            "patch": role + ".patch",
            "patchSha256": sha(ROOT / (role + ".patch")),
            "gitDiffCheckExit": 0,
            "gitReverseApplyCheckExit": 0,
            "files": files,
        }
    )
write("fixture-source-proof.json", fixture_proof)
write("changed-files.json", changed_index)

reserved = Path(r"C:\src\aspnetcore")
head = git(reserved, "rev-parse", "HEAD")
branch = git(reserved, "branch", "--show-current")
status = git(reserved, "status", "--porcelain=v1", "--untracked-files=normal")
assert head == "24875ef5dabb55567870b39f6eb0002170435e2f"
assert branch == "autoperf/F145-hoist-large-response-utf8-encoding"
expected_reports = sorted(
    [
        "autoperf-issue-70219-deduplicated-report.html",
        "autoperf-issue-70219-duplicate-report.html",
        "autoperf-scan-report.md",
        "performance-antipattern-findings.md",
    ]
)
assert sorted(line[3:] for line in status.splitlines()) == expected_reports
assert all(line.startswith("?? ") for line in status.splitlines())
write(
    "reserved-root-final.json",
    {
        "head": head,
        "branch": branch,
        "status": status.splitlines(),
        "ownerWroteReservedWorktree": False,
        "reports": [
            {"path": name, "finalSha256": sha(reserved / name)}
            for name in expected_reports
        ],
        "limit": "Initial report byte hashes were not captured; initial/final branch, HEAD, names and tracked status match.",
    },
)

assert read(ROOT / "upstream-source-pin.json")["defaultCommit"] == DEFAULT_PIN
assert read(ROOT / "upstream-default-recheck.json")["sha"] == DEFAULT_PIN
terminal = read(ROOT / "owned-terminal-check-016.json")
assert terminal["allObservedOwnedIdentitiesTerminal"]
assert terminal["nativeRoots"] == 15
assert not terminal["actualBenchmarkLeasePresent"]

acceptance = read(ROOT / "ACCEPTANCE.json")
write("ACCEPTANCE-defined-before-implementation.json", acceptance)
acceptance["status"] = "passed-at-declared-producer-correctness-boundary"
acceptance["finalNativeProjectRowsPerRole"] = 18
acceptance["redGreenEvidence"] = "red-green-row-proof.json"
acceptance["performanceQualified"] = False
write("ACCEPTANCE-result.json", acceptance)

handoff = {
    "schema": 1,
    "finding": "F208",
    "card": "expensive-branch-result-computed-eagerly",
    "sealedAtUtc": datetime.now(timezone.utc).isoformat(),
    "state": "private-candidate-correctness-qualified-only",
    "coordinatorOwnsFinalDispositionTimingAndPublication": True,
    "sourcePins": {
        "original": BASELINE,
        "actualUpstreamDefault": DEFAULT_PIN,
        "freshSourceReceipt": "upstream-source-pin.json",
        "finalDefaultRecheck": "upstream-default-recheck.json",
        "graphs": [str(ORIGINAL), str(DEFAULT)],
    },
    "change": {
        "shipping": "Only add logger.IsEnabled(LogLevel.Error) to the existing non-whitespace stderr-line condition.",
        "tests": "One four-row real-Node producer theory in the existing SpaServices.Extensions.Tests project, a gated Node asset, and its content-copy item.",
        "publicApiDefaultsOrConventionsChanged": False,
        "exactDiffAndHashIndex": "changed-files.json",
        "indexSha256": sha(ROOT / "changed-files.json"),
        "privateGitState": "Detached source pins; two new test files have intent-to-add entries only. No commit, push, PR or issue.",
    },
    "rationale": (
        "Real Node stderr reached the production stream reader and generated five already-normalized "
        "ILogger.Log attempts even when the real LoggerFactory discarded Error. The guard avoids "
        "preparing that unused branch and matches stdout's existing Information guard. This is a "
        "conditional mechanism improvement, not evidence of a worthwhile performance win."
    ),
    "evidenceBoundary": {
        "producer": "Actual NodeScriptRunner Process.Start -> Node fixture process.stderr -> redirected StandardError -> EventedStreamReader.Run -> AttachToLogger.",
        "filter": "Real LoggerFactory category Microsoft.AspNetCore.SpaServices; Information/Error/Critical/None thresholds. Recording logger forwards to that real factory.",
        "observable": "Normalized attempted messages before the factory filter, actual provider sink messages, unchanged raw error capture, progress Console forwarding, EOF and exit code.",
        "covered": [
            "ANSI SGR normalization and ANSI-only lines",
            "CRLF/LF multiline output, empty and whitespace-only lines",
            "literal braces, final unterminated stderr line",
            "partial stderr Console forwarding regardless of log threshold",
            "raw EventedStreamStringReader diagnostics independent of filtering",
            "each fixture awaits runner process exit 0 and both stream-closed events",
        ],
        "notBypassed": "No synthetic event/delegate invocation, uninitialized runner, standalone compiler or replacement stream reader.",
        "limits": [
            "Node is passed directly as the package-manager command to the fixture's extensionless run file; complete npm/Angular/React CLI applications were not installed or exercised.",
            "Windows only; no cross-OS execution or long-running CLI workload qualification.",
            "No incidence, realistic volume, CPU, throughput, latency, allocation, or materiality evidence.",
        ],
    },
    "correctness": {
        "nativeProject": r"src\Middleware\Spa\SpaServices.Extensions\test\Microsoft.AspNetCore.SpaServices.Extensions.Tests.csproj",
        "test": TEST,
        "regressions": ["Critical", "None"],
        "nearestControls": ["Information", "Error"],
        "baselinePerRole": "Two expected failing disabled rows; both enabled controls passed.",
        "candidatePerRole": "All 18 native project rows passed; 4 producer rows and 14 existing controls; no skips.",
        "exactRowsAndExecutionIdentities": "test-rows.json",
        "redGreenIdentityProof": "red-green-row-proof.json",
        "assertionsUnchangedProof": "fixture-source-proof.json",
        "acceptance": "ACCEPTANCE-result.json",
    },
    "historyAndRelatedWork": {
        "stdoutGuardPrecedent": "103560b3d4b322779638e4f3e127f59a98a41847 / upstream PR47837; history-2023-guard.diff",
        "newDefaultProcessChange": "0328b915263b84541e57b75f824e79a75f2d5ed3 / PR70669 only changes ProcessStartInfo to InheritedHandles=[] at this file; untouched.",
        "duplicateChecks": "No F208 fork branch or matching F208/NodeScriptRunner fork PR found; current upstream remains eager. Search receipts are preserved; not an exhaustive unpublished-branch claim.",
        "scope": "No F200/F201/F214/F236/F345 code, graph, policy or ledger changes.",
    },
    "exceptionSemantics": {
        "sourceOnly": (
            "No catch, regex, timeout, process-start wrapping or stream-reader implementation changed. "
            "Enabled output retains the same one-second regex replacement then LogError. Disabled output "
            "now intentionally skips both operations. New IsEnabled exceptions, stateful filters, and "
            "RegexMatchTimeoutException were not forced. EventedStreamReader.Run does not catch callback "
            "exceptions; no universal exception-equivalence claim is made."
        ),
        "rawStartupErrorDiagnostics": "Production Angular/React error readers subscribe independently to StdErr; exact raw capture is preserved in the producer theory.",
    },
    "nativeExecution": {
        "allCommandsArgumentsEnvironmentExits": "COMMANDS.json",
        "commandManifestSha256": sha(ROOT / "COMMANDS.json"),
        "nativeRoots": 15,
        "allObservedOwnedRootsChildrenAndStreamsTerminal": True,
        "terminalReceipt": "owned-terminal-check-016.json",
        "forcedOwnedProcessStops": 0,
        "sdk": "12.0.100-alpha.1.26557.102; each command activated its exact graph and refused ambient SDK fallback.",
        "constraints": "max2 build nodes; concurrent final role builds used one each; no node reuse/shared compilation.",
        "defaultRuntime": "Exact cached 12.0.0-alpha.1.26569.107 materialized privately; no download/install/downgrade; 200 file hashes in cached-default-runtime.json. SDK activation remains graph-local; explicit DOTNET_ROOT_X64 selects the private application runtime.",
        "originalRuntimeLimit": "Runtimeconfig requires 12.0.0-alpha.1.26562.105; selected Original runtime was not separately instrumented. No exact performance-runtime pairing claim.",
        "preservedFailures": [
            "red-001-no-restore: missing generated imports, exit1; recovered by bounded GenerateFiles target.",
            "red-003-no-assets and default-008-no-assets: NETSDK1004, exit1; only then restored each native test graph.",
            "red-005-native and red-006-filter-boundary: expected Original disabled-row assertion failures, exit1.",
            "default-010-red-native: testhost missing runtime69, exit1 and zero rows; all four producer cases blocked before assertions. Recovered from existing exact cache in default-011.",
            "default-011-red-cached-runtime: expected Default disabled-row assertion failures, exit1.",
            "default-010 rows.json: failed null-row parser output retained and superseded by actual-rows.json, COMMANDS.json and real TRX.",
        ],
    },
    "performanceAndMateriality": {
        "comparisonsAuthorized": 0,
        "benchmarksWarmupsCountersProfilersExecuted": 0,
        "performanceQualified": False,
        "limits": "Developer CLI output only; Error normally enabled. The added enabled-path IsEnabled cost and real-world benefit are unmeasured. No performance or false-positive disposition.",
    },
    "reservedWorktree": "reserved-root-final.json; expected branch/HEAD and four unrelated untracked reports retained; no owner writes.",
    "policyLeaseRegistryLedgerWrites": False,
    "publicationOrBrowserActions": False,
    "artifactHashIndex": "ARTIFACTS.sha256.json",
}
write("HANDOFF.json", handoff)

artifact_index = [
    {
        "path": str(path.relative_to(ROOT)),
        "bytes": path.stat().st_size,
        "sha256": sha(path),
    }
    for path in sorted(ROOT.rglob("*"))
    if path.is_file() and path.name != "ARTIFACTS.sha256.json"
]
write("ARTIFACTS.sha256.json", artifact_index)
print(
    json.dumps(
        {
            "handoff": str(ROOT / "HANDOFF.json"),
            "handoffSha256": sha(ROOT / "HANDOFF.json"),
            "changedFileIndexSha256": sha(ROOT / "changed-files.json"),
            "artifactIndexSha256": sha(ROOT / "ARTIFACTS.sha256.json"),
            "nativeRootsTerminal": 15,
            "candidateNativeRowsPassedPerRole": 18,
            "performanceAuthorizations": 0,
        },
        indent=2,
    )
)
