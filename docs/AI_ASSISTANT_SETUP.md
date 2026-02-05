# 🤖 AI League Assistant Setup Guide

## Overview

The AI League Assistant is powered by Google Gemini 1.5 Flash and provides intelligent, context-aware assistance for your fantasy cricket league.

## Features

### What Users Can Ask:

- **Squad Optimization**
  - "Who should I make my captain?"
  - "Suggest 3 transfers to improve my squad"
  - "Which players are underperforming?"

- **Performance Analysis**
  - "How is my squad performing?"
  - "Compare my squad with the league leader"
  - "Analyze my captain's performance"

- **Strategy Advice**
  - "What's the best bench transfer I can make?"
  - "How can I improve my squad to catch up?"
  - "Who are the top scorers in the league?"

### Key Capabilities:

✅ Natural language understanding
✅ Real-time data analysis from Firebase
✅ Personalized recommendations based on your squad
✅ League-wide statistical insights
✅ Transfer suggestions with reasoning
✅ Captain recommendations

---

## Setup Instructions

### 1. Get Your Free Gemini API Key

1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

**Free Tier Limits:**
- 60 requests per minute
- 1,500 requests per day
- More than enough for typical usage!

### 2. Add API Key to Environment

Create a `.env.local` file in the project root:

```bash
# Copy from .env.example
cp .env.example .env.local
```

Add your Gemini API key:

```env
REACT_APP_GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Restart Development Server

```bash
npm start
```

### 4. Test the Assistant

1. Navigate to any league page (Dashboard, Squad, Leaderboard)
2. Click the floating AI button (bottom-right corner)
3. Try asking: "Who should I make my captain?"

---

## Usage Guide

### Opening the Assistant

The AI assistant appears as a floating button with a robot icon on:
- League Dashboard
- Squad Selection
- Leaderboard

Click it to open the chat interface.

### Sample Conversations

**Example 1: Captain Recommendation**
```
User: Who should I make my captain?

AI: 🎯 Captain Recommendation:

Make Player A your captain!

Why?
• Highest points in your squad (245 pts)
• Consistently outperforming (avg 45 pts/match)
• Strong form in recent matches

Expected advantage: +30-40 points per match vs your current captain
```

**Example 2: Squad Analysis**
```
User: How is my squad performing?

AI: 📊 Your Squad Analysis:

Total Points: 1,247 (League avg: 1,180) ✅ +67
Rank: #12 of 50 (Top 24%)

Strengths:
• Batsmen are 12% above league average
• Captain picks have been solid

Weaknesses:
• Bowlers are 8% below league average
• 2 inactive players (no points in 3 weeks)

Recommendation: Consider replacing inactive players with in-form alternatives
```

**Example 3: Transfer Suggestions**
```
User: Suggest 3 transfers to improve my squad

AI: 💡 Transfer Recommendations:

You have 2 transfers remaining.

1. OUT: Player X (45 pts) → IN: Player Y (145 pts)
   Reason: Player Y has 100 more points and is in excellent form
   Impact: +100 points

2. Bench Transfer: Swap Player A with Player B
   Reason: Player B averages 35 pts/match (vs 18 for Player A)
   Impact: +51 points

3. Captain Change: Make Player Z your captain
   Reason: Highest scoring player (245 pts)
   Impact: Better banking potential

Total potential gain: ~150 points (could move you from #12 to #8)
```

---

## Technical Architecture

### Components

1. **LeagueAssistant.tsx**
   - Chat widget UI
   - Message history management
   - Context loading

2. **aiService.ts**
   - Gemini AI integration
   - Context building from Firebase
   - Prompt engineering

3. **LeagueLayout.tsx**
   - Wraps league pages
   - Provides AI assistant access

### Data Flow

```
User Question
    ↓
LeagueAssistant Component
    ↓
Fetch Context (Firebase)
    ├─ User Squad
    ├─ All League Squads
    ├─ Player Pool
    └─ League Settings
    ↓
Build Context (aiService)
    ↓
Query Gemini AI
    ↓
Format Response
    ↓
Display to User
```

### Context Provided to AI

The AI has access to:

- **User's Squad:**
  - All players and their points
  - Current captain, vice-captain, X-factor
  - Banked points
  - Transfers remaining

- **League Stats:**
  - Total participants
  - Average points
  - Top score
  - User's rank

- **Available Players:**
  - All players in the pool
  - Their points, roles, teams
  - Overseas status

---

## Performance & Costs

### Free Tier Analysis

For a league with 100 users:
- Average: 10 AI queries per user per day
- Total: 1,000 queries/day
- **Well within free tier (1,500/day)**

**Estimated Monthly Cost: $0** ✅

### Response Times

- Context loading: ~500ms
- AI response: ~1-2 seconds
- Total: ~1.5-2.5 seconds

---

## Best Practices

### For Users:

1. **Be Specific**
   - ❌ "Help me"
   - ✅ "Who should I captain this week?"

2. **Provide Context**
   - ❌ "Is this good?"
   - ✅ "Should I transfer out Player X who has 45 points?"

3. **Use Follow-ups**
   - The AI remembers recent conversation
   - Ask clarifying questions

### For Admins:

1. **Monitor API Usage**
   - Check Google AI Studio dashboard
   - Set up alerts for quota limits

2. **Rate Limiting (Optional)**
   - Consider client-side rate limiting
   - Prevent abuse: max 10 requests/minute per user

3. **Production Deployment**
   - Move API key to Firebase Cloud Functions
   - Never commit .env files to git

---

## Troubleshooting

### "AI service not configured"
- Check that `.env.local` exists
- Verify `REACT_APP_GEMINI_API_KEY` is set
- Restart development server

### "Failed to load context"
- User needs to create a squad first
- Check Firebase permissions
- Verify league data exists

### Slow Responses
- Normal: 1-2 seconds
- If slower, check network connection
- Firebase data fetching might be slow

### Quota Exceeded
- Free tier: 1,500 requests/day
- Solution: Wait 24 hours or upgrade plan
- Implement rate limiting

---

## Future Enhancements

### Phase 2 (Next Release):

- [ ] **Voice Input**
  - Speak questions instead of typing
  - Better mobile experience

- [ ] **Match Predictions**
  - Predict upcoming match outcomes
  - Suggest optimal lineups

- [ ] **Historical Trends**
  - "Show Player X's points trend"
  - Performance graphs

- [ ] **Notifications**
  - AI-powered transfer alerts
  - Form warnings for your players

### Phase 3 (Future):

- [ ] **Multi-language Support**
  - Hindi, Tamil, etc.

- [ ] **Advanced Analytics**
  - Points projections
  - Optimal transfer paths

- [ ] **Team Chat Integration**
  - Group discussions with AI
  - League-wide insights

---

## Migration to Cloud Functions

For production, move the AI service to Firebase Cloud Functions:

### Benefits:
- ✅ API key security (not exposed to client)
- ✅ Better rate limiting
- ✅ Monitoring and logging
- ✅ Cost control

### Implementation:

```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(functions.config().gemini.key);

export const leagueAssistant = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { question, conversationHistory } = data;
  const userId = context.auth.uid;

  // Fetch context and query AI
  // ... (same logic as aiService.ts)
});
```

Update client to call Cloud Function instead of direct API.

---

## Support

For issues or questions:
1. Check this guide first
2. Review error messages in console
3. Verify API key is valid
4. Check Firebase console for data issues

---

## Credits

- **AI Model:** Google Gemini 1.5 Flash
- **Integration:** @google/generative-ai SDK
- **UI Framework:** Material-UI
- **Backend:** Firebase Firestore

---

**Happy AI-assisted managing! 🚀**
