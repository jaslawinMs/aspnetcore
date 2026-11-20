import argparse
import hashlib
import json
import os
import platform
import stat
import tarfile
from datetime import datetime
from pathlib import Path
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parent
OLD = ROOT.parent / "finding-F146-006"
SELF_FILES = {"MANIFEST.json", "MANIFEST.sha256"}
ROLES = ("Original", "ObservedDefault")
NAMESPACE = {"t": "http://microsoft.com/schemas/VisualStudio/TeamTest/2010"}
METHODS = (
    "ManagedHttp3_IndependentInputStreamsReachIndependentHandlers",
    "ManagedHttp3_PayloadLargerThan4096IsReceivedAcrossReads",
    "ManagedHttp3_TwoWritesReachOneAcceptedUnidirectionalHandler",
)
CLASS = "Microsoft.AspNetCore.Server.Kestrel.Core.Tests.F146ManagedProducerTests."


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def digest(path):
    result = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def save(name, value):
    (ROOT / name).write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def old_capsule_check():
    manifest_path = OLD / "MANIFEST.json"
    expected_manifest = "24fe014f3a9dc99456169639e6f7c3cf3d8dc58301dbd2293aa238128460b0e2"
    assert digest(manifest_path) == expected_manifest
    manifest = load(manifest_path)
    assert manifest["payloadFileCount"] == len(manifest["files"]) == 100
    for entry in manifest["files"]:
        path = OLD / entry["path"]
        assert path.stat().st_size == entry["length"], path
        assert digest(path) == entry["sha256"].lower(), path
    return {
        "root": str(OLD),
        "payloadFileCount": 100,
        "manifestSha256": expected_manifest,
        "allPayloadHashesMatch": True,
        "historicalHoldInterpretationNotRewritten": True,
    }


def source_archive_check(role):
    identity = load(ROOT / f"{role}-source.json")
    archive_path = ROOT / f"{role}.source.tar"
    assert digest(archive_path) == identity["archiveSha256"].lower()
    graph = Path(identity["graph"])
    regular_count = 0
    other_entries = []
    with tarfile.open(archive_path, "r:") as archive:
        for member in archive:
            if member.isdir():
                continue
            if not member.isfile():
                other_entries.append({"path": member.name, "linkTarget": member.linkname})
                continue
            relative = Path(*member.name.split("/"))
            assert not relative.is_absolute() and ".." not in relative.parts
            expected = hashlib.sha256(archive.extractfile(member).read()).hexdigest()
            actual_path = graph / relative
            assert actual_path.is_file(), actual_path
            assert digest(actual_path) == expected, actual_path
            regular_count += 1
    return {
        **identity,
        "archive": str(archive_path),
        "regularArchivedSourceFilesVerified": regular_count,
        "everyRegularArchivedFileUnchangedAfterBuildAndTests": True,
        "nonRegularArchiveEntriesNotContentCompared": other_entries,
    }


def image_check(role):
    graph = ROOT / "graphs" / role
    output = graph / r"artifacts\bin\InMemory.FunctionalTests\Release\net12.0"
    before = {item["path"]: item for item in load(ROOT / f"{role}-complete-output-image-before-run.json")}
    after = {}
    for path in sorted(output.rglob("*")):
        if path.is_file():
            relative = str(path.relative_to(output))
            after[relative] = {"path": relative, "bytes": path.stat().st_size, "sha256": digest(path)}
    assert before.keys() == after.keys(), role
    for name in before:
        assert before[name]["sha256"].lower() == after[name]["sha256"], (role, name)
        assert before[name]["bytes"] == after[name]["bytes"], (role, name)
    for name in ("InMemory.FunctionalTests.dll", "InMemory.FunctionalTests.pdb",
                 "InMemory.FunctionalTests.deps.json", "InMemory.FunctionalTests.runtimeconfig.json",
                 "Microsoft.AspNetCore.Server.Kestrel.Core.dll", "Microsoft.AspNetCore.Server.Kestrel.Core.pdb"):
        assert name in after, (role, name)
    save(f"{role}-complete-output-image-after-run.json", list(after.values()))
    return after


def trx_check(role):
    path = ROOT / "results" / role / "attempt1" / f"F146-{role}-rt57-attempt1.trx"
    root = ElementTree.parse(path).getroot()
    rows = root.findall("t:Results/t:UnitTestResult", NAMESPACE)
    assert len(rows) == 3
    assert {row.attrib["testName"] for row in rows} == {CLASS + name for name in METHODS}
    for row in rows:
        assert row.attrib["outcome"] == "Passed"
        assert row.attrib["computerName"].casefold() == platform.node().casefold()
        output = row.findtext("t:Output/t:StdOut", namespaces=NAMESPACE)
        for observation in ("received SETTINGS frame", "received HEADERS frame", "sending HEADERS frame",
                            "Initializing stream 6"):
            assert observation in output, (role, row.attrib["testName"], observation)
        if row.attrib["testName"].endswith(METHODS[0]):
            assert "Initializing stream 10" in output
    counters = root.find("t:ResultSummary/t:Counters", NAMESPACE).attrib
    assert all(counters[name] == "3" for name in ("total", "executed", "passed"))
    assert counters["failed"] == "0"
    return {
        "role": role,
        "trx": str(path),
        "trxSha256": digest(path),
        "rows": sorted(
            [{"name": row.attrib["testName"], "outcome": row.attrib["outcome"]} for row in rows],
            key=lambda row: row["name"]),
        "actualManagedHttp3FrameTracePresentInEveryRow": True,
        "samePhysicalMachine": platform.node(),
        "ownerPathHashAndActualRuntimeAssertedInsideEveryRow": True,
        "performanceDurationsNotCollectedOrInterpreted": True,
    }


def collect():
    assert not (ROOT / "MANIFEST.json").exists(), "Already frozen."
    old = old_capsule_check()
    archives = [source_archive_check(role) for role in ROLES]
    source_inputs = load(ROOT / "source-observations.json")
    for item in source_inputs["inputs"]:
        path = ROOT / "graphs" / item["role"] / item["path"]
        assert digest(path) == item["sha256"].lower(), path
    images = {role: image_check(role) for role in ROLES}
    differences = []
    for name in sorted(images[ROLES[0]].keys() | images[ROLES[1]].keys()):
        first = images[ROLES[0]].get(name)
        second = images[ROLES[1]].get(name)
        if first != second:
            differences.append({"path": name, "Original": first, "ObservedDefault": second})
    intended_owner_names = {"WebTransportInteractiveSampleApp.dll", "WebTransportInteractiveSampleApp.pdb"}
    non_owner = [entry for entry in differences if entry["path"] not in intended_owner_names]
    common = {}
    for name in ("InMemory.FunctionalTests.dll", "InMemory.FunctionalTests.pdb",
                 "InMemory.FunctionalTests.deps.json", "InMemory.FunctionalTests.runtimeconfig.json"):
        common[name] = {
            role: images[role][name]["sha256"] for role in ROLES
        } | {"identical": images[ROLES[0]][name] == images[ROLES[1]][name]}
    audit = {
        "candidatePair": False,
        "performanceComparisonAuthorized": False,
        "commonHarnessCompiledOnce": False,
        "commonFilesNeverExcludedByPrefix": common,
        "everyOutputFileHashed": True,
        "fileCounts": {role: len(images[role]) for role in ROLES},
        "fullImageDifferenceCount": len(differences),
        "nonSampleOwnerDifferenceCount": len(non_owner),
        "illustrativeFutureOwnerNamesOnly": sorted(intended_owner_names),
        "futurePolicyOrGatesAdopted": False,
        "compiledSampleOwnerPresent": False,
        "eligibleForPerformanceComparison": False,
        "reason": "Independent characterization builds; no common-once harness or compiled sample owner; non-owner image differences and an explicit analyzer-profile difference.",
        "differences": differences,
    }
    assert non_owner
    save("COMPLETE-IMAGE-AUDIT.json", audit)
    tests = [trx_check(role) for role in ROLES]
    pdb = load(ROOT / "PDB-SOURCE-OWNER-CHECKS.json")
    assert len(pdb) == 2
    for entry in pdb:
        assert len(entry["managedProducerSourceDocumentChecks"]) == 4
        assert len(entry["extractedBodyAndTestDocumentChecks"]) == 2
        assert all(check["match"] for check in entry["managedProducerSourceDocumentChecks"]
                   + entry["extractedBodyAndTestDocumentChecks"])
    receipts = [load(path) for path in sorted((ROOT / "logs").glob("*.receipt.json"))]
    assert receipts
    assert all(not pid["stillRunning"] for receipt in receipts for pid in receipt["ownedPidObservations"])
    native_summary = {
        "recordedCommandCount": len(receipts),
        "ownedPidObservationCount": sum(len(receipt["ownedPidObservations"]) for receipt in receipts),
        "distinctObservedOwnedPids": sorted({pid["pid"] for receipt in receipts for pid in receipt["ownedPidObservations"]}),
        "allObservedOwnedPidsTerminalAtCommandCompletion": True,
        "notAnExhaustiveInstantaneousChildInventory": True,
        "commands": receipts,
    }
    save("EXACT-COMMANDS-AND-EXIT-CODES.json", native_summary)
    save("UNCHANGED-006-CHECK.json", old)
    save("SOURCE-ARCHIVE-AND-INPUT-CHECKS.json", {
        "roles": archives,
        "historicalSourceObservationInputsVerified": len(source_inputs["inputs"]),
        "candidateApplied": False,
    })
    save("EXECUTABLE-RESULTS.json", {
        "finding": "F146",
        "continuation": "007",
        "artifactOnly": True,
        "untimedUntuned": True,
        "nativeWorkHoldActive": False,
        "oldCapsuleImmutable": old,
        "liveDefaultObservedSeparately": (ROOT / "live-default.txt").read_text(encoding="utf-8-sig").strip(),
        "liveSampleBlobObservedSeparately": (ROOT / "live-default-program-blob.txt").read_text(encoding="utf-8-sig").strip(),
        "pins": {entry["role"]: entry["sourcePin"] for entry in archives},
        "sdk": "12.0.100-alpha.1.26557.102",
        "actualCoreRuntimeVersionAssertedInsideAllSixRows": "12.0.0-alpha.1.26557.102",
        "declared268PresentInOwnSdkRoot": Path(r"C:\src\aspnetcore\.dotnet\shared\Microsoft.NETCore.App\12.0.0-alpha.1.26568.110").is_dir(),
        "privateF145Runtime268Used": False,
        "tests": tests,
        "managedProducerAndReceivedBehaviorVerified": True,
        "sourceExtractedHandlerNotCompiledSampleOwner": True,
        "defaultDiagnosticAnalyzersDisabledAfterRecordedAD0001": True,
        "fullCiValidationClaimed": False,
        "nativeQuicTlsBrowserFullSampleVerified": False,
        "poolingCandidateAppliedOrExecuted": False,
        "poolingUsefulOptimizationEstablished": False,
        "performanceOrCampaignVerdict": None,
        "recommendation": "Retain informational finding; managed producer reachability is proven at the simulated multiplexed transport boundary, not a reason to adopt pooling.",
    })
    print(json.dumps({
        "producerRowsPassed": 6,
        "sourceRegularFileCounts": {entry["role"]: entry["regularArchivedSourceFilesVerified"] for entry in archives},
        "outputImageFileCounts": audit["fileCounts"],
        "nonOwnerImageDifferences": len(non_owner),
        "recordedCommands": len(receipts),
        "ownedPidObservations": native_summary["ownedPidObservationCount"],
        "allOwnedPidObservationsTerminal": True,
    }, indent=2))


def payload_files():
    for directory, directories, filenames in os.walk(ROOT, followlinks=False):
        directories[:] = [
            name for name in directories
            if not (os.lstat(Path(directory) / name).st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT)
        ]
        for filename in filenames:
            path = Path(directory) / filename
            relative = str(path.relative_to(ROOT))
            if relative in SELF_FILES:
                continue
            assert not (os.lstat(path).st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT), path
            yield relative, path


def seal():
    assert not (ROOT / "MANIFEST.json").exists(), "Already frozen."
    assert load(ROOT / "EXECUTABLE-RESULTS.json")["managedProducerAndReceivedBehaviorVerified"]
    assert load(ROOT / "FINAL-OWNED-PID-CHECK.json")["allObservedOwnedPidsTerminal"]
    assert (ROOT / "HANDOFF.md").is_file()
    save("ARTIFACT-FREEZE.json", {
        "wallClock": datetime.now().astimezone().isoformat(),
        "artifactIntegrityOnly": True,
        "performancePairOrCampaignAcceptanceSeal": False,
        "doNotRebuildOrModifyFrozenGraphs": True,
        "noCandidateExecuted": True,
    })
    entries = [
        {"path": relative, "length": path.stat().st_size, "sha256": digest(path)}
        for relative, path in sorted(payload_files())
    ]
    save("MANIFEST.json", {
        "schemaVersion": 1,
        "finding": "F146",
        "continuation": "executable-007",
        "artifactIntegrityOnly": True,
        "payloadFileCount": len(entries),
        "excludedManifestSelfFiles": sorted(SELF_FILES),
        "excludedReadOnlyToolchainJunctions": [rf"graphs\{role}\.dotnet" for role in ROLES],
        "note": "Every regular payload file including all source, archive, generated-output and test-image files is hashed. Shared toolchain junctions are not traversed. Not a performance or campaign seal.",
        "files": entries,
    })
    checksum = digest(ROOT / "MANIFEST.json")
    (ROOT / "MANIFEST.sha256").write_text(checksum + "  MANIFEST.json\n", encoding="ascii")
    print(json.dumps({"payloadFileCount": len(entries), "manifestSha256": checksum}, indent=2))


def verify_only():
    manifest = load(ROOT / "MANIFEST.json")
    assert (ROOT / "MANIFEST.sha256").read_text(encoding="ascii").split()[0] == digest(ROOT / "MANIFEST.json")
    actual = dict(payload_files())
    assert set(actual) == {entry["path"] for entry in manifest["files"]}
    for entry in manifest["files"]:
        path = actual[entry["path"]]
        assert path.stat().st_size == entry["length"], path
        assert digest(path) == entry["sha256"], path
    old_capsule_check()
    print(json.dumps({
        "verifyOnly": True,
        "writes": False,
        "dotnetStarts": 0,
        "performanceRuns": 0,
        "payloadFileCount": manifest["payloadFileCount"],
        "original006PayloadFilesUnchanged": 100,
        "allHashesMatch": True,
        "manifestSha256": digest(ROOT / "MANIFEST.json"),
    }, indent=2))


parser = argparse.ArgumentParser()
parser.add_argument("mode", choices=("collect", "seal", "verify-only"))
mode = parser.parse_args().mode
{"collect": collect, "seal": seal, "verify-only": verify_only}[mode]()
