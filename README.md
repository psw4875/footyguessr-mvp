# ⚽ FootyGuessr

> A real-time football match guessing game inspired by GeoGuessr  
> **Live:** [footyguessr.io](https://footyguessr.io) | **한국어:** [README.ko.md](README.ko.md)

---

## 🎯 Project Overview

**FootyGuessr** is a web-based guessing game where players identify iconic football matches from a single image. Built by a non-CS Business major, this project demonstrates end-to-end product development—from ideation to a live service with real users.

**Why I built this:**
- Passion for football + interest in interactive web games
- Wanted to prove I could build and ship a complete product independently
- Learn modern web development while solving a real UX challenge: making football trivia engaging and competitive

---

## ✨ Key Features

### 🎮 Three Game Modes
- **60s Rush** — Solo time-attack mode with adaptive difficulty
- **Daily Challenge** — Compete globally on a fixed puzzle each day
- **1v1 PvP Battles** — Real-time multiplayer with WebSocket matchmaking

### 🏗️ Technical Highlights
- Real-time bidirectional communication via **Socket.IO**
- Scalable room-based architecture for PvP gameplay
- Responsive UI with **Chakra UI** and optimized for mobile
- User analytics integrated with **Google Analytics 4**
- SEO-optimized with dynamic meta tags for sharing

### 📊 Product Thinking
- Built an MVP within 3 weeks, iterating based on user feedback
- Implemented fair scoring system: +5 for correct teams, +10 for exact score
- Designed graceful disconnect handling to prevent abuse in competitive modes
- Curated 100+ high-quality match images covering club and international football

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js, React, Chakra UI |
| **Backend** | Node.js, Express, Socket.IO |
| **Deployment** | Vercel (frontend), Google Cloud Run (backend) |
| **Analytics** | Google Analytics 4 |
| **Data** | CSV-based question bank (normalized on server start) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/footyguessr-mvp.git
cd footyguessr-mvp

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../web
npm install
```

### Running Locally

**Terminal 1 — Backend:**
```bash
cd server
npm start
# Server runs on http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd web
npm run dev
# App runs on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
footyguessr-mvp/
├── server/              # Backend (Express + Socket.IO)
│   ├── index.js         # Main server logic
│   ├── lib/
│   │   └── roomStore.js # In-memory room management
│   └── data/
│       └── questions.csv
├── web/                 # Frontend (Next.js)
│   ├── pages/           # Routes
│   ├── components/      # React components
│   ├── engine/          # Game logic (scoring, adaptive difficulty)
│   └── lib/
│       └── socket.js    # Socket.IO client singleton
└── tools/               # Build scripts and utilities
```

---

## 🎓 What I Learned

As a **Business Administration major with no prior CS degree**, this project taught me:

- **Full-stack development**: Building and connecting frontend/backend systems
- **Real-time systems**: WebSocket architecture, state management, and sync challenges
- **Product management**: Prioritizing features, handling edge cases, and iterating on feedback
- **Deployment & DevOps**: CI/CD pipelines, environment variables, and production debugging
- **User-centric design**: Balancing competitive fairness with UX clarity

---

## 📈 Current Status

- ✅ Live at [footyguessr.io](https://footyguessr.io)
- ✅ 100+ curated match questions
- ✅ Mobile-responsive design
- ✅ Analytics tracking for user behavior insights
- 🔄 Ongoing improvements based on user feedback

---

## 📝 License

Proprietary. All rights reserved.

---

## 👤 Author

Built with ⚽ by a Business major learning to code.  
**Portfolio project** — demonstrating product thinking, technical execution, and end-to-end ownership.
