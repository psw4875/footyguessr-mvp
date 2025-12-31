# FootyGuessr ⚽

**Play now:** https://footyguessr.io

## Description

FootyGuessr is a football guessing game where you guess legendary matches, World Cups, and iconic football moments. Test your football knowledge against the clock, compete in daily challenges, or challenge players in real-time PvP matches.

## How to Play

- Look at the match image
- Guess the teams, score, and tournament
- Get scored and compete

## Game Modes

- **60s Rush**: Solo mode—how many matches can you identify in 60 seconds?
- **Daily Challenge**: A fixed daily puzzle. Compete on the global leaderboard.
- **1v1 PvP**: Real-time multiplayer—challenge a friend or wait for an opponent.

## Getting Started

### Requirements
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies for backend
cd server
npm install

# Install dependencies for frontend
cd ../web
npm install
```

### Running Locally

**Terminal 1 – Backend:**
```bash
cd server
npm start
# Runs on http://localhost:3001 (default)
```

**Terminal 2 – Frontend:**
```bash
cd web
npm run dev
# Runs on http://localhost:3000
```

Open http://localhost:3000 in your browser.

## Tech Stack

- **Frontend**: Next.js, React, Chakra UI
- **Backend**: Express.js, Socket.IO
- **Deployment**: Vercel (frontend), Cloud Run / similar (backend)

## License

Proprietary. All rights reserved.
