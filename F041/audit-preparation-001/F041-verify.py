import argparse
import hashlib
import json
import math
import re
import statistics
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path


parser = argparse.ArgumentParser(description="Read-only F041 original-only evidence audit. Never executes .NET or a benchmark.")
parser.add_argument("directory", nargs="?", type=Path, default=Path(__file__).resolve().parent)
parser.add_argument("--live-source", type=Path)
parser.add_argument("--consumer", type=Path)
parser.add_argument("--write", action="store_true")
args = parser.parse_args()
base = args.directory.resolve()
checked_files = set()


def located(relative):
    return base.joinpath(*re.split(r"[\\/]", relative))


def read(relative):
    return json.loads(located(relative).read_text(encoding="utf-8-sig"))


def sha(file):
    checked_files.add(str(file.resolve()))
    return hashlib.sha256(file.read_bytes()).hexdigest().upper()


def close(actual, expected):
    assert math.isclose(actual, expected, rel_tol=1e-11, abs_tol=1e-6), (actual, expected)


def canonical_blob(file):
    data = file.read_bytes().replace(b"\r\n", b"\n")
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()


def evidence(folder, kind):
    matches = sorted(located(folder + "/evidence").glob("*-" + kind + ".json"))
    assert len(matches) == 1, (folder, kind, len(matches))
    return json.loads(matches[0].read_text(encoding="utf-8-sig"))


inputs = read("source-inputs.json")
plan = read("acceptance-plan.json")
budget = read("diagnostic-budget.json")
assert inputs["baseline"] == "37e809ead5824bc753a1c3d56f11615bdb1296c5"
assert inputs["upstreamDefault"] == "c5baf473f31fa3bbe9f8201e3411361c632f3a91"
assert inputs["selectedFiles"] == len(inputs["sourceFiles"]) == 13
assert budget["actualAuthorizedOriginalOnlyInvocations"] == budget["maximumAuthorizedOriginalOnlyInvocations"] == 1
assert budget["actualAuthorizedSourceComparisons"] == 0
assert budget["actualBudgetPermanentlyClosedAfterThisAttempt"] is True
assert budget["actualOptimizedCandidateExists"] is False
assert budget["actualGainOrNoGainClaimed"] is False
assert plan["sourceMutationAuthorizedByThisPlan"] is False
assert sum(file["baselineBlob"] == file["defaultBlob"] for file in inputs["sourceFiles"]) == 12
for item in inputs["sourceFiles"]:
    snapshot = located("source-files/" + item["path"])
    assert sha(snapshot) == item["sha256"]
    assert snapshot.stat().st_size == item["bytes"]
    assert canonical_blob(snapshot) == item["baselineBlob"]
default_input = located("current-default-InputBase.cs")
original_input = located("source-files/src/Components/Web/src/Forms/InputBase.cs")
producer = next(item for item in inputs["sourceFiles"] if item["gitPath"].endswith("/InputBase.cs"))
assert canonical_blob(default_input) == producer["defaultBlob"]


def initialization(file):
    text = file.read_text(encoding="utf-8").replace("\r\n", "\n")
    start = text.index("        if (!_hasInitializedParameters)\n")
    end = text.index("        else if (CascadedEditContext != EditContext)\n", start)
    return text[start:end]


assert initialization(original_input) == initialization(default_input)
for item in read("harness-source-hashes.json"):
    file = located("harness/" + item["path"])
    assert sha(file) == item["sha256"]
    assert file.stat().st_size == item["bytes"]
closure = read("consumer-closure.json")
assert closure["variant"] == "original-only"
assert len(closure["files"]) == 131
closure_by_name = {item["path"]: item for item in closure["files"]}
source_by_name = {item["path"]: item for item in inputs["sourceFiles"]}
runtime_records = []
for folder in ["native-characterize-001", "native-measure-001"]:
    command = read(folder + "/command.json")
    assert command["actualExitCode"] == 0
    assert located(folder + "/stderr.txt").read_bytes() == b""
    image = evidence(folder, "verified-image")
    assert image == {"actualEntries": 131, "actualEveryEntryVerified": True}
    discovery = evidence(folder, "benchmarkdotnet-discovery-preflight")
    assert discovery == {"actualEligiblePublicNonSealedType": True, "actualDiscoveredCases": 6,
                         "actualTimingRunByThisPreflight": False}
    associations = evidence(folder, "selected-source-pdb-associations")
    assert associations["actualSelectedInputs"] == 13
    assert associations["actualSelectedDocuments"] == len(associations["proofs"]) == 8
    assert associations["actualCompleteCompilerProvenanceClaimed"] is False
    for association in associations["proofs"]:
        assert association["sha256"] == source_by_name[association["source"]]["sha256"]
        assert association["actualOwnerSha256"] == closure_by_name[association["owner"] + ".dll"]["sha256"]
        assert association["actualPdbSha256"] == closure_by_name[association["owner"] + ".pdb"]["sha256"]
    runtime_records += [json.loads(file.read_text(encoding="utf-8-sig"))
                        for file in sorted(located(folder + "/evidence").glob("*-runtime-*.json"))]
assert len(runtime_records) == 4
settings = {"processPriority": "Normal", "threadPriority": "Normal", "affinity": 65535}
for runtime in runtime_records:
    assert runtime["framework"] == ".NET 12.0.0-alpha.1.26562.105"
    assert runtime["settings"] == settings
    owners = {item["name"]: item for item in runtime["assemblies"]}
    for name in ["AutoPerf.Benchmarks", "Microsoft.AspNetCore.Components.Forms", "Microsoft.AspNetCore.Components.Web"]:
        assert owners[name]["sha256"] == closure_by_name[name + ".dll"]["sha256"]
characterization = evidence("native-characterize-001", "characterization")
assert characterization["actualCases"] == 10 and characterization["actualEveryCasePassed"] is True
assert characterization["actualNonpublicMemberInvocations"] == 0
assert characterization["actualBrowserValidationClaimed"] is False
cases = characterization["cases"]
assert [item["name"] for item in cases] == plan["requiredCharacterizationCases"]
assert all(item["passed"] is True for item in cases)
assert cases[0]["actualHashes"] == 0 and cases[1]["actualHashes"] == 2
for case in cases[2:8]:
    count = int(case["name"].rsplit("_", 1)[1])
    observation = case["observation"]
    assert observation["actualInputCount"] == len(observation["fields"]) == count
    assert observation["actualProviderCalls"] == 1
    assert observation["actualApplicationPropertyPreserved"] is True
    assert f'<f041-observation data-fields="{count}"></f041-observation>' in observation["html"]
    for index, field in enumerate(observation["fields"]):
        assert field == {"fieldName": "Value", "renderedName": f"fields[{index}].Value",
                         "value": f"fields-value-{index}", "actualModelReferenceMatched": True}
        assert f'name="{field["renderedName"]}"' in observation["html"]
        assert f'value="{field["value"]}"' in observation["html"]
assert cases[-1]["observation"]["actualInputCount"] == cases[-1]["observation"]["actualProviderCalls"] == 0
assert evidence("native-characterize-001", "all-lifecycles") == {
    "actualProfiles": 6, "actualEverySetupWorkloadCleanupPassed": True}
expected_profiles = {(count, state) for count in [1, 8, 64] for state in ["Cold", "Warm"]}
for folder in ["native-characterize-001", "native-measure-001"]:
    for phase in ["setup", "cleanup"]:
        lifecycle = [json.loads(file.read_text(encoding="utf-8-sig"))
                     for file in sorted(located(folder + "/evidence").glob("*-lifecycle-" + phase + ".json"))]
        assert len(lifecycle) == 6
        assert {(item["FieldCount"], item["RegistryState"]) for item in lifecycle} == expected_profiles
        if phase == "cleanup":
            assert all(item["actualWorkloadConsumerCalls"] > 0 and
                       item["actualApplicationPropertyPreserved"] is True and
                       item["actualServiceProviderDisposed"] is True for item in lifecycle)
for phase in ["before", "after"]:
    settings_records = list(located("native-measure-001/evidence").glob("*-settings-" + phase + ".json"))
    assert len(settings_records) == 6
    assert all(json.loads(file.read_text(encoding="utf-8-sig")) == settings for file in settings_records)
assert evidence("native-measure-001", "completed") == {
    "actualReports": 6, "actualAllSuccessful": True, "actualSourceComparison": False,
    "actualOptimizedCandidateExists": False, "actualGainClaimed": False}
for folder in ["validation/WebBuild-original-001", "validation/InputBaseTests-original-001"]:
    assert read(folder + "/command.json")["actualExitCode"] == 0
    assert located(folder + "/stderr.txt").read_bytes() == b""
trx = ET.parse(located("validation/InputBaseTests-original-001/results/results.trx"))
ns = {"t": "http://microsoft.com/schemas/VisualStudio/TeamTest/2010"}
test_rows = [item.attrib for item in trx.findall(".//t:UnitTestResult", ns)]
assert len(test_rows) == len({row["executionId"] for row in test_rows}) == 21
assert all(row["outcome"] == "Passed" and ".InputBaseTest." in row["testName"] for row in test_rows)
recorded_rows = read("validation/verified-owner-validation.json")["actualRows"]
assert sorted((row["testName"], row["testId"], row["outcome"]) for row in test_rows) == sorted(
    (row["testName"], row["testId"], row["outcome"]) for row in recorded_rows)
stdout = located("native-measure-001/stdout.txt").read_text(encoding="utf-8-sig")
blocks = re.split(r"^// Benchmark: ", stdout, flags=re.M)[1:]
assert len(blocks) == 6
native_profiles = {}
for block in blocks:
    identity = re.search(r"\[FieldCount=(\d+), RegistryState=(Cold|Warm)\]", block)
    key = (int(identity[1]), identity[2])
    assert key not in native_profiles
    result_rows = re.findall(r"^WorkloadResult\s+(\d+): (\d+) op, ([\d.]+) ns,", block, flags=re.M)
    actual_rows = re.findall(r"^WorkloadActual\s+(\d+): (\d+) op, ([\d.]+) ns,", block, flags=re.M)
    overhead = re.findall(r"^OverheadActual\s+\d+: (\d+) op, ([\d.]+) ns,", block, flags=re.M)
    assert len(result_rows) == len(actual_rows) == 8 and len(overhead) == 20
    assert len(re.findall(r"^WorkloadWarmup\s+", block, flags=re.M)) == 3
    gc = re.findall(r"^GC:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$", block, flags=re.M)
    assert len(gc) == 1
    native_profiles[key] = {"results": result_rows, "actual": actual_rows, "overhead": overhead,
                            "gc": [int(item) for item in gc[0]]}
raw = read("native-measure-001/reports/results/AutoPerf.FieldRegistryBenchmarks-report-full.json")
assert len(raw["Benchmarks"]) == 6 and set(native_profiles) == expected_profiles
profiles = []
for benchmark in raw["Benchmarks"]:
    identity = re.fullmatch(r"FieldCount=(\d+)&RegistryState=(Cold|Warm)", benchmark["Parameters"])
    key = (int(identity[1]), identity[2])
    native = native_profiles[key]
    measurements = benchmark["Measurements"]
    assert len(measurements) == benchmark["Statistics"]["N"] == 8
    values = []
    overhead_per_operation = statistics.median(float(ns) / int(ops) for ops, ns in native["overhead"])
    for ordinal, (measurement, result, actual) in enumerate(zip(measurements, native["results"], native["actual"]), 1):
        index, operations, total_ns = int(result[0]), int(result[1]), float(result[2])
        assert index == int(actual[0]) == ordinal == measurement["IterationIndex"] and measurement["LaunchIndex"] == 1
        assert measurement["IterationMode"] == "Workload" and measurement["IterationStage"] == "Result"
        assert operations == measurement["Operations"] == int(actual[1])
        close(total_ns, measurement["Nanoseconds"])
        close(total_ns, float(actual[2]) - overhead_per_operation * operations)
        values.append(total_ns / operations)
    stats = benchmark["Statistics"]
    assert len(stats["OriginalValues"]) == 8
    for field, value in [("Mean", statistics.mean(values)), ("StandardDeviation", statistics.stdev(values)),
                         ("Variance", statistics.variance(values)), ("Median", statistics.median(values)),
                         ("Min", min(values)), ("Max", max(values)),
                         ("StandardError", statistics.stdev(values) / math.sqrt(8))]:
        close(stats[field], value)
    for actual, expected in zip(values, stats["OriginalValues"]):
        close(actual, expected)
    memory = benchmark["Memory"]
    assert memory["TotalOperations"] == native["gc"][4]
    assert memory["BytesAllocatedPerOperation"] == native["gc"][3] // native["gc"][4]
    assert [memory["Gen0Collections"], memory["Gen1Collections"], memory["Gen2Collections"]] == native["gc"][:3]
    profiles.append({"fieldCount": key[0], "registryState": key[1], "n": 8,
                     "meanNs": statistics.mean(values), "standardDeviationNs": statistics.stdev(values),
                     "medianNs": statistics.median(values), "cvPercent": 100 * statistics.stdev(values) / statistics.mean(values),
                     "allocatedBytesPerOperation": memory["BytesAllocatedPerOperation"], "rawResultNsPerOperation": values})
assert {(item["fieldCount"], item["registryState"]) for item in profiles} == expected_profiles
live = None
if args.live_source is not None or args.consumer is not None:
    assert args.live_source is not None and args.consumer is not None
    root = args.live_source.resolve()

    def git(*arguments):
        return subprocess.check_output(["git", *arguments], cwd=root, text=True, encoding="utf-8").strip()

    assert git("rev-parse", "HEAD") == inputs["baseline"]
    assert git("branch", "--show-current") == inputs["branch"]
    assert git("status", "--porcelain", "--untracked-files=no") == ""
    assert sorted(git("ls-files", "--others", "--exclude-standard").splitlines()) == sorted(
        item["path"] for item in inputs["preservedUntrackedReports"])
    for item in inputs["sourceFiles"] + inputs["preservedUntrackedReports"]:
        assert sha(root.joinpath(*item["path"].split("\\"))) == item["sha256"]
    consumer = args.consumer.resolve()
    assert sorted(str(file.relative_to(consumer)) for file in consumer.rglob("*") if file.is_file()) == sorted(closure_by_name)
    for item in closure["files"]:
        assert sha(consumer.joinpath(*item["path"].split("\\"))) == item["sha256"]
    assembly_bindings = 0
    for runtime in runtime_records:
        for assembly in runtime["assemblies"]:
            assert sha(Path(assembly["location"])) == assembly["sha256"]
            assembly_bindings += 1
    live = {"actualFrozenConsumerEntriesRehashed": 131, "actualLoadedAssemblyBindingsRehashed": assembly_bindings,
            "actualSourceAndFourUntrackedReportsPreserved": True,
            "actualPortablePdbIndependentlyDecodedByThisPythonAudit": False}
result = {"candidate": "F041", "actualOptimizedCandidateExists": False, "actualSourceComparisons": 0,
          "actualOriginalOnlyInvocations": 1, "actualOriginalOnlyProfiles": 6, "actualRawResultsCrossChecked": 48,
          "actualMeansSampleSdVarianceSeMedianMinMaxRecomputed": True, "actualConsoleGcArithmeticCrossChecked": True,
          "actualCharacterizationCases": 10, "actualUntimedLifecycles": 6, "actualExistingInputBaseRows": 21,
          "actualSkippedRows": 0, "actualSelectedSourcePdbAssociationsRecordedPerImageCheck": 8,
          "actualCompleteCompilerProvenanceClaimed": False, "profiles": profiles}
record_file = located("audit-original-only.json")
if args.write:
    with record_file.open("x", encoding="utf-8", newline="\n") as output:
        json.dump(result, output, indent=2)
        output.write("\n")
else:
    assert result == read("audit-original-only.json")
capsule_count = 0
if located("capsule-file-hashes.json").exists():
    for item in read("capsule-file-hashes.json")["files"]:
        assert sha(located(item["path"])) == item["sha256"]
        capsule_count += 1
print(json.dumps({"actualCoreEvidenceAuditPassed": True, "actualOriginalOnlyProfiles": 6,
                  "actualRawResultsCrossChecked": 48, "actualUniquePhysicalFilesRehashed": len(checked_files),
                  "actualCapsuleFilesRehashed": capsule_count, "live": live,
                  "profiles": [{key: value for key, value in profile.items() if key != "rawResultNsPerOperation"} for profile in profiles]},
                 indent=2))
