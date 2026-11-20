"""Finish only the small selected capsule; no product execution or graph modification."""
import json
import importlib.util
import sys
from pathlib import Path

sys.dont_write_bytecode = True
WORK = Path(__file__).resolve().parent
sys.path.insert(0, str(WORK))
import audit

specification = importlib.util.spec_from_file_location("prepare_capsule", WORK / "prepare-capsule.py")
prepare = importlib.util.module_from_spec(specification)
specification.loader.exec_module(prepare)
SCOPE = WORK.parent
CAPSULE = SCOPE / "capsule"


def main():
    if (CAPSULE / "manifest.json").exists():
        raise RuntimeError("Manifest already exists; preserve the sealed capsule.")
    receipt = audit.load(SCOPE / "capsule-preparation.process.json")
    assert receipt["terminal"] and receipt["exitCode"] == 0
    expected = [
        "image-Original37.json", "image-Default.json", "graph-Original37.json", "graph-Default.json",
        "private-packages-Original37.json", "private-packages-Default.json",
        "omitted-common-bin.json", "omitted-common-obj.json", "private-python-tools.json",
        "external-runtime-Original37.json", "external-runtime-Default.json", "external-sdk.json",
    ]
    assert all((CAPSULE / "inventories" / name).is_file() for name in expected)
    for name in ("README.md", "audit.py", "finalize-capsule.py", "auxiliary-attempts.json"):
        prepare.copy(WORK / name, CAPSULE / name)
    for suffix in ("started.json", "process.json", "stdout.log", "stderr.log"):
        prepare.copy(SCOPE / f"capsule-preparation.{suffix}", CAPSULE / "logs" / f"capsule-preparation.{suffix}")
    absent_ancillary = []
    for name in ("cli", "http", "scratch"):
        path = SCOPE / name
        if path.exists():
            prepare.inventory(path, CAPSULE / "inventories" / f"ancillary-{name}.json")
        else:
            absent_ancillary.append(str(path))
    downloads = []
    for role in ("Original37", "Default"):
        for project in ("GenerateFiles", "Microsoft.AspNetCore.Components.Endpoints.Tests"):
            path = SCOPE / "graphs" / role / "artifacts" / "obj" / project / "project.assets.json"
            assets = audit.load(path)
            for framework, configuration in assets["project"]["frameworks"].items():
                for dependency in configuration.get("downloadDependencies", []):
                    downloads.append({"role": role, "project": project, "framework": framework,
                                      "dependency": dependency, "assetsPath": str(path),
                                      "packageFolders": list(assets.get("packageFolders", {}))})
    prepare.write(CAPSULE / "framework-download-prerequisites.json", downloads)
    listings = []
    for path in sorted((CAPSULE / "inventories").glob("*.json")):
        content = audit.load(path)
        listings.append({"inventory": str(path.relative_to(CAPSULE)).replace("\\", "/"),
                         "root": content["root"], "ordinaryFiles": len(content["files"]),
                         "excludedOrReparsePoints": content["excludedOrReparsePoints"]})
    prepare.write(CAPSULE / "omissions.json", {
        "inventoriedTrees": listings,
        "absentAncillaryRoots": absent_ancillary,
        "notRecursivelyCopiedOrRehashed": [
            "Git alternate object store C:\\src\\aspnetcore\\.git\\objects: source revisions and selected blobs are pinned, the coordinator's entire changing object database is not sealed.",
            "Shared global NuGet cache: own restore assets and archive sha512 identities, framework download prerequisites and SDK versions are pinned instead of inventorying unrelated packages.",
            "Full external .dotnet installation outside the exact SDK/core-runtime trees: selected actual loaded host/coreclr paths and hashes are in evidence JSON.",
            "Metadata finalization/audit receipts are adjacent terminal evidence generated after this payload is sealed, not self-referential manifest entries."
        ],
        "payloadSelection": "selected sources/projects/generated imports/assets, immutable failures/logs/TRX, metadata traces and only selected DLL/PDB proof; no complete graph/obj/packages/runtime tree"
    })
    files = []
    for path in sorted(CAPSULE.rglob("*")):
        if path.is_file():
            files.append({"path": str(path.relative_to(CAPSULE)).replace("\\", "/"),
                          "bytes": path.stat().st_size, "sha256": audit.sha256(path)})
    assert len(files) + 2 <= 250, f"Payload too large: {len(files) + 2} files"
    prepare.write(CAPSULE / "manifest.json", {
        "finding": "F136", "officialStatus": "pending", "purpose": "untimed preparation only",
        "originalRevision": "37e809ead5824bc753a1c3d56f11615bdb1296c5",
        "freshDefaultRevision": "00560e2dd1954a2acf2bc54b35422b0f32484bf1",
        "selectedDocumentAssociationIsFullCompilerAttestation": False,
        "files": files
    })
    checksums = {entry["path"]: entry["sha256"] for entry in files}
    checksums["manifest.json"] = audit.sha256(CAPSULE / "manifest.json")
    (CAPSULE / "CHECKSUMS.sha256").write_text(
        "".join(f"{digest}  {name}\n" for name, digest in sorted(checksums.items())), encoding="utf-8")
    print(json.dumps({"capsule": str(CAPSULE), "filesIncludingManifestAndChecksums": len(files) + 2,
                      "payloadBytesExcludingManifestAndChecksums": sum(entry["bytes"] for entry in files),
                      "manifestSha256": checksums["manifest.json"],
                      "nativeValidation": "both graphs build; 5/5 native rows and 5/5 untimed cases each",
                      "officialFinding": "pending"}, indent=2), flush=True)


if __name__ == "__main__":
    main()
