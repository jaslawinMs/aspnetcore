"""Read-only admission of the six images and their actual untimed native reports."""
import hashlib
import importlib.util
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def read(file):
    return json.loads(file.read_text(encoding="utf-8-sig"))


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest().upper()


def main(root, helper):
    specification = importlib.util.spec_from_file_location("autoperf_pe_pdb_reader", helper)
    assert specification is not None and specification.loader is not None
    reader = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(reader)
    plan = read(root / "acceptance.json")
    graphs = read(root / "source-graphs.json")
    common = read(root / "common-identity.json")
    assert digest(root / "acceptance.json") == graphs["actualAcceptancePlanSha256"]
    assert common["actualSuccessfulCompilations"] == 1
    assert digest(root / "prepared" / "CompiledSampleProducerTests.cs") == common["actualArtifactSourceSha256"]
    assert digest(root / "prepared" / "Probe010.targets") == common["actualCustomTargetsSha256"]
    pairs = []

    def selected_pair(dll, pdb, source, suffix, label):
        mvid, codeviews = reader.pe_metadata(dll)
        pdb_id, documents = reader.pdb_metadata(pdb)
        assert any(c["guid"] == pdb_id[0] and c["stamp"] == pdb_id[1] and c["age"] == 1 for c in codeviews)
        selected = [d for d in documents if reader.normalized(d["name"]).endswith(reader.normalized(suffix))]
        assert len(selected) == 1
        document = selected[0]
        assert document["algorithm"] == "8829d00f-11b8-4213-878b-770e8597ac16"
        assert document["checksum"] == digest(source)
        record = {"label": label, "dll": str(dll), "pdb": str(pdb), "source": str(source),
                  "actualParsedMvid": mvid, "actualParsedPdbId": pdb_id,
                  "actualFreshDocument": document, "actualRawChecksumMatched": True,
                  "actualDllSha256": digest(dll), "actualPdbSha256": digest(pdb),
                  "fullCompilerInputAttestation": False}
        pairs.append(record)
        return record

    common_path = Path(common["actualOutputDirectory"])
    fixture = selected_pair(common_path / "InMemory.FunctionalTests.dll",
                            common_path / "InMemory.FunctionalTests.pdb",
                            root / "prepared" / "CompiledSampleProducerTests.cs",
                            "CompiledSampleProducerTests.cs", "common-fixture")
    reports = []
    image_differences = []
    images = {}
    ns = {"t": "http://microsoft.com/schemas/VisualStudio/TeamTest/2010"}
    expected_utf8 = {
        f'Microsoft.AspNetCore.Server.Kestrel.Core.Tests.CompiledSampleProducerTests.'
        f'ActualSample_Utf8DecodeAndPerReadFallback(bidirectional: {direction}, caseName: "{case}")'
        for direction in ("False", "True") for case in ("ValidUtf8", "InvalidUtf8", "SplitUtf8")
    }
    for role in ("Original", "CurrentDefault"):
        for variant in ("Baseline", "F147", "F149"):
            image = read(root / "evidence" / f"{role}-{variant}-image.json")
            images[(role, variant)] = image
            image_path = Path(image["actualImagePath"])
            actual_paths = {str(f.relative_to(image_path)).replace("\\", "/")
                            for f in image_path.rglob("*") if f.is_file()}
            assert actual_paths == {f["file"] for f in image["actualAllImageFiles"]}
            for entry in image["actualAllImageFiles"]:
                file = image_path / entry["file"]
                assert file.stat().st_size == entry["bytes"] and digest(file) == entry["sha256"]
            owner = selected_pair(image_path / "WebTransportInteractiveSampleApp.dll",
                                  image_path / "WebTransportInteractiveSampleApp.pdb",
                                  Path(image["actualRawSourceSnapshot"]), plan["target"], f"{role}-{variant}")
            assert owner["actualDllSha256"] == image["actualOwnerSha256"]
            assert image["actualAcceptancePlanSha256"] == graphs["actualAcceptancePlanSha256"]
            assert image["actualWholeDefaultFrameworkClaimed"] is False
            accepted_file = root / "results" / f"{role}-{variant}-functional-1" / "functional-acceptance.json"
            accepted = read(accepted_file)
            trx = Path(accepted["actualNativeTrx"])
            assert digest(trx) == accepted["actualNativeTrxSha256"]
            xml = ET.parse(trx).getroot()
            rows = xml.findall(".//t:UnitTestResult", ns)
            assert len(rows) == 20
            definitions = {d.attrib["id"]: d for d in xml.findall(".//t:TestDefinitions/t:UnitTest", ns)}
            saved = {d["executionId"]: d for d in accepted["actualRows"]}
            actual_utf8 = set()
            checked = []
            workload_count = 0
            for row in rows:
                a = row.attrib
                assert a["outcome"] == "Passed"
                definition = definitions[a["testId"]]
                assert definition.find("t:Execution", ns).attrib["id"] == a["executionId"]
                assert saved[a["executionId"]]["testName"] == a["testName"]
                assert saved[a["executionId"]]["testId"] == a["testId"]
                if "ActualSample_Utf8DecodeAndPerReadFallback" in a["testName"]:
                    actual_utf8.add(a["testName"])
                stdout = row.findtext("t:Output/t:StdOut", default="", namespaces=ns)
                if "CompiledSampleProducerTests." in a["testName"]:
                    loaded = re.findall(r"ACTUAL_LOADED name=(\S+) path=(.+?) sha256=([0-9A-F]{64}) mvid=([0-9a-f-]{36})", stdout)
                    by_name = {m[0]: m for m in loaded}
                    assert by_name["WebTransportInteractiveSampleApp"][2:] == (owner["actualDllSha256"], owner["actualParsedMvid"])
                    assert by_name["InMemory.FunctionalTests"][2:] == (fixture["actualDllSha256"], fixture["actualParsedMvid"])
                    assert "\\12.0.0-alpha.1.26557.102\\" in by_name["System.Private.CoreLib"][1]
                if a["testName"].endswith(".ActualSample_SteadyStateWorkload"):
                    markers = re.findall(r"AUTOPERF_SAMPLE_WORKLOAD_JSON ([^\r\n]+)", stdout)
                    assert len(markers) == 1
                    observation = json.loads(markers[0])
                    assert observation["mode"] == "inspect" and observation["sampleSha256"] == owner["actualDllSha256"]
                    assert len(observation["observations"]) == 2
                    assert {o["Direction"] for o in observation["observations"]} == {"unidirectional", "bidirectional"}
                    for o in observation["observations"]:
                        assert o["ActualMeasurement"] is False and o["AllocatedBytes"] == 0 and o["ElapsedMilliseconds"] == 0
                        assert o["Operations"] == 1 and o["PayloadBytes"] == 65536
                    workload_count += 1
                checked.append({k: a[k] for k in ("testName", "testId", "executionId", "outcome")})
            assert actual_utf8 == expected_utf8 and workload_count == 1
            counters = xml.find(".//t:ResultSummary/t:Counters", ns).attrib
            assert int(counters["total"]) == 20 and int(counters["passed"]) == 20 and int(counters["failed"]) == 0
            reports.append({"role": role, "variant": variant, "file": str(trx), "sha256": digest(trx),
                            "actualRows": checked, "actualAllSixUtf8ValuesReconciled": True,
                            "actualWorkloadInspectionWithoutCountersReconciled": True,
                            "functionalAcceptance": str(accepted_file), "functionalAcceptanceSha256": digest(accepted_file)})
        baseline = {e["file"]: e for e in images[(role, "Baseline")]["actualAllImageFiles"]}
        for variant in ("F147", "F149"):
            candidate = {e["file"]: e for e in images[(role, variant)]["actualAllImageFiles"]}
            assert baseline.keys() == candidate.keys() and len(baseline) == 156
            differences = [{"file": name, "baseline": baseline[name], "candidate": candidate[name]}
                           for name in sorted(baseline) if baseline[name] != candidate[name]]
            assert {d["file"] for d in differences} == {"WebTransportInteractiveSampleApp.dll", "WebTransportInteractiveSampleApp.pdb"}
            image_differences.append({"role": role, "finding": variant, "actualAllFilesCompared": 156,
                                     "actualDifferences": differences, "actualPrefixExemptions": []})
    for directory, entries in ((common_path, common["actualFiles"]),
                               (Path(common["actualRuntimeDirectory"]), common["actualAllRuntimeFiles"])):
        actual = {str(f.relative_to(directory)).replace("\\", "/") for f in directory.rglob("*") if f.is_file()}
        assert actual == {e["file"] for e in entries}
        for entry in entries:
            file = directory / entry["file"]
            assert file.stat().st_size == entry["bytes"] and digest(file) == entry["sha256"]
    assert len(pairs) == 7 and len(reports) == 6
    print(json.dumps({"passed": True, "actualSelectedPairsFreshlyParsed": pairs,
                      "actualAllNativeXmlRows": 120, "actualNativeReports": reports,
                      "actualCausalPairImageComparisons": image_differences,
                      "actualAllCommonFilesUnchanged": 224, "actualAllRuntimeFilesUnchanged": 197,
                      "actualOneSuccessfulCommonCompilation": True, "actualNoNativeTargetExecution": True,
                      "actualNoBenchmarkOrCounters": True, "actualWholeDefaultFrameworkClaimed": False,
                      "actualReaderHelper": str(helper), "actualReaderHelperSha256": digest(helper),
                      "fullCompilerInputAttestation": False}, indent=2))


if __name__ == "__main__":
    assert len(sys.argv) == 3
    main(Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve())
