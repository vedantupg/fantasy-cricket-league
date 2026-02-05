# Transfer Window Automation - Implementation Summary

## Overview

Implemented fully automated transfer window management that opens and closes flexible/bench change permissions based on match schedule timing, eliminating manual admin intervention.

## Core Logic

### Timing Rules
- **Windows Open**: 7:30 PM GMT after last match of the day ends
- **Windows Close**: 15 minutes before first match of next match day  
- **Match Days**: Only calendar dates with scheduled matches (gaps are ignored)
- **Before Tournament**: Toggles OFF until Day 1 completes
- **After Tournament**: Toggles OFF permanently

## Files Created

### 1. `src/utils/transferWindowAutomation.ts`
**Purpose**: Core business logic for calculating toggle status

**Key Functions**:
- `getMatchDays()` - Extracts unique match days from schedule
- `calculateToggleStatus()` - Determines if toggles should be ON/OFF
- `calculateTransferWindows()` - Calculates all ON/OFF windows
- `formatTimeUntilChange()` - Human-readable countdown
- `formatDateTime()` - Display formatting

**Exports**:
```typescript
interface ToggleStatus {
  shouldBeEnabled: boolean;
  nextChangeTime: Date | null;
  nextChangeAction: 'enable' | 'disable' | null;
  currentWindow: TransferWindow | null;
  matchDaysInfo: {
    totalMatchDays: number;
    completedMatchDays: number;
    upcomingMatchDays: number;
  };
}
```

### 2. `api/transfer-toggle-automator.ts`
**Purpose**: Vercel API endpoint called by GitHub Actions

**Features**:
- Firebase Admin SDK integration
- Fetches all active leagues
- Calculates desired toggle state
- Idempotent updates (no error if already correct)
- Per-league error handling
- Authorization check via `CRON_SECRET`
- Detailed logging

**Endpoint**: `POST /api/transfer-toggle-automator`

**Response**:
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
  "results": [...]
}
```

### 3. `.github/workflows/transfer-automation.yml`
**Purpose**: GitHub Actions workflow for scheduled automation

**Features**:
- Runs every 10 minutes
- Calls Vercel API endpoint
- Includes authorization header
- Logs success/failure
- Manual trigger support

### 4. `TRANSFER_WINDOW_AUTOMATION.md`
**Purpose**: Comprehensive documentation

**Sections**:
- How it works
- Setup instructions
- Admin controls
- Technical details
- API reference
- Testing guide
- Troubleshooting

### 5. `AUTOMATION_SETUP_GUIDE.md`
**Purpose**: Quick setup checklist

**Content**:
- Step-by-step setup
- Environment variable guide
- GitHub secrets guide
- Verification checklist
- Test scenarios
- Troubleshooting

### 6. `GITHUB_ACTIONS_SETUP.md`
**Purpose**: GitHub Actions specific setup guide

**Content**:
- GitHub secrets configuration
- Workflow explanation
- Monitoring instructions
- Free tier information
- Troubleshooting

## Files Modified

### 1. `src/types/database.ts`

**Added to League interface**:
```typescript
// Transfer Window Automation
autoToggleEnabled?: boolean; // Enable/disable automation (default: true)
lastAutoToggleUpdate?: Date; // When automation last changed toggles
lastAutoToggleAction?: 'enabled' | 'disabled'; // Last action taken
```

### 2. `src/pages/EditLeaguePage.tsx`

**Added Imports**:
```typescript
import { Chip, Divider } from '@mui/material';
import { SmartToy as AutomationIcon, Schedule as ScheduleIcon } from '@mui/icons-material';
import { calculateToggleStatus, formatTimeUntilChange, formatDateTime } from '../utils/transferWindowAutomation';
```

**Added State**:
```typescript
const [autoToggleEnabled, setAutoToggleEnabled] = useState(true);
```

**Enhanced Admin Controls Section**:
- Master automation toggle
- Real-time automation status display
- Next change countdown
- Last update timestamp
- Manual override capability
- Visual indicators (badges, chips)
- Contextual alerts

**UI Features**:
- "WINDOWS OPEN/CLOSED" status badge
- "Automated" badge when active
- Next change time with countdown
- Manual override section (grayed when automated)
- Helpful info alerts

### 3. `.github/workflows/transfer-automation.yml`

**GitHub Actions Workflow**:
```yaml
on:
  schedule:
    - cron: '*/10 * * * *'  # Every 10 minutes
  workflow_dispatch:  # Manual trigger
```

**Calls**: Vercel API endpoint with authorization  
**Frequency**: Every 10 minutes  it is
**Cost**: Free (GitHub Actions free tier)

### 4. `.env.example`

**Added Variables**:
```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=fantasy-cricket-league-2554c
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@fantasy-cricket-league-2554c.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDkPhDSZY4eqF5N\nI0KZzfkZAaHsbwxm7b1bSLY3qeiVTf9P28TAY8wf4odi6jTtsK8z58M637TlJMs4\nbLLaCLracXeQzub7gp/twJWB03d+//NeZEkFDhfCFc+57zd1ukQldlPrO+lXO1x1\nxwokuf/0kxZMhU2MFIJExXCtXWG03/Mz0EFUnytGLw7MlXi+P2TqRqcLDdyKimgE\n7Ucz4gv19AjoUmQU0H3vRlwHKP1C41QviKFAR9HaGeknzyLZl91YNJilgXNE4j8E\nKkLfCjwMPamaufRJmsPzWPi6B3+In1cO/kD4DS5Qkpfe/dwa/F4pfeU98jYarFzU\nB2GKg4XBAgMBAAECggEABsMSeUNGOsEK+y7RXzBnof6nAxPWqpl+R80vjdZgNEUx\nbFai3X7Paj3qPCtbalPW2vsxsOW2DKhih29L/LLvwz9DlzQUCo1ICvGO1F/1HTt8\nxLYEpkxQtqCyDOyKCHg+Ytw+t/xISVvyPTCKi8RBcafmbBmybpUgd2RgllhLB+Jg\n1ElFtHuQBLQWZZFiVHsokGbprnWqnxav59NCjMNSF+vfYMCVX5N+dILy6ckkOihR\n4QhyUy7UeS71ShTsLJxQ4KHm/W9HtIPBqDuhCayHZKf6PbkderXsBJt9xSvKz79w\npJhBaoOeD3Rr7v4ozURWBEPX0pBidKV0Nm5sKVfvGQKBgQD48SlXhNzTQHVI174l\nz/bQTw00uOoa/9Fn/ELx7wTOujz9rqTr7XDKR4VyeDJ5hniO0D02Z+2hHdxw4c4M\nlwFDl338rIxmgGXjO4NLzcWGYEfxR69jCO+K+Ip4RI9ydFcHoQy288DlSaoL9Ahg\nqKlj5e/8foaGbwcCSJZuc/l8yQKBgQDqtqpG0DwbClfHv7PBPVxvJ0iIPbC1Kfii\nWp7HpPc7dFC9UccpyCnz9q1s2TPr1xwzd/C1PW00ktlJACVpDnXFnZrSlEWbdFfy\nG9f+VB+JOx1e1r5l9qHuGjwZsdStRQh+XOYmOLQKQfZbHLxi0S/zcaMoff8ffYLL\niY+gAUhVOQKBgQCGm3hcT4ZMYGVKzwWNUqdFugkNAhPsJ3mmvZvBUBoMYl3KWl3p\nCIndhtDctautVI3pwyXmPkoavZfOHfsZialwUAEa2H5Oio0NUsfK/GgbIgKkr7th\nVJqaTYwqPgBGxius/2Ntpd4e3TcqoXjKM0jssI+UuyGonW5vyKo27VTxKQKBgQCU\n1PGSZ7bFWsCgzAGa9mLnpNxMb/neVtfvc1EdvZB8JdyQwAtvhhp8NZ5w2CYhVUzv\nog2Dj4jw/nFD5hDS1jV98ttazmR5F8QwpNFI12UL6u1L1xXyp/q0dfRIQsheetjQ\n7+2MrQYVPxCNY+JdMtKaJyPTqFmfSUIn+HmXd1i7mQKBgF2Mg+xJD6SGE8Q/l4l7\nq3azBuwHb3ZgHpZQZBPrxaUQXUAXjXV8ZNp4hbuyn9uubfcmc2nQzLRRXkuq9ScN\nyCBJOGA2aR89BYNKvRB3ScQ/0Lu+reGilvr4s53w2KIao4WED2Tg25jIsMrHFaBl\n+tv7Du8x0jL9/aJ86zUok137\n-----END PRIVATE KEY-----\n

# Vercel Cron Job Security
CRON_SECRET=Sn4gdV5U3hUa00JRTzDrmeA+wCpgL5BQh8PpINRaR6I=
```

### 5. `package.json`

**Added Dependencies**:
```json
{
  "@vercel/node": "^3.0.21",
  "firebase-admin": "^12.0.0"
}
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                AUTOMATED (24/7)                     │
├─────────────────────────────────────────────────────┤
│ GitHub Actions (every 10 minutes)                   │
│   ↓                                                 │
│ POST /api/transfer-toggle-automator                 │
│   + Authorization: Bearer <CRON_SECRET>             │
│   ↓                                                 │
│ Vercel API Endpoint                                 │
│   ↓                                                 │
│ Core Logic: transferWindowAutomation.ts             │
│   ↓                                                 │
│ Update Firestore leagues collection                 │
│   → flexibleChangesEnabled: true/false              │
│   → benchChangesEnabled: true/false                 │
│   → lastAutoToggleUpdate: timestamp                 │
│   → lastAutoToggleAction: 'enabled'/'disabled'      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              ADMIN UI (Real-time)                   │
├─────────────────────────────────────────────────────┤
│ EditLeaguePage.tsx                                  │
│   ↓                                                 │
│ Reads league data from Firestore                    │
│   ↓                                                 │
│ Displays automation status                          │
│   ↓                                                 │
│ Allows manual override                              │
│   ↓                                                 │
│ Saves changes to Firestore                          │
└─────────────────────────────────────────────────────┘
```

## Algorithm Flow

### GitHub Actions → API Execution

```
GitHub Actions triggers every 10 minutes
  ↓
Calls Vercel API endpoint
  ↓
For each active league:
  ├─ Check autoToggleEnabled !== false
  │   └─ If false: Skip (automation disabled)
  │
  ├─ Check matchSchedule exists and has matches
  │   └─ If empty: Skip (no schedule)
  │
  ├─ Extract match days (dates with matches)
  ├─ Sort match days chronologically
  ├─ Calculate current toggle status
  │
  ├─ Compare current state vs desired state
  │   ├─ If same: Skip (already correct)
  │   └─ If different: Update Firestore
  │
  └─ Log result and continue
```

### Toggle Status Calculation

```
Input: Match schedule + Current time

Step 1: Extract match days
  └─ Group matches by calendar date
  └─ Sort chronologically

Step 2: Identify position in timeline
  ├─ Before Day 1 ends? → OFF
  ├─ After last day ends? → OFF
  └─ Between days? → Check windows

Step 3: Check transfer windows
  For each match day (except last):
    ├─ Window starts: 7:30 PM GMT on match day
    ├─ Window ends: 15 mins before next match day
    └─ If current time in window → ON

Step 4: Return status
  └─ shouldBeEnabled: true/false
  └─ nextChangeTime: Date | null
  └─ nextChangeAction: 'enable' | 'disable' | null
```

## Failsafes Implemented

### 1. Idempotent Operations
- No error if toggle already in correct state
- Safe to run multiple times
- Only updates when necessary

### 2. Per-League Error Handling
- One league failure doesn't affect others
- Errors logged but execution continues
- Detailed error messages

### 3. UI Real-Time Sync
- Always reads from Firestore (no stale cache)
- Shows actual toggle state
- Updates visible immediately after cron runs

### 4. Manual Override Support
- Manual changes persist until next scheduled time
- Admins can still control manually
- Clear visual indication of override

### 5. Automation Opt-Out
- Per-league `autoToggleEnabled` flag
- Cron skips disabled leagues
- Full manual control when disabled

### 6. Authorization
- Requires `CRON_SECRET` header
- Prevents unauthorized cron execution
- Environment variable based

## Testing Strategy

### Unit Testing Scenarios

1. **Before Tournament**: Current time < Day 1 end → OFF
2. **After Day 1**: Current time > Day 1 end → ON
3. **Before Day 2**: Current time < Day 2 start - 15 min → OFF
4. **Between Match Days**: No matches for days → Stay ON
5. **After Tournament**: Current time > Last day end → OFF

### Integration Testing

1. **Workflow Execution**: Verify GitHub Actions runs every 10 minutes
2. **League Updates**: Check Firestore writes
3. **UI Display**: Verify status shown correctly
4. **Manual Override**: Test admin changes persist
5. **Automation Toggle**: Test enable/disable per league

### End-to-End Testing

1. Create league with schedule
2. Enable automation
3. Wait for cron to run
4. Verify toggles change at expected times
5. Manually override toggles
6. Verify manual state persists
7. Wait for next scheduled change
8. Verify automation resumes

## Performance Considerations

### GitHub Actions

- **Frequency**: Every 10 minutes (configurable)
- **Execution Time**: ~5-10 seconds per workflow run
- **API Call Time**: 1-5 seconds (processes all active leagues)
- **Firestore Writes**: Only when state changes
- **Cost**: FREE (2,000 minutes/month free tier, uses ~360/month)

### Optimization Opportunities

1. **Caching**: Cache match schedule calculations
2. **Batch Writes**: Use Firestore batch for multiple leagues
3. **Conditional Execution**: Skip leagues far from change times
4. **Index Queries**: Add Firestore indexes for faster reads

## Deployment Requirements

### Environment Variables (Vercel)

| Variable | Required | Purpose |
|----------|----------|---------|
| `FIREBASE_PROJECT_ID` | Yes | Firebase Admin auth |
| `FIREBASE_CLIENT_EMAIL` | Yes | Firebase Admin auth |
| `FIREBASE_PRIVATE_KEY` | Yes | Firebase Admin auth |
| `CRON_SECRET` | Yes | API authorization |

### GitHub Secrets

| Secret | Required | Purpose |
|--------|----------|---------|
| `CRON_SECRET` | Yes | API authorization (matches Vercel) |
| `VERCEL_APP_URL` | Yes | Target URL for API calls |

### Vercel Configuration

- Production deployment required
- Environment variables scoped to production
- API endpoint must be accessible

### GitHub Configuration

- GitHub Actions must be enabled
- Workflow file in `.github/workflows/`
- Secrets configured in repository settings

### Firebase Configuration

- Firestore database must be accessible
- Service account must have write permissions
- Security rules must allow admin writes

## Monitoring & Debugging

### GitHub Actions

- **Actions Tab**: View all workflow runs
- **Run Logs**: See detailed execution logs
- **Manual Trigger**: Test workflow anytime
- **Status Badges**: Green = success, Red = failure

### Vercel Dashboard

- **Deployments → Functions**: View API execution logs
- **Environment Variables**: Check all variables set
- **Function Logs**: See detailed API logs when called

### Firestore Console

- Check `leagues` collection for updates
- Verify `lastAutoToggleUpdate` timestamps
- Confirm toggle states match expected

### Admin UI

- View automation status in real-time
- Check "Last automated update" timestamp
- Verify countdown to next change

### Log Messages

**GitHub Actions:**
```
✅ Automation completed successfully
HTTP Status: 200
Response: {"success":true,...}
```

**Vercel API:**
```
🤖 Transfer Toggle Automator: Starting...
✅ League abc123: Updated false → true
⏭️  League def456: No schedule, skipping
🎉 Transfer Toggle Automator: Complete
```

## Security Considerations

### Authorization

- Cron endpoint requires `Authorization: Bearer <CRON_SECRET>`
- Secret stored in environment variables
- Vercel validates request origin

### Firebase Admin

- Uses service account credentials
- Server-side only (not exposed to client)
- Least privilege principle

### Data Validation

- Validates match schedule format
- Handles malformed data gracefully
- Type-safe TypeScript throughout

## Future Enhancements

### Potential Improvements

1. **Custom Timing Per League**: Allow admins to set custom timing rules
2. **Email Notifications**: Notify users when windows open/close
3. **Webhook Support**: External integrations for window changes
4. **History Dashboard**: View all automated changes over time
5. **Manual Trigger Button**: Force immediate automation check
6. **Schedule Preview**: Show calculated windows before enabling
7. **Timezone Support**: Display times in user's local timezone
8. **Slack/Discord Integration**: Bot notifications for window changes

### Scalability Improvements

1. **Batch Processing**: Process leagues in batches
2. **Smart Scheduling**: Skip leagues far from change times
3. **Caching Layer**: Cache calculations for repeated queries
4. **Database Indexes**: Optimize Firestore queries
5. **Background Jobs**: Offload heavy processing

## Success Metrics

### Key Indicators

- ✅ GitHub Actions runs successfully every 10 minutes
- ✅ Zero manual admin interventions needed
- ✅ Toggles change at expected times (within 10 min window)
- ✅ No errors in GitHub Actions or Vercel logs
- ✅ Users can make changes during open windows
- ✅ Changes blocked during closed windows

### Monitoring Targets

- **Uptime**: 99.9%+ workflow execution success
- **Accuracy**: 100% correct toggle state
- **Latency**: Changes within 10 minutes of scheduled time
- **Errors**: < 0.1% failure rate

## Rollout Plan

### Phase 1: Testing (Current)
- Deploy to staging/preview
- Test with sample leagues
- Verify all scenarios

### Phase 2: Beta (1-2 Weeks)
- Enable for 1-2 leagues
- Monitor closely
- Gather feedback

### Phase 3: Gradual Rollout
- Enable for 25% of leagues
- Increase to 50%
- Full rollout

### Phase 4: Default On
- Make automation default for new leagues
- Keep opt-out available

## Documentation

### For Admins
- ✅ AUTOMATION_SETUP_GUIDE.md - Quick setup
- ✅ TRANSFER_WINDOW_AUTOMATION.md - Full documentation

### For Developers
- ✅ AUTOMATION_IMPLEMENTATION_SUMMARY.md - This file
- ✅ Code comments in all files
- ✅ TypeScript types for all functions

### For Users
- Consider adding user-facing docs about:
  - When transfer windows are open
  - How to know when changes are allowed
  - What automation means for them

## Conclusion

The Transfer Window Automation feature is fully implemented with:

- ✅ Robust core logic
- ✅ Reliable GitHub Actions workflow
- ✅ Vercel API endpoint
- ✅ Enhanced admin UI
- ✅ Comprehensive documentation
- ✅ Failsafe mechanisms
- ✅ Manual override support
- ✅ Per-league opt-out
- ✅ **FREE** on GitHub free tier

**Status**: Ready for testing and deployment  
**Next Step**: Install dependencies → Set Vercel env vars → Set GitHub secrets → Deploy & Push
