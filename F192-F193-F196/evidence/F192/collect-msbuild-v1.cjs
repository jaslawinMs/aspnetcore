const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { OUT, receipts, put, json, run } = require("./source-io-v1.cjs");
const commit = fs.readFileSync(path.join(OUT, "installed-source-identity", "sdk-version.raw"), "utf8").split(/\r?\n/)[0].trim();
const gh = ["gh", "api", "--method", "GET"];
const sourceIndex = [];

function content(label, file) {
    const response = run(label, [...gh, `repos/dotnet/dotnet/contents/${file}`, "-f", `ref=${commit}`]);
    if (response.status !== 0) {
        return;
    }
    const metadata = JSON.parse(response.stdout.toString("utf8"));
    if (metadata.type !== "file" || metadata.encoding !== "base64") {
        throw new Error("Complete source bytes not returned: " + file);
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
        artifact: put(path.join("msbuild-source", path.basename(file)), bytes),
        boundary: "Source-established producer implementation; actual task execution/type not observed."
    });
}

try {
    const directory = run("msbuild-task-execution-host-directory", [...gh,
        "repos/dotnet/dotnet/contents/src/msbuild/src/Build/BackEnd/TaskExecutionHost",
        "-f", `ref=${commit}`]);
    if (directory.status === 0) {
        const files = JSON.parse(directory.stdout.toString("utf8"));
        const host = files.find(item => item.name === "TaskExecutionHost.cs" && item.type === "file");
        if (host) {
            content("msbuild-task-execution-host", host.path);
        }
    }
    content("msbuild-expander", "src/msbuild/src/Build/Evaluation/Expander.cs");
} finally {
    json("msbuild-source-index-v1.json", sourceIndex);
    json("msbuild-command-index-v1.json", receipts);
}
