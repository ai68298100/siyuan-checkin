# Mobile QA Harness

Build the current worktree, then point the maintained external harness at this checkout:

```powershell
pnpm run build
$env:CHECKIN_QA_PROJECT_ROOT = (Get-Location).Path
$env:CHECKIN_QA_OUTPUT_ROOT = "C:\Users\sunku\.codex\visualizations\mobile-qa"
# Optional when Edge/Chrome is installed in a standard Windows path.
$env:CHECKIN_BROWSER = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
node "C:\Users\sunku\.codex\visualizations\2026\09\06\01a0746c-a70f-78c0-b369-de9bc71c594e\qa-preview.cjs"
```

The harness now reads `CHECKIN_QA_PROJECT_ROOT` and `CHECKIN_QA_OUTPUT_ROOT`. It mounts the production bundle in a SiYuan-compatible mock, checks the dock, history, summary, editor, template application, tab, narrow layout, draft preservation, concurrent writes, focus adapters, archive/restore, and horizontal scroll width, and writes screenshots to the output directory.

The validated viewport matrix includes the 320px, 360px, 390px, and 430px mobile widths, the 420px dock, and the 1180px tab layout. Each mobile width now produces a Today screenshot and checks that the rendered surface has no horizontal overflow.

The repository browser entry point probes standard Edge and Chrome installation paths, then executes the maintained harness with the current worktree in `CHECKIN_QA_PROJECT_ROOT`. Set `CHECKIN_BROWSER` explicitly when the executable is installed elsewhere, or set `CHECKIN_QA_HARNESS` when the harness is stored at another path.

The current worktree passed the harness on 2026-09-10. It covered all seven 4.0 surfaces (Today, History, Summary, Occasions, Insights, Archived, and Settings), Editor, narrow and wide layouts, template interactions, concurrent writes, API readiness, and reported no page errors. This is mock-client evidence; final acceptance in real SiYuan desktop and mobile clients remains separate.
