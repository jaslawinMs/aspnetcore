"""Stage a bounded F138 facts capsule. Sealing is a separate, explicit operation."""
import collections
import hashlib
import json
import pathlib
import re
import shutil
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from audit_capsule import digest, pe_metadata

SCOPE = pathlib.Path(__file__).resolve().parent
TARGET = SCOPE / "handoff"
SOURCE_FILES = [
    "global.json", "Directory.Build.props", "Directory.Build.targets", "Directory.Packages.props",
    r"eng\Versions.props", r"eng\Version.Details.props", r"eng\Version.Details.xml",
    r"eng\Tools.props", r"eng\Common.props", r"eng\targets\CSharp.Common.props",
    r"eng\tools\GenerateFiles\GenerateFiles.csproj",
    r"src\OpenApi\README.md", r"src\OpenApi\src\PACKAGE.md",
    r"src\OpenApi\src\Microsoft.AspNetCore.OpenApi.csproj",
    r"src\OpenApi\src\Extensions\ApiDescriptionExtensions.cs",
    r"src\OpenApi\src\Services\OpenApiDocumentService.cs",
    r"src\OpenApi\src\Services\OpenApiDocumentProvider.cs",
    r"src\OpenApi\src\Services\IOpenApiDocumentProvider.cs",
    r"src\OpenApi\src\Extensions\OpenApiEndpointRouteBuilderExtensions.cs",
    r"src\OpenApi\src\Extensions\OpenApiServiceCollectionExtensions.cs",
    r"src\OpenApi\test\Microsoft.AspNetCore.OpenApi.Tests\Microsoft.AspNetCore.OpenApi.Tests.csproj",
    r"src\OpenApi\test\Microsoft.AspNetCore.OpenApi.Tests\Extensions\ApiDescriptionExtensionsTests.cs",
    r"src\OpenApi\test\Microsoft.AspNetCore.OpenApi.Tests\Services\OpenApiDocumentServiceTestsBase.cs",
    r"src\OpenApi\test\Microsoft.AspNetCore.OpenApi.Tests\Services\OpenApiDocumentService\OpenApiDocumentServiceTests.RequestBody.cs",
    r"src\Mvc\Mvc.ApiExplorer\src\EndpointMetadataApiDescriptionProvider.cs",
    r"src\Mvc\Mvc.ApiExplorer\src\DefaultApiDescriptionProvider.cs",
    r"src\Mvc\Mvc.ApiExplorer\src\ApiDescriptionGroupCollectionProvider.cs",
    r"src\Mvc\Mvc.Abstractions\src\ApiExplorer\ApiDescription.cs",
    r"src\Mvc\Mvc.Abstractions\src\ApiExplorer\ApiParameterDescription.cs",
    r"src\Mvc\Mvc.Abstractions\src\ModelBinding\BindingSource.cs",
    r"src\Mvc\Mvc.Core\src\ApplicationModels\InferParameterBindingInfoConvention.cs",
    r"src\Http\Http.Extensions\src\RequestDelegateFactory.cs",
    r"src\Http\Routing\src\RouteEndpointDataSource.cs",
]
OWNERS = ["Microsoft.AspNetCore.OpenApi", "Microsoft.AspNetCore.Mvc.ApiExplorer",
          "Microsoft.AspNetCore.Mvc.Abstractions", "Microsoft.AspNetCore.Http.Extensions",
          "Microsoft.AspNetCore.OpenApi.Tests"]
RUNTIME68 = SCOPE.parent / "finding-F145-005" / "runtime-default"
SDKROOT = pathlib.Path(r"C:\src\aspnetcore\.dotnet")


def load(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write(name, value):
    path = TARGET / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def copy(source, relative):
    destination = TARGET / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
    return str(destination.relative_to(TARGET)).replace("\\", "/")


def file_record(path):
    mvid = None
    if path.suffix.casefold() in (".dll", ".exe"):
        mvid, _ = pe_metadata(path)
    return {"path": str(path), "sha256": digest(path), "bytes": path.stat().st_size, "mvid": mvid}


def main():
    if (TARGET / "MANIFEST.json").exists():
        raise RuntimeError("Refusing to alter a sealed handoff")
    TARGET.mkdir(exist_ok=True)
    for path in (SCOPE / "logs").iterdir():
        if path.name.endswith(".started.json"):
            continue
        if path.is_file() and (path.suffix == ".json" or path.stat().st_size):
            copy(path, pathlib.Path("logs") / path.name)
    for role in ("baseline", "default"):
        result = SCOPE / "results" / f"{role}-producer"
        for path in result.iterdir():
            if path.is_file():
                copy(path, pathlib.Path("results") / result.name / path.name)
        trx = SCOPE / "results" / f"{role}-existing" / f"{role}.trx"
        copy(trx, pathlib.Path("results") / f"{role}-existing" / trx.name)
    for name in ("Invoke-Recorded.ps1", "Build-Graphs.ps1", "Run-Default.ps1", "Collect-Facts.py", "audit_capsule.py",
                 "Close-Preparation.ps1", "Seal-Facts.py", "scope.json"):
        copy(SCOPE / name, pathlib.Path(name))
    if (SCOPE / "terminal-state.json").exists():
        copy(SCOPE / "terminal-state.json", pathlib.Path("terminal-state.json"))
    for kind, project in (("consumer", "F138.Characterization"), ("auditor", "MetadataAudit")):
        copy(SCOPE / kind / "Program.cs", pathlib.Path(kind) / "Program.cs")
        copy(SCOPE / kind / f"{project}.csproj", pathlib.Path(kind) / f"{project}.csproj")
        for suffix in (".dll", ".pdb", ".deps.json", ".runtimeconfig.json"):
            copy(SCOPE / kind / "bin" / "Debug" / "net12.0" / f"{project}{suffix}", pathlib.Path(kind) / "built" / f"{project}{suffix}")
    common_metadata = load(SCOPE / "logs" / "040-common-consumer-metadata.stdout.log")
    common_documents = []
    for document in common_metadata["documents"]:
        path = pathlib.Path(document["rawPath"])
        snapshot = "consumer/Program.cs" if path.name == "Program.cs" else copy(
            path, pathlib.Path("consumer") / "generated-source" / path.name)
        assert document["rawChecksumMatches"]
        common_documents.append({"originalPath": document["name"], "snapshot": snapshot})
    source_catalog = []
    snapshots = {}
    project_graphs = {}
    omitted = []
    owner_proofs = []
    owner_associations = []
    test_rows = {}
    for role in ("baseline", "default"):
        checkout = SCOPE / role
        tree = {}
        text = (SCOPE / "logs" / f"038-{role}-source-tree-identities.stdout.log").read_text()
        text += (SCOPE / "logs" / f"049-{role}-root-dependency-source-identities.stdout.log").read_text()
        for line in (SCOPE / "logs" / f"049-{role}-eng-dependency-source-identities.stdout.log").read_text().splitlines():
            metadata, name = line.split("\t", 1)
            text += f"{metadata}\teng/{name}\n"
        for line in text.splitlines():
            prefix, name = line.split("\t", 1)
            tree[name] = prefix.split()[2]
        for relative in SOURCE_FILES:
            path = checkout / relative
            raw = path.read_bytes()
            raw_sha = hashlib.sha256(raw).hexdigest().upper()
            git_lf = raw.replace(b"\r\n", b"\n")
            git_lf_blob = hashlib.sha1(b"blob " + str(len(git_lf)).encode("ascii") + b"\0" + git_lf).hexdigest()
            git_name = relative.replace("\\", "/")
            if raw_sha not in snapshots:
                snapshots[raw_sha] = copy(path, pathlib.Path("source-snapshots") / f"{path.stem}-{raw_sha[:12]}{path.suffix}")
            source_catalog.append({
                "role": role, "relativePath": git_name, "originalPath": str(path), "snapshot": snapshots[raw_sha],
                "rawSha256": raw_sha, "rawBytes": len(raw), "gitLfSha256": hashlib.sha256(git_lf).hexdigest().upper(),
                "gitBlobSha1": tree.get(git_name), "normalizedWorkingBytesGitBlobSha1": git_lf_blob,
                "normalizedWorkingBytesMatchGitBlob": git_lf_blob == tree.get(git_name),
                "rawCrlfCount": raw.count(b"\r\n"),
            })
        for name in ("Directory.Build.props", "Directory.Build.targets"):
            copy(checkout / "artifacts" / "bin" / "GenerateFiles" / name, pathlib.Path("generated") / role / name)
        obj = checkout / "artifacts" / "obj" / "Microsoft.AspNetCore.OpenApi.Tests"
        spec_path = obj / "Microsoft.AspNetCore.OpenApi.Tests.csproj.nuget.dgspec.json"
        spec = load(spec_path)
        project_graphs[role] = {
            "dgspecPath": str(spec_path), "dgspecSha256": digest(spec_path),
            "assetsPath": str(obj / "project.assets.json"), "assetsSha256": digest(obj / "project.assets.json"),
            "projects": [],
        }
        for project_path, project in spec["projects"].items():
            references = []
            for framework in project.get("restore", {}).get("frameworks", {}).values():
                references.extend(framework.get("projectReferences", {}).keys())
            project_graphs[role]["projects"].append({
                "path": project_path,
                "targetFrameworks": list(project.get("frameworks", {})),
                "projectReferences": sorted(set(references)),
                "packageDependencies": {name: framework.get("dependencies", {}) for name, framework in project.get("frameworks", {}).items()},
            })
        foreign_projects = [project["path"] for project in project_graphs[role]["projects"]
                            if not project["path"].casefold().startswith(str(checkout).casefold() + "\\")]
        project_graphs[role]["foreignProjectPaths"] = foreign_projects
        assert not foreign_projects, foreign_projects
        bin_path = checkout / "artifacts" / "bin" / "Microsoft.AspNetCore.OpenApi.Tests" / "Debug" / "net12.0"
        copy(bin_path / "Microsoft.AspNetCore.OpenApi.Tests.runtimeconfig.json",
             pathlib.Path("generated") / role / "existing-tests.runtimeconfig.json")
        loaded = load(SCOPE / "results" / f"{role}-producer" / "loaded-assemblies.json")
        for owner in OWNERS:
            prefix = "032" if role == "baseline" else "037"
            metadata = load(SCOPE / "logs" / f"{prefix}-{role}-metadata-{owner}.stdout.log")
            assert metadata["codeViewMatchesPdb"] and metadata["rawDocumentMismatchCount"] == 0
            owner_associations.append({
                "role": role, "owner": owner,
                "imagePath": metadata["imagePath"], "imageSha256": metadata["imageSha256"], "mvid": metadata["mvid"],
                "codeViews": metadata["codeViews"], "portablePdbIdentity": metadata["pdbIdentity"],
                "documentCount": metadata["documentCount"], "associatedRawDocumentCount": metadata["associatedRawDocumentCount"],
                "rawDocumentMismatchCount": metadata["rawDocumentMismatchCount"],
                "rawMetadataLog": f"logs/{prefix}-{role}-metadata-{owner}.stdout.log",
                "observedLoadedInCommonConsumer": any(assembly["name"] == owner for assembly in loaded),
            })
            if owner == "Microsoft.AspNetCore.OpenApi":
                actual = next(assembly for assembly in loaded if assembly["name"] == owner)
                assert actual["sha256"] == metadata["imageSha256"] and actual["mvid"] == metadata["mvid"]
                image = copy(bin_path / f"{owner}.dll", pathlib.Path("proof") / role / f"{owner}.dll")
                pdb = copy(bin_path / f"{owner}.pdb", pathlib.Path("proof") / role / f"{owner}.pdb")
                owner_proofs.append({"role": role, "image": image, "pdb": pdb, "sha256": actual["sha256"], "mvid": actual["mvid"], "actualLoadedPath": actual["path"]})
        for path in sorted(bin_path.rglob("*")):
            if path.is_file():
                omitted.append({"role": role, "scope": "complete existing-test output directory", "path": str(path),
                                "relativePath": str(path.relative_to(bin_path)), "sha256": digest(path), "bytes": path.stat().st_size})
        trx = ET.parse(SCOPE / "results" / f"{role}-existing" / f"{role}.trx")
        ns = "{http://microsoft.com/schemas/VisualStudio/TeamTest/2010}"
        rows = list(trx.getroot().iter(ns + "UnitTestResult"))
        test_rows[role] = [{"name": row.attrib["testName"], "outcome": row.attrib["outcome"],
                           "message": row.findtext(f"{ns}Output/{ns}ErrorInfo/{ns}Message")} for row in rows]
        assert collections.Counter(row["outcome"] for row in test_rows[role]) == {"Passed": 105, "NotExecuted": 2}
    runtime_images = []
    for path in sorted(RUNTIME68.rglob("*")):
        if path.is_file() and path.suffix.casefold() in (".dll", ".exe"):
            record = file_record(path)
            record["key"] = "runtime/" + str(path.relative_to(RUNTIME68)).replace("\\", "/").casefold()
            runtime_images.append(record)
    common_images = []
    common_path = SCOPE / "consumer" / "bin" / "Debug" / "net12.0" / "F138.Characterization.dll"
    common_record = file_record(common_path)
    common_record["key"] = "common/f138.characterization.dll"
    common_images.append(common_record)
    image_sets = {}
    for role in ("baseline", "default"):
        graph_images = load(SCOPE / "results" / f"{role}-producer" / "graph-images.json")
        image_sets[role] = [
            {"key": "graph/" + entry["relativePath"].replace("\\", "/").casefold(), **entry}
            for entry in graph_images
        ] + runtime_images + common_images
        assert len({entry["key"] for entry in image_sets[role]}) == len(image_sets[role])
        image_sets[role].sort(key=lambda entry: entry["key"])
        write(f"results/{role}-execution-images.json", image_sets[role])
    by_role = {role: {entry["key"]: entry for entry in entries} for role, entries in image_sets.items()}
    comparison = []
    for key in sorted(set(by_role["baseline"]) | set(by_role["default"])):
        left = by_role["baseline"].get(key)
        right = by_role["default"].get(key)
        comparison.append({
            "key": key,
            "baselineSha256": left["sha256"] if left else None,
            "defaultSha256": right["sha256"] if right else None,
            "status": "only-default" if not left else "only-baseline" if not right else "same" if left["sha256"] == right["sha256"] else "different",
            "targetOwnerImage": key == "graph/microsoft.aspnetcore.openapi.dll",
        })
    counts = dict(collections.Counter(entry["status"] for entry in comparison))
    non_owner_differences = [entry["key"] for entry in comparison if entry["status"] != "same" and not entry["targetOwnerImage"]]
    write("image-comparison.json", {
        "entries": comparison, "counts": counts, "nonOwnerDifferences": non_owner_differences,
        "prefixExclusions": [], "completeWithinInventoriedImageSets": True,
        "causalPerformancePair": False,
        "reason": "Two source-role characterizations, not a candidate/control pair. Source revisions and non-owner images differ; existing-test runtimes also differ. No timing was performed."
    })
    write("source-catalog.json", source_catalog)
    write("project-graphs.json", project_graphs)
    write("omitted-output-files.json", omitted)
    write("owner-associations.json", owner_associations)
    write("test-rows.json", test_rows)
    runtime_facts = []
    for version, root in (("12.0.0-alpha.1.26557.102", SDKROOT), ("12.0.0-alpha.1.26562.105", SDKROOT), ("12.0.0-alpha.1.26568.110", RUNTIME68)):
        corelib = root / "shared" / "Microsoft.NETCore.App" / version / "System.Private.CoreLib.dll"
        clr = corelib.parent / "coreclr.dll"
        runtime_facts.append({"version": version, "root": str(root), "coreLib": file_record(corelib), "coreClr": file_record(clr)})
    write("runtime-prerequisites.json", {
        "runtimes": runtime_facts,
        "commonConsumerRuntimeImages": runtime_images,
        "sdk": {"version": "12.0.100-alpha.1.26557.102", "root": str(SDKROOT),
                "vstestDriver": file_record(SDKROOT / "sdk" / "12.0.100-alpha.1.26557.102" / "vstest.console.dll")},
        "notCopied": "No SDK, runtime, package cache, full checkout, or complete obj/build-output tree is included."
    })
    common_loaded = [next(entry for entry in load(SCOPE / "results" / f"{role}-producer" / "loaded-assemblies.json")
                          if entry["name"] == "F138.Characterization") for role in ("baseline", "default")]
    assert common_loaded[0]["sha256"] == common_loaded[1]["sha256"] == common_record["sha256"]
    facts = {
        "finding": "F138", "officialState": "PENDING", "preparationOnly": True,
        "baseline": "37e809ead5824bc753a1c3d56f11615bdb1296c5",
        "freshDefault": "00560e2dd1954a2acf2bc54b35422b0f32484bf1",
        "freshObservationReceipt": "logs/001-fresh-upstream.json",
        "freshSourceObjectReceipt": "logs/007-obtain-default-object.json",
        "coordinatorReadOnlySource": "24875ef5dabb55567870b39f6eb0002170435e2f",
        "ownerProofs": owner_proofs,
        "existingTests": {role: dict(collections.Counter(row["outcome"] for row in rows)) for role, rows in test_rows.items()},
        "commonConsumer": {
            "successfulCompilationReceipt": "logs/030-consumer-build-once.json",
            "languageVersion": "13.0", "runtime": "12.0.0-alpha.1.26568.110",
            "loadedRoleIdentities": common_loaded,
            "metadataReceipt": "logs/040-common-consumer-metadata.stdout.log",
            "rawSourceDocuments": common_documents,
            "files": [file_record(SCOPE / "consumer" / "bin" / "Debug" / "net12.0" / f"F138.Characterization{suffix}")
                      for suffix in (".dll", ".pdb", ".deps.json", ".runtimeconfig.json")],
            "provenanceBoundary": "Both runs use the same canonical files; DLL SHA/MVID were observed inside both processes. PDB/deps/runtimeconfig hashes were collected after both runs, not separately before the first run."
        },
        "characterizationAssertionsPerRole": {role: {
            "total": len(load(SCOPE / "results" / f"{role}-producer" / "assertions.json")),
            "realProducerOutputCacheAndRejectionRows": 28,
            "isolatedPublicMetadataGuardControlRows": 1
        } for role in ("baseline", "default")},
        "imageComparisonCounts": counts, "nonOwnerImageDifferenceCount": len(non_owner_differences),
        "holdReleaseReceipts": [], "explicitHoldReceived": False,
        "sourceRewriteApplied": False, "candidateAdopted": False, "performanceMeasurements": False,
        "publicWrites": False, "ledgerWrites": False, "machineReconfiguration": False,
        "limits": [
            "No gain/no-gain/rejection verdict, threshold, benchmark, confidence promotion, or causal performance pair.",
            "No full compiler attestation or full repository materialization audit. Selected raw source/PDB associations only; omitted full outputs are hashed.",
            "Multiple Body parameters are rejected by the exercised real RequestDelegateFactory producer. The separate public metadata-list guard control is not a shipping multiple-body producer.",
            "Two existing skipped MVC tests (#55349) did not reach assertions and remain unverified.",
            "No arbitrary side-effecting getters, predicates, custom collections, concurrent mutation, or private-state injection was introduced.",
            "Observed lists in this fixture have zero to three parameters; no application-wide parameter distribution or production frequency was measured.",
            "Static repeated terminal enumeration is not a measured benefit or proof of zero cost.",
        ],
    }
    write("facts.json", facts)
    receipts = []
    for path in sorted((SCOPE / "logs").glob("*.json")):
        if path.name.endswith(".started.json"):
            continue
        receipt = load(path)
        if "executable" in receipt:
            assert receipt["terminal"], path
            receipts.append(receipt)
    write("native-command-receipts.json", receipts)
    lines = ["# Exact commands and results", "", "Arguments below are the actual native argument arrays (JSON), not shell reconstructions. Each linked receipt contains cwd, selected environment, PID, exit, and terminal state; unchanged stdout/stderr are beside it. Empty streams are omitted from this capsule; their bytes are zero.", "",
             "| ID | Exit | PID | Executable | Actual arguments |", "|---|---:|---:|---|---|"]
    for receipt in receipts:
        arguments = json.dumps(receipt["arguments"], ensure_ascii=False).replace("|", "&#124;")
        lines.append(f"| [{receipt['id']}](logs/{receipt['id']}.json) | {receipt['exitCode']} | {receipt['pid']} | `{receipt['executable']}` | `{arguments}` |")
    (TARGET / "COMMANDS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"stagedFiles": sum(path.is_file() for path in TARGET.rglob("*")),
                      "sourceSnapshots": len(snapshots), "imageEntries": len(comparison), "imageCounts": counts,
                      "nonOwnerDifferences": len(non_owner_differences), "nativeCommands": len(receipts),
                      "roleGraphProjects": {role: len(graph["projects"]) for role, graph in project_graphs.items()}}, indent=2))


if __name__ == "__main__":
    main()
