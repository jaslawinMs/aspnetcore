# Default analyzer prerequisite and limited retry

ObservedDefault's first full source build failed AD0001 in the existing `CSharpMakeFieldReadonlyDiagnosticAnalyzer`: it could not load `System.Runtime.Serialization.Primitives, Version=12.0.0.0`. Exact failures, command arguments, and terminal owned PID observations are retained in `logs\ObservedDefault-build-rt57-1.*`; the driver used is preserved in `failed-attempts`.

The bounded next attempt explicitly disables diagnostic analyzers for **ObservedDefault only** using `RunAnalyzers=false` and `RunAnalyzersDuringBuild=false`, without changing any pinned source/configuration or installing dependencies. Source generators and compilation remain enabled. This retry is real managed producer characterization, not full CI/build validation.

Original compiled with its original analyzer settings and its first three producer rows passed. The two roles therefore have an additional explicit build-profile difference. Independently built characterization images are **not a valid performance pair**, even if their source inputs match. No performance inference, candidate execution, or acceptance-policy change follows from this retry.
