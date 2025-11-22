# Guide: Merging Collaborator Changes via Pull Request

## Current Situation

Your collaborator has added a new profile feature. Here's how to properly merge it:

## Step-by-Step Merge Process

### 1. Check What Changed

First, review what your collaborator added:

```bash
# Fetch latest changes
git fetch origin

# See what branches exist
git branch -r

# Check the collaborator's branch (if they created a PR)
# Or check the latest commit on dev
git log origin/dev --oneline -10
```

### 2. Review the Pull Request

1. Go to GitHub: `https://github.com/OnarYusifov/scrims/pulls`
2. Find the PR from your collaborator
3. Review the changes:
   - What files were modified?
   - What new features were added?
   - Are there any conflicts?
   - Does it follow the project structure?

### 3. Check for Conflicts

If the PR shows conflicts:

```bash
# Checkout the PR branch locally
git fetch origin
git checkout -b review/collaborator-feature origin/collaborator-branch-name

# Try to merge dev into it to see conflicts
git merge dev

# If conflicts exist, resolve them:
# 1. Open conflicted files
# 2. Look for <<<<<<< markers
# 3. Keep both changes where appropriate
# 4. Remove conflict markers
# 5. Test the merged code
```

### 4. Test the Changes Locally

```bash
# Make sure you're on the PR branch
git checkout review/collaborator-feature

# Install dependencies
bun install

# Run linter
bunx turbo run lint

# Build everything
bunx turbo run build

# Test the application
# Start dev server and test the new profile feature
```

### 5. Approve and Merge

Once you've reviewed and tested:

1. **On GitHub PR page:**
   - Add your review comments (if any)
   - Click "Approve" if everything looks good
   - Click "Merge pull request"
   - Choose merge type:
     - **Squash and merge** (recommended) - Combines all commits into one
     - **Create a merge commit** - Preserves commit history
     - **Rebase and merge** - Linear history (if you prefer)

2. **After merge:**

   ```bash
   # Update your local dev
   git checkout dev
   git pull origin dev

   # Delete the review branch
   git branch -d review/collaborator-feature
   ```

## Handling Profile Feature Merge

### What Your Collaborator Likely Added:

Based on the profile page code, they added:

- Games display functionality
- Badges system integration
- Profile enhancements

### Merge Strategy:

1. **If no conflicts:**
   - Simply approve and merge the PR
   - The changes will integrate automatically

2. **If conflicts exist:**
   - The conflicts are likely in `apps/frontend/app/profile/page.tsx`
   - You'll need to:
     - Keep your working code
     - Integrate their new features
     - Ensure both codebases work together

### Example Conflict Resolution:

If you see conflicts in `profile/page.tsx`:

```typescript
// Your code (keep this)
const [yourState, setYourState] = useState();

// Their code (add this)
const [games, setGames] = useState<Array<{...}>>([]);

// Merge both - keep both state variables
const [yourState, setYourState] = useState();
const [games, setGames] = useState<Array<{...}>>([]);
```

## Best Practices

1. **Always review PRs before merging**
2. **Test locally if possible**
3. **Communicate with collaborator** if you have questions
4. **Use PR comments** to discuss changes
5. **Merge during low-activity periods** if it's a big change

## If Something Breaks After Merge

```bash
# Revert the merge
git revert -m 1 <merge-commit-hash>

# Or reset to before merge (if no one else pulled)
git reset --hard HEAD~1
git push origin dev --force-with-lease
```

## Communication Template for AI Assistants

When helping merge collaborator changes:

1. **Acknowledge the PR**: "I see a PR from [collaborator] adding [feature]"
2. **Review changes**: "Let me review what changed..."
3. **Check conflicts**: "Checking for merge conflicts..."
4. **Test integration**: "Testing the merged code..."
5. **Recommend action**: "The changes look good, ready to merge" or "Found conflicts, need to resolve..."
