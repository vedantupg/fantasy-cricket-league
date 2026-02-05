# GitHub Actions Setup for Transfer Window Automation

## Overview

We're using **GitHub Actions** instead of Vercel Cron Jobs to run the automation every 10 minutes for free.

---

## Setup Steps

### 1. Add GitHub Secrets

Go to your GitHub repository:

1. Click **Settings** (top menu)
2. Click **Secrets and variables** → **Actions** (left sidebar)
3. Click **New repository secret**

Add these 2 secrets:

#### Secret 1: `CRON_SECRET`
- **Name**: `CRON_SECRET`
- **Value**: (same value you used in Vercel environment variables)
- Click **Add secret**

#### Secret 2: `VERCEL_APP_URL`
- **Name**: `VERCEL_APP_URL`
- **Value**: `https://your-app.vercel.app` (your actual Vercel URL)
- Click **Add secret**

**Example:**
```
CRON_SECRET: abc123xyz789...
VERCEL_APP_URL: https://fantasy-cricket-league.vercel.app
```

---

### 2. Enable GitHub Actions

If your repository doesn't have Actions enabled:

1. Go to **Settings** → **Actions** → **General**
2. Under "Actions permissions", select:
   - ✅ **Allow all actions and reusable workflows**
3. Click **Save**

---

### 3. Commit and Push

The workflow file is at `.github/workflows/transfer-automation.yml`

```bash
# Add the new workflow file
git add .github/workflows/transfer-automation.yml

# Also commit the updated vercel.json (cron removed)
git add vercel.json

# Commit
git commit -m "feat: Switch to GitHub Actions for transfer automation

- Add GitHub Actions workflow for 10-minute automation
- Remove Vercel cron (free tier limitation)
- Works with Hobby/free tier"

# Push to your branch
git push
```

---

### 4. Verify Workflow is Running

1. Go to your GitHub repository
2. Click **Actions** tab (top menu)
3. You should see "Transfer Window Automation" workflow
4. It will start running automatically every 10 minutes
5. Click on a run to see logs

---

## Testing

### Manual Test (Before Waiting 10 Minutes)

1. Go to **Actions** tab
2. Click **Transfer Window Automation** (left sidebar)
3. Click **Run workflow** dropdown (right side)
4. Click **Run workflow** button
5. Watch the live logs

You should see:
```
✅ Automation completed successfully
HTTP Status: 200
Response: {"success":true,...}
```

---

## Monitoring

### Check Recent Runs

1. Go to **Actions** tab
2. Click **Transfer Window Automation**
3. See all recent runs (every 10 minutes)
4. Green checkmark = success ✅
5. Red X = failure ❌

### View Logs

Click on any run to see detailed logs:
- HTTP status code
- API response
- Success/failure message

---

## How It Works

```
Every 10 minutes:
  ↓
GitHub Actions triggers workflow
  ↓
Workflow calls: POST https://your-app.vercel.app/api/transfer-toggle-automator
  ↓
Includes: Authorization: Bearer <CRON_SECRET>
  ↓
Vercel API endpoint executes
  ↓
Updates league toggles in Firestore
  ↓
Returns success/failure response
  ↓
GitHub Actions logs result
```

---

## Troubleshooting

### Workflow Not Running

**Check:**
1. GitHub Actions is enabled in repository settings
2. Secrets are added correctly (no typos)
3. Workflow file is in `.github/workflows/` directory
4. File has `.yml` extension

### "Unauthorized" Error

**Fix:**
- Verify `CRON_SECRET` matches between:
  - GitHub Secret
  - Vercel environment variable
- Check for extra spaces or quotes

### "Connection Failed" Error

**Fix:**
- Verify `VERCEL_APP_URL` is correct
- Make sure it starts with `https://`
- No trailing slash: ✅ `https://app.vercel.app` ❌ `https://app.vercel.app/`

### API Returns 500 Error

**Fix:**
- Check Vercel environment variables are set:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
  - `CRON_SECRET`
- Check Vercel function logs

---

## Cost

### GitHub Actions Free Tier

- ✅ **2,000 minutes/month** for private repos
- ✅ **Unlimited for public repos**
- Each run takes ~5-10 seconds
- 10-minute interval = 4,320 runs/month
- Total: ~360 minutes/month (well under limit)

**Conclusion: Completely FREE! 🎉**

---

## Advantages Over Vercel Cron

✅ **Free** - No need to upgrade to Vercel Pro  
✅ **10-Minute Intervals** - Responsive automation  
✅ **Built-in Monitoring** - GitHub Actions UI  
✅ **Manual Trigger** - Test anytime via workflow_dispatch  
✅ **Logs** - See every execution  
✅ **Reliable** - GitHub's infrastructure  

---

## Disabling Automation

If you need to stop the automation:

### Temporary (Pause)

1. Go to **Actions** tab
2. Click **Transfer Window Automation**
3. Click **⋯** (three dots, top right)
4. Click **Disable workflow**

To re-enable: Same steps, click **Enable workflow**

### Permanent (Delete)

Delete the file:
```bash
git rm .github/workflows/transfer-automation.yml
git commit -m "Remove transfer automation workflow"
git push
```

---

## Alternative Schedules

Edit `.github/workflows/transfer-automation.yml`:

```yaml
schedule:
  - cron: '*/10 * * * *'  # Every 10 minutes (current)
  # - cron: '*/5 * * * *'   # Every 5 minutes
  # - cron: '*/15 * * * *'  # Every 15 minutes
  # - cron: '0 * * * *'     # Every hour
  # - cron: '0 */2 * * *'   # Every 2 hours
```

---

## Support

If issues persist:
1. Check GitHub Actions logs
2. Check Vercel function logs
3. Verify all secrets are set
4. Test manual trigger first
5. Check Firestore connectivity

---

## Summary

✅ Created: `.github/workflows/transfer-automation.yml`  
✅ Updated: `vercel.json` (removed Vercel cron)  
✅ Add GitHub Secrets: `CRON_SECRET` + `VERCEL_APP_URL`  
✅ Push to GitHub  
✅ Verify in Actions tab  

**Status: Free, automated, and reliable! 🚀**
