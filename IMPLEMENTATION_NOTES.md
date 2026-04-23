# MoMA Acquisition Intelligence Platform - Implementation Notes

This file is updated at the end of every implementation step.
Each step must also include a `Dumbified explanation` section (plain-English summary).

## Step 1 - Repository Wiring and Workflow Policy

Date: 2026-04-23

### What was implemented
- Re-pointed local `AppDev` git remote from `RalphjCruz/AppDev` to `RalphjCruz/MoMa-Acquisition-Platform`.
- Fetched remote and checked out tracked `main` branch.
- Established a permanent process rule:
  - every step must include an update in this file
  - every step must be committed and pushed to GitHub

### Why this matters
- Prevents working in the wrong repository.
- Creates an auditable engineering log for demo defense and grading discussions.
- Enforces disciplined delivery and traceability per assignment milestone.

### Dumbified explanation
- We fixed the project folder so it now talks to the correct GitHub repo.
- We made a rule: after every coding step, we write what we did here and push it online.
- This stops confusion and proves steady progress for grading and demo.

### Commands executed
- `git remote set-url origin https://github.com/RalphjCruz/MoMa-Acquisition-Platform.git`
- `git fetch origin`
- `git checkout -b main --track origin/main`

### Validation
- `git remote -v` now points to:
  - `https://github.com/RalphjCruz/MoMa-Acquisition-Platform.git`
- Repo root now contains remote-tracked files (e.g., `README.md`).

### Next step planned
- Step 2: Backend foundation (`Express` scaffold + `GET /api/health` + backend-served `GET /about`).
