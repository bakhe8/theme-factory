# Salla Review Evidence

This directory stores the manual Salla submission decision and, later, the final Salla review evidence for deliverable themes.

Local certification proves that the factory gates passed. A Salla review file proves that the exact certified fingerprint is approved for manual submission to Salla, or that the same fingerprint was later accepted after Salla's manual review.

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

`deliver` runs this gate automatically. A theme cannot be copied into `deliverables/<theme>/theme` without a valid `waived` manual-submission decision or a `passed` review file after Salla returns its result.
