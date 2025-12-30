import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUESTIONS = JSON.parse(
  fs.readFileSync(path.join(__dirname, "questions.json"), "utf-8")
);

function normalizeMode(v) {
  const s = String(v || "").toUpperCase().trim();
  return (s === "CLUB" || s === "INTERNATIONAL") ? s : "ALL";
}

function _matchTypeOf(q) {
  try {
    const mt = (q?.meta?.matchType || "INTERNATIONAL").toUpperCase();
    return mt === "CLUB" ? "CLUB" : "INTERNATIONAL";
  } catch {
    return "INTERNATIONAL";
  }
}

function _filterIndexesByMode(mode) {
  const M = String(mode || "ALL").toUpperCase();
  if (M === "ALL") return Array.from({ length: QUESTIONS.length }, (_, i) => i);
  const want = M === "CLUB" ? "CLUB" : "INTERNATIONAL";
  const out = [];
  for (let i = 0; i < QUESTIONS.length; i++) {
    const mt = _matchTypeOf(QUESTIONS[i]);
    if (mt === want) out.push(i);
  }
  return out.length ? out : Array.from({ length: QUESTIONS.length }, (_, i) => i);
}

function _buildTeamOptionsForMode(mode) {
  const idxs = _filterIndexesByMode(mode || "ALL");
  const set = new Set();
  for (const idx of idxs) {
    const q = QUESTIONS[idx];
    const a = q?.correct?.teamA;
    const b = q?.correct?.teamB;
    if (a) set.add(String(a).trim());
    if (b) set.add(String(b).trim());
  }
  return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

const TEAM_OPTIONS = Array.from(
  new Set(
    QUESTIONS.flatMap((q) => [
      q?.correct?.teamA,
      q?.correct?.teamB,
    ])
  )
)
  .filter(Boolean)
  .map((s) => String(s).trim())
  .filter((s) => s.length > 0)
  .sort((a, b) => a.localeCompare(b));

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const REDIS_URL = process.env.REDIS_URL || null;
const DEBUG_PVP = (String(process.env.DEBUG_PVP || '').toLowerCase() === '1' || String(process.env.DEBUG_PVP || '').toLowerCase() === 'true');

import roomStore from "./lib/roomStore.js";

const app = express();

// ✅ Trust proxy for EB/nginx environment
app.set('trust proxy', true);

// ✅ CORS: Allow production domains + localhost
const allowedOrigins = [
  CLIENT_URL,
  "http://localhost:3000",
  "https://footyguessr.io",
  "https://www.footyguessr.io",
  "https://footyguessr-mvp.vercel.app",
];

console.log('[CORS] Allowed origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      // Return the specific requesting origin (not just true)
      console.log('[CORS] Allowing origin:', origin);
      callback(null, origin);
    } else {
      console.warn('[CORS] Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.get("/api/questions", (req, res) => {
  // Parse pool filter from query: ?pool=club or ?pool=national (default: all)
  const poolParam = String(req.query.pool || "").toUpperCase().trim();
  const requestedPool = (poolParam === "CLUB" || poolParam === "NATIONAL") ? poolParam : "ALL";
  
  // Normalize each question to ensure difficulty and matchType exist
  const normalized = QUESTIONS.map((q, idx) => {
    // Parse difficulty: try multiple sources, default to 2
    const rawDiff = q?.difficulty ?? q?.Difficulty ?? q?.meta?.difficulty ?? q?.meta?.Difficulty ?? q?.diff ?? q?.meta?.diff ?? null;
    const parsedDiff = Number(rawDiff);
    const difficulty = Number.isFinite(parsedDiff) ? Math.max(1, Math.min(5, Math.round(parsedDiff))) : 2;

    // Parse matchType: try multiple sources, default to INTERNATIONAL
    const rawType = q?.matchType ?? q?.type ?? q?.meta?.matchType ?? q?.meta?.type ?? "INTERNATIONAL";
    const matchType = String(rawType).toUpperCase() === "CLUB" ? "CLUB" : "INTERNATIONAL";

    return {
      ...q,
      id: q.id ?? `q_${idx}`,
      difficulty,
      meta: {
        ...(q.meta || {}),
        difficulty,
        matchType,
      },
    };
  });
  
  // Apply server-side filtering based on pool parameter
  let filtered = normalized;
  if (requestedPool === "CLUB") {
    filtered = normalized.filter(q => q.meta.matchType === "CLUB");
  } else if (requestedPool === "NATIONAL") {
    filtered = normalized.filter(q => q.meta.matchType === "INTERNATIONAL");
  }
  
  res.json(filtered);
});


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        // Return the specific requesting origin (not just true)
        callback(null, origin);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
  allowEIO3: true, // Backward compatibility
});

// If REDIS_URL is set, wire the socket.io redis adapter dynamically
if (REDIS_URL) {
  (async () => {
    try {
      const { createAdapter } = await import('@socket.io/redis-adapter');
      const { createClient } = await import('redis');
      _redisPub = createClient({ url: REDIS_URL });
      _redisSub = _redisPub.duplicate();
      await _redisPub.connect();
      await _redisSub.connect();
      io.adapter(createAdapter(_redisPub, _redisSub));
      console.log('[REDIS] socket.io adapter enabled');
    } catch (err) {
      console.error('[REDIS] adapter failed', err);
    }
  })();
}

// ===== In-memory state (MVP) =====
// Room storage is abstracted via `server/lib/roomStore.js` (in-memory).
// Swap the implementation later to a Redis-backed store without changing logic here.
const waitingInternational = []; // socket.id들 preferring INTERNATIONAL
const waitingClub = [];           // socket.id들 preferring CLUB
const waitingAll = [];            // socket.id들 preferring ALL
const rooms = roomStore; // keep Map-like API for existing code
const roomsByCode = new Map(); // code -> roomId
const socketRoom = new Map(); // socketId -> roomId for quick cleanup
const quitStats = new Map(); // key -> { quitTimestamps: number[], quitCountTotal: number, cooldownUntil: number }
const GRACE_MS = 10_000; // disconnect grace period for in-game

function removeFromQueue(queue, socketId) {
  const idx = queue.indexOf(socketId);
  if (idx >= 0) queue.splice(idx, 1);
  return idx >= 0;
}

function removeFromAllQueues(socketId) {
  const removedIntl = removeFromQueue(waitingInternational, socketId);
  const removedClub = removeFromQueue(waitingClub, socketId);
  const removedAll = removeFromQueue(waitingAll, socketId);
  if (DEBUG_PVP && (removedIntl || removedClub || removedAll)) {
    console.log("[QUEUE_CANCEL]", socketId, "removed", {
      international: removedIntl,
      club: removedClub,
      all: removedAll,
    });
  }
}

function trackSocketRoom(socketId, roomId) {
  if (!socketId) return;
  if (roomId) socketRoom.set(socketId, roomId);
  else socketRoom.delete(socketId);
}

function getPlayerKey(socket) {
  return socket?.data?.playerToken || socket?.data?.userId || socket?.id;
}

function recordQuit(socket, roomType) {
  if (roomType !== "QUICK") return;
  const key = getPlayerKey(socket);
  if (!key) return;
  const now = Date.now();
  const entry = quitStats.get(key) || { quitTimestamps: [], quitCountTotal: 0, cooldownUntil: 0 };
  // keep only last 2h
  entry.quitTimestamps = (entry.quitTimestamps || []).filter((t) => now - t <= 2 * 60 * 60 * 1000);
  entry.quitTimestamps.push(now);
  entry.quitCountTotal += 1;

  const quits10m = entry.quitTimestamps.filter((t) => now - t <= 10 * 60 * 1000).length;
  const quits60m = entry.quitTimestamps.filter((t) => now - t <= 60 * 60 * 1000).length;
  let cooldown = 0;
  if (quits60m >= 5) cooldown = 30 * 60 * 1000;
  else if (quits10m >= 2) cooldown = 5 * 60 * 1000;
  if (cooldown > 0) entry.cooldownUntil = Math.max(entry.cooldownUntil || 0, now + cooldown);
  quitStats.set(key, entry);
}

function checkCooldown(socket) {
  const key = getPlayerKey(socket);
  if (!key) return { blocked: false };
  const entry = quitStats.get(key);
  if (!entry) return { blocked: false };
  const now = Date.now();
  if ((entry.cooldownUntil || 0) > now) {
    return { blocked: true, cooldownUntil: entry.cooldownUntil };
  }
  return { blocked: false };
}

function finalizeForfeit(room, leaverSocketId, reason = "FORFEIT") {
  if (!room || !leaverSocketId) return;
  if (room.phase === "FINISHED" || room.isClosed) return;
  if (room.pendingForfeit && room.pendingForfeit.timer) clearTimeout(room.pendingForfeit.timer);
  room.pendingForfeit = null;
  const remaining = room.players.find((p) => p.socketId !== leaverSocketId);
  const winnerSocketId = remaining?.socketId || null;
  const finishedAt = Date.now();
  room.phase = "FINISHED";
  room.status = "GAME_END";
  room.finishedAt = finishedAt;
  room.result = { winnerSocketId, loserSocketId: leaverSocketId, reason, finishedAt, note: "WIN_BY_FORFEIT" };
  if (DEBUG_PVP) {
    console.log("[PVP] forfeit applied", { roomId: room.roomId, phase: room.phase, progressed: room.progressed, reason });
    console.log("[PVP] finished set", { roomId: room.roomId, phase: room.phase, result: room.result });
  }
  emitRoomState(room.roomId);
  const finishedPayload = {
    roomId: room.roomId,
    phase: room.phase,
    finishedAt,
    result: room.result,
    winnerSocketId,
    loserSocketId: leaverSocketId,
    reason,
    note: "WIN_BY_FORFEIT",
  };
  io.to(room.roomId).emit("pvp:finished", finishedPayload);
  const leaverSock = io.sockets.sockets.get(leaverSocketId);
  if (leaverSock) {
    leaverSock.emit("pvp:finished", { ...finishedPayload, note: "LOSS_BY_LEAVE" });
  }
}

// Redis adapter clients (optional)
let _redisPub = null;
let _redisSub = null;

function makeRound(room) {
  // room.questionDeck: 이번 방에서 쓸 문제 인덱스 덱 (중복 방지)
  if (!room.questionDeck || room.questionDeck.length === 0) {
    // 새 덱 생성(모드 기반 필터 + 셔플)
    const idxs = _filterIndexesByMode(room.mode || "ALL");
    if (DEBUG_PVP) {
      console.log("[DECK_BUILD]", "room", room.roomId || "unknown", "mode", room.mode || "ALL", "poolFiltered", idxs.length, "poolAll", QUESTIONS.length);
    }
    room.questionDeck = Array.from(idxs);
    for (let i = room.questionDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [room.questionDeck[i], room.questionDeck[j]] = [room.questionDeck[j], room.questionDeck[i]];
    }
  }

  const qIndex = room.questionDeck.pop();
  const q = QUESTIONS[qIndex];
  if (DEBUG_PVP) {
    console.log("[PICKED]", "room", room.roomId || "unknown", "mode", room.mode || "ALL", "matchType", _matchTypeOf(q), "index", qIndex, "image", q.imageUrl);
  }
  console.log("[Q_PICKED]", q.imageUrl);

  return {
    roundId: uuidv4(),
    imageUrl: q.imageUrl,     // ✅ web/public 기준 경로
    correct: q.correct,       // ✅ 문제별 정답
    startedAt: Date.now(),
    durationMs: 30_000,
    answers: {},
  };
}


function normTeam(s) {
  return String(s || "").trim().toLowerCase();
}

function parseScore(scoreStr) {
  // "7-1", "7:1", "7 - 1" 등 허용
  const s = String(scoreStr || "").trim();
  const m = s.match(/^(\d+)\s*[-:]\s*(\d+)$/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

function scoreAnswer(answer, correct) {
  const aA = normTeam(answer.teamA);
  const aB = normTeam(answer.teamB);

  const cA = normTeam(correct.teamA);
  const cB = normTeam(correct.teamB);

  // 팀이 정확히 같은 경기인지(순서 무관)
  const sameOrder = aA === cA && aB === cB;
  const swappedOrder = aA === cB && aB === cA;

  const teamsCorrect = sameOrder || swappedOrder;

  // 스코어 비교 (팀 순서에 따라 스코어도 뒤집어서 비교)
  const u = parseScore(answer.score);
  const c = parseScore(correct.score);

  let scoreCorrect = false;
  if (u && c) {
    const [u1, u2] = u;
    const [c1, c2] = c;

    if (sameOrder) scoreCorrect = u1 === c1 && u2 === c2;
    if (swappedOrder) scoreCorrect = u1 === c2 && u2 === c1;
  }

  if (teamsCorrect && scoreCorrect) return 10;
  if (teamsCorrect) return 5;
  return 0;
}

function emitRoomState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  if (DEBUG_PVP) {
    console.log("[ROOM_STATE_EMIT]", "room", roomId, "status", room.status, "mode", room.mode || "ALL", "round", room.currentRound);
  }
  const teamOptions = _buildTeamOptionsForMode(room.mode || "ALL");
  io.to(roomId).emit("ROOM_STATE", {
    roomId,
    status: room.status,
    phase: room.phase,
    mode: room.mode || "ALL",
    type: room.type || "QUICK",
    teamOptions: teamOptions,
    currentRound: room.currentRound,  
    maxRounds: room.maxRounds,
    progressed: !!room.progressed,
    result: room.result || null,
    isClosed: !!room.isClosed,
    players: room.players.map((p) => ({
      socketId: p.socketId,
      name: p.name,
      points: p.points,
      submitted: !!room.round?.answers?.[p.socketId],
      rematchRequested: !!(room.rematchVotes && room.rematchVotes[p.socketId]),
    })),
    round: room.round ? {
  roundId: room.round.roundId,
  imageUrl: room.round.imageUrl,
  startedAt: room.round.startedAt,
  durationMs: room.round.durationMs,
} : null,
  });
}

function startRound(roomId, countdownMs = 0) {
  const room = rooms.get(roomId);
  if (!room) return;

  if (room.phase === "FINISHED" || room.isClosed) {
    if (DEBUG_PVP) {
      console.log("[PVP] startRound blocked (finished/closed)", { roomId, phase: room.phase, isClosed: room.isClosed });
    }
    return;
  }

  if (DEBUG_PVP) {
    console.log("[ROUND_START]", roomId, "mode", room.mode || "ALL", "countdownMs", countdownMs);
  } else {
    console.log("[ROUND_START]", roomId, "countdownMs=", countdownMs);
  }

  if (room.currentRound >= room.maxRounds) return;

  room.currentRound += 1;

  // ✅ 서버 상태는 무조건 IN_ROUND
  room.status = "IN_ROUND";
  room.phase = "IN_GAME";
  room.progressed = true;

  // round 생성
  room.round = makeRound(room);

  // ✅ 시작 시간을 미래로(카운트다운)
  const now = Date.now();
  room.round.startedAt = now + Math.max(0, countdownMs);

  // ✅ 타이머는 "실제 시작 시간 + duration" 기준으로 걸어야 함
  room.roundTimer && clearTimeout(room.roundTimer);

  const msToTimeout = (room.round.startedAt - now) + room.round.durationMs + 300;

  room.roundTimer = setTimeout(() => {
    finishRound(roomId, "TIMEOUT");
  }, msToTimeout);

  // 라운드 시작 이벤트(클라가 startedAt 보고 TRANSITION/IN_ROUND 알아서 판단)
  io.to(roomId).emit("ROUND_START", {
    roomId,
    serverNow: Date.now(),
    currentRound: room.currentRound,
    maxRounds: room.maxRounds,
    round: {
      roundId: room.round.roundId,
      imageUrl: room.round.imageUrl,
      startedAt: room.round.startedAt,
      durationMs: room.round.durationMs,
    },
  });

  emitRoomState(roomId);
}





function finishRound(roomId, reason = "BOTH_SUBMITTED") {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.status !== "IN_ROUND") return;

  room.status = "ROUND_RESULT";
  room.roundTimer && clearTimeout(room.roundTimer);

  // 채점
  const results = room.players.map((p) => {
    const ans = room.round.answers[p.socketId];
    const points = ans ? scoreAnswer(ans, room.round.correct) : 0;
    p.points += points;
    return {
      socketId: p.socketId,
      name: p.name,
      answer: ans || null,
      gained: points,
      total: p.points,
    };
  });

  io.to(roomId).emit("ROUND_RESULT", {
    roomId,
    reason,
    correct: room.round.correct,
    results,
  });

  emitRoomState(roomId);

  // MVP: 1라운드만 하고 종료
  setTimeout(() => {
  const r = rooms.get(roomId);
  if (!r) return;

  if (r.currentRound < r.maxRounds) {
    startRound(roomId, 3000);   // ✅ 다음 라운드
  } else {
    endGame(roomId);      // ✅ 3라운드 끝 → 종료
  }
}, 1500);
}

function endGame(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.pendingForfeit && room.pendingForfeit.timer) clearTimeout(room.pendingForfeit.timer);
  room.pendingForfeit = null;
  const finishedAt = Date.now();
  room.status = "GAME_END";
  room.phase = "FINISHED";
  room.finishedAt = finishedAt;
  const sorted = [...room.players].sort((a, b) => b.points - a.points);
  const scoreboard = sorted.map((p) => ({
    socketId: p.socketId,
    name: p.name,
    points: p.points,
  }));
  const winner = scoreboard[0];
  const runnerUp = scoreboard[1];
  const isTie = winner && runnerUp && winner.points === runnerUp.points;
  const winnerSocketId = isTie ? null : winner?.socketId || null;
  const loserSocketId = isTie ? null : runnerUp?.socketId || null;
  room.result = {
    winnerSocketId,
    loserSocketId,
    reason: "GAME_END",
    finishedAt,
    scoreboard,
  };
  if (DEBUG_PVP) {
    console.log("[PVP] finished set", { roomId, phase: room.phase, result: room.result });
  }

  io.to(roomId).emit("GAME_END", {
    roomId,
    scoreboard,
  });

  io.to(roomId).emit("pvp:finished", {
    roomId,
    phase: room.phase,
    finishedAt,
    result: room.result,
    winnerSocketId,
    loserSocketId,
    reason: "GAME_END",
  });

  emitRoomState(roomId);
}

function handleLeaveOrDisconnect(socket, opts = {}) {
  const { isDisconnect = false, explicit = false, roomIdHint = null } = opts;
  const checked = new Set();
  const candidates = [];
  if (roomIdHint) candidates.push(roomIdHint);
  const mapped = socketRoom.get(socket.id);
  if (mapped && !candidates.includes(mapped)) candidates.push(mapped);

  // Fallback: scan all rooms if no direct hint
  if (candidates.length === 0) {
    for (const [rid] of rooms) {
      candidates.push(rid);
    }
  }

  for (const rid of candidates) {
    if (checked.has(rid)) continue;
    checked.add(rid);
    const room = rooms.get(rid);
    if (!room) continue;
    const playerIdx = room.players.findIndex((p) => p.socketId === socket.id);
    if (playerIdx === -1) continue;
    const player = room.players[playerIdx];

    // Guard: if match already finished or room closed, just cleanup without forfeit logic
    if (room.phase === "FINISHED" || room.isClosed) {
      if (DEBUG_PVP) {
        console.log("[PVP] leave ignored for forfeit (match already finished)", { roomId: rid, by: socket.id, isClosed: room.isClosed, phase: room.phase });
      }
      if (room.pendingForfeit && room.pendingForfeit.timer) clearTimeout(room.pendingForfeit.timer);
      room.pendingForfeit = null;
      // Notify remaining players even after finish (informational only)
      const remainingIds = room.players.filter((p) => p.socketId !== socket.id).map((p) => p.socketId);
      for (const remId of remainingIds) {
        const sockRemain = io.sockets.sockets.get(remId);
        if (sockRemain) {
          sockRemain.emit("pvp:opponent_left", {
            roomId: rid,
            phase: "FINISHED",
            reason: "LEFT_AFTER_FINISH",
            roomType: room.type,
          });
        }
      }
      if (DEBUG_PVP) {
        console.log("[PVP] opponent_left emitted after FINISHED", { roomId: rid, leaverId: socket.id, remainingIds });
      }
      room.players = room.players.filter((p) => p.socketId !== socket.id);
      room.ready && room.ready.delete && room.ready.delete(socket.id);
      trackSocketRoom(socket.id, null);
      if (room.players.length === 0) {
        if (room.code) roomsByCode.delete(room.code);
        rooms.delete(rid);
      } else {
        emitRoomState(rid);
      }
      continue;
    }

    const progressed = room.progressed || room.status === "IN_ROUND" || room.phase === "IN_GAME";

    // Disconnect grace window for in-game sessions
    if (isDisconnect && progressed) {
      const deadline = Date.now() + GRACE_MS;
      room.pendingForfeit && room.pendingForfeit.timer && clearTimeout(room.pendingForfeit.timer);
      room.pendingForfeit = {
        playerToken: player.playerToken,
        socketId: socket.id,
        deadline,
        reason: "DISCONNECT",
        timer: setTimeout(() => {
          if (room.pendingForfeit && room.pendingForfeit.playerToken === player.playerToken) {
            if (DEBUG_PVP) console.log("[PVP] forfeit timeout", rid, player.playerToken);
            finalizeForfeit(room, socket.id, "FORFEIT_TIMEOUT");
            room.pendingForfeit = null;
          }
        }, GRACE_MS),
      };
      player.disconnected = true;
      trackSocketRoom(socket.id, null);
      const remaining = room.players.find((p) => p.socketId !== socket.id);
      if (remaining) {
        io.to(remaining.socketId).emit("pvp:opponent_disconnected", {
          roomId: rid,
          deadlineSeconds: Math.ceil(GRACE_MS / 1000),
        });
      }
      if (DEBUG_PVP) {
        console.log("[PVP] pending forfeit", { roomId: rid, playerToken: player.playerToken, deadline });
      }
      continue;
    }

    // Explicit leave or non-progressed disconnect
    room.players = room.players.filter((p) => p.socketId !== socket.id);
    room.ready && room.ready.delete && room.ready.delete(socket.id);
    trackSocketRoom(socket.id, null);

    if (room.players.length === 0) {
      if (room.code) roomsByCode.delete(room.code);
      rooms.delete(rid);
      continue;
    }

    const remaining = room.players[0];
    const wasPaired = room.hadTwoPlayers || (room.status && room.status !== "WAITING");

    if (!wasPaired) {
      // still waiting for first opponent; keep room waiting
      room.status = "WAITING";
      room.phase = "WAITING";
      room.round = null;
      room.roundTimer && clearTimeout(room.roundTimer);
      room.roundTimer = null;
      // For PRIVATE games, notify opponent even if not paired
      if (room.type === "PRIVATE") {
        const sockRemain = io.sockets.sockets.get(remaining?.socketId);
        if (sockRemain) {
          sockRemain.emit("pvp:opponent_left", {
            roomId: rid,
            mode: "PRIVATE",
            reason: explicit ? "MENU" : "DISCONNECT",
            phase: room.phase,
          });
        }
      }
      if (DEBUG_PVP) {
        console.log("[LEAVE_NO_OPP]", rid, "by", socket.id, "status", room.status);
      }
      emitRoomState(rid);
      continue;
    }

    if (progressed) {
      if (room.type === "QUICK" && explicit) recordQuit(socket, room.type);
      if (DEBUG_PVP) {
        console.log("[PVP] forfeit applied", { roomId: rid, phase: room.phase, progressed, reason: explicit ? "FORFEIT" : "FORFEIT_TIMEOUT", roomType: room.type });
      }

      // PRIVATE: stop game immediately, mark abandoned, and notify remaining player
      if (room.type === "PRIVATE") {
        room.status = "ABANDONED";
        room.phase = "FINISHED";
        room.round = null;
        room.roundTimer && clearTimeout(room.roundTimer);
        room.roundTimer = null;
        const finishedAt = Date.now();
        const winnerSocketId = remaining?.socketId || null;
        room.finishedAt = finishedAt;
        room.result = {
          winnerSocketId,
          loserSocketId: socket.id,
          reason: explicit ? "FORFEIT" : "FORFEIT_TIMEOUT",
          finishedAt,
          note: "WIN_BY_FORFEIT",
        };
        emitRoomState(rid);
        const sockRemain = io.sockets.sockets.get(remaining.socketId);
        if (sockRemain) {
          sockRemain.emit("pvp:opponent_left", {
            roomId: rid,
            mode: "PRIVATE",
            reason: explicit ? "MENU" : "DISCONNECT",
            phase: "ABANDONED",
          });
        } else {
          io.to(rid).emit("pvp:opponent_left", {
            roomId: rid,
            mode: "PRIVATE",
            reason: explicit ? "MENU" : "DISCONNECT",
            phase: "ABANDONED",
          });
        }
      } else {
        // QUICK mode: apply forfeit
        finalizeForfeit(room, socket.id, explicit ? "FORFEIT" : "FORFEIT_TIMEOUT");
      }
      continue;
    }

    // Not progressed: mark abandoned without penalties
    room.status = "ABANDONED";
    room.phase = "FINISHED";
    room.round = null;
    room.roundTimer && clearTimeout(room.roundTimer);
    room.roundTimer = null;
    emitRoomState(rid);

    if (DEBUG_PVP) {
      console.log("[OPP_LEFT_EMIT]", rid, "remaining", remaining.socketId, {
        disconnect: isDisconnect,
        hadTwoPlayers: room.hadTwoPlayers,
        statusBefore: room.status,
      });
    }

    const sockRemain = io.sockets.sockets.get(remaining.socketId);
    if (sockRemain) {
      sockRemain.emit("pvp:opponent_left", { roomId: rid, disconnect: isDisconnect });
    } else {
      io.to(rid).emit("pvp:opponent_left", { roomId: rid, disconnect: isDisconnect });
    }
  }
}

function tryMatchmake() {
  // Process all queues and attempt to match players
  let matched = true;
  while (matched) {
    matched = false;

    // Rule 1: INTERNATIONAL preference
    if (waitingInternational.length >= 2) {
      const s1 = waitingInternational.shift();
      const s2 = waitingInternational.shift();
      const sock1 = io.sockets.sockets.get(s1);
      const sock2 = io.sockets.sockets.get(s2);
      if (sock1 && sock2) {
        createMatch(sock1, sock2, "INTERNATIONAL", "waitingInternational");
        matched = true;
        continue;
      }
    }

    // Rule 2: CLUB preference
    if (waitingClub.length >= 2) {
      const s1 = waitingClub.shift();
      const s2 = waitingClub.shift();
      const sock1 = io.sockets.sockets.get(s1);
      const sock2 = io.sockets.sockets.get(s2);
      if (sock1 && sock2) {
        createMatch(sock1, sock2, "CLUB", "waitingClub");
        matched = true;
        continue;
      }
    }

    // Rule 3: ALL preference tries to match with other queues first
    if (waitingAll.length >= 1) {
      // Try to match with INTERNATIONAL queue first
      if (waitingInternational.length >= 1) {
        const s1 = waitingAll.shift();
        const s2 = waitingInternational.shift();
        const sock1 = io.sockets.sockets.get(s1);
        const sock2 = io.sockets.sockets.get(s2);
        if (sock1 && sock2) {
          createMatch(sock1, sock2, "INTERNATIONAL", "waitingAll+waitingInternational");
          matched = true;
          continue;
        }
      }
      // Try to match with CLUB queue
      if (waitingClub.length >= 1) {
        const s1 = waitingAll.shift();
        const s2 = waitingClub.shift();
        const sock1 = io.sockets.sockets.get(s1);
        const sock2 = io.sockets.sockets.get(s2);
        if (sock1 && sock2) {
          createMatch(sock1, sock2, "CLUB", "waitingAll+waitingClub");
          matched = true;
          continue;
        }
      }
      // If two players in waitingAll, match them
      if (waitingAll.length >= 2) {
        const s1 = waitingAll.shift();
        const s2 = waitingAll.shift();
        const sock1 = io.sockets.sockets.get(s1);
        const sock2 = io.sockets.sockets.get(s2);
        if (sock1 && sock2) {
          createMatch(sock1, sock2, "ALL", "waitingAll");
          matched = true;
          continue;
        }
      }
    }

    // No match found
    break;
  }
}

function createMatch(sock1, sock2, mode, queueLabel) {
  const roomId = uuidv4();
  console.log("[MATCH]", sock1.id, "vs", sock2.id, "room", roomId, "mode", mode, "from queue", queueLabel);

  const roomState = {
    roomId,
    mode: mode,
    type: "QUICK",
    status: "MATCHED",
    phase: "READY",
    players: [
      { socketId: sock1.id, name: sock1.data.name || "P1", points: 0, playerToken: getPlayerKey(sock1) },
      { socketId: sock2.id, name: sock2.data.name || "P2", points: 0, playerToken: getPlayerKey(sock2) },
    ],
    questionDeck: [],
    round: null,
    roundTimer: null,
    ready: new Set(),
    currentRound: 0,
    maxRounds: 3,
    hadTwoPlayers: true,
    progressed: false,
  };

  rooms.set(roomId, roomState);

  sock1.join(roomId);
  sock2.join(roomId);
  trackSocketRoom(sock1.id, roomId);
  trackSocketRoom(sock2.id, roomId);

  io.to(roomId).emit("MATCH_FOUND", {
    roomId,
    players: roomState.players.map((p) => ({
      socketId: p.socketId,
      name: p.name,
    })),
  });

  emitRoomState(roomId);
}


// 방 코드용
function makeRoomCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}



io.on("connection", (socket) => {
  console.log("connected", socket.id);
  console.log("[META] TEAM_OPTIONS length:", TEAM_OPTIONS.length); 
  console.log("[META] sample:", TEAM_OPTIONS.slice(0, 5));
  socket.emit("META",{ teams: TEAM_OPTIONS})
  socket.on("GET_META", () => {
    socket.emit("META", { teams: TEAM_OPTIONS });
});
  socket.on("HELLO", ({ name, token }) => {
    socket.data.name = String(name || "Player").slice(0, 20);
    socket.data.playerToken = token || socket.data.playerToken || uuidv4();
    socket.emit("HELLO_ACK", { socketId: socket.id, name: socket.data.name, token: socket.data.playerToken });
  });

// ===== FRIEND INVITE ROOMS =====
socket.on("GET_ROOM_STATE", ({ roomId }) => {
  const room = rooms.get(roomId);
  if (room && room.players.some((p) => p.socketId === socket.id)) {
    console.log("[GET_ROOM_STATE] emitting for", roomId);
    emitRoomState(roomId);
  } else {
    socket.emit("ROOM_STATE_FAIL", { roomId, error: "NOT_FOUND" });
  }
});

socket.on("pvp:rejoin", ({ roomId, token }) => {
  const room = rooms.get(roomId);
  if (!room) return;
  const playerToken = token || socket.data.playerToken;
  if (!playerToken) return;
  const idx = room.players.findIndex((p) => p.playerToken === playerToken);
  if (idx === -1) return;

  const player = room.players[idx];
  player.socketId = socket.id;
  player.disconnected = false;
  socket.join(roomId);
  trackSocketRoom(socket.id, roomId);

  if (room.pendingForfeit && room.pendingForfeit.playerToken === playerToken) {
    clearTimeout(room.pendingForfeit.timer);
    room.pendingForfeit = null;
    io.to(roomId).emit("pvp:opponent_rejoined", { roomId });
    if (DEBUG_PVP) {
      console.log("[REJOIN] cleared pending forfeit", roomId, playerToken);
    }
  }
  emitRoomState(roomId);
});

socket.on("CREATE_ROOM", ({ mode } = {}) => {
  let code = makeRoomCode();
  while (roomsByCode.has(code)) code = makeRoomCode();

  const roomId = uuidv4();

  const roomState = {
    roomId,
    mode: normalizeMode(mode || "ALL"),
    type: "PRIVATE",
    code,
    status: "WAITING",
    phase: "WAITING",
    players: [{ socketId: socket.id, name: socket.data.name || "P1", points: 0, playerToken: getPlayerKey(socket) }],
    questionDeck: [],
    round: null,
    roundTimer: null,
    ready: new Set(),
    currentRound: 0,
    maxRounds: 3,
    rematch: {},
    hadTwoPlayers: false,
    progressed: false,
  };

  rooms.set(roomId, roomState);
  roomsByCode.set(code, roomId);
  socket.join(roomId);
  trackSocketRoom(socket.id, roomId);

  if (DEBUG_PVP) {
    console.log("[CREATE_ROOM]", "requestedMode", mode, "storedMode", roomState.mode, "roomId", roomId, "code", code);
  }
  socket.emit("ROOM_CREATED", { roomId, code });
  emitRoomState(roomId);
});

socket.on("pvp:rematch_request", ({ oldRoomId }) => {
  const room = rooms.get(oldRoomId);
  if (!room) return;
  if (room.phase !== "FINISHED") return;
  if (!room.players.some((p) => p.socketId === socket.id)) return;

  room.rematchVotes = room.rematchVotes || {};
  room.rematchVotes[socket.id] = true;

  if (DEBUG_PVP) {
    console.log("[REMATCH_VOTE]", oldRoomId, socket.id, Object.keys(room.rematchVotes).length);
  }

  emitRoomState(oldRoomId);

  // check if all players requested rematch
  const allRequested = room.players.length >= 2 && room.players.every((p) => room.rematchVotes[p.socketId]);
  if (allRequested) {
    const newRoomId = uuidv4();
    console.log("[REMATCH_START] creating new room", newRoomId, "from", oldRoomId);

    // Create new room with fresh state
    const newRoom = {
      roomId: newRoomId,
      type: room.type || "QUICK",
      mode: room.mode || "ALL",
      code: room.code || null,
      status: "MATCHED",
      phase: "READY",
      players: room.players.map((p) => ({
        socketId: p.socketId,
        name: p.name,
        points: 0,
        playerToken: p.playerToken,
      })),
      questionDeck: [],
      round: null,
      roundTimer: null,
      ready: new Set(),
      currentRound: 0,
      maxRounds: 3,
      hadTwoPlayers: true,
      progressed: false,
      rematchVotes: {},
      prevRoomId: oldRoomId,
      createdAt: Date.now(),
    };

    rooms.set(newRoomId, newRoom);

    // Move sockets to new room
    for (const player of room.players) {
      const sock = io.sockets.sockets.get(player.socketId);
      if (sock) {
        sock.leave(oldRoomId);
        sock.join(newRoomId);
        trackSocketRoom(player.socketId, newRoomId);
      }
    }

    // Lock old room
    room.isClosed = true;

    // Emit rematch started event
    io.to(newRoomId).emit("pvp:rematch_started", {
      newRoomId,
      mode: newRoom.mode,
      type: newRoom.type,
    });

    emitRoomState(newRoomId);

    // Rematch는 READY 없이 바로 다음 라운드로 진입시킨다
    startRound(newRoomId, 0);

    // Clean up old room after delay
    setTimeout(() => {
      if (room.code) roomsByCode.delete(room.code);
      rooms.delete(oldRoomId);
      if (DEBUG_PVP) console.log("[REMATCH_CLEANUP] deleted old room", oldRoomId);
    }, 30000);
  }
});

socket.on("JOIN_ROOM", ({ code }) => {
  const key = String(code || "").trim().toUpperCase();
  const roomId = roomsByCode.get(key);
  if (!roomId) return socket.emit("JOIN_ROOM_FAIL", { error: "NOT_FOUND" });

  const room = rooms.get(roomId);
  if (!room) return socket.emit("JOIN_ROOM_FAIL", { error: "NOT_FOUND" });
  if (DEBUG_PVP) {
    console.log("[JOIN_ROOM]", "roomId", roomId, "mode", room.mode || "ALL");
  }
  if (room.players.length >= 2) return socket.emit("JOIN_ROOM_FAIL", { error: "FULL" });

  room.players.push({ socketId: socket.id, name: socket.data.name || "P2", points: 0, playerToken: getPlayerKey(socket) });
  room.status = "MATCHED";
  room.phase = "READY";
  room.hadTwoPlayers = true;

  socket.join(roomId);
  trackSocketRoom(socket.id, roomId);

  io.to(roomId).emit("MATCH_FOUND", {
    roomId,
    players: room.players.map((p) => ({ socketId: p.socketId, name: p.name })),
  });

  emitRoomState(roomId);
});





 socket.on("READY", ({ roomId }) => {
  const room = rooms.get(roomId);
  if (!room) return;

  // MATCHED일 때만 READY 받기
  if (room.status !== "MATCHED") return;

  room.ready.add(socket.id);
  console.log("[READY]", socket.id, room.ready.size);

  // 두 명 다 준비되면 3초 카운트다운 후 시작(서버는 IN_ROUND로 유지)
  if (room.ready.size === room.players.length) {
    startRound(roomId, 3000);
  }

  emitRoomState(roomId);
});



  socket.on("JOIN_QUEUE", ({ preferenceMode, mode } = {}) => {
    console.log("[JOIN_QUEUE]", socket.id, socket.data.name);
    const cooldown = checkCooldown(socket);
    if (cooldown.blocked) {
      socket.emit("quick:blocked", { cooldownUntil: cooldown.cooldownUntil, reason: "TOO_MANY_QUITS" });
      return;
    }
    const raw = preferenceMode ?? mode ?? "ALL";
    const m = String(raw).toUpperCase();
    const preference = (m === "INTERNATIONAL" || m === "CLUB") ? m : "ALL";
    socket.data.preferenceMode = preference;
    if (DEBUG_PVP) {
      console.log("[QUEUE_PREFERENCE]", "requested", raw, "stored", preference);
    }

    // Add to appropriate queue based on preference
    if (preference === "INTERNATIONAL") {
      if (!waitingInternational.includes(socket.id)) waitingInternational.push(socket.id);
    } else if (preference === "CLUB") {
      if (!waitingClub.includes(socket.id)) waitingClub.push(socket.id);
    } else {
      if (!waitingAll.includes(socket.id)) waitingAll.push(socket.id);
    }

    socket.emit("QUEUE_JOINED");
    tryMatchmake();
  });

  socket.on("quick:cancel", () => {
    removeFromAllQueues(socket.id);
    socket.emit("quick:cancelled");
  });

  socket.on("LEAVE_QUEUE", () => {
    removeFromAllQueues(socket.id);
    socket.emit("QUEUE_LEFT");
  });

  // Explicit leave from a room (client-initiated)
  socket.on("pvp:leave", ({ roomId } = {}) => {
    handleLeaveOrDisconnect(socket, { explicit: true, roomIdHint: roomId });
  });

  socket.on("SUBMIT_ANSWER", ({ roomId, answer }) => {
  const room = rooms.get(roomId);
  if (!room) {
    console.log("[SUBMIT_ANSWER] no room", roomId);
    return;
  }
  if (room.status !== "IN_ROUND") {
    console.log("[SUBMIT_ANSWER] wrong status", room.status, roomId);
    return;
  }

  // 룸 멤버 확인
  if (!room.players.some((p) => p.socketId === socket.id)) {
    console.log("[SUBMIT_ANSWER] not a member", socket.id, roomId);
    return;
  }

  // round/answers 안전장치
  if (!room.round) {
    console.log("[SUBMIT_ANSWER] room.round missing", roomId);
    return;
  }
  // ✅ 아직 시작 전이면 제출 막기
  if (Date.now() < room.round.startedAt) {
  console.log("[SUBMIT_ANSWER] too early (countdown)", roomId);
  return;
  }

  room.round.answers = room.round.answers || {};

  // 한 번만 제출 허용
  if (room.round.answers[socket.id]) {
    console.log("[SUBMIT_ANSWER] duplicate", socket.id, roomId);
    return;
  }

  room.round.answers[socket.id] = {
    teamA: answer?.teamA ?? "",
    teamB: answer?.teamB ?? "",
    score: answer?.score ?? "",
    submittedAt: Date.now(),
  };

  console.log(
    "[SUBMIT_ANSWER]",
    roomId,
    "by",
    socket.id,
    "answersCount=",
    Object.keys(room.round.answers).length,
    "players=",
    room.players.map((p) => p.socketId)
  );

  socket.to(roomId).emit("OPPONENT_SUBMITTED", { roomId });
  emitRoomState(roomId);

  const allSubmitted = room.players.every((p) => !!room.round.answers[p.socketId]);

  console.log("[ALL_SUBMITTED?]", roomId, allSubmitted);

  if (allSubmitted) finishRound(roomId, "BOTH_SUBMITTED");
});


  socket.on("disconnect", () => {
    console.log("disconnected", socket.id);
    // Remove from all queues
    removeFromAllQueues(socket.id);

    handleLeaveOrDisconnect(socket, { isDisconnect: true });
  });
});

app.get('/', (_, res) => {
  res.status(200).send('FootyGuessr server alive');
});

app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development',
    rooms: rooms.size || 0,
    timestamp: Date.now(),
  });
});

const PORT = process.env.PORT || 4000;

let _shuttingDown = false;
async function _shutdown(signal) {
  if (_shuttingDown) return;
  _shuttingDown = true;
  console.log('Shutting down server - signal=', signal);

  // stop accepting new connections
  server.close(async (err) => {
    if (err) console.error('Error closing server', err);
    try {
      // close socket.io (stops new connections and waits for existing to close)
      await io.close();
    } catch (e) {
      console.error('Error closing socket.io', e);
    }
    try {
      if (_redisPub) await _redisPub.quit();
      if (_redisSub) await _redisSub.quit();
    } catch (e) {
      // ignore
    }
    console.log('Shutdown complete');
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    console.warn('Forcing shutdown now');
    process.exit(1);
  }, 30_000).unref();
}

process.on('SIGTERM', () => _shutdown('SIGTERM'));
process.on('SIGINT', () => _shutdown('SIGINT'));

server.listen(PORT, '0.0.0.0', () => console.log(`[SERVER] listening on 0.0.0.0:${PORT}`));

