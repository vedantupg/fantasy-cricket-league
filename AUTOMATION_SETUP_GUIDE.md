# Transfer Window Automation - Quick Setup Guide

## What Was Created

### New Files
1. `src/utils/transferWindowAutomation.ts` - Core automation logic
2. `api/transfer-toggle-automator.ts` - API endpoint (called by GitHub Actions)
3. `.github/workflows/transfer-automation.yml` - GitHub Actions workflow
4. `TRANSFER_WINDOW_AUTOMATION.md` - Comprehensive documentation
5. `GITHUB_ACTIONS_SETUP.md` - GitHub Actions setup guide
6. `AUTOMATION_SETUP_GUIDE.md` - This file

### Modified Files
1. `src/types/database.ts` - Added automation fields to League type
2. `src/pages/EditLeaguePage.tsx` - Enhanced UI with automation controls
3. `.env.example` - Added required environment variables
4. `package.json` - Added firebase-admin and @vercel/node dependencies

## Quick Setup Steps

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Get Firebase Admin Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon → Project Settings
4. Go to "Service Accounts" tab
5. Click "Generate New Private Key"
6. Download the JSON file

### Step 3: Generate Cron Secret

Run in terminal:
```bash
openssl rand -base64 32
```

Copy the output - this is your `CRON_SECRET`.

### Step 4: Set Vercel Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables:

| Variable | Value | Source |
|----------|-------|--------|
| `FIREBASE_PROJECT_ID` | Your project ID | From Firebase JSON |
| `FIREBASE_CLIENT_EMAIL` | firebase-adminsdk-...@... | From Firebase JSON |
| `FIREBASE_PRIVATE_KEY` | -----BEGIN PRIVATE KEY----- ... | From Firebase JSON (keep the \n) |
| `CRON_SECRET` | Your generated secret | From Step 3 |

**Important:** 
- Set scope to "Production" and "Preview" 
- For `FIREBASE_PRIVATE_KEY`, keep it as one line with `\n` for newlines
- Example: `"-----BEGIN PRIVATE KEY-----\nMIIE....\n-----END PRIVATE KEY-----\n"`

### Step 5: Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these 2 secrets:

| Secret Name | Value |
|------------|-------|
| `CRON_SECRET` | (same value as Vercel) |
| `VERCEL_APP_URL` | `https://your-app.vercel.app` |

### Step 6: Deploy to Vercel

```bash
vercel --prod
```

### Step 7: Push to GitHub

```bash
git add .
git commit -m "feat: Add transfer window automation"
git push
```

### Step 8: Verify GitHub Actions is Running

1. Go to GitHub Repository → Actions tab
2. You should see: "Transfer Window Automation" workflow
3. Click "Run workflow" to test manually (or wait 10 minutes)
4. Check logs - should see ✅ success

### Step 7: Test the Automation

#### Option A: Wait for Cron (10 minutes)
Just wait and check the logs.

#### Option B: Manual Test
```bash
curl -X POST https://your-app.vercel.app/api/transfer-toggle-automator \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Replace:
- `your-app.vercel.app` with your actual Vercel URL
- `YOUR_CRON_SECRET` with your actual secret

### Step 8: Enable Automation for a League

1. Login as admin
2. Go to any league
3. Click "Edit League"
4. Scroll to "Transfer Window Management"
5. Toggle "Automatic Transfer Window Management" to ON
6. Make sure the league has a match schedule uploaded
7. Click "Save Changes"

## Verification Checklist

- [ ] Dependencies installed (`npm install` completed)
- [ ] Firebase Admin credentials obtained
- [ ] Cron secret generated
- [ ] All 4 environment variables set in Vercel
- [ ] 2 secrets added to GitHub (CRON_SECRET, VERCEL_APP_URL)
- [ ] Deployed to Vercel successfully
- [ ] Pushed to GitHub
- [ ] GitHub Actions workflow appears in Actions tab
- [ ] Manual test returns success response
- [ ] Automation enabled for at least one league
- [ ] Match schedule uploaded for that league
- [ ] Admin UI shows automation status

## Expected Behavior

### In Admin UI (EditLeaguePage)

When automation is enabled and schedule exists:
```
✅ Shows "WINDOWS OPEN" or "WINDOWS CLOSED" badge
✅ Shows "Automated" badge  
✅ Shows next change time with countdown
✅ Shows last automated update timestamp
```

When automation is disabled:
```
✅ Shows "Manual mode enabled" message
✅ Manual toggles are fully functional
✅ No automatic overrides
```

### In GitHub Actions Logs

Every 10 minutes you should see:
```
✅ Automation completed successfully
HTTP Status: 200
Response: {"success":true,"summary":{"totalLeagues":3,"updated":1,...}}
```

### In Vercel Function Logs

When GitHub Actions calls the API:
```
🤖 Transfer Toggle Automator: Starting...
Found X active leagues
✅ League abc123: Updated false → true
✅ League def456: Already in correct state (true)
⏭️  League ghi789: No schedule, skipping
🎉 Transfer Toggle Automator: Complete
```

## Troubleshooting

### Error: "Unauthorized"
- Check `CRON_SECRET` matches between GitHub Secret and Vercel env variable
- Verify Authorization header format

### Error: "No project ID"
- Check `FIREBASE_PROJECT_ID` is set in Vercel
- Verify all Firebase environment variables in Vercel

### Workflow Not Running
- Check GitHub Actions is enabled in repository settings
- Verify secrets are added to GitHub (not Vercel)
- Check workflow file is in `.github/workflows/` directory
- Wait 10 minutes after push, or trigger manually

### Automation Not Working
- Check league has `autoToggleEnabled: true`
- Verify match schedule is uploaded
- Check current time vs match schedule timing
- Review cron logs for specific league

### UI Not Showing Automation Status
- Hard refresh the page (Cmd/Ctrl + Shift + R)
- Check browser console for errors
- Verify league data is loaded

## Manual Testing

### Test via GitHub Actions (Recommended)

1. Go to GitHub → Actions tab
2. Click "Transfer Window Automation"
3. Click "Run workflow" button
4. Watch live logs
5. Should see ✅ success

### Test via Direct API Call

```bash
curl -X POST https://your-app.vercel.app/api/transfer-toggle-automator \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Testing Different Scenarios

### Test Case 1: Before Tournament Starts
- Current time: Before Day 1 last match ends
- Expected: Toggles should be OFF
- UI: Shows next change as "ENABLE" at Day 1 end time

### Test Case 2: After Day 1 Matches
- Current time: After 7:30 PM GMT on Day 1
- Expected: Toggles should be ON
- UI: Shows "WINDOWS OPEN" and next change as "DISABLE"

### Test Case 3: Before Day 2 Matches
- Current time: 15 mins before Day 2 first match
- Expected: Toggles should be OFF
- UI: Shows "WINDOWS CLOSED"

### Test Case 4: No Matches for Days
- Current time: Between match days with no matches
- Expected: Toggles stay ON (no change)
- UI: Shows "WINDOWS OPEN" and next change at next match day

### Test Case 5: After Tournament Ends
- Current time: After last match day ends
- Expected: Toggles should be OFF forever
- UI: Shows "Tournament complete - no more automatic changes"

### Test Case 6: Manual Override
1. Enable automation
2. Manually change toggles
3. Save
4. Wait for next cron run (up to 10 minutes)
5. Verify: Manual change persists until next scheduled time

## Advanced Configuration

### Change Cron Frequency

Edit `.github/workflows/transfer-automation.yml`:

```yaml
on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes instead of 10
```

Cron schedule format: `minute hour day month weekday`
- `*/10 * * * *` = Every 10 minutes (current)
- `*/15 * * * *` = Every 15 minutes
- `0 * * * *` = Every hour
- `0 */2 * * *` = Every 2 hours

### Customize Timing Rules

Edit `src/utils/transferWindowAutomation.ts`:

```typescript
// Change enable time (currently 7:30 PM GMT)
function calculateEnableTime(matchDay: MatchDay): Date {
  const enableTime = new Date(matchDay.dateObject);
  enableTime.setUTCHours(19, 30, 0, 0); // Change these values
  return enableTime;
}

// Change disable buffer (currently 15 minutes)
function calculateDisableTime(nextMatchDay: MatchDay): Date {
  const disableTime = new Date(nextMatchDay.firstMatchTime);
  disableTime.setMinutes(disableTime.getMinutes() - 15); // Change buffer
  return disableTime;
}
```

## Support

If you encounter issues:
1. Check GitHub Actions logs (Actions tab)
2. Check Vercel function logs (when API is called)
3. Review Firebase Admin permissions
4. Verify environment variables (Vercel) and secrets (GitHub)
5. Test API endpoint manually
6. Check match schedule format

## Next Steps

After successful setup:
1. Enable automation for all active leagues
2. Monitor GitHub Actions for first few runs
3. Verify toggle changes happen at expected times
4. Communicate to users about automatic windows
5. Update league rules/announcements

## Success Indicators

You'll know it's working when:
- ✅ GitHub Actions runs every 10 minutes without errors
- ✅ Leagues with schedules show automation status
- ✅ Toggles change automatically at scheduled times
- ✅ Manual overrides work correctly
- ✅ No errors in GitHub Actions or Vercel logs
- ✅ Users see window open/close automatically
