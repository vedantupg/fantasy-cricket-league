# Transfer Window Automation

## Overview

The Transfer Window Automation feature automatically manages when users can make flexible and bench changes to their squads based on the match schedule. This eliminates the need for admins to manually toggle these settings.

**Implementation:** GitHub Actions workflow runs every 10 minutes, calling a Vercel API endpoint that updates league toggles based on match schedules.

## How It Works

### Timing Rules

1. **Windows Open**: After the last match of the day ends (7:30 PM GMT)
2. **Windows Close**: 15 minutes before the first match of the next match day
3. **Before Tournament**: Toggles remain OFF until Day 1 matches complete
4. **After Tournament**: Toggles remain OFF forever

### Example Timeline

```
Day 1: Matches at 11 AM, 3 PM, 7 PM IST
  → Toggles OFF until 7:30 PM GMT
  → Toggles turn ON at 7:30 PM GMT

Day 2: Matches at 3 PM, 7 PM IST  
  → Toggles turn OFF at 9:15 AM GMT (15 mins before 3 PM IST)
  → Toggles turn ON at 7:30 PM GMT after matches

Day 3-4: No matches
  → Toggles remain ON (no change)

Day 5: Match at 7 PM IST (Final)
  → Toggles turn OFF at 1:15 PM GMT (15 mins before 7 PM IST)
  → After final match ends at 7:30 PM GMT: Toggles stay OFF forever
```

## Setup Instructions

### 1. Vercel Environment Variables

Add the following to your Vercel project environment variables (Dashboard → Settings → Environment Variables):

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Private_Key_Here\n-----END PRIVATE KEY-----\n"

# Cron Job Security
CRON_SECRET=your_random_secret_string
```

**Getting Firebase Admin Credentials:**
1. Go to Firebase Console > Project Settings
2. Navigate to Service Accounts tab
3. Click "Generate New Private Key"
4. Copy the values from the downloaded JSON file

**Generating CRON_SECRET:**
```bash
openssl rand -base64 32
```

### 2. GitHub Secrets

Add the following to your GitHub repository (Settings → Secrets and variables → Actions):

```bash
# GitHub Secrets (2 required)
CRON_SECRET=<same value as Vercel>
VERCEL_APP_URL=https://your-app.vercel.app
```

### 3. Install Dependencies

```bash
npm install
```

This will install:
- `firebase-admin`: For server-side Firebase access
- `@vercel/node`: For Vercel serverless function types

### 4. Deploy to Vercel

```bash
vercel --prod
```

### 5. Push to GitHub

```bash
git push
```

The GitHub Actions workflow will automatically start running every 10 minutes.

### 6. Verify GitHub Actions

1. Go to GitHub Repository → **Actions** tab
2. You should see: "Transfer Window Automation" workflow
3. Click **Run workflow** to test manually (or wait 10 minutes)
4. Check logs for success message

## Admin Controls

### Enabling Automation (Per League)

1. Go to Edit League page
2. Find "Transfer Window Management" section
3. Toggle "Automatic Transfer Window Management" to ON
4. Upload match schedule (if not already done)
5. Save changes

### Disabling Automation

1. Go to Edit League page
2. Toggle "Automatic Transfer Window Management" to OFF
3. Use manual toggles to control windows
4. Save changes

### Manual Override

Even with automation enabled, admins can manually toggle the switches. The manual state will persist until the next scheduled automation time.

## Admin UI Features

### Automation Status Display

When automation is enabled and a schedule is uploaded, admins see:

- **Current Status**: "WINDOWS OPEN" or "WINDOWS CLOSED"
- **Next Change**: When the next toggle will happen and what action (enable/disable)
- **Countdown**: Time remaining until next change (e.g., "3h 12m")
- **Last Update**: When automation last changed the toggles

### Manual Mode

When automation is disabled:
- Full manual control over toggle switches
- Changes take effect immediately upon saving
- No automatic overrides

## Technical Details

### GitHub Actions Frequency

- Runs every 10 minutes (`*/10 * * * *`)
- Can be adjusted in `.github/workflows/transfer-automation.yml`
- Completely free on GitHub (2,000 minutes/month free tier)

### Processing Logic

For each active league:
1. Check if automation is enabled (`autoToggleEnabled !== false`)
2. Check if match schedule exists
3. Calculate desired toggle state based on current time
4. Compare with current state
5. Update only if state needs to change (idempotent)
6. Log result and continue to next league

### Error Handling

- Per-league error handling (one league failure doesn't stop others)
- Detailed logging for debugging
- Idempotent updates (safe to run multiple times)
- Authorization check (requires `CRON_SECRET`)

## API Endpoint

### URL
```
POST /api/transfer-toggle-automator
```

### Authentication
```
Authorization: Bearer <CRON_SECRET>
```

### Response Format

```json
{
  "success": true,
  "timestamp": "2026-02-05T10:30:00.000Z",
  "summary": {
    "totalLeagues": 5,
    "updated": 2,
    "noChange": 2,
    "skipped": 1,
    "errors": 0
  },
  "results": [
    {
      "leagueId": "abc123",
      "name": "My League",
      "status": "updated",
      "from": false,
      "to": true,
      "timestamp": "2026-02-05T10:30:00.000Z"
    }
  ]
}
```

## Testing

### Manual Testing

You can manually test the API endpoint:

```bash
curl -X POST https://your-app.vercel.app/api/transfer-toggle-automator \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Test Scenarios

1. **Before Tournament**: Verify toggles stay OFF
2. **After Day 1 Matches**: Verify toggles turn ON
3. **Before Day 2 Matches**: Verify toggles turn OFF 15 mins before
4. **No Match Days**: Verify toggles stay ON during gaps
5. **After Tournament**: Verify toggles stay OFF
6. **Manual Override**: Verify manual changes persist until next scheduled time
7. **Automation Disabled**: Verify cron skips the league

## Troubleshooting

### Workflow Not Running

1. Check GitHub Repository → Settings → Actions (ensure Actions are enabled)
2. Verify `.github/workflows/transfer-automation.yml` exists
3. Check GitHub Secrets are added correctly
4. View workflow runs in Actions tab

### Toggle Not Updating

1. Verify `autoToggleEnabled` is true in league document
2. Check match schedule is uploaded
3. Verify environment variables are set correctly
4. Check GitHub Actions and API logs for specific league

### Authorization Errors

1. Verify `CRON_SECRET` matches between GitHub Secret and Vercel environment variable
2. Ensure Authorization header format is correct
3. Check both GitHub and Vercel secrets are set correctly

### Time Zone Issues

1. All calculations use GMT/UTC
2. Match times must be in GMT format
3. Verify `timeGMT` field in match schedule is correct

## Monitoring

### Logs to Check

1. **GitHub Actions Logs**: See workflow execution (Actions tab)
2. **Vercel Function Logs**: See API execution results
3. **Firestore Updates**: Check `lastAutoToggleUpdate` field
4. **Admin UI**: View "Last automated update" timestamp

### What to Monitor

- Successful updates per run (GitHub Actions)
- Errors or failures (check both GitHub and Vercel logs)
- Leagues being skipped (automation disabled or no schedule)
- Time accuracy (updates happening at expected times)

## Cost Considerations

### GitHub Actions (Free)

- **Free tier**: 2,000 minutes/month (private repos), unlimited (public repos)
- Running every 10 minutes ≈ 4,320 executions/month
- Each execution ~5-10 seconds
- **Total usage**: ~360 minutes/month
- **Cost**: $0 (well within free tier) ✅

### Vercel Function Calls

- Called by GitHub Actions (not billed separately for execution time)
- Standard Vercel function limits apply
- Free tier: 100 GB-hours/month
- Well within limits for most use cases

## Future Enhancements

Possible improvements:
- Per-league custom timing rules
- Email notifications when windows open/close
- Webhook support for external integrations
- Dashboard for viewing automation history
- Manual trigger button in admin UI

## Support

For issues or questions:
1. Check logs in Vercel Dashboard
2. Verify environment variables
3. Test manual API call
4. Check match schedule format
5. Review Firestore security rules
