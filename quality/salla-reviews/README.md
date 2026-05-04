# Salla Review Evidence

This directory stores the final Salla/Partner Portal review evidence for deliverable themes.

Local certification proves that the factory gates passed. A Salla review file proves that the exact certified fingerprint was reviewed in the real Salla environment, or that a temporary delivery waiver was explicitly accepted.

Create a template:

```bash
node factory.js salla-review template <theme>
```

Create a waiver template:

```bash
node factory.js salla-review template <theme> --waiver
```

Gate:

```bash
node factory.js salla-review gate <theme>
```

`deliver` runs this gate automatically. A theme cannot be copied into `deliverables/<theme>/theme` without a `passed` review file or a valid `waived` review file.
