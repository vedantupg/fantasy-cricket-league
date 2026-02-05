# Transfer Window Automation - Quick Setup Guide

## What Was Created

### New Files
1. `src/utils/transferWindowAutomation.ts` - Core automation logic
2. `api/transfer-toggle-automator.ts` - Vercel serverless function (cron endpoint)
3. `TRANSFER_WINDOW_AUTOMATION.md` - Comprehensive documentation
4. `AUTOMATION_SETUP_GUIDE.md` - This file

### Modified Files
1. `src/types/database.ts` - Added automation fields to League type
2. `src/pages/EditLeaguePage.tsx` - Enhanced UI with automation controls
3. `vercel.json` - Added cron job configuration
4. `.env.example` - Added required environment variables
5. `package.json` - Added firebase-admin and @vercel/node dependencies

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

### Step 5: Deploy to Vercel

```bash
vercel --prod
```

### Step 6: Verify Cron Job is Running

1. Go to Vercel Dashboard → Your Project → Settings → Cron Jobs
2. You should see: `/api/transfer-toggle-automator` scheduled every 10 minutes
3. Wait 10 minutes and check Vercel Dashboard → Deployments → Functions
4. Click on `transfer-toggle-automator` to see logs

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
- [ ] Deployed to Vercel successfully
- [ ] Cron job appears in Vercel dashboard
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

### In Vercel Logs

Every 10 minutes you should see:
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
- Check `CRON_SECRET` is set correctly in Vercel
- Verify Authorization header in manual test

### Error: "No project ID"
- Check `FIREBASE_PROJECT_ID` is set
- Verify all Firebase environment variables

### Cron Not Running
- Check Vercel Dashboard → Settings → Cron Jobs
- Verify `vercel.json` was deployed
- Wait 10 minutes after deployment

### Automation Not Working
- Check league has `autoToggleEnabled: true`
- Verify match schedule is uploaded
- Check current time vs match schedule timing
- Review cron logs for specific league

### UI Not Showing Automation Status
- Hard refresh the page (Cmd/Ctrl + Shift + R)
- Check browser console for errors
- Verify league data is loaded

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

Edit `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/transfer-toggle-automator",
      "schedule": "*/15 * * * *"  // Every 15 minutes instead of 10
    }
  ]
}
```

Cron schedule format: `minute hour day month weekday`
- `*/10 * * * *` = Every 10 minutes
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
1. Check Vercel function logs
2. Review Firebase Admin permissions
3. Verify environment variables
4. Test API endpoint manually
5. Check match schedule format

## Next Steps

After successful setup:
1. Enable automation for all active leagues
2. Monitor cron logs for first few days
3. Verify toggle changes happen at expected times
4. Communicate to users about automatic windows
5. Update league rules/announcements

## Success Indicators

You'll know it's working when:
- ✅ Cron runs every 10 minutes without errors
- ✅ Leagues with schedules show automation status
- ✅ Toggles change automatically at scheduled times
- ✅ Manual overrides work correctly
- ✅ No errors in Vercel logs
- ✅ Users see window open/close automatically
