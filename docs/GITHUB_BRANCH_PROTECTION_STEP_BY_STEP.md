# GitHub Branch Protection - Step-by-Step Guide

## For `dev` Branch

Go to: `https://github.com/OnarYusifov/scrims/settings/branches`

Click "Add rule" or edit existing rule for `dev` branch.

### ✅ SELECT THESE (Required):

#### 1. **Require a pull request before merging**
   - ✅ **Check this box**
   - **Required approvals**: Set to `1`
   - ✅ **Dismiss stale pull request approvals when new commits are pushed** - Check this
   - ❌ **Require review from Code Owners** - Leave unchecked (unless you set up CODEOWNERS)
   - ❌ **Require approval of the most recent reviewable push** - Leave unchecked
   - ❌ **Require conversation resolution before merging** - Leave unchecked (optional, can enable if you want)
   - ❌ **Automatically request Copilot code review** - Leave unchecked (optional)

   **Allowed merge methods**: Select at least one:
   - ✅ **Allow squash merging** (recommended - combines commits into one)
   - ✅ **Allow merge commits** (preserves history)
   - ✅ **Allow rebase merging** (linear history)

#### 2. **Require status checks to pass**
   - ✅ **Check this box**
   - ✅ **Require branches to be up to date before merging** - Check this
   - ❌ **Do not require status checks on creation** - Leave unchecked
   
   **Status checks to require** (after CI runs once, these will appear):
   - Select: `lint-and-build` (from CI workflow)
   - Select: `pr-validation` (from PR check workflow)
   
   *Note: These will appear after the first PR is created and CI runs*

#### 3. **Block force pushes**
   - ✅ **Check this box**

#### 4. **Restrict updates**
   - ✅ **Check this box** - Only allow users with bypass permission to update matching refs

#### 5. **Restrict deletions**
   - ✅ **Check this box** - Only allow users with bypass permissions to delete matching refs

### ⚠️ OPTIONAL (Recommended):

#### 6. **Require linear history**
   - ✅ **Check this box** - Prevents merge commits (cleaner history)

### ❌ DO NOT SELECT (Leave Unchecked):

- ❌ **Restrict creations** - Not needed
- ❌ **Require deployments to succeed** - Only if you have deployment environments
- ❌ **Require signed commits** - Only if you want GPG signing
- ❌ **Require code scanning results** - Only if you have code scanning enabled
- ❌ **Require code quality results** - Only if you have code quality tools

---

## For `main` Branch

Apply the **SAME rules** as `dev`, but with these differences:

### Differences for `main`:

1. **Require a pull request before merging**
   - **Required approvals**: Set to `2` (more strict than dev)
   - ✅ **Require approval of the most recent reviewable push** - Check this (more strict)
   - All other settings same as dev

2. All other rules same as `dev`

---

## Quick Checklist for `dev` Branch

Copy this checklist while setting up:

```
✅ Require a pull request before merging
   ✅ Required approvals: 1
   ✅ Dismiss stale pull request approvals
   ✅ Allow squash merging
   ✅ Allow merge commits
   ✅ Allow rebase merging

✅ Require status checks to pass
   ✅ Require branches to be up to date
   ✅ Select: lint-and-build (after first CI run)
   ✅ Select: pr-validation (after first CI run)

✅ Block force pushes

✅ Restrict updates

✅ Restrict deletions

✅ Require linear history (optional but recommended)

❌ Restrict creations (leave unchecked)
❌ Require deployments (leave unchecked)
❌ Require signed commits (leave unchecked)
❌ Require code scanning (leave unchecked)
❌ Require code quality (leave unchecked)
```

---

## After Setting Up

1. **Test the protection:**
   - Try to push directly to `dev` - should be blocked
   - Create a feature branch and PR - should work

2. **First PR will trigger CI:**
   - After first PR, status checks will appear
   - You can then select them in branch protection settings

3. **Update status checks:**
   - Go back to branch protection settings
   - Add the status checks that appeared from CI

---

## Important Notes

- **Status checks won't appear until CI runs**: After your first PR, the workflows will run and create status checks. Then you can add them to branch protection.

- **Bypass permissions**: Only repository admins should have bypass. This ensures even admins follow PR workflow.

- **If you need to push directly** (emergency only): You'll need to temporarily disable protection or use bypass permission.

