# Guide: Pushing Changes and Merging with Collaborator's Profile Feature

## Current Status ✅

**Good news**: Your feature branch already includes the collaborator's profile changes!

- Your branch: `feature/setup-pr-workflow-and-ci`
- Base: `origin/dev` (latest version)
- Collaborator's profile changes: Already merged in
- Your new changes: 5 commits ahead (PR workflow, env config, docs)

## Step 1: Verify No Conflicts

Your changes don't conflict with the profile feature because:
- You modified: `apps/frontend/package.json`, `apps/backend/src/index.ts`, `apps/frontend/next.config.ts`
- Collaborator modified: `apps/frontend/app/profile/page.tsx` (different file)
- No overlap = No conflicts! ✅

## Step 2: Push Your Feature Branch

### Option A: If Branch Protection Allows Feature Branches

```bash
# Push your feature branch
git push origin feature/setup-pr-workflow-and-ci
```

### Option B: If Branch Protection Blocks Feature Branches

You need to fix branch protection rules first:

1. **Go to GitHub**: https://github.com/OnarYusifov/scrims/settings/branches
2. **Find the rule blocking feature branches**
3. **Edit the rule**:
   - Change "Branch name pattern" from `*` to `dev` or `main`
   - OR add an exception for `feature/*` branches
4. **Save changes**
5. **Then push**:
   ```bash
   git push origin feature/setup-pr-workflow-and-ci
   ```

## Step 3: Create Pull Request

1. **Go to GitHub**: https://github.com/OnarYusifov/scrims/compare
2. **Or use the link** (after pushing):
   ```
   https://github.com/OnarYusifov/scrims/compare/dev...feature/setup-pr-workflow-and-ci
   ```

3. **Fill out the PR**:
   - **Title**: `feat: centralized env-based port config and PR workflow setup`
   - **Description**:
     ```markdown
     ## Changes
     
     - ✅ Use centralized `.env` file for ports (no hardcoded ports)
     - ✅ Setup GitHub Actions CI/CD workflows
     - ✅ Add PR workflow documentation
     - ✅ Add configuration standards for AI assistants
     
     ## Port Configuration
     
     - Frontend: Uses `FRONTEND_PORT` from root `.env` (defaults to 3000)
     - Backend: Uses `BACKEND_PORT` from root `.env` (defaults to 3001)
     - Both developers can use different ports (3000/3001 vs 5000/5001)
     
     ## Documentation
     
     - `docs/ENV_PORT_CONFIGURATION.md` - Port configuration guide
     - `docs/FOR_COLLABORATOR_AI.md` - Guide for collaborator's AI
     - `docs/AI_COLLABORATION_CONFIG.md` - AI collaboration standards
     - `docs/CONFIGURATION_STANDARD.md` - Configuration standards
     
     ## Testing
     
     - ✅ Lint passes
     - ✅ Build succeeds
     - ✅ No conflicts with collaborator's profile changes
     
     ## Related
     
     - Includes collaborator's profile feature (already merged in base)
     - No conflicts with profile page changes
     ```

4. **Request Review**: Add your collaborator as reviewer (optional)

5. **Create PR**

## Step 4: After PR is Created

### For You (PR Creator):

1. **Wait for CI to pass**:
   - GitHub Actions will run lint, type-check, and build
   - Check the "Checks" tab on the PR

2. **Address any review comments** (if any)

3. **Once approved, merge**:
   - Use "Squash and merge" (recommended) or "Create a merge commit"
   - This will merge your changes into `dev`

### For Collaborator:

1. **They should review the PR**
2. **They can test locally**:
   ```bash
   git fetch origin
   git checkout -b test/env-config origin/feature/setup-pr-workflow-and-ci
   bun install
   bun run dev
   # Test that ports work with their .env file
   ```

3. **After merge, they should**:
   ```bash
   git checkout dev
   git pull origin dev
   # Update their .env with FRONTEND_PORT and BACKEND_PORT
   ```

## Step 5: Update Your Local Environment

After the PR is merged:

```bash
# Switch to dev
git checkout dev

# Pull latest (includes your merged PR)
git pull origin dev

# Delete feature branch (optional)
git branch -d feature/setup-pr-workflow-and-ci
git push origin --delete feature/setup-pr-workflow-and-ci
```

## Important Notes

### Port Configuration

After merge, both developers need to update their root `.env`:

**Your setup**:
```env
FRONTEND_PORT=3000
BACKEND_PORT=3001
```

**Collaborator's setup**:
```env
FRONTEND_PORT=5000
BACKEND_PORT=5001
```

### Profile Feature

The collaborator's profile changes are already included in your branch (no action needed).

## Troubleshooting

### If Push is Blocked

**Error**: `Changes must be made through a pull request`

**Solution**: 
1. Check branch protection rules
2. Ensure feature branches are allowed
3. Or temporarily disable protection for this push

### If PR Shows Conflicts

**Unlikely**, but if it happens:

```bash
# Fetch latest
git fetch origin

# Merge dev into your feature branch
git checkout feature/setup-pr-workflow-and-ci
git merge origin/dev

# Resolve conflicts (if any)
# Then push
git push origin feature/setup-pr-workflow-and-ci
```

### If CI Fails

1. Check the error in GitHub Actions
2. Fix locally
3. Commit and push again
4. CI will re-run automatically

## Summary

✅ **Your branch is ready** - includes collaborator's changes  
✅ **No conflicts** - different files modified  
✅ **Ready to push** - just need to handle branch protection if needed  
✅ **Create PR** - merge into `dev` when ready  

The collaborator's profile feature will be preserved because it's already in your branch's history!

