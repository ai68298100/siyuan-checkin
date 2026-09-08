# Mobile QA Harness

Build the current worktree, then point the maintained external harness at this checkout:

```powershell
pnpm run build
$env:CHECKIN_QA_PROJECT_ROOT = (Get-Location).Path
$env:CHECKIN_QA_OUTPUT_ROOT = "C:\Users\sunku\.codex\visualizations\mobile-qa"
$env:CHECKIN_BROWSER = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
node "C:\Users\sunku\.codex\visualizations\2026\09\06\01a0746c-a70f-78c0-b369-de9bc71c594e\qa-preview.cjs"
```

The harness now reads `CHECKIN_QA_PROJECT_ROOT` and `CHECKIN_QA_OUTPUT_ROOT`. It mounts the production bundle in a SiYuan-compatible mock, checks the dock, history, summary, editor, template application, tab, narrow layout, draft preservation, concurrent writes, focus adapters, archive/restore, and horizontal scroll width, and writes screenshots to the output directory.

The validated viewport matrix includes the 420px dock, 320px narrow dock, and 1180px tab layout. The existing harness can be extended with explicit 360px, 390px, and 430px screenshot loops when a separate screenshot baseline is needed.
