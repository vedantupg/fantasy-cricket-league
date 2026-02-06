# Dev & Prod Environment Setup

This guide explains how to set up separate **Dev** and **Prod** deployments on Vercel.

## Architecture

- **Dev Site**: Deployed from `dev` branch → Test your changes here
- **Prod Site**: Deployed from `main` branch → Live production site

## Setup Instructions

### Step 1: Create Dev Branch

```bash
# Create and switch to dev branch
git checkout -b dev

# Push dev branch to remote
git push -u origin dev
```

### Step 2: Set Up Vercel Projects

You'll create **two separate Vercel projects**:

#### A. Dev Project (for testing)

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Configure:
   - **Project Name**: `fantasy-cricket-league-dev` (or your preferred name)
   - **Framework Preset**: Create React App
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`
4. Go to **Settings → Git**
   - **Production Branch**: Set to `dev`
   - This ensures the dev site deploys from the `dev` branch
5. Note the deployment URL (e.g., `fantasy-cricket-league-dev.vercel.app`)

#### B. Prod Project (for production)

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import the **same** GitHub repository
3. Configure:
   - **Project Name**: `fantasy-cricket-league` (or your production name)
   - **Framework Preset**: Create React App
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`
4. Go to **Settings → Git**
   - **Production Branch**: Set to `main`
   - This ensures the prod site deploys from the `main` branch
5. Note the deployment URL (your production domain)

### Step 3: Optional - Custom Domains

- **Dev Site**: You can add a custom domain like `dev.yourdomain.com`
- **Prod Site**: Your main domain (e.g., `yourdomain.com`)

## Workflow

### Daily Development

```bash
# 1. Switch to dev branch
git checkout dev

# 2. Make your changes
# ... edit files ...

# 3. Commit and push to dev
git add .
git commit -m "Your feature description"
git push origin dev

# 4. Vercel will automatically deploy to DEV SITE
# 5. Test on the dev site URL
```

### Deploying to Production

Once you've tested on the dev site and everything works:

```bash
# 1. Ensure dev branch is up to date
git checkout dev
git pull origin dev

# 2. Switch to main branch
git checkout main
git pull origin main

# 3. Merge dev into main
git merge dev

# 4. Push to main (triggers PROD deployment)
git push origin main

# 5. Vercel will automatically deploy to PROD SITE
```

### Alternative: Using Pull Requests

For better code review:

```bash
# 1. Work on dev branch and push
git checkout dev
# ... make changes ...
git push origin dev

# 2. Create Pull Request: dev → main
# 3. Review the PR
# 4. Merge PR to main (triggers prod deployment)
```

## Environment Variables

If you need different environment variables for dev and prod:

### Dev Project
1. Go to Dev Project → **Settings → Environment Variables**
2. Add variables with **Environment**: `Production` (since it's the production branch for that project)

### Prod Project
1. Go to Prod Project → **Settings → Environment Variables**
2. Add variables with **Environment**: `Production`

## Benefits

✅ **Clean separation**: Dev and prod are completely isolated  
✅ **Safe testing**: Test on dev site before affecting production  
✅ **No merge complications**: Simple branch-based workflow  
✅ **Automatic deployments**: Both sites auto-deploy on push  
✅ **Easy rollback**: If prod breaks, just don't merge dev → main

## Quick Reference

| Branch | Vercel Project | Purpose |
|--------|---------------|---------|
| `dev` | `fantasy-cricket-league-dev` | Development & Testing |
| `main` | `fantasy-cricket-league` | Production (Live) |

## Troubleshooting

### Dev site not deploying?
- Check that the dev Vercel project has `dev` as the production branch
- Verify you pushed to `dev` branch, not `main`

### Prod site deploying from wrong branch?
- Check that the prod Vercel project has `main` as the production branch

### Need to test locally?
Need new?
```bash
npm start  # Runs on http://localhost:3000
```
