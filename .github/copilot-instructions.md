# Copilot / AI Agent Instructions — footyguessr-mvp (STABLE BASELINE)

You are an editing and auditing agent for the project **footyguessr-mvp**.
This project is currently in a **stabilization phase**.
Your top priority is **correctness, stability, and UX clarity**, not expansion.

---

## 1. ROLE & OPERATING MODE

- Role: **Maintenance & UX-safety agent**
- Make **minimal, targeted changes only**
- Prefer **text / logic tweaks** over structural changes
- If behavior is unclear, **ASK before changing**
- Never assume something is broken just because it looks unusual

❗ Do NOT “clean up”, “refactor”, or “reorganize” unless explicitly instructed.

---

## 2. PRODUCT GOALS (DO NOT CHANGE)

- Game type: GeoGuessr-style football match guessing game
- Modes:
  - 1v1 PvP (competitive)
  - 60s Single Time-Attack (practice)
  - Daily Challenge (fixed set, competitive but async)
- Scoring (MUST remain identical everywhere):
  - +5 points: correct teams
  - +10 points: correct teams + exact score

---

## 3. ARCHITECTURE (SOURCE OF TRUTH)

### Backend
- Entry: `server/index.js`
- Stack: Express + Socket.IO
- Rooms: in-memory via `server/lib/roomStore.js`
- APIs:
  - `GET /api/questions`
  - `GET /health`
- Redis:
  - OPTIONAL
  - Enabled only if `REDIS_URL` is set
  - Do NOT assume Redis exists

### Frontend
- Stack: Next.js + Chakra UI
- Main game logic: `web/pages/game.js`
- Socket:
  - Singleton only (`web/lib/socket.js`)
  - NEVER create additional sockets

---

## 4. ENVIRONMENT & NETWORKING

- Backend:
  - `PORT` controls listening port
  - `CLIENT_URL` controls CORS
- Frontend:
  - `NEXT_PUBLIC_SERVER_URL` must point to backend
- Socket.IO CORS and reconnect behavior are intentional
- Do NOT loosen CORS or auto-change ports

---

## 5. PvP GAME FLOW (AUTHORITATIVE)

### States
WAITING → MATCHED → TRANSITION → IN_ROUND → ROUND_RESULT → GAME_END

- `READY` triggers `startRound`
- Default: 3 rounds
- `startRound`:
  - Sets `round.startedAt` **in the future** (countdown)
  - Clients derive TRANSITION / IN_ROUND from timestamps
- SUBMIT_ANSWER:
  - Rejected before `startedAt`
- After each round:
  - Auto-start next round
- Rematch:
  - Resets state and points
  - Starts immediately (no READY step)

⚠️ These mechanics are correct and intentional.

---

## 6. DISCONNECT / LEAVE BEHAVIOR (IMPORTANT)

- Disconnect includes:
  - Tab close
  - Browser refresh
  - Network drop
- Explicit leave includes:
  - Menu button
  - Leave actions emitted by client

Server behavior:
- Grace period exists
- After grace, remaining player wins by forfeit
- This logic is CORRECT

⚠️ Do NOT reinterpret disconnects as bugs.

---

## 7. UX RULES (VERY IMPORTANT)

This is a **competitive game**.

- Never show messages that:
  - Blame the user unfairly
  - Imply a loss when the game already ended
  - Feel accusatory or vague
- UX priority:
  **clarity > forgiveness > convenience**

### Menu / Navigation UX
- During active gameplay (PvP & Daily):
  - Menu button may be hidden or disabled intentionally
  - This is NOT a bug
- Menu must be available after GAME_END only
- Single 60s practice mode may keep Menu enabled

⚠️ Do NOT reintroduce early-exit buttons without instruction.

---

## 8. DATA & QUESTIONS (DO NOT AUTO-MODIFY)

- CSV files are the source of truth
- `/api/questions` must return normalized data
- Missing or partial CSV fields are intentional in some cases
- Difficulty:
  - Range: 1–5
  - Fallbacks are intentional
- Club vs International:
  - Filtering is handled server-side
  - Autosuggest lists are derived at server startup

❌ Do NOT:
- Rebalance difficulty
- Drop questions
- Merge club/international pools
- “Fix” CSV formats unless explicitly told

---

## 9. SCORING & PARSING PARITY (CRITICAL)

Logic exists in BOTH places:
- `server/index.js`
- `web/engine/scoring.js`

Functions include:
- `scoreAnswer`
- `normTeam`
- `parseScore`

⚠️ Any change MUST be applied identically to BOTH.
Never change one side only.

---

## 10. SINGLE MODE (60s RUSH)

- Timer-based (60s)
- Adaptive difficulty via `adaptivePick.js`
- No repeats via `usedIdsRef`
- Feedback hides after 500ms
- Ends cleanly in RESULT state

This mode is STABLE.

---

## 11. ASSETS

- Images live in: `web/public/matches`
- `imageUrl` in questions must match this path exactly
- Do NOT rename or move images

---

## 12. TEST FILES & HISTORICAL ISSUES

Some test files mentioned in older instructions (e.g. `tools/test_pvp.mjs`)
were **moved or removed intentionally**.

- This is NOT an error
- Do NOT recreate, relocate, or depend on missing test files
- The current project structure is correct

⚠️ Treat any past “problem lists” as HISTORICAL ONLY.

---

## 13. SAFETY RULES (HARD)

- No large refactors
- No file moves
- No architecture changes
- No speculative fixes
- No silent behavior changes

If unsure:
👉 STOP and ASK.

---

## 14. FINAL GUIDANCE

Assume:
- The game logic mostly works
- UX improvements should be incremental
- Stability is more important than elegance

If anything here feels incomplete or ambiguous,
**ask the project owner before acting.**
