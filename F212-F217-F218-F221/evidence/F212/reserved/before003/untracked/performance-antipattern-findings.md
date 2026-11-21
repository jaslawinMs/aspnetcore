# Performance anti-pattern scan

**Status: blocked during preparation; no source files were scanned.**

## Scope

- Repository: `dotnet/aspnetcore`
- Local revision: `1d03b662a9b9ddacb6421ea152dad07e0ddc5820`
- Date: 2026-11-03
- Requested delivery: local Markdown only, without telemetry publication or a report PR.
- Method: `common-anti-pattern-scan`, using the `Fperf.AntiPattern.Cards` catalog.

## Preparation result

The repository activation script reported that the local .NET SDK was not
installed. The scan preparation script then exited with code 1 and
`az_login_required`: Azure CLI was not logged in.

The preparation script requires Azure authentication for telemetry and central
MCP access even when invoked with `--scanner-output-mode report-only`.
No Azure login, repository restore, telemetry publication, or PR creation was
performed.

### Retry at 16:25 local time

Preparation was retried after the user reported completing `az login`. It
again exited with `az_login_required`. A direct `az account show --query state
--output tsv` check in the assistant's shell also returned:
`Please run 'az login' to setup account.`

The reported login is not visible in this execution environment. No source
analysis ran during the retry.

## Findings

No findings were established. This is not a clean scan result: the card-loading,
file-triage, and source-analysis stages did not run.

## Required next step

The scanner needs a preparation path that supports the requested local-only
delivery, or explicit authorization to satisfy its Azure authentication
prerequisite. A working .NET SDK is also required to restore the card package.
