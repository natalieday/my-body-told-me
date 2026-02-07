# My Body Told Me

A cross-platform health tracking app for people who want to track their health, built with React Native and Expo.

## Features

- **Daily Check-In Logging**: Track symptoms, severity, sleep, stress, activity, food, medications, and triggers
- **Multi-Condition Support**: Track multiple conditions simultaneously
- **Streak System**: Duolingo-style streak tracking for consistent logging
- **Dashboard with Insights**: View trends and AI-generated insights about symptom patterns
- **History View**: Browse all past logs
- **Cross-Platform**: Runs on iOS, Android, and Web

## Tech Stack

- **Frontend**: React Native + Expo Router
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **AI**: OpenAI API for generating health insights
- **Authentication**: Supabase Email/Password Auth

## Project Structure

```
├── app/                          # Expo Router screens
│   ├── (tabs)/                   # Tab-based navigation
│   │   ├── today.tsx             # Daily check-in screen
│   │   ├── dashboard.tsx         # Trends & insights dashboard
│   │   ├── history.tsx           # Historical logs
│   │   └── settings.tsx          # Settings & sign out
│   ├── auth/                     # Authentication screens
│   ├── onboarding/               # Onboarding flow
│   └── _layout.tsx               # Root layout
├── lib/                          # Utilities
│   ├── supabase.ts               # Supabase client
│   ├── auth.ts                   # Auth functions
│   ├── streak.ts                 # Streak calculation
│   ├── ai-insights.ts            # AI insights API call
│   └── types.ts                  # TypeScript types
├── context/                      # React context
│   └── AuthContext.tsx           # Authentication state
└── supabase/functions/           # Edge functions
    └── ai-insights/              # AI insight generation
```

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- An OpenAI API key

### Environment Variables

The app uses Supabase for data storage and authentication. Environment variables are already configured in `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

To enable AI insights, configure the OpenAI API key in your Supabase project:

1. Go to your Supabase project settings
2. Navigate to Edge Function secrets
3. Add `OPENAI_API_KEY` with your OpenAI API key

### Installation

```bash
npm install
```

### Running the App

#### Development (Web)

```bash
npm run dev
```

This starts the development server. You can then access the app on your browser.

#### Building for Web

```bash
npm run build:web
```

#### Mobile (Expo)

To run on iOS/Android, use the Expo Go app:

```bash
npm run dev
```

Scan the QR code with the Expo Go app on your device.

## Database Schema

The app uses the following tables:

- **users**: User profiles with streak tracking
- **conditions**: Predefined condition list
- **user_conditions**: Many-to-many relationship (users → conditions)
- **daily_logs**: Daily check-in records
- **daily_log_conditions**: Per-condition severity for each log
- **external_metrics**: For future wearable integrations
- **ai_insights**: Cached AI-generated insights

All tables have Row Level Security (RLS) enabled to ensure users can only access their own data.

## API Routes

### AI Insights Edge Function

**Endpoint**: `/functions/v1/ai-insights`

**Method**: POST

**Body**:
```json
{
  "userId": "user-uuid",
  "days": 30
}
```

**Response**:
```json
{
  "insights": "string with AI-generated insights",
  "logsAnalyzed": 15,
  "daysAnalyzed": 30
}
```

The function:
1. Fetches user's logs from the specified period
2. Sends data to OpenAI for analysis
3. Returns insights about patterns and potential triggers
4. Caches results in the `ai_insights` table

## Key Features in Detail

### Daily Check-In

The "Today" screen allows users to log:
- Overall symptom severity (0-10)
- Per-condition severity for tracked conditions
- Sleep hours and quality
- Stress level
- Activity level
- Food notes
- Medications
- Triggers (catch-all for environmental/situational factors)

### Streak System

- Current streak: Consecutive days of logging
- Longest streak: Best performance to date
- Streaks reset if a day is skipped
- Displayed prominently on the dashboard

### Dashboard

Shows at a glance:
- Current and longest streaks
- Average symptom severity (last 30 days)
- Number of "flare days" (severity ≥ 7)
- Recent logs summary
- AI-generated insights with refresh capability

### History

Browse all past logs with:
- Date
- Overall severity with color-coded badge
- Summary of key logged data
- Quick reference for pattern spotting

## Security

- All user data is protected by Row Level Security (RLS)
- Users can only access their own data
- Authentication via Supabase Auth
- API keys are securely stored in environment variables
- Edge functions validate user ID from JWT tokens

## Development Notes

- The app is mobile-first with responsive design
- Color scheme uses Indigo (#6366f1) as primary
- Icons from Lucide React Native
- StyleSheet used for all styling (no NativeWind)
- TypeScript used throughout for type safety

## Future Enhancements

- Integration with Apple Health / HealthKit
- MyFitnessPal food logging integration
- Wearable device integration (Fitbit, Oura, etc.)
- Custom notifications and reminders
- Data export functionality
- Dark mode
- Multiple language support

## Support

For issues or questions, please refer to the [Expo documentation](https://docs.expo.dev/) and [Supabase documentation](https://supabase.com/docs).

<img width="285" height="464" alt="image" src="https://github.com/user-attachments/assets/b0e4477c-5d7f-4ae8-b6e2-d611ac26ffd1" />

<img width="284" height="474" alt="image" src="https://github.com/user-attachments/assets/da6326d1-d8a1-448d-bf2f-fa91f56ca800" />

<img width="290" height="484" alt="image" src="https://github.com/user-attachments/assets/b6c3b81d-570e-4f7f-9a69-fb2fdbbdf8cb" />

<img width="287" height="453" alt="image" src="https://github.com/user-attachments/assets/9670ff1f-c585-4273-8721-4615c6546b2a" />




