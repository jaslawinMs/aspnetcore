const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { OUT, receipts, put, json, run } = require("./source-io-v1.cjs");
const gh = ["gh", "api", "--method", "GET"];
const sourceIndex = [];

function content(label, commit, file, output) {
    const response = run(label, [...gh, `repos/dotnet/dotnet/contents/${file}`, "-f", `ref=${commit}`]);
    if (response.status !== 0) {
        return null;
    }
    const metadata = JSON.parse(response.stdout.toString("utf8"));
    if (metadata.type !== "file" || metadata.encoding !== "base64") {
        throw new Error("Expected retained complete base64 file: " + label);
    }
    const bytes = Buffer.from(metadata.content, "base64");
    const blob = crypto.createHash("sha1")
        .update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest("hex");
    if (blob !== metadata.sha || bytes.length !== metadata.size) {
        throw new Error("Git blob/length mismatch: " + label);
    }
    sourceIndex.push({
        label, repository: "dotnet/dotnet", commit, sourcePath: file,
        gitBlobSha1: metadata.sha, verifiedGitBlobAndByteLength: true,
        artifact: put(path.join("runtime-source", output), bytes),
        boundary: "Pinned source inspection; no runtime execution or loaded-image attestation."
    });
    return metadata;
}

try {
    const versions = [
        ["26557", "runtime-26557-version.raw"],
        ["26562", "runtime-26562-version.raw"],
        ["26565", "runtime-26565-version.raw"]
    ].map(([label, file]) => ({
        label,
        commit: fs.readFileSync(path.join(OUT, "installed-source-identity", file), "utf8").split(/\r?\n/)[0].trim()
    }));
    const sdkCommit = versions[0].commit;
    run("sdk-vmr-commit", [...gh, `repos/dotnet/dotnet/git/commits/${sdkCommit}`]);
    run("sdk-vmr-msbuild-backend-directory", [...gh,
        "repos/dotnet/dotnet/contents/src/msbuild/src/Build/BackEnd", "-f", `ref=${sdkCommit}`]);
    for (const version of versions) {
        content(`runtime-${version.label}-string-manipulation`, version.commit,
            "src/runtime/src/libraries/System.Private.CoreLib/src/System/String.Manipulation.cs",
            `${version.label}-String.Manipulation.cs`);
    }
    for (const [label, file] of [
        ["linq-select", "src/runtime/src/libraries/System.Linq/src/System/Linq/Select.cs"],
        ["linq-select-speedopt", "src/runtime/src/libraries/System.Linq/src/System/Linq/Select.SpeedOpt.cs"],
        ["linq-toarray", "src/runtime/src/libraries/System.Linq/src/System/Linq/ToCollection.cs"]
    ]) {
        content(label, sdkCommit, file, path.basename(file));
    }
} finally {
    json("runtime-source-index-v1.json", sourceIndex);
    json("runtime-command-index-v1.json", receipts);
}
