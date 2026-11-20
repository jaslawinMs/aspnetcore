import copy
import hashlib
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
allowed_owner_files = {
    "Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.dll",
    "Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.pdb",
}


def load(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def sha(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def inventory(directory):
    return {
        str(path.relative_to(directory)): {
            "length": path.stat().st_size,
            "sha256": sha(path),
        }
        for path in sorted(directory.rglob("*"))
        if path.is_file()
    }


def gate(left, right, same_runtime=True):
    differences = [
        {
            "file": name,
            "left": left.get(name),
            "right": right.get(name),
            "ownerWhitelisted": name in allowed_owner_files,
        }
        for name in sorted(left.keys() | right.keys())
        if left.get(name) != right.get(name)
    ]
    rejected = [item for item in differences if not item["ownerWhitelisted"]]
    return {
        "ownerOnlyImageContractSatisfied": not rejected and same_runtime,
        "sameRuntimeIdentity": same_runtime,
        "differences": differences,
        "rejectedDifferenceCount": len(rejected),
        "allowedOwnerFileNames": sorted(allowed_owner_files),
        "noFixtureOrAutoPerfPrefixExclusion": True,
        "authorizationOrPerformanceVerdict": False,
    }


actual = {}
for image in sorted((root / "images").iterdir()):
    if image.is_dir():
        actual[image.name] = inventory(image)

expected_paths = {
    "original-producer": "original-complete-consumer-before-execution.json",
    "default-producer": "default-complete-consumer-before-execution.json",
    "original-complete": "original-complete-closure-before-execution.json",
    "default-complete": "default-complete-closure-before-execution.json",
    "original-final": "original-final-consumer-before-execution.json",
    "default-final": "default-final-consumer-before-execution.json",
}
unchanged = []
for image, before_file in expected_paths.items():
    before = {
        row["path"]: {"length": row["length"], "sha256": row["sha256"]}
        for row in load(root / "evidence" / before_file)
    }
    comparison = gate(before, actual[image])
    assert not comparison["differences"], image
    unchanged.append({"image": image, "count": len(before), "allBytesUnchanged": True})

common_main = load(root / "evidence" / "compile-once-common-consumer.json")
common_edge = load(root / "evidence" / "empty-edge-common-compiled-once.json")
common_rows = []
for row in common_main:
    for image in actual:
        assert actual[image][row["file"]]["sha256"] == row["sha256"], (image, row)
    common_rows.append({"file": row["file"], "sha256": row["sha256"], "images": sorted(actual)})
for row in common_edge:
    for image in ("original-final", "default-final"):
        assert actual[image][row["file"]]["sha256"] == row["sha256"], (image, row)
    common_rows.append({"file": row["file"], "sha256": row["sha256"], "images": ["original-final", "default-final"]})
overlay = "AutoPerf.F137.SourceClosure.deps.json"
assert actual["original-final"][overlay] == actual["default-final"][overlay]

original = load(root / "results" / "original-complete" / "producer.json")
default = load(root / "results" / "default-complete" / "producer.json")
for role, producer in (("original", original), ("default", default)):
    assert len(producer["rows"]) == 18
    bad = [row for row in producer["rows"] if row["outcome"] != "Passed"]
    assert len(bad) == 1 and bad[0]["name"] == "EmptyCompilePath_NormalizerRejects"
    assert producer["failed"] == 1 and producer["assertions"] == 97
    edge = load(root / "results" / f"{role}-empty-edge" / "producer.json")
    assert edge["outcome"] == "Passed" and edge["assertions"] == 5
    assert edge["exception"] == "System.ArgumentException" and edge["parameter"] == "path"
    assert edge["owner"]["sha256"] == producer["ownerIdentities"][0]["sha256"]
    tests = load(root / "results" / role / "existing-tests-parsed.json")
    assert tests["count"] == 10 and all(row["outcome"] == "Passed" for row in tests["rows"])
    owner_name = "Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.dll"
    assert actual[f"{role}-producer"][owner_name] == actual[f"{role}-complete"][owner_name]
    assert actual[f"{role}-complete"][owner_name] == actual[f"{role}-final"][owner_name]
    for owner in producer["ownerIdentities"]:
        assert owner["selectedDocument"]["checksumMatches"]
        assert owner["peCodeView"]["Guid"] == owner["pdbId"]["guid"]
        assert owner["peCodeView"]["Stamp"] == owner["pdbId"]["stamp"]

runtime_fields = ("frameworkDescription", "version", "architecture", "coreLibrarySha256", "hostSha256", "rollForward")
same_runtime = all(original["runtime"][key] == default["runtime"][key] for key in runtime_fields)
real_gate = gate(actual["original-final"], actual["default-final"], same_runtime)
assert not real_gate["ownerOnlyImageContractSatisfied"]

control = actual["original-final"]
self_tests = []


def check_gate(name, changes, expected, runtime=True):
    altered = copy.deepcopy(control)
    for filename in changes:
        if filename is None:
            altered["unexpected-file.bin"] = {"length": 1, "sha256": "0" * 64}
        else:
            assert filename in altered
            altered[filename]["sha256"] = "0" * 64
    observed = gate(control, altered, runtime)["ownerOnlyImageContractSatisfied"]
    assert observed == expected, name
    self_tests.append({"name": name, "outcome": "Passed", "expectedContractSatisfied": expected})


check_gate("IdenticalImageAndRuntime_PassesStructuralGateOnly", [], True)
check_gate("OnlyIntendedOwnerDllPdbChanges_AllowedStructurally", sorted(allowed_owner_files), True)
check_gate("CommonMainDllDifference_Rejected", ["AutoPerf.F137.VerifyOnly.dll"], False)
check_gate("CommonMainPdbDifference_Rejected", ["AutoPerf.F137.VerifyOnly.pdb"], False)
check_gate("CommonMainDepsDifference_Rejected", ["AutoPerf.F137.VerifyOnly.deps.json"], False)
check_gate("CommonMainRuntimeconfigDifference_Rejected", ["AutoPerf.F137.VerifyOnly.runtimeconfig.json"], False)
check_gate("OwnFixtureDifference_Rejected", ["AutoPerf.F137.Fixture.HIGH.dll"], False)
check_gate("OwnEdgeConsumerDifference_Rejected", ["AutoPerf.F137.EmptyPath.VerifyOnly.dll"], False)
check_gate("AdditionalDepsDifference_Rejected", [overlay], False)
check_gate("UnexpectedConsumerFile_Rejected", [None], False)
check_gate("IdenticalFilesButDifferentRuntime_Rejected", [], False, False)

report = {
    "everyActualConsumerImageEntryHashed": True,
    "imageInventories": actual,
    "unchangedAfterExecution": unchanged,
    "commonCompiledConsumerByteIdentity": common_rows,
    "originalDefaultRealFullImageGate": real_gate,
    "gateSelfTests": self_tests,
    "selfTestBoundary": "Mutation tests alter in-memory inventory dictionaries only, never source, candidate bytes, consumer files, or frozen measurements.",
    "originalDefaultAreSeparateFunctionalCharacterizations": True,
    "notACausalPerformancePair": True,
    "knownProbeFailurePreserved": "EmptyCompilePath_NormalizerRejects: wrong probe expectation at both roles; separate unchanged-byte shared edge consumer verifies actual ArgumentException(path) through real registered producer.",
}
target = root / "evidence" / "complete-image-audit.json"
if target.exists():
    raise RuntimeError("Refusing to overwrite image audit")
target.write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps({
    "imageCounts": {name: len(items) for name, items in actual.items()},
    "commonFilesVerified": len(common_rows),
    "nonOwnerDifferencesOriginalDefault": real_gate["rejectedDifferenceCount"],
    "gateSelfTestsPassed": len(self_tests),
    "runtimeIdentical": same_runtime,
}))
