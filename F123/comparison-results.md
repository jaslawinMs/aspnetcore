# F123: all measured results

The declared primary is one public `IList.IndexOf` miss on an already-copied actual MVC default-five-factory collection. Negative **less-time** means slower. This is a local method boundary, not request throughput.

| Comparison | Order | Original ns/op | Candidate ns/op | Less time | B/op |
|---|---|---:|---:|---:|---|
| 1 | Original -> Candidate | 10.70 | 16.75 | -56.51% | 0 -> 0 |
| 2 | Candidate -> Original | 10.73 | 16.48 | -53.66% | 0 -> 0 |
| 3 | Original -> Candidate | 90.39 | 16.97 | 81.23% | 0 -> 0 |

Median paired primary effect: **-53.66% less time**, or **53.66% more time**. This is the median of paired percentage effects, not a ratio of independent medians. Both sources report **0 B/op in every primary pair**.

## Every profile and unchanged control

Twelve profiles retain misses, first-hit and last-hit short circuits, empty, singleton and eight-factory shapes, both source-backed and already-copied. `UnchangedContains` consumes the same collection and probe; IndexOf is not its own control. The ordinary source-backed path's median observed effect is 21.28% less time. Favorable rows do not replace the declared primary.

| Method | Profile | Median less time | Each comparison less time | Original -> candidate B/op |
|---|---|---:|---|---|
| IndexOf | CopiedDefault5 | -53.66% | -56.51% / -53.66% / 81.23% | 0/0/0 -> 0/0/0 |
| IndexOf | UnmodifiedDefault5 | 21.28% | 21.28% / 21.99% / 13.28% | 32/32/32 -> 32/32/32 |
| IndexOf | CopiedDefault5HitFirst | -183.54% | -183.54% / -169.61% / -186.96% | 0/0/0 -> 0/0/0 |
| IndexOf | UnmodifiedDefault5HitFirst | 7.73% | 1.60% / 12.75% / 7.73% | 32/32/32 -> 32/32/32 |
| IndexOf | CopiedDefault5HitLast | -70.71% | -70.71% / -81.82% / -63.22% | 0/0/0 -> 0/0/0 |
| IndexOf | UnmodifiedDefault5HitLast | 12.92% | 14.06% / 12.92% / 8.41% | 32/32/32 -> 32/32/32 |
| IndexOf | CopiedEmpty | 19.20% | 13.71% / 22.26% / 19.20% | 0/0/0 -> 0/0/0 |
| IndexOf | UnmodifiedEmpty | 26.40% | 21.56% / 31.61% / 26.40% | 0/0/0 -> 0/0/0 |
| IndexOf | CopiedOne | -97.21% | -125.85% / -97.21% / -94.04% | 0/0/0 -> 0/0/0 |
| IndexOf | UnmodifiedOne | 19.72% | 19.72% / 20.75% / 16.56% | 32/32/32 -> 32/32/32 |
| IndexOf | CopiedEight | -35.21% | -35.09% / -35.21% / -42.11% | 0/0/0 -> 0/0/0 |
| IndexOf | UnmodifiedEight | 18.86% | 22.23% / 18.86% / 8.86% | 32/32/32 -> 32/32/32 |
| UnchangedContains | CopiedDefault5 | 0.23% | 5.14% / -6.47% / 0.23% | 0/0/0 -> 0/0/0 |
| UnchangedContains | UnmodifiedDefault5 | 0.30% | -1.07% / 22.32% / 0.30% | 32/32/32 -> 32/32/32 |
| UnchangedContains | CopiedDefault5HitFirst | 0.36% | -31.28% / 24.18% / 0.36% | 0/0/0 -> 0/0/0 |
| UnchangedContains | UnmodifiedDefault5HitFirst | -2.04% | 2.19% / -9.17% / -2.04% | 32/32/32 -> 32/32/32 |
| UnchangedContains | CopiedDefault5HitLast | -0.03% | 5.62% / -1.52% / -0.03% | 0/0/0 -> 0/0/0 |
| UnchangedContains | UnmodifiedDefault5HitLast | 0.78% | 0.78% / 1.07% / 0.07% | 32/32/32 -> 32/32/32 |
| UnchangedContains | CopiedEmpty | -5.41% | -24.21% / 18.21% / -5.41% | 0/0/0 -> 0/0/0 |
| UnchangedContains | UnmodifiedEmpty | -5.61% | -7.31% / 4.57% / -5.61% | 0/0/0 -> 0/0/0 |
| UnchangedContains | CopiedOne | 2.24% | -17.21% / 14.93% / 2.24% | 0/0/0 -> 0/0/0 |
| UnchangedContains | UnmodifiedOne | -2.94% | -3.82% / 0.37% / -2.94% | 32/32/32 -> 32/32/32 |
| UnchangedContains | CopiedEight | -5.68% | 7.15% / -9.45% / -5.68% | 0/0/0 -> 0/0/0 |
| UnchangedContains | UnmodifiedEight | -1.43% | 2.92% / -1.43% / -1.71% | 32/32/32 -> 32/32/32 |

The original source fallback is byte-for-byte unchanged. No specific JIT explanation is assigned to its favorable movement or to unchanged-control movement. This shared box is not isolated; the worst individual-case CV is 162.39%. No disassembly was collected.

## Every case's variability

Each row retains all eight results. SD is sample standard deviation; fitted trend is fitted first-to-last change divided by the mean. No outlier removal, case substitution or retuning occurred.

| Comparison | Source | Method | Profile | Mean ns | SD ns | CV | First-half ns | Last-half ns | Fitted trend |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| 1 | Original | IndexOf | CopiedDefault5 | 10.70 | 0.08 | 0.71% | 10.73 | 10.67 | -0.65% |
| 1 | Original | UnchangedContains | CopiedDefault5 | 11.90 | 0.05 | 0.39% | 11.90 | 11.89 | -0.12% |
| 1 | Original | IndexOf | UnmodifiedDefault5 | 50.90 | 0.45 | 0.89% | 51.10 | 50.69 | -1.37% |
| 1 | Original | UnchangedContains | UnmodifiedDefault5 | 51.46 | 0.98 | 1.90% | 51.10 | 51.82 | 0.28% |
| 1 | Original | IndexOf | CopiedDefault5HitFirst | 2.57 | 0.01 | 0.35% | 2.58 | 2.57 | -0.29% |
| 1 | Original | UnchangedContains | CopiedDefault5HitFirst | 2.18 | 0.01 | 0.56% | 2.18 | 2.18 | 0.68% |
| 1 | Original | IndexOf | UnmodifiedDefault5HitFirst | 21.74 | 0.51 | 2.35% | 21.95 | 21.53 | -3.18% |
| 1 | Original | UnchangedContains | UnmodifiedDefault5HitFirst | 22.85 | 1.24 | 5.44% | 22.98 | 22.73 | -0.61% |
| 1 | Original | IndexOf | CopiedDefault5HitLast | 9.55 | 0.11 | 1.19% | 9.48 | 9.62 | 2.02% |
| 1 | Original | UnchangedContains | CopiedDefault5HitLast | 10.32 | 0.06 | 0.56% | 10.29 | 10.35 | 0.59% |
| 1 | Original | IndexOf | UnmodifiedDefault5HitLast | 48.67 | 1.07 | 2.19% | 49.09 | 48.24 | -2.44% |
| 1 | Original | UnchangedContains | UnmodifiedDefault5HitLast | 46.99 | 0.23 | 0.49% | 47.00 | 46.98 | -0.34% |
| 1 | Original | IndexOf | CopiedEmpty | 6.61 | 0.05 | 0.74% | 6.59 | 6.62 | -0.18% |
| 1 | Original | UnchangedContains | CopiedEmpty | 6.21 | 0.05 | 0.77% | 6.21 | 6.22 | -0.30% |
| 1 | Original | IndexOf | UnmodifiedEmpty | 12.04 | 0.10 | 0.79% | 12.03 | 12.05 | 0.02% |
| 1 | Original | UnchangedContains | UnmodifiedEmpty | 12.48 | 0.08 | 0.62% | 12.48 | 12.48 | -0.54% |
| 1 | Original | IndexOf | CopiedOne | 3.74 | 0.11 | 2.89% | 3.76 | 3.72 | -3.45% |
| 1 | Original | UnchangedContains | CopiedOne | 3.76 | 0.15 | 4.12% | 3.67 | 3.86 | 6.30% |
| 1 | Original | IndexOf | UnmodifiedOne | 27.65 | 0.69 | 2.51% | 27.26 | 28.03 | 5.31% |
| 1 | Original | UnchangedContains | UnmodifiedOne | 26.67 | 1.29 | 4.83% | 27.27 | 26.07 | -10.28% |
| 1 | Original | IndexOf | CopiedEight | 16.83 | 0.16 | 0.96% | 16.89 | 16.76 | -1.60% |
| 1 | Original | UnchangedContains | CopiedEight | 17.88 | 0.19 | 1.04% | 17.87 | 17.89 | -0.12% |
| 1 | Original | IndexOf | UnmodifiedEight | 72.83 | 0.29 | 0.39% | 72.77 | 72.89 | 0.19% |
| 1 | Original | UnchangedContains | UnmodifiedEight | 71.49 | 1.14 | 1.59% | 71.01 | 71.97 | 2.87% |
| 1 | Candidate | IndexOf | CopiedDefault5 | 16.75 | 0.13 | 0.76% | 16.73 | 16.78 | 0.22% |
| 1 | Candidate | UnchangedContains | CopiedDefault5 | 11.28 | 0.08 | 0.67% | 11.28 | 11.29 | 0.79% |
| 1 | Candidate | IndexOf | UnmodifiedDefault5 | 40.06 | 0.26 | 0.66% | 40.26 | 39.87 | -1.06% |
| 1 | Candidate | UnchangedContains | UnmodifiedDefault5 | 52.01 | 0.73 | 1.40% | 52.17 | 51.85 | -1.51% |
| 1 | Candidate | IndexOf | CopiedDefault5HitFirst | 7.30 | 0.08 | 1.03% | 7.34 | 7.26 | -1.30% |
| 1 | Candidate | UnchangedContains | CopiedDefault5HitFirst | 2.86 | 0.01 | 0.52% | 2.85 | 2.87 | 0.42% |
| 1 | Candidate | IndexOf | UnmodifiedDefault5HitFirst | 21.39 | 1.20 | 5.60% | 20.99 | 21.78 | 7.58% |
| 1 | Candidate | UnchangedContains | UnmodifiedDefault5HitFirst | 22.35 | 1.20 | 5.35% | 23.26 | 21.44 | -13.79% |
| 1 | Candidate | IndexOf | CopiedDefault5HitLast | 16.31 | 0.07 | 0.42% | 16.26 | 16.36 | 1.06% |
| 1 | Candidate | UnchangedContains | CopiedDefault5HitLast | 9.74 | 0.11 | 1.09% | 9.79 | 9.69 | -1.87% |
| 1 | Candidate | IndexOf | UnmodifiedDefault5HitLast | 41.82 | 0.95 | 2.27% | 42.17 | 41.47 | -4.49% |
| 1 | Candidate | UnchangedContains | UnmodifiedDefault5HitLast | 46.62 | 0.68 | 1.45% | 46.69 | 46.55 | 0.45% |
| 1 | Candidate | IndexOf | CopiedEmpty | 5.70 | 0.04 | 0.63% | 5.71 | 5.69 | -0.13% |
| 1 | Candidate | UnchangedContains | CopiedEmpty | 7.72 | 0.11 | 1.40% | 7.71 | 7.72 | -1.23% |
| 1 | Candidate | IndexOf | UnmodifiedEmpty | 9.44 | 0.09 | 0.91% | 9.45 | 9.44 | -0.51% |
| 1 | Candidate | UnchangedContains | UnmodifiedEmpty | 13.39 | 0.16 | 1.17% | 13.40 | 13.39 | -1.20% |
| 1 | Candidate | IndexOf | CopiedOne | 8.45 | 0.44 | 5.22% | 8.66 | 8.23 | -2.06% |
| 1 | Candidate | UnchangedContains | CopiedOne | 4.41 | 0.26 | 5.84% | 4.50 | 4.33 | -7.45% |
| 1 | Candidate | IndexOf | UnmodifiedOne | 22.20 | 0.84 | 3.76% | 22.06 | 22.33 | 3.43% |
| 1 | Candidate | UnchangedContains | UnmodifiedOne | 27.69 | 0.93 | 3.35% | 28.23 | 27.15 | -7.37% |
| 1 | Candidate | IndexOf | CopiedEight | 22.73 | 0.21 | 0.93% | 22.60 | 22.86 | 1.72% |
| 1 | Candidate | UnchangedContains | CopiedEight | 16.60 | 0.27 | 1.65% | 16.75 | 16.46 | -2.21% |
| 1 | Candidate | IndexOf | UnmodifiedEight | 56.64 | 1.27 | 2.24% | 57.06 | 56.22 | -3.74% |
| 1 | Candidate | UnchangedContains | UnmodifiedEight | 69.40 | 0.41 | 0.60% | 69.38 | 69.42 | -0.04% |
| 2 | Candidate | IndexOf | CopiedDefault5 | 16.48 | 0.15 | 0.92% | 16.46 | 16.50 | -0.45% |
| 2 | Candidate | UnchangedContains | CopiedDefault5 | 11.92 | 0.06 | 0.51% | 11.90 | 11.93 | 0.53% |
| 2 | Candidate | IndexOf | UnmodifiedDefault5 | 41.11 | 0.17 | 0.42% | 41.20 | 41.01 | -0.77% |
| 2 | Candidate | UnchangedContains | UnmodifiedDefault5 | 50.51 | 0.23 | 0.46% | 50.55 | 50.48 | -0.48% |
| 2 | Candidate | IndexOf | CopiedDefault5HitFirst | 7.05 | 0.03 | 0.39% | 7.07 | 7.04 | -0.88% |
| 2 | Candidate | UnchangedContains | CopiedDefault5HitFirst | 2.18 | 0.03 | 1.30% | 2.16 | 2.20 | 2.26% |
| 2 | Candidate | IndexOf | UnmodifiedDefault5HitFirst | 20.29 | 0.50 | 2.46% | 20.07 | 20.50 | 1.50% |
| 2 | Candidate | UnchangedContains | UnmodifiedDefault5HitFirst | 23.89 | 1.51 | 6.31% | 22.76 | 25.02 | 12.87% |
| 2 | Candidate | IndexOf | CopiedDefault5HitLast | 17.82 | 1.51 | 8.49% | 17.88 | 17.77 | 2.20% |
| 2 | Candidate | UnchangedContains | CopiedDefault5HitLast | 10.67 | 0.31 | 2.91% | 10.62 | 10.72 | 1.74% |
| 2 | Candidate | IndexOf | UnmodifiedDefault5HitLast | 42.89 | 0.61 | 1.42% | 43.11 | 42.67 | -1.05% |
| 2 | Candidate | UnchangedContains | UnmodifiedDefault5HitLast | 47.11 | 0.51 | 1.09% | 47.11 | 47.10 | -0.90% |
| 2 | Candidate | IndexOf | CopiedEmpty | 5.37 | 0.03 | 0.59% | 5.36 | 5.38 | 1.03% |
| 2 | Candidate | UnchangedContains | CopiedEmpty | 6.20 | 0.06 | 0.93% | 6.20 | 6.19 | 0.97% |
| 2 | Candidate | IndexOf | UnmodifiedEmpty | 8.95 | 0.06 | 0.67% | 8.98 | 8.92 | -0.96% |
| 2 | Candidate | UnchangedContains | UnmodifiedEmpty | 12.59 | 0.10 | 0.78% | 12.60 | 12.58 | 0.52% |
| 2 | Candidate | IndexOf | CopiedOne | 7.51 | 0.12 | 1.65% | 7.45 | 7.58 | 2.26% |
| 2 | Candidate | UnchangedContains | CopiedOne | 3.72 | 0.07 | 2.01% | 3.71 | 3.72 | 1.59% |
| 2 | Candidate | IndexOf | UnmodifiedOne | 21.18 | 0.17 | 0.78% | 21.23 | 21.12 | -1.55% |
| 2 | Candidate | UnchangedContains | UnmodifiedOne | 26.18 | 0.32 | 1.22% | 26.26 | 26.10 | -0.97% |
| 2 | Candidate | IndexOf | CopiedEight | 22.81 | 0.36 | 1.59% | 22.93 | 22.70 | -2.51% |
| 2 | Candidate | UnchangedContains | CopiedEight | 17.84 | 0.12 | 0.67% | 17.79 | 17.88 | 0.83% |
| 2 | Candidate | IndexOf | UnmodifiedEight | 58.24 | 0.56 | 0.97% | 58.19 | 58.29 | 0.53% |
| 2 | Candidate | UnchangedContains | UnmodifiedEight | 71.69 | 2.06 | 2.87% | 70.91 | 72.47 | 3.01% |
| 2 | Original | IndexOf | CopiedDefault5 | 10.73 | 0.07 | 0.61% | 10.71 | 10.74 | 0.27% |
| 2 | Original | UnchangedContains | CopiedDefault5 | 11.19 | 0.41 | 3.63% | 10.91 | 11.47 | 6.02% |
| 2 | Original | IndexOf | UnmodifiedDefault5 | 52.70 | 1.39 | 2.64% | 53.93 | 51.47 | -6.18% |
| 2 | Original | UnchangedContains | UnmodifiedDefault5 | 65.02 | 15.24 | 23.44% | 70.07 | 59.98 | -30.47% |
| 2 | Original | IndexOf | CopiedDefault5HitFirst | 2.62 | 0.04 | 1.50% | 2.61 | 2.62 | 0.16% |
| 2 | Original | UnchangedContains | CopiedDefault5HitFirst | 2.88 | 0.07 | 2.59% | 2.92 | 2.84 | -5.96% |
| 2 | Original | IndexOf | UnmodifiedDefault5HitFirst | 23.25 | 1.34 | 5.77% | 24.24 | 22.26 | -14.47% |
| 2 | Original | UnchangedContains | UnmodifiedDefault5HitFirst | 21.88 | 1.19 | 5.44% | 21.09 | 22.67 | 12.92% |
| 2 | Original | IndexOf | CopiedDefault5HitLast | 9.80 | 0.12 | 1.27% | 9.87 | 9.73 | -1.75% |
| 2 | Original | UnchangedContains | CopiedDefault5HitLast | 10.51 | 0.23 | 2.22% | 10.40 | 10.62 | 1.94% |
| 2 | Original | IndexOf | UnmodifiedDefault5HitLast | 49.25 | 1.30 | 2.63% | 48.19 | 50.30 | 4.30% |
| 2 | Original | UnchangedContains | UnmodifiedDefault5HitLast | 47.62 | 1.36 | 2.85% | 47.47 | 47.76 | -0.44% |
| 2 | Original | IndexOf | CopiedEmpty | 6.91 | 0.05 | 0.79% | 6.88 | 6.94 | 1.37% |
| 2 | Original | UnchangedContains | CopiedEmpty | 7.58 | 0.10 | 1.31% | 7.60 | 7.55 | -1.46% |
| 2 | Original | IndexOf | UnmodifiedEmpty | 13.09 | 0.10 | 0.75% | 13.06 | 13.12 | 1.55% |
| 2 | Original | UnchangedContains | UnmodifiedEmpty | 13.19 | 0.07 | 0.51% | 13.23 | 13.15 | -0.95% |
| 2 | Original | IndexOf | CopiedOne | 3.81 | 0.05 | 1.28% | 3.79 | 3.83 | 0.66% |
| 2 | Original | UnchangedContains | CopiedOne | 4.37 | 0.26 | 5.90% | 4.44 | 4.30 | -8.95% |
| 2 | Original | IndexOf | UnmodifiedOne | 26.72 | 0.19 | 0.73% | 26.66 | 26.78 | 0.27% |
| 2 | Original | UnchangedContains | UnmodifiedOne | 26.28 | 0.16 | 0.62% | 26.34 | 26.21 | -0.94% |
| 2 | Original | IndexOf | CopiedEight | 16.87 | 0.15 | 0.91% | 16.94 | 16.81 | -1.39% |
| 2 | Original | UnchangedContains | CopiedEight | 16.29 | 0.15 | 0.91% | 16.40 | 16.19 | -1.65% |
| 2 | Original | IndexOf | UnmodifiedEight | 71.77 | 0.97 | 1.36% | 72.07 | 71.47 | -1.78% |
| 2 | Original | UnchangedContains | UnmodifiedEight | 70.67 | 0.56 | 0.79% | 70.73 | 70.62 | -0.78% |
| 3 | Original | IndexOf | CopiedDefault5 | 90.39 | 146.79 | 162.39% | 169.86 | 10.93 | -353.00% |
| 3 | Original | UnchangedContains | CopiedDefault5 | 11.60 | 0.11 | 0.98% | 11.65 | 11.54 | -1.38% |
| 3 | Original | IndexOf | UnmodifiedDefault5 | 48.70 | 1.22 | 2.50% | 48.30 | 49.10 | 3.27% |
| 3 | Original | UnchangedContains | UnmodifiedDefault5 | 49.94 | 0.41 | 0.82% | 50.05 | 49.84 | -1.03% |
| 3 | Original | IndexOf | CopiedDefault5HitFirst | 2.33 | 0.03 | 1.16% | 2.34 | 2.32 | -1.32% |
| 3 | Original | UnchangedContains | CopiedDefault5HitFirst | 2.25 | 0.01 | 0.61% | 2.24 | 2.25 | 0.35% |
| 3 | Original | IndexOf | UnmodifiedDefault5HitFirst | 22.06 | 1.35 | 6.13% | 21.60 | 22.52 | 10.14% |
| 3 | Original | UnchangedContains | UnmodifiedDefault5HitFirst | 23.07 | 0.89 | 3.87% | 22.68 | 23.46 | 3.13% |
| 3 | Original | IndexOf | CopiedDefault5HitLast | 9.55 | 0.05 | 0.54% | 9.53 | 9.57 | 0.68% |
| 3 | Original | UnchangedContains | CopiedDefault5HitLast | 9.62 | 0.04 | 0.40% | 9.65 | 9.60 | -0.68% |
| 3 | Original | IndexOf | UnmodifiedDefault5HitLast | 45.46 | 0.44 | 0.98% | 45.37 | 45.56 | 0.47% |
| 3 | Original | UnchangedContains | UnmodifiedDefault5HitLast | 47.98 | 1.05 | 2.19% | 47.55 | 48.41 | 1.24% |
| 3 | Original | IndexOf | CopiedEmpty | 6.69 | 0.02 | 0.31% | 6.70 | 6.67 | -0.56% |
| 3 | Original | UnchangedContains | CopiedEmpty | 6.45 | 0.05 | 0.77% | 6.48 | 6.42 | -1.57% |
| 3 | Original | IndexOf | UnmodifiedEmpty | 12.14 | 0.05 | 0.44% | 12.15 | 12.13 | -0.46% |
| 3 | Original | UnchangedContains | UnmodifiedEmpty | 12.26 | 0.12 | 0.95% | 12.28 | 12.23 | -0.30% |
| 3 | Original | IndexOf | CopiedOne | 3.90 | 0.04 | 1.08% | 3.89 | 3.90 | -0.45% |
| 3 | Original | UnchangedContains | CopiedOne | 3.91 | 0.06 | 1.52% | 3.93 | 3.89 | -0.57% |
| 3 | Original | IndexOf | UnmodifiedOne | 25.23 | 0.16 | 0.62% | 25.23 | 25.22 | 0.51% |
| 3 | Original | UnchangedContains | UnmodifiedOne | 25.87 | 0.64 | 2.49% | 26.05 | 25.68 | -3.36% |
| 3 | Original | IndexOf | CopiedEight | 16.70 | 0.08 | 0.46% | 16.69 | 16.71 | -0.30% |
| 3 | Original | UnchangedContains | CopiedEight | 15.82 | 0.17 | 1.10% | 15.85 | 15.79 | -0.38% |
| 3 | Original | IndexOf | UnmodifiedEight | 67.56 | 0.90 | 1.33% | 67.01 | 68.10 | 2.47% |
| 3 | Original | UnchangedContains | UnmodifiedEight | 69.03 | 0.62 | 0.89% | 68.95 | 69.11 | -0.30% |
| 3 | Candidate | IndexOf | CopiedDefault5 | 16.97 | 0.15 | 0.88% | 16.93 | 17.01 | 0.35% |
| 3 | Candidate | UnchangedContains | CopiedDefault5 | 11.57 | 0.13 | 1.12% | 11.66 | 11.48 | -1.52% |
| 3 | Candidate | IndexOf | UnmodifiedDefault5 | 42.23 | 0.70 | 1.65% | 42.30 | 42.17 | -0.84% |
| 3 | Candidate | UnchangedContains | UnmodifiedDefault5 | 49.80 | 2.13 | 4.28% | 48.81 | 50.79 | 4.75% |
| 3 | Candidate | IndexOf | CopiedDefault5HitFirst | 6.69 | 0.02 | 0.37% | 6.69 | 6.70 | 0.18% |
| 3 | Candidate | UnchangedContains | CopiedDefault5HitFirst | 2.24 | 0.02 | 0.74% | 2.23 | 2.24 | 0.38% |
| 3 | Candidate | IndexOf | UnmodifiedDefault5HitFirst | 20.35 | 1.07 | 5.26% | 20.78 | 19.92 | -2.37% |
| 3 | Candidate | UnchangedContains | UnmodifiedDefault5HitFirst | 23.54 | 1.22 | 5.18% | 23.68 | 23.41 | -2.52% |
| 3 | Candidate | IndexOf | CopiedDefault5HitLast | 15.58 | 0.18 | 1.14% | 15.60 | 15.57 | 0.16% |
| 3 | Candidate | UnchangedContains | CopiedDefault5HitLast | 9.63 | 0.09 | 0.89% | 9.66 | 9.60 | -1.65% |
| 3 | Candidate | IndexOf | UnmodifiedDefault5HitLast | 41.64 | 0.46 | 1.11% | 41.84 | 41.44 | -1.97% |
| 3 | Candidate | UnchangedContains | UnmodifiedDefault5HitLast | 47.95 | 3.32 | 6.93% | 50.10 | 45.79 | -16.56% |
| 3 | Candidate | IndexOf | CopiedEmpty | 5.40 | 0.01 | 0.16% | 5.41 | 5.40 | -0.01% |
| 3 | Candidate | UnchangedContains | CopiedEmpty | 6.80 | 0.04 | 0.52% | 6.80 | 6.80 | -0.14% |
| 3 | Candidate | IndexOf | UnmodifiedEmpty | 8.93 | 0.05 | 0.51% | 8.93 | 8.94 | -0.31% |
| 3 | Candidate | UnchangedContains | UnmodifiedEmpty | 12.95 | 0.06 | 0.45% | 12.93 | 12.96 | 0.16% |
| 3 | Candidate | IndexOf | CopiedOne | 7.56 | 0.10 | 1.31% | 7.53 | 7.60 | 0.99% |
| 3 | Candidate | UnchangedContains | CopiedOne | 3.82 | 0.09 | 2.40% | 3.81 | 3.83 | -0.58% |
| 3 | Candidate | IndexOf | UnmodifiedOne | 21.05 | 0.26 | 1.26% | 20.96 | 21.14 | 1.21% |
| 3 | Candidate | UnchangedContains | UnmodifiedOne | 26.63 | 0.89 | 3.36% | 26.30 | 26.95 | 2.42% |
| 3 | Candidate | IndexOf | CopiedEight | 23.73 | 1.30 | 5.49% | 23.75 | 23.71 | 2.60% |
| 3 | Candidate | UnchangedContains | CopiedEight | 16.72 | 0.57 | 3.41% | 16.89 | 16.55 | 0.70% |
| 3 | Candidate | IndexOf | UnmodifiedEight | 61.57 | 4.09 | 6.65% | 63.30 | 59.84 | -2.74% |
| 3 | Candidate | UnchangedContains | UnmodifiedEight | 70.21 | 1.98 | 2.83% | 71.36 | 69.07 | -5.88% |

## Raw authority

- Comparison 1: [Original full JSON](comparison-001/Original/reports/results/AutoPerf.CollectionBenchmarks-report-full.json), [Candidate full JSON](comparison-001/Candidate/reports/results/AutoPerf.CollectionBenchmarks-report-full.json), [authorization](comparison-001/authorization.json), [execution receipt](comparison-001/execution-receipt.json).
- Comparison 2: [Original full JSON](comparison-002/Original/reports/results/AutoPerf.CollectionBenchmarks-report-full.json), [Candidate full JSON](comparison-002/Candidate/reports/results/AutoPerf.CollectionBenchmarks-report-full.json), [authorization](comparison-002/authorization.json), [execution receipt](comparison-002/execution-receipt.json).
- Comparison 3: [Original full JSON](comparison-003/Original/reports/results/AutoPerf.CollectionBenchmarks-report-full.json), [Candidate full JSON](comparison-003/Candidate/reports/results/AutoPerf.CollectionBenchmarks-report-full.json), [authorization](comparison-003/authorization.json), [execution receipt](comparison-003/execution-receipt.json).

Each source directory also retains exact stdout, all warmups, adaptive-overhead/workload/result/GC observations, source/runtime/owner/settings records and CSV/Markdown exports. [Independent recomputation](measurement-audit.json) checks all **1,152** actual-minus-median-overhead samples and midpoint-to-even allocation arithmetic against [BDN's pinned source](BenchmarkDotNet-0.13.0-GcStats.cs) and [license](BenchmarkDotNet-0.13.0-LICENSE.md).
