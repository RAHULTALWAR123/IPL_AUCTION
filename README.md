# IPL Auction Website

A real-time IPL auction platform where users can build their dream teams through live auctions.

## Project Structure

```
IPL_Auction/
├── frontend/          # Next.js 15 application
│   ├── app/          # App Router pages and components
│   ├── components/   # Reusable React components
│   └── ...
├── supabase/         # Supabase configuration and migrations
│   ├── migrations/   # Database migrations
│   └── ...
└── README.md
```

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **Database & Auth**: Supabase (PostgreSQL + Auth + Realtime)
- **State Management**: Zustand
- **AI**: Gemini API
- **Deployment**: Vercel + Supabase

## Getting Started

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

### Supabase Setup

(To be configured)

## Features

- User authentication
- Team selection (10 IPL teams)
- AI auction mode
- Multiplayer auction rooms
- Real-time bidding
- Squad building
