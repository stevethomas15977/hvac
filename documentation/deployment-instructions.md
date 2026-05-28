# HVAC Frontend Deployment Instructions

This runbook covers a simple deploy flow using Git and GitHub CLI.

## Prerequisites

- Access to the `stevethomas15977/hvac` repository.
- `git` installed and configured.
- `gh` (GitHub CLI) installed.
- Authenticated GitHub CLI session:

```bash
gh auth login
gh auth status
```

## 1) Commit and Push Changes

From the repository root:

```bash
cd /home/ubuntu/projects/hvac
git status
git add .
git commit -m "Describe your change"
git push origin main
```

## 2) Trigger Frontend Deployment

Run a manual workflow dispatch for development:

```bash
gh workflow run .github/workflows/frontend.yaml -f environment=development
```

For production:

```bash
gh workflow run .github/workflows/frontend.yaml -f environment=production
```

## 3) Watch Deployment Progress

List recent runs:

```bash
gh run list --workflow frontend.yaml --limit 5
```

Watch a specific run:

```bash
gh run watch <RUN_ID>
```

View logs for failed steps:

```bash
gh run view <RUN_ID> --log-failed
```

## 4) Verify Deployment Result

The workflow includes:

- S3 sync of frontend assets
- CloudFront invalidation (`/` and `/index.html`)
- Smoke checks against the deployed URL
- A deployment summary in the GitHub Actions run output

After a successful run, open the deployed URL and verify sign-in/sign-out behavior.

## 5) Common Recovery Actions

Rerun only failed jobs:

```bash
gh run rerun <RUN_ID> --failed
```

Rerun full workflow:

```bash
gh run rerun <RUN_ID>
```

If a workflow cannot be dispatched, re-check authentication:

```bash
gh auth status
gh auth login
```
