# Mobile Visual Evidence

Run:

```powershell
pnpm run test:mobile:visual:evidence
```

The command builds the current worktree and runs the parameterized external QA harness four times at 320, 360, 390, and 430 pixels. Screenshots and `manifest.json` are written outside the repository to `..mobile-qa-evidence` by default. Set `CHECKIN_QA_EVIDENCE_ROOT` to choose another evidence directory.

The manifest records the generation time, worktree, harness, browser executable and version, viewport widths, screenshot filenames, and the scroll assertion used by the harness. Because evidence is generated output, PNG files and the manifest are intentionally excluded from Git commits.

For an upgrade comparison, run the command once against the previous release checkout and once against the candidate checkout, then compare the two evidence directories by matching `width` and screenshot filename. A change is actionable when a page gains horizontal scroll, a fixed action is clipped, or the same semantic surface changes unexpectedly at a supported width.

The comparison entry point produces a machine-readable report using screenshot hashes:

```powershell
pnpm run test:mobile:visual:compare -- C:\path\to\before\manifest.json C:\path\to\after\manifest.json C:\path\to\comparison.json
```

It records added, removed, and changed screenshots for each width without copying PNG files into the repository.
