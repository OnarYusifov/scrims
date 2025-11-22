# Pull Request Workflow Setup - Summary

## ✅ What Was Set Up

1. **Updated `.ai-workflow.md`** - AI assistants now enforce PR workflow
2. **Created GitHub Actions CI** - Automatic lint, type-check, and build on PRs
3. **Created PR validation workflow** - Checks branch rules and commit messages
4. **Created documentation** - Guides for branch protection and merging

## 📋 GitHub Branch Protection Rules - What to Select

Go to: `https://github.com/OnarYusifov/scrims/settings/branches`

### For `dev` branch, select:

✅ **Require a pull request before merging**

- Required approvals: `1`
- ✅ Dismiss stale pull request approvals when new commits are pushed

✅ **Require status checks to pass before merging**

- ✅ Require branches to be up to date before merging
- Select these checks:
  - `lint-and-build` (from CI workflow)
  - `pr-validation` (from PR check workflow)

✅ **Block force pushes**

✅ **Require linear history** (optional but recommended)

✅ **Restrict updates** - Only allow users with bypass permission

✅ **Restrict deletions** - Only allow users with bypass permission

### For `main` branch, select the same but:

- Required approvals: `2` (more strict)

## 🔄 How to Merge Your Collaborator's Profile Feature

### Option 1: They Create a PR (Recommended)

1. **Your collaborator should:**
   - Create a feature branch: `feature/profile-games-badges`
   - Push their changes
   - Create PR: `feature/profile-games-badges` → `dev`

2. **You then:**
   - Review the PR on GitHub
   - Check for conflicts
   - Test locally if needed
   - Approve and merge

### Option 2: They Already Pushed to dev (Current Situation)

If they already pushed directly to dev:

1. **Create a PR from their commit:**

   ```bash
   # Check what they added
   git log origin/dev --oneline -5

   # Create a branch from before their changes
   git checkout -b feature/review-profile-changes <commit-before-theirs>

   # Cherry-pick their changes
   git cherry-pick <their-commit-hash>

   # Push and create PR
   git push origin feature/review-profile-changes
   ```

2. **Or ask them to:**
   - Create a feature branch from their current work
   - Create a PR from that branch

## 📝 Next Steps

1. **Set up branch protection** using the guide above
2. **Create PR for this workflow setup:**
   - Go to: https://github.com/OnarYusifov/scrims/pull/new/feature/setup-pr-workflow-and-ci
   - Review and merge it
3. **Communicate with your collaborator:**
   - Share the updated `COLLABORATION.md`
   - Explain the new PR workflow
   - Ask them to create a PR for their profile feature

## 🤖 For AI Assistants (Both Sides)

Both AI assistants should now:

- ✅ Never push directly to `dev` or `main`
- ✅ Always create feature branches
- ✅ Always create Pull Requests
- ✅ Follow conventional commit messages
- ✅ Check `.ai-workflow.md` for workflow rules

## 📚 Documentation Files Created

- `.ai-workflow.md` - AI assistant workflow rules
- `docs/BRANCH_PROTECTION_GUIDE.md` - GitHub settings guide
- `docs/MERGING_COLLABORATOR_CHANGES.md` - How to merge PRs
- `COLLABORATION.md` - Updated with PR workflow (already existed)
