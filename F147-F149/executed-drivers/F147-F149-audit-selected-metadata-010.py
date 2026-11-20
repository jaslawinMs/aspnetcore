"""Read-only independent selected PE/PDB/document audit; never executes target code."""
import hashlib
import importlib.util
import json
import sys
from pathlib import Path, PureWindowsPath


def local(root, logical):
    relative = PureWindowsPath(logical)
    assert not relative.is_absolute() and ".." not in relative.parts
    return root.joinpath(*relative.parts)


def normalized(value):
    return value.replace("\\", "/").casefold()


def main(root, helper):
    specification = importlib.util.spec_from_file_location("autoperf_pe_pdb_reader", helper)
    assert specification is not None and specification.loader is not None
    reader = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(reader)
    receipts = json.loads(local(root, "evidence\\PDB-PE-SOURCE-RECEIPTS.json").read_text(encoding="utf-8-sig"))
    pairs = []
    documents = []
    for receipt in receipts:
        image_path = local(root, receipt["selectedDll"])
        pdb_path = local(root, receipt["selectedPdb"])
        mvid, codeviews = reader.pe_metadata(image_path)
        pdb_id, parsed = reader.pdb_metadata(pdb_path)
        metadata = receipt["metadata"]
        assert mvid == metadata["mvid"], receipt["id"]
        assert reader.digest(image_path) == metadata["peSha256"]
        assert reader.digest(pdb_path) == metadata["pdbSha256"]
        assert pdb_id == (metadata["pdbIdGuid"], metadata["pdbIdStamp"])
        assert any(record["guid"] == pdb_id[0] and record["stamp"] == pdb_id[1]
                   and record["age"] == 1 for record in codeviews)
        parsed_documents = {normalized(document["name"]): document for document in parsed}
        for selected in receipt["selectedRawSourceChecks"]:
            expected = selected["pdbDocument"]
            actual = parsed_documents[normalized(expected["path"])]
            assert actual["algorithm"] == expected["algorithm"]
            assert actual["checksum"] == expected["checksum"]
            raw_path = local(root, selected["snapshot"])
            raw = raw_path.read_bytes()
            algorithm = {
                "8829d00f-11b8-4213-878b-770e8597ac16": "sha256",
                "ff1816ec-aa5e-4d10-87f7-6f4963833460": "sha1",
            }[actual["algorithm"]]
            assert hashlib.new(algorithm, raw).hexdigest().upper() == actual["checksum"]
            assert hashlib.sha256(raw).hexdigest().upper() == selected["sha256"]
            documents.append({"id": receipt["id"], "rawSnapshot": selected["snapshot"],
                              "actualParsedPdbDocument": actual, "actualRawChecksumMatched": True})
        assert receipt["fullCompilerInputAttestation"] is False
        pairs.append({"id": receipt["id"], "actualParsedMvid": mvid,
                      "actualParsedPdbGuid": pdb_id[0], "actualParsedPdbStamp": pdb_id[1],
                      "actualCodeViewMatched": True, "actualSelectedSourceDocuments": len(receipt["selectedRawSourceChecks"])})
    assert len(pairs) == 5 and len(documents) == 10
    print(json.dumps({"passed": True, "actualSelectedPairsFreshlyParsed": pairs,
                      "actualRawDocumentsFreshlyParsedAndMatched": documents,
                      "actualReaderHelper": str(helper), "actualReaderHelperSha256": reader.digest(helper),
                      "actualNoNativeTargetExecution": True, "actualNoBenchmark": True,
                      "fullCompilerInputAttestation": False}, indent=2))


if __name__ == "__main__":
    assert len(sys.argv) == 3, "Expected capsule directory and the preserved generic PE/PDB reader module."
    main(Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve())
