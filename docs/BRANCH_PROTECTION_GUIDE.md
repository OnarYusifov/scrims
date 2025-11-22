# GitHub Branch Protection Rules Guide

## Recommended Settings for `dev` Branch

When setting up branch protection for the `dev` branch, select these rules:

### ✅ Required Rules:

1. **Require a pull request before merging**
   - ✅ Required number of approvals: `1`
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require review from Code Owners (if you set up CODEOWNERS file)

2. **Require status checks to pass before merging**
   - ✅ Require branches to be up to date before merging
   - Select these status checks:
     - `lint-and-build` (from CI workflow)
     - `pr-validation` (from PR check workflow)

3. **Block force pushes**
   - ✅ Block force pushes to matching branches

4. **Require linear history** (Optional but recommended)
   - ✅ Prevent merge commits from being pushed

### ⚠️ Optional but Recommended:

5. **Restrict updates**
   - ✅ Only allow users with bypass permission to update matching refs
   - This prevents direct pushes even with admin access

6. **Restrict deletions**
   - ✅ Only allow users with bypass permissions to delete matching refs

### ❌ Do NOT Enable (unless needed):

- **Require deployments to succeed** - Only if you have deployment environments set up
- **Require signed commits** - Only if you want to enforce GPG signing
- **Require code scanning results** - Only if you have code scanning enabled
- **Require code quality results** - Only if you have code quality tools configured
- **Automatically request Copilot code review** - Optional, can enable if you want

## Recommended Settings for `main` Branch

Apply the same rules as `dev`, but with stricter requirements:

1. **Require a pull request before merging**
   - ✅ Required number of approvals: `2` (more strict than dev)
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require review from Code Owners

2. **Require status checks to pass before merging**
   - ✅ Require branches to be up to date before merging
   - All CI checks must pass

3. **Block force pushes** ✅

4. **Require linear history** ✅

5. **Restrict updates** ✅

6. **Restrict deletions** ✅

## How to Set Up

1. Go to: `https://github.com/OnarYusifov/scrims/settings/branches`
2. Click "Add rule" or "Add branch protection rule"
3. Enter branch name: `dev`
4. Select the rules listed above
5. Click "Create" or "Save changes"
6. Repeat for `main` branch with stricter settings

## Bypass Permissions

Only repository admins should have bypass permissions. This ensures even admins follow the PR workflow.
