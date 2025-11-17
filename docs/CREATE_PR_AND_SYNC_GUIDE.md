# Guide: Create PR, Merge, and Sync on Friend's Machine

## Current Situation

- ✅ Your branch `feature/setup-pr-workflow-and-ci` exists on GitHub
- ✅ You have 4 new commits locally that need to be in the PR
- ⚠️ Branch protection is blocking direct push to feature branch

## Solution: Create PR from Existing Branch + Manual Update

Since branch protection blocks pushing to feature branches, we'll work around it:

### Option 1: Update Branch Protection (Recommended)

1. **Go to**: https://github.com/OnarYusifov/scrims/settings/branches
2. **Find the rule** blocking feature branches
3. **Edit it** to exclude feature branches:
   - Add exception: `feature/*` or `feat/*`
   - OR change pattern from `*` to only `dev` and `main`
4. **Save**
5. **Then push**:
   ```bash
   git push origin feature/setup-pr-workflow-and-ci
   ```

### Option 2: Create PR from Web Interface (If can't update rules)

If you can't update branch protection rules right now:

1. **Go to GitHub**: https://github.com/OnarYusifov/scrims
2. **Click "Pull requests"** tab
3. **Click "New pull request"**
4. **Select branches**:
   - Base: `dev`
   - Compare: `feature/setup-pr-workflow-and-ci`
5. **Fill PR details** (see template below)
6. **Create PR**

**Note**: The PR will show the old commits. You'll need to update the branch later or merge as-is and add your new commits in a follow-up PR.

## PR Template

### Title:
```
feat: centralized env-based port config and PR workflow setup
```

### Description:
```markdown
## 🎯 Summary

This PR implements centralized environment-based port configuration and sets up the PR workflow infrastructure.

## ✅ Changes

- **Port Configuration**: Use `FRONTEND_PORT` and `BACKEND_PORT` from root `.env` file (no hardcoded ports)
- **GitHub Actions CI/CD**: Added workflows for lint, type-check, and build validation
- **PR Workflow Documentation**: Comprehensive guides for AI assistants and human collaborators
- **Configuration Standards**: Documentation for port and env variable management

## 🔧 Port Configuration

Both developers can now use different ports via root `.env`:

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

## 📚 Documentation Added

- `docs/ENV_PORT_CONFIGURATION.md` - Port configuration guide
- `docs/FOR_COLLABORATOR_AI.md` - Quick guide for collaborator's AI
- `docs/AI_COLLABORATION_CONFIG.md` - AI collaboration standards
- `docs/CONFIGURATION_STANDARD.md` - Configuration standards
- `docs/PUSH_AND_MERGE_GUIDE.md` - Merge workflow guide

## ✅ Testing

- ✅ Lint passes
- ✅ Build succeeds
- ✅ No conflicts with collaborator's profile changes (already included in base)

## 🔗 Related

- Includes collaborator's profile feature (commit dbfa94a) - already in branch history
- No conflicts with profile page changes

## 📝 Next Steps After Merge

1. Both developers update root `.env` with their preferred ports
2. Restart dev servers to pick up new port configuration
3. Continue development with centralized env config
```

## Step 2: Review and Merge PR

### For You (PR Creator):

1. **Wait for CI to pass** (if it runs)
2. **Review the changes** one more time
3. **Merge the PR**:
   - Click "Merge pull request"
   - Choose "Squash and merge" (recommended) or "Create a merge commit"
   - Click "Confirm merge"

### For Your Friend (Reviewer):

1. **Review the PR** on GitHub
2. **Approve** if everything looks good
3. **Or request changes** if needed

## Step 3: Sync on Friend's Machine

After the PR is merged into `dev`, your friend needs to pull the changes:

### On Friend's Machine:

```bash
# 1. Navigate to project
cd /path/to/scrims

# 2. Check current branch
git branch

# 3. If on a feature branch, switch to dev
git checkout dev

# 4. Fetch latest changes
git fetch origin

# 5. Pull merged changes
git pull origin dev

# 6. Verify you have the latest
git log --oneline -5
# Should see the merge commit and your new commits

# 7. Update dependencies (if needed)
bun install

# 8. Update root .env file with their ports
# Edit .env file:
nano .env
# Or
code .env

# Add these lines:
FRONTEND_PORT=5000
BACKEND_PORT=5001

# 9. Update URL variables to match ports
FRONTEND_URL="http://localhost:5000"
BACKEND_URL="http://localhost:5001"
API_URL="http://localhost:5001"
NEXT_PUBLIC_API_URL="http://localhost:5001"
AUTH_URL="http://localhost:5000"
NEXTAUTH_URL="http://localhost:5000"

# 10. Restart dev server
bun run dev

# 11. Verify ports
# Frontend should show: "Local: http://localhost:5000"
# Backend should show: "🚀 Backend server running on http://0.0.0.0:5001"
```

## Step 4: Verify Sync

### On Your Machine:

```bash
# 1. Switch to dev
git checkout dev

# 2. Pull latest (includes merged PR)
git pull origin dev

# 3. Update your .env with your ports
# Edit .env:
nano .env

# Add:
FRONTEND_PORT=3000
BACKEND_PORT=3001

# 4. Restart dev server
bun run dev
```

### On Friend's Machine:

```bash
# Verify they have the same commits
git log --oneline -10

# Should match your log
```

## Troubleshooting

### If Friend Can't Pull

```bash
# Check if they have uncommitted changes
git status

# If yes, stash them
git stash

# Then pull
git pull origin dev

# Restore stashed changes if needed
git stash pop
```

### If Ports Don't Work

1. **Check .env file location**: Must be in root directory (`/path/to/scrims/.env`)
2. **Check variable names**: Must be `FRONTEND_PORT` and `BACKEND_PORT` (exact case)
3. **Restart dev server**: Ports are read at startup
4. **Check for per-app .env files**: Delete any `.env.local` files in app directories

### If Merge Conflicts Occur

```bash
# On friend's machine, if they have local changes:
git fetch origin
git checkout dev
git pull origin dev

# If conflicts:
# Resolve conflicts in files
# Then:
git add .
git commit -m "Merge: resolve conflicts with env config"
```

## Quick Sync Script for Friend

Create this script for your friend to run:

```bash
#!/bin/bash
# sync-env-config.sh

echo "🔄 Syncing environment configuration..."

# Check if on dev branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "dev" ]; then
    echo "⚠️  Switching to dev branch..."
    git checkout dev
fi

# Fetch and pull
echo "📥 Fetching latest changes..."
git fetch origin
git pull origin dev

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    touch .env
fi

# Add port configuration if not present
if ! grep -q "FRONTEND_PORT" .env; then
    echo "📝 Adding FRONTEND_PORT to .env..."
    echo "" >> .env
    echo "# Port Configuration" >> .env
    echo "FRONTEND_PORT=5000" >> .env
    echo "BACKEND_PORT=5001" >> .env
fi

echo "✅ Sync complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review .env file and update ports if needed"
echo "2. Update URL variables (FRONTEND_URL, BACKEND_URL, etc.)"
echo "3. Run: bun install (if dependencies changed)"
echo "4. Run: bun run dev"
```

Save as `sync-env-config.sh`, make executable:
```bash
chmod +x sync-env-config.sh
./sync-env-config.sh
```

## Summary Checklist

### Before Creating PR:
- [ ] All changes committed
- [ ] Lint passes
- [ ] Build succeeds
- [ ] Branch protection allows feature branches (or workaround ready)

### Creating PR:
- [ ] PR created on GitHub
- [ ] Description filled out
- [ ] CI checks passing (if applicable)

### After Merge:
- [ ] Pull latest on your machine
- [ ] Update your `.env` with `FRONTEND_PORT=3000` and `BACKEND_PORT=3001`
- [ ] Friend pulls latest on their machine
- [ ] Friend updates their `.env` with `FRONTEND_PORT=5000` and `BACKEND_PORT=5001`
- [ ] Both restart dev servers
- [ ] Both verify ports are correct

## Communication Template

Send this to your friend:

```
Hey! I've merged the env-based port configuration PR.

To sync on your machine:

1. git checkout dev
2. git pull origin dev
3. Add to your .env file:
   FRONTEND_PORT=5000
   BACKEND_PORT=5001
4. Update URL variables to match (FRONTEND_URL, BACKEND_URL, etc.)
5. bun run dev

Your profile feature is safe - it's already included! 🎉
```

