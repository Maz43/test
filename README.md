# BidForge – Real-Time Auction Platform

BidForge is a full-stack auction platform featuring real-time bidding, credit-based economy, and AI-powered insights.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Framer Motion, Lucide Icons
- **Backend**: Node.js, Express, Socket.io
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini API

## Setup Instructions

### 1. Database Setup (Supabase)
1. Create a new project on [Supabase](https://supabase.com/).
2. Go to the **SQL Editor** and run the contents of `supabase_schema.sql`.
3. Go to **Project Settings > API** and copy your `URL` and `anon public` key.

### 2. Environment Variables
Create a `.env` file (or use the AI Studio Secrets panel) with:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Installation
```bash
npm install
```

### 4. Running the App
```bash
npm run dev
```

## AI Features
- **Admin**: "AI Generate" button in the creation modal uses Gemini to write professional item descriptions.
- **Bidder**: "Smart Bid Suggestions" in the bidding modal suggests competitive bid values based on current activity.

## Real-Time Logic
The app uses **Socket.io** to broadcast bid updates instantly. When a user places a bid, all other users viewing that auction see the price update without refreshing.
