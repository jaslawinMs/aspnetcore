"""Metadata-only portable F136 auditor. Never starts .NET, tests or benchmarks."""
import argparse
import hashlib
import json
import struct
import sys
import uuid
import xml.etree.ElementTree as ET
from pathlib import Path, PureWindowsPath


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def integer(data, offset, size):
    return int.from_bytes(data[offset:offset + size], "little")


def compressed(data, offset):
    first = data[offset]
    if first < 0x80:
        return first, offset + 1
    if first < 0xC0:
        return ((first & 0x3F) << 8) | data[offset + 1], offset + 2
    return ((first & 0x1F) << 24) | int.from_bytes(data[offset + 1:offset + 4], "big"), offset + 4


def streams(data, root=0):
    assert data[root:root + 4] == b"BSJB", "Not ECMA metadata"
    position = (root + 16 + integer(data, root + 12, 4) + 3) & ~3
    count = integer(data, position + 2, 2)
    position += 4
    result = {}
    for _ in range(count):
        offset, size = struct.unpack_from("<II", data, position)
        end = data.index(0, position + 8)
        name = data[position + 8:end].decode("ascii")
        result[name] = data[root + offset:root + offset + size]
        position = (end + 4) & ~3
    return result


def table_info(heaps):
    table = heaps.get("#~", heaps.get("#-"))
    assert table is not None, "Missing metadata tables"
    valid = integer(table, 8, 8)
    position = 24
    rows = {}
    for index in range(64):
        if valid & (1 << index):
            rows[index] = integer(table, position, 4)
            position += 4
    flags = table[6]
    return table, position, rows, (4 if flags & 1 else 2), (4 if flags & 2 else 2), (4 if flags & 4 else 2)


def guid(heap, index):
    return str(uuid.UUID(bytes_le=heap[(index - 1) * 16:index * 16]))


def pe_metadata(path):
    data = Path(path).read_bytes()
    pe = integer(data, 0x3C, 4)
    assert data[pe:pe + 4] == b"PE\0\0", "Not a PE"
    coff = pe + 4
    optional = coff + 20
    directory = optional + (112 if integer(data, optional, 2) == 0x20B else 96)
    sections = optional + integer(data, coff + 16, 2)
    layout = []
    for index in range(integer(data, coff + 2, 2)):
        base = sections + index * 40
        virtual_size, address, raw_size, pointer = struct.unpack_from("<IIII", data, base + 8)
        layout.append((address, max(virtual_size, raw_size), pointer))

    def rva(address):
        for start, size, pointer in layout:
            if start <= address < start + size:
                return pointer + address - start
        raise ValueError(f"Unmapped RVA {address}")

    cli = rva(integer(data, directory + 14 * 8, 4))
    heaps = streams(data, rva(integer(data, cli + 8, 4)))
    table, position, rows, string_size, guid_size, _ = table_info(heaps)
    assert rows.get(0) == 1, "Missing Module row"
    mvid_index = integer(table, position + 2 + string_size, guid_size)
    debug_rva, debug_size = struct.unpack_from("<II", data, directory + 6 * 8)
    codeviews = []
    if debug_rva:
        start = rva(debug_rva)
        for offset in range(start, start + debug_size, 28):
            if integer(data, offset + 12, 4) != 2:
                continue
            pointer = integer(data, offset + 24, 4)
            assert data[pointer:pointer + 4] == b"RSDS", "Unsupported CodeView"
            end = data.index(0, pointer + 24)
            codeviews.append({
                "guid": str(uuid.UUID(bytes_le=data[pointer + 4:pointer + 20])),
                "stamp": integer(data, offset + 4, 4),
                "age": integer(data, pointer + 20, 4),
                "path": data[pointer + 24:end].decode("utf-8")
            })
    return {"mvid": guid(heaps["#GUID"], mvid_index), "codeView": codeviews,
            "peTimestamp": integer(data, coff + 4, 4)}


def pdb_metadata(path):
    heaps = streams(Path(path).read_bytes())
    identifier = heaps["#Pdb"][:20]
    table, position, rows, _, guid_size, blob_size = table_info(heaps)
    assert not any(key < 48 and count for key, count in rows.items()), "Unsupported pre-Document PDB table"

    def blob(index):
        size, start = compressed(heaps["#Blob"], index)
        return heaps["#Blob"][start:start + size]

    documents = []
    for _ in range(rows.get(48, 0)):
        name_index = integer(table, position, blob_size)
        algorithm_index = integer(table, position + blob_size, guid_size)
        checksum_index = integer(table, position + blob_size + guid_size, blob_size)
        name_blob = blob(name_index)
        separator = chr(name_blob[0])
        parts = []
        cursor = 1
        while cursor < len(name_blob):
            part, cursor = compressed(name_blob, cursor)
            parts.append(blob(part).decode("utf-8"))
        documents.append({"name": separator.join(parts), "algorithm": guid(heaps["#GUID"], algorithm_index),
                          "documentChecksum": blob(checksum_index).hex()})
        position += 2 * blob_size + 2 * guid_size
    return {"pdbGuid": str(uuid.UUID(bytes_le=identifier[:16])),
            "pdbStamp": integer(identifier, 16, 4), "documents": documents}


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def audit(root, external=False):
    manifest = load(root / "manifest.json")
    for entry in manifest["files"]:
        path = root / entry["path"]
        assert path.is_file(), f"Missing sealed file: {entry['path']}"
        assert path.stat().st_size == entry["bytes"] and sha256(path) == entry["sha256"], f"Sealed hash mismatch: {path}"
    listed = {entry["path"] for entry in manifest["files"]}
    actual = {str(path.relative_to(root)).replace("\\", "/") for path in root.rglob("*") if path.is_file()}
    assert actual == listed | {"manifest.json", "CHECKSUMS.sha256"}, "Unexpected or unlisted payload files"
    checksum_rows = {}
    for line in (root / "CHECKSUMS.sha256").read_text(encoding="utf-8").splitlines():
        digest, name = line.split("  ", 1)
        checksum_rows[name] = digest
    expected_checksums = {entry["path"]: entry["sha256"] for entry in manifest["files"]}
    expected_checksums["manifest.json"] = sha256(root / "manifest.json")
    assert checksum_rows == expected_checksums, "Checksum listing does not exactly cover payload plus manifest"
    summaries = {entry["trx"]: entry for entry in load(root / "test-results.json")}
    for role in ("Original37", "Default"):
        report_path = root / "evidence" / f"{role}-verify.json"
        if not report_path.exists():
            continue
        report = load(report_path)
        assert report["succeeded"] and len(report["cases"]) == 5
        assert all(case["outcome"] == "Passed" for case in report["cases"])
        for record in report["selectedMetadata"]:
            name = Path(record["path"].replace("\\", "/")).name
            proof = root / "proof" / role / name
            assert proof.exists(), f"Missing selected binary proof: {proof}"
            pe = pe_metadata(proof)
            assert pe["mvid"] == record["mvid"] and pe["codeView"] == record["codeView"], f"PE mismatch: {name}"
            pdb_path = proof.with_suffix(".pdb")
            pdb = pdb_metadata(pdb_path)
            assert pdb["pdbGuid"] == record["pdbGuid"] and pdb["pdbStamp"] == record["pdbStamp"]
            assert sha256(proof) == record["sha256"] and sha256(pdb_path) == record["pdbSha256"]
            assert any(item["guid"] == pdb["pdbGuid"] and item["stamp"] == pdb["pdbStamp"] for item in pe["codeView"])
            for document in record["selectedDocuments"]:
                assert document["rawDocumentMatches"], f"Captured raw source mismatch: {document['relative']}"
                matching = [item for item in pdb["documents"] if item["name"] == document["name"]]
                assert len(matching) == 1 and matching[0]["documentChecksum"] == document["documentChecksum"]
                source = root / "source" / role / Path(document["relative"].replace("\\", "/"))
                assert sha256(source) == document["rawSha256"]
                raw = source.read_bytes()
                algorithm = hashlib.sha1 if document["algorithm"] == "ff1816ec-aa5e-4d10-87f7-6f4963833460" else hashlib.sha256
                assert algorithm(raw).hexdigest() == document["documentChecksum"]
                assert hashlib.sha256(raw.replace(b"\r\n", b"\n")).hexdigest() == document["lfNormalizedSha256"]
        image = load(root / "inventories" / f"image-{role}.json")
        image_hashes = {entry["path"]: entry["sha256"] for entry in image["files"]}
        for assembly in report["assemblies"]:
            name = PureWindowsPath(assembly["path"]).name
            if assembly["name"].startswith("Microsoft.AspNetCore."):
                assert PureWindowsPath(assembly["path"]).parent == PureWindowsPath(image["root"]), "Loaded ASP.NET owner outside role image"
                assert image_hashes[name] == assembly["sha256"]
        expected_runtime = "12.0.0-alpha.1.26562.105" if role == "Original37" else "12.0.0-alpha.1.26568.110"
        assert expected_runtime in report["runtimeDirectory"]
    for path in sorted((root / "results").glob("*.trx")):
        tree = ET.parse(path)
        rows = [node for node in tree.iter() if node.tag.endswith("UnitTestResult")]
        assert len(rows) == 5, f"Unexpected native row count: {path}"
        assert all(row.attrib["outcome"] == "Passed" for row in rows), f"Nonpassing native result: {path}"
        assert sha256(path) == summaries[path.name]["sha256"]
        assert sorted((row.attrib["testName"], row.attrib["outcome"]) for row in rows) == sorted(
            (row["testName"], row["outcome"]) for row in summaries[path.name]["rows"])
    common = load(root / "common-source-association.json")
    common_pdb = pdb_metadata(root / common["pdb"])
    assert common["document"] in common_pdb["documents"]
    assert sha256(root / common["source"]) == common["rawSha256"] == common["document"]["documentChecksum"]
    for record in load(root / "source-identities.json"):
        if record.get("absent"):
            continue
        path = root / "source" / record["role"] / Path(record["relative"].replace("\\", "/"))
        raw = path.read_bytes()
        lf = raw.replace(b"\r\n", b"\n")
        assert hashlib.sha256(raw).hexdigest() == record["rawSha256"]
        assert hashlib.sha256(lf).hexdigest() == record["lfNormalizedSha256"]
        assert hashlib.sha1(f"blob {len(raw)}\0".encode() + raw).hexdigest() == record["rawGitObjectSha1"]
        assert hashlib.sha1(f"blob {len(lf)}\0".encode() + lf).hexdigest() == record["lfNormalizedGitObjectSha1"]
    comparison_path = root / "image-comparison.json"
    if comparison_path.exists():
        comparison = load(comparison_path)
        assert comparison["exemptions"] == [] and comparison["futureCausalPair"] is False
        images = {role: {entry["path"]: entry["sha256"] for entry in load(root / "inventories" / f"image-{role}.json")["files"]}
                  for role in ("Original37", "Default")}
        expected_files = [{"path": name, "Original37": images["Original37"].get(name), "Default": images["Default"].get(name)}
                          for name in sorted(images["Original37"].keys() | images["Default"].keys())]
        assert expected_files == comparison["files"] and comparison["everyImageFileCompared"]
        for name in ("F136Verify.dll", "F136Verify.pdb", "F136Verify.deps.json", "F136Verify.runtimeconfig.json"):
            row = next(item for item in comparison["files"] if item["path"] == name)
            assert row["Original37"] == row["Default"] and row["Original37"] is not None, f"Common binary drift: {name}"
    commands = load(root / "commands.json")
    assert commands and all(item["terminal"] and item["exitCode"] is not None for item in commands)
    for role in ("Original37", "Default"):
        for name in ("generate-restored", "owner-restore", "owner-build", "native-tests", "verify"):
            assert next(item for item in commands if item["role"] == role and item["name"] == name)["exitCode"] == 0
    assert all(item["terminal"] and item["exitCode"] == 0 for item in load(root / "native-testhost-terminal.json"))
    inventories = {}
    for role in ("Original37", "Default"):
        for kind in ("graph", "image"):
            listing = load(root / "inventories" / f"{kind}-{role}.json")
            inventories[(kind, role)] = (PureWindowsPath(listing["root"]),
                                         {entry["path"]: entry["sha256"] for entry in listing["files"]})
    for owner in load(root / "source-built-owners.json"):
        graph_root, graph_files = inventories[("graph", owner["role"])]
        image_root, image_files = inventories[("image", owner["role"])]
        graph_name = str(PureWindowsPath(owner["projectOutput"]).relative_to(graph_root)).replace("\\", "/")
        image_name = str(PureWindowsPath(owner["imageFile"]).relative_to(image_root)).replace("\\", "/")
        assert graph_files[graph_name] == owner["sha256"] == owner["imageSha256"] == image_files[image_name]
        assert owner["sameAsOwnGraph"]
    if external:
        for inventory in sorted((root / "inventories").glob("*.json")):
            listing = load(inventory)
            for entry in listing["files"]:
                path = Path(listing["root"]) / Path(entry["path"].replace("\\", "/"))
                assert path.is_file() and sha256(path) == entry["sha256"], f"External omitted hash mismatch: {path}"
    return {"status": "passed", "sealedFiles": len(manifest["files"]),
            "externalPrerequisitesRehashed": external, "execution": "metadata only; no .NET or benchmark started"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--external", action="store_true", help="Also rehash pinned omitted graphs/images/runtime trees in place.")
    options = parser.parse_args()
    try:
        print(json.dumps(audit(Path(__file__).resolve().parent, options.external), indent=2))
    except Exception as error:
        print(f"AUDIT FAILED: {error}", file=sys.stderr)
        raise
