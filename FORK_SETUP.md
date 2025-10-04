# Setting Up Your Fork of lakekeeper-console

## 📋 Current Status

✅ **Done:**
- Created feature branch: `feature/fgac-management-tab`
- Committed FGAC changes (FgacManager.vue + table page integration)
- Ready to push to your fork

## 🔧 Steps to Complete

### Step 1: Create Fork on GitHub

1. Go to https://github.com/lakekeeper/console
2. Click the **"Fork"** button in the top right
3. Select your account: **anandlonkar-work**
4. This creates: `https://github.com/anandlonkar-work/console`

### Step 2: Add Your Fork as Remote

```bash
cd /Users/anand.lonkar/code/lakekeeper/lakekeeper-console

# Add your fork as a remote
git remote add myfork https://github.com/anandlonkar-work/console.git

# Verify remotes
git remote -v
# Should show:
# origin    https://github.com/lakekeeper/console.git (fetch)
# origin    https://github.com/lakekeeper/console.git (push)
# myfork    https://github.com/anandlonkar-work/console.git (fetch)
# myfork    https://github.com/anandlonkar-work/console.git (push)
```

### Step 3: Push Your Branch to Your Fork

```bash
# Push the feature branch to your fork
git push myfork feature/fgac-management-tab

# Set upstream tracking (optional, for easier future pushes)
git push -u myfork feature/fgac-management-tab
```

### Step 4: Update lakekeeper-bin/Cargo.toml

Update the dependency to use your fork:

```toml
# File: /Users/anand.lonkar/code/lakekeeper/lakekeeper-local/crates/lakekeeper-bin/Cargo.toml

[dependencies]
# Change from local path to your GitHub fork
lakekeeper-console = { 
    git = "https://github.com/anandlonkar-work/console", 
    branch = "feature/fgac-management-tab",
    optional = true 
}
```

### Step 5: Update docker-compose-build.yaml

Revert the docker-compose context back to normal (since we'll use GitHub now):

```yaml
# File: examples/access-control-fgac/docker-compose-build.yaml

lakekeeper:
  build:
    context: ../../
    dockerfile: docker/full.Dockerfile
  environment:
    # ... rest of config

migrate:
  build:
    context: ../../
    dockerfile: docker/full.Dockerfile
  environment:
    # ... rest of config
```

### Step 6: Update docker/full.Dockerfile

Revert the Dockerfile to original (no need to copy lakekeeper-console locally):

```dockerfile
FROM chef AS planner
COPY . .
RUN ($NO_CHEF && touch recipe.json) || cargo chef prepare  --recipe-path recipe.json

FROM chef AS builder

COPY --from=planner /app/recipe.json recipe.json
RUN $NO_CHEF || cargo chef cook --release --recipe-path recipe.json
COPY . .

ENV SQLX_OFFLINE=true
RUN cargo build --release --all-features --bin lakekeeper
```

### Step 7: Rebuild Docker Image

```bash
cd /Users/anand.lonkar/code/lakekeeper/lakekeeper-local/examples/access-control-fgac

# Build with your fork
docker-compose -f docker-compose-build.yaml build lakekeeper

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f lakekeeper
```

## 🎯 Benefits of This Approach

### ✅ Advantages:
- **Cleaner builds**: No need to copy 3GB+ of local files into Docker
- **Faster builds**: Docker can cache layers better
- **Version control**: Changes are tracked in GitHub
- **Collaboration**: Easy to share and review changes
- **Production-ready**: Same pattern used for official releases

### 📝 Workflow Going Forward:

1. **Make changes** to lakekeeper-console locally
2. **Commit** changes to your feature branch
3. **Push** to your fork: `git push myfork feature/fgac-management-tab`
4. **Rebuild** Docker: `docker-compose -f docker-compose-build.yaml build`
5. **Test** your changes in the running containers

## 🔄 Alternative: Use a Tag

If you want a stable version instead of tracking a branch:

```bash
# Tag your commit
cd /Users/anand.lonkar/code/lakekeeper/lakekeeper-console
git tag v0.10.1-fgac
git push myfork v0.10.1-fgac

# Update Cargo.toml to use tag
lakekeeper-console = { 
    git = "https://github.com/anandlonkar-work/console", 
    tag = "v0.10.1-fgac",
    optional = true 
}
```

## 📚 Summary

**Your changes are committed to:** `feature/fgac-management-tab` branch

**Files changed:**
- ✅ `src/components/FgacManager.vue` (new file - 625 lines)
- ✅ `src/pages/warehouse/[id].namespace.[nsid].table.[tid].vue` (added FGAC tab)
- ✅ `FGAC_IMPLEMENTATION_COMPLETE.md` (documentation)
- ✅ `FGAC_TAB_IMPLEMENTATION.md` (documentation)

**Next action:** Fork the repository on GitHub and follow Step 2 above! 🚀
