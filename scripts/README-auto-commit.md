# Auto-commit (recommended: every 15 minutes)

This repo includes `auto-commit.sh` to create a WIP commit when there are staged changes, on a schedule you control with **cron**.

**Recommended interval:** every **15 minutes** (`*/15` in cron). That is frequent enough to recover from crashes without creating as much noise as every 1–5 minutes.

## One-time setup

1. Make the script executable:

   ```bash
   chmod +x scripts/auto-commit.sh
   ```

2. Ensure Git knows who you are (required for `git commit`):

   ```bash
   git config user.email "you@example.com"
   git config user.name "Your Name"
   ```

3. Install a cron job (edit with `crontab -e`). Use the **absolute** path to this repo (quotes matter if the path has spaces):

   ```cron
   */15 * * * * "/home/guy/Desktop/Lowcountry AI/lowcountry-listings-ai-final/scripts/auto-commit.sh" >> "/home/you/Desktop/Lowcountry AI/lowcountry-listings-ai-final/.auto-commit.log" 2>&1
   ```

   Replace `/home/you/Desktop/...` with your real path.

## Behavior

- Commits only when there is something to commit (modified or new **non-ignored** files).
- Skips when you are in the middle of a **merge** or **rebase**.
- **`.env.local`** and other ignored files are never added (see `.gitignore`).
- Does **not** push; run `git push` when you are ready.

## Other intervals

| Interval | Cron expression |
|----------|-----------------|
| Every 15 min (recommended) | `*/15 * * * *` |
| Every 30 min | `*/30 * * * *` |
| Hourly | `0 * * * *` |

## Disable

Remove the line from `crontab -e` or comment it out with `#`.
