# ZenTube - Master Your Learning Flow

Transform your YouTube learning experience with real-time tracking, habit formation, and intelligent playlist management. Turn watching into achieving.

## Features

- **Real-time Tracking**: Monitor your learning progress as it happens with detailed analytics, time spent, completion rates, and learning velocity.
- **Habit Tracking**: Build consistent learning habits with streak tracking, daily goals, and personalized reminders.
- **Playlist Management**: Organize, prioritize, and manage your YouTube playlists with ease. Create learning paths and track progress across multiple topics.
- **AI-Powered Notes**: Generate comprehensive study notes from YouTube videos using Google Generative AI. Features include:
  - Automatic transcript extraction from YouTube videos
  - AI-powered conversion of transcripts into structured study notes
  - PDF generation with watermark ("Zentube 2025")
  - Daily usage limit (3 notes per day, resets at midnight IST)
  - Downloadable PDF format for offline studying

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety and better development experience
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Modern UI components
- **Lucide React** - Beautiful icons

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **NextAuth.js** - Authentication with Google OAuth
- **Supabase** - PostgreSQL database with real-time capabilities

## Project Structure

```
new-zentube-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # Backend API routes
│   │   │   ├── auth/          # NextAuth configuration
│   │   │   ├── users/         # User management endpoints
│   │   │   └── playlists/     # Playlist management endpoints
│   │   ├── dashboard/         # User dashboard page
│   │   ├── login/            # Authentication page
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Homepage
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # Shadcn UI components
│   │   ├── header.tsx       # Navigation header
│   │   └── providers.tsx    # Context providers
│   ├── lib/                 # Utilities and configurations
│   │   ├── supabase.ts      # Supabase client setup
│   │   └── utils.ts         # Utility functions
│   └── types/               # TypeScript type definitions
├── database/                # Database schema and migrations
└── public/                  # Static assets
```

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd new-zentube-app
npm install
```

### 2. Environment Variables

Copy the environment variables template:

```bash
cp .env.example .env.local
```

Fill in the required environment variables in `.env.local`:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# YouTube API
YOUTUBE_API_KEY=your-youtube-api-key

# Google Generative AI (for Notes feature)
GOOGLE_GENERATIVE_AI_API_KEY=your-google-generative-ai-api-key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 3. Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" and create an OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
6. Copy the Client ID and Client Secret to your `.env.local`

### 4. YouTube API Setup

1. In the same Google Cloud Console project
2. Enable the YouTube Data API v3
3. Create an API key (not OAuth credentials)
4. Copy the API key to your `.env.local` as `YOUTUBE_API_KEY`

### 5. Google Generative AI Setup (for Notes feature)

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Copy the API key to your `.env.local` as `GOOGLE_GENERATIVE_AI_API_KEY`

### 6. Supabase Setup

1. Create a new project at [Supabase](https://supabase.com/)
2. Go to Project Settings → API to get your URL and keys
3. Copy the Project URL, anon key, and service role key to your `.env.local`
4. Run the database schema:
   - Go to the SQL Editor in Supabase
   - Copy and run the contents of `database/schema.sql`

### 7. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## API Routes

### Authentication
- `GET/POST /api/auth/[...nextauth]` - NextAuth.js authentication endpoints

### Users
- `GET /api/users` - Get all users or specific user by ID
- `POST /api/users` - Create or update user

### Playlists
- `GET /api/playlists` - Get user's playlists
- `POST /api/playlists` - Create new playlist

### YouTube Integration
- `GET /api/youtube/playlist` - Fetch YouTube playlist data
- `GET /api/youtube/comments` - Fetch video comments
- `GET /api/youtube/transcript` - Extract video transcript

### Notes Feature
- `GET /api/notes/generate` - Check daily usage limit for notes generation
- `POST /api/notes/generate` - Generate AI-powered study notes from transcript
- `POST /api/notes/pdf` - Convert notes to PDF with watermark

## Database Schema

The application uses three main tables:

### Users Table
- `id` (text, primary key) - User ID from authentication provider
- `email` (text, unique) - User's email address
- `name` (text) - User's display name
- `avatar_url` (text) - Profile picture URL
- `created_at` (timestamp) - Account creation time
- `updated_at` (timestamp) - Last update time

### Playlists Table
- `id` (uuid, primary key) - Unique playlist identifier
- `user_id` (text, foreign key) - References users.id
- `title` (text) - Playlist title
- `description` (text) - Optional description
- `youtube_playlist_id` (text) - YouTube playlist ID
- `created_at` (timestamp) - Playlist creation time
- `updated_at` (timestamp) - Last update time

### Notes Usage Table
- `id` (uuid, primary key) - Unique usage record identifier
- `user_id` (text, foreign key) - References users.id
- `usage_date` (date) - Date in IST timezone
- `usage_count` (integer) - Number of notes generated on this date
- `created_at` (timestamp) - Record creation time
- `updated_at` (timestamp) - Last update time

## Next Steps

This foundation provides the basic structure for the ZenTube application. Future enhancements will include:

- YouTube API integration for playlist data
- Real-time progress tracking
- Advanced analytics and insights
- Habit tracking features
- Mobile responsiveness improvements
- Performance optimizations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
