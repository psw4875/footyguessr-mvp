import {
  Container,
  Box,
  Button,
  Input,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  useToast,
  FormControl,
  FormLabel,
  FormHelperText,
  FormErrorMessage,
  Grid,
  Alert,
  Progress,
  Spinner,
  Select,
  Tooltip,
  IconButton,
} from "@chakra-ui/react";
import { socket } from "../lib/socket";
import { trackEvent } from "../lib/analytics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import MetaHead from "../components/MetaHead";
import { scoreAnswer, pickAdaptiveQuestion } from "../engine";
import { MdShare } from "react-icons/md";

// ✅ Simple 1x1 gray blur placeholder (base64)
const BLUR_PLACEHOLDER = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8VAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";





// ✅ Unified API base URL: localhost detection for dev, production for others
const API_BASE = (() => {
  // Check environment variable first
  if (process.env.NEXT_PUBLIC_SERVER_URL) {
    return process.env.NEXT_PUBLIC_SERVER_URL;
  }
  // Auto-detect: localhost/127.0.0.1 = dev, otherwise = production
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:4000";
    }
  }
  // Production default
  return "https://api.footyguessr.io";
})();
const DEBUG_PVP = String(process.env.NEXT_PUBLIC_DEBUG_PVP || "").toLowerCase() === "1" || String(process.env.NEXT_PUBLIC_DEBUG_PVP || "").toLowerCase() === "true";

export async function getServerSideProps(ctx) {
  const mode = typeof ctx?.query?.mode === "string" ? ctx.query.mode : "";
  const code = typeof ctx?.query?.code === "string" ? ctx.query.code : "";
  return { props: { mode, code } };
}

function msLeft(startedAt, durationMs) {
  const now = Date.now();
  const start = startedAt ?? now;
  if (now < start) return 0;
  const left = start + durationMs - now;
  return Math.max(0, left);
}

// ✅ Safe localStorage access for SSR: returns null on server, actual value on client
function safeGetLS(key) {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// ✅ Safe localStorage set for SSR: no-op on server
function safeSetLS(key, value) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function normalizeTeam(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isValidTeam(s, teamsMap) {
  const norm = normalizeTeam(s);
  if (!norm) return false;
  return teamsMap.has(norm);
}

function playGameStartSound() {
  try {
    const audio = new Audio("/sfx/gamestart.mp3");
    audio.volume = 0.5;
    audio.play().catch((err) => {
      console.log("[GAMESTART_SFX] Audio play blocked or failed:", err);
    });
  } catch (err) {
    console.log("[GAMESTART_SFX] Audio creation failed:", err);
  }
}

/** ================== Single (그대로) ================== */
function SingleTimeAttack() {
  const router = useRouter();
  const toast = useToast();
  const [questions, setQuestions] = useState([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [targetDiff, setTargetDiff] = useState(1);
  const usedIdsRef = useRef(new Set());
  const [current, setCurrent] = useState(null);
  const [filterType, setFilterType] = useState("ALL"); // ALL | INTERNATIONAL | CLUB

  function readDifficulty(q) {
    const v =
      q?.difficulty ??
      q?.Difficulty ??
      q?.meta?.difficulty ??
      q?.meta?.Difficulty ??
      q?.diff ??
      q?.meta?.diff ??
      q?.correct?.difficulty ??
      q?.correct?.Difficulty;

    const n = Number(v);
    return Number.isFinite(n) ? n : 2; // fallback to 2 instead of null
  }

  useEffect(() => {
    let alive = true;
    setLoadingQ(true);
    setLoadErr("");

    // Build query string for pool filtering
    const poolParam = filterType === "ALL" ? "" : `?pool=${filterType.toLowerCase()}`;
    const url = `${API_BASE}/api/questions${poolParam}`;
    
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch questions from ${url} (HTTP ${r.status})`);
        return r.json();
      })
      .then((data) => {
        if (!alive) return;
        const rawQuestions = Array.isArray(data) ? data : [];
        
        // Defensive client-side filtering (belt-and-suspenders)
        let finalQuestions = rawQuestions;
        if (filterType !== "ALL") {
          finalQuestions = rawQuestions.filter((q) => {
            const mt = (q?.meta?.matchType || "INTERNATIONAL").toUpperCase();
            if (mt !== filterType) {
              // Sanity check: log any mismatched questions
              console.warn(`[Question Pool] Filtered out mismatched question:`, {
                id: q.id,
                imageUrl: q.imageUrl,
                tournament: q?.correct?.tournament,
                expectedType: filterType,
                actualType: mt
              });
              return false;
            }
            return true;
          });
        }
        
        setQuestions(finalQuestions);
        setLoadingQ(false);
      })
      .catch((e) => {
        if (!alive) return;
        setLoadErr(String(e?.message || e));
        setLoadingQ(false);
      });

    return () => {
      alive = false;
    };
  }, [filterType]);

  const teams = useMemo(() => {
    const set = new Set();
    for (const q of questions) {
      const a = q?.correct?.teamA;
      const b = q?.correct?.teamB;
      if (a) set.add(String(a).trim());
      if (b) set.add(String(b).trim());
    }
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [questions]);

  const teamsMap = useMemo(() => {
    const map = new Map();
    for (const t of teams) {
      const norm = normalizeTeam(t);
      if (norm) map.set(norm, t);
    }
    return map;
  }, [teams]);

  const [status, setStatus] = useState("READY");
  const [timeLeftMs, setTimeLeftMs] = useState(60_000);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [perfect, setPerfect] = useState(0);
  const [bothTeams, setBothTeams] = useState(0);
  const [oneTeam, setOneTeam] = useState(0);
  const [personalBest, setPersonalBest] = useState(0);
  const [todayBest, setTodayBest] = useState(0);

  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [teamAValid, setTeamAValid] = useState(false);
  const [teamBValid, setTeamBValid] = useState(false);
  const [teamAError, setTeamAError] = useState("");
  const [teamBError, setTeamBError] = useState("");
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");

  const [feedback, setFeedback] = useState(null);
  const timerRef = useRef(null);
  const startAtRef = useRef(0);
  const goatSoundPlayedRef = useRef(false);
  const goatSelectedSrcRef = useRef(null);
  const under20SoundPlayedRef = useRef(false);
  const leaderboardFetchedDateRef = useRef(null); // Guard: track last fetched date

  const imageSrc = useMemo(() => current?.imageUrl || "", [current]);

  // \u2705 Preload next image to improve perceived performance
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!imageSrc) return;
    const preloader = new window.Image();
    preloader.src = imageSrc;
    // Clean up reference
    return () => {
      preloader.src = "";
    };
  }, [imageSrc]);

  const [dailyMode, setDailyMode] = useState(false);
  const [dailyDeck, setDailyDeck] = useState([]);
  const dailyPosRef = useRef(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [userId, setUserId] = useState(null);
  const [localNick, setLocalNick] = useState("");
  const [clientId, setClientId] = useState(null); // Anonymous clientId for leaderboard
  const [leaderboardItems, setLeaderboardItems] = useState([]); // Top scores for today
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const goatSounds = useMemo(() => ["/sfx/goat1.mp3", "/sfx/goat2.mp3"], []);

  const getCanonicalTeam = useCallback(
    (value) => {
      const norm = normalizeTeam(value);
      if (!norm) return null;
      if (!isValidTeam(value, teamsMap)) return null;
      return teamsMap.get(norm) || null;
    },
    [teamsMap]
  );

  const handleTeamChange = useCallback(
    (value, setter, setValid, setError) => {
      const canonical = getCanonicalTeam(value);
      if (canonical) {
        setter(canonical);
        setValid(true);
        setError("");
      } else {
        setter(value);
        setValid(false);
        setError("");
      }
    },
    [getCanonicalTeam]
  );

  const finalizeTeamField = useCallback(
    (value, setter, setValid, setError) => {
      const trimmed = String(value || "").trim();
      if (!trimmed) {
        setter("");
        setValid(false);
        setError("");
        return;
      }
      const canonical = getCanonicalTeam(trimmed);
      if (canonical) {
        setter(canonical);
        setValid(true);
        setError("");
      } else {
        setter("");
        setValid(false);
        setError("Select a valid team from the list.");
      }
    },
    [getCanonicalTeam]
  );

  const sameTeam = useMemo(() => {
    if (!teamAValid || !teamBValid) return false;
    return normalizeTeam(teamA) === normalizeTeam(teamB);
  }, [teamA, teamB, teamAValid, teamBValid]);

  // Share results handler for Single mode
  const handleShareResults = async () => {
    const shareText = 
      `FootyGuessr — 60s Rush (Single)\n` +
      `Score: ${score} pts | Correct: ${solved} | Perfect: ${perfect}\n` +
      `Both teams: ${bothTeams} | One team: ${oneTeam}`;
    
    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : "https://footyguessr.io"}/game?mode=single`;
    // Full payload with URL for clipboard/sharing (appears only once in text)
    const fullPayload = `${shareText}\n\nPlay: ${shareUrl}`;

    let shareMethod = null;

    // Try Web Share API first
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        // Mobile: use text only, omit url param to prevent duplication
        await navigator.share({
          title: "FootyGuessr",
          text: fullPayload,
        });
        shareMethod = "web_share";
        toast({
          title: "Shared!",
          status: "success",
          duration: 1800,
          isClosable: true,
        });
      } catch (err) {
        // User cancelled or share failed (except user cancel)
        if (err.name !== "AbortError") {
          // Fall through to clipboard
          shareMethod = null;
        }
      }
    }

    // Fallback to clipboard if Web Share API unavailable or failed
    if (!shareMethod && typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        // Desktop: copy the full payload with result summary + URL
        await navigator.clipboard.writeText(fullPayload);
        shareMethod = "clipboard";
        toast({
          title: "Copied!",
          status: "success",
          duration: 1800,
          isClosable: true,
        });
      } catch (err) {
        toast({
          title: "Failed to copy",
          description: "Please try again.",
          status: "error",
          duration: 2000,
          isClosable: true,
        });
        return;
      }
    }

    // Track share event in GA4 if available
    if (shareMethod && typeof window !== "undefined" && window.gtag) {
      window.gtag?.("event", "share_result", {
        mode: "single",
        score,
        correct: solved,
        method: shareMethod,
      });
    }
  };

  // Submit daily challenge result to leaderboard
  const submitDailyToLeaderboard = async () => {
    // Guard: only submit if in daily mode with valid client ID and completed result
    if (!dailyMode || !clientId || status !== "RESULT") return;

    const serverUrl = API_BASE;
    const today = getDateKey(); // YYYY-MM-DD

    console.log("[LEADERBOARD] submit date=" + today);
    
    try {
      const response = await fetch(`${serverUrl}/api/leaderboard/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "daily",
          date: today,
          name: localNick || "Anonymous",
          clientId,
          score: Number(score ?? 0),
          solved: Number(solved ?? 0),
          correct: Number(solved ?? 0), // correct = solved count
          perfect: Number(perfect ?? 0),
          bothTeams: Number(bothTeams ?? 0),
          oneTeam: Number(oneTeam ?? 0),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[LEADERBOARD] submit success stored=" + data.stored);
        // Optionally track in GA
        trackEvent("leaderboard_submit", { mode: "daily", stored: data.stored });
      } else {
        console.warn("[LEADERBOARD] submit failed status=" + response.status);
      }
    } catch (err) {
      console.error("[LEADERBOARD] submit error", err);
    }
  };

  // Fetch today's leaderboard
  const fetchTodaysLeaderboard = useCallback(async (dateKey) => {
    const serverUrl = API_BASE;
    const today = dateKey || getDateKey(); // YYYY-MM-DD

    // Prevent duplicate fetch for same date
    if (leaderboardFetchedDateRef.current === today) {
      console.log("[LEADERBOARD] already fetched for date=" + today);
      return;
    }

    console.log("[LEADERBOARD] fetch date=" + today);
    leaderboardFetchedDateRef.current = today;
    
    setLeaderboardLoading(true);
    try {
      const response = await fetch(
        `${serverUrl}/api/leaderboard?mode=daily&date=${today}&limit=20`
      );

      if (response.ok) {
        const data = await response.json();
        setLeaderboardItems(data.items || []);
        console.log("[LEADERBOARD] fetch success fetched=" + (data.items?.length || 0) + " items");
      } else {
        console.warn("[LEADERBOARD] fetch failed status=" + response.status);
        setLeaderboardItems([]);
      }
    } catch (err) {
      console.error("[LEADERBOARD] fetch error", err);
      setLeaderboardItems([]);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  const startGame = () => {
    if (!questions.length) return;
    usedIdsRef.current = new Set();
    setTargetDiff(1);

    playGameStartSound();
    
    // Track game start event
    trackEvent("game_start", { mode: "practice" });

    let first = pickAdaptiveQuestion(questions, usedIdsRef.current, 1);
    // Fallback: if no question returned, pick any random from questions
    if (!first && questions.length > 0) {
      console.warn('[Single] pickAdaptiveQuestion returned null, using random fallback');
      first = questions[Math.floor(Math.random() * questions.length)];
    }
    if (first?.id) usedIdsRef.current.add(first.id);
    setCurrent(first);

    setScore(0);
    setSolved(0);
    setPerfect(0);
    setBothTeams(0);
    setOneTeam(0);
    setFeedback(null);

    setTeamA("");
    setTeamB("");
    setTeamAValid(false);
    setTeamBValid(false);
    setTeamAError("");
    setTeamBError("");
    setScoreA("");
    setScoreB("");

    setDailyMode(false);
    setStatus("PLAYING");
    setTimeLeftMs(60_000);
    startAtRef.current = Date.now();
    goatSoundPlayedRef.current = false;
    goatSelectedSrcRef.current = null;
    under20SoundPlayedRef.current = false;

    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startAtRef.current;
      const left = Math.max(0, 60_000 - elapsed);
      setTimeLeftMs(left);
      if (left <= 0) {
        clearInterval(timerRef.current);
        setStatus("RESULT");
      }
    }, 50);
  };

  function getDateKey() {
    // Use local timezone (not UTC) to ensure same date across all devices in same timezone
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function pickDailyDeck(questions, dateKey, count = 15) {
    const seed = [...dateKey].reduce((s, c) => s * 31 + c.charCodeAt(0), 7);
    const idxs = Array.from({ length: questions.length }, (_, i) => i);
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.abs((seed * (i + 1)) % (i + 1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    return idxs.slice(0, Math.min(count, idxs.length));
  }

  function ensureLocalUser() {
    if (typeof window === "undefined") return;
    try {
      let id = localStorage.getItem("fta_userId");
      if (!id) {
        id = `u_${Math.random().toString(36).slice(2,9)}`;
        localStorage.setItem("fta_userId", id);
      }
      setUserId(id);
      const nick = localStorage.getItem("fta_nick") || "Player";
      setLocalNick(nick);
    } catch (e) {}
  }

  const startDailyChallenge = () => {
    if (!questions.length) return;
    ensureLocalUser();
    const dk = getDateKey();
    const deck = pickDailyDeck(questions, dk, 15);

    playGameStartSound();
    
    // Track game start event for daily mode
    trackEvent("game_start", { mode: "daily" });

    setDailyDeck(deck);
    dailyPosRef.current = 0;
    usedIdsRef.current = new Set();
    const firstQ = questions[deck[0]];
    if (firstQ?.id) usedIdsRef.current.add(firstQ.id);
    setCurrent(firstQ);

    setScore(0);
    setSolved(0);
    setPerfect(0);
    setBothTeams(0);
    setOneTeam(0);
    setFeedback(null);
    setTeamA("");
    setTeamB("");
    setTeamAValid(false);
    setTeamBValid(false);
    setTeamAError("");
    setTeamBError("");
    setScoreA("");
    setScoreB("");

    setDailyMode(true);
    setStatus("PLAYING");
    setTimeLeftMs(60_000);
    startAtRef.current = Date.now();
    goatSoundPlayedRef.current = false;
    goatSelectedSrcRef.current = null;
    under20SoundPlayedRef.current = false;

    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startAtRef.current;
      const left = Math.max(0, 60_000 - elapsed);
      setTimeLeftMs(left);
      if (left <= 0) {
        clearInterval(timerRef.current);
        setStatus("RESULT");
      }
    }, 50);
  };

  // Auto-start daily if query param present (from Home CTA)
  useEffect(() => {
    const q = router.query || {};
    if (q.daily === '1' || q.daily === 1) {
      // only start if not already playing or played
      const dk = getDateKey();
      const played = safeGetLS(`fta_daily_${dk}`);
      if (!played) startDailyChallenge();
      if (q.leaderboard === '1') setShowLeaderboard(true);
    }
  }, [router.query]);

  // Initialize stable anonymous clientId on client only
  useEffect(() => {
    if (typeof window === "undefined") return;
    const existingId = safeGetLS("fg_client_id");
    if (existingId) {
      setClientId(existingId);
    } else {
      // Generate new crypto UUID if available, fallback to random string
      let newId;
      if (typeof window !== "undefined" && window.crypto?.randomUUID) {
        newId = window.crypto.randomUUID();
      } else {
        newId = `fg_${Math.random().toString(36).slice(2, 18)}_${Date.now().toString(36)}`;
      }
      safeSetLS("fg_client_id", newId);
      setClientId(newId);
    }
  }, []);

  // 결과 화면 사운드: 50점 이상은 염소 사운드 중 랜덤 1개, 20점 미만은 under20.mp3 (각각 한 번만)
  useEffect(() => {
    if (status === "RESULT" && score >= 50 && !goatSoundPlayedRef.current) {
      // Pick one sound only once per result
      if (!goatSelectedSrcRef.current) {
        const pick = Math.random() < 0.5 ? goatSounds[0] : goatSounds[1];
        goatSelectedSrcRef.current = pick;
      }
      const src = goatSelectedSrcRef.current;
      if (src) {
        goatSoundPlayedRef.current = true;
        try {
          const audio = new Audio(src);
          audio.volume = 0.5;
          audio.play().catch((err) => {
            console.log("[GOAT_SFX] Audio play blocked or failed:", err);
          });
        } catch (err) {
          console.log("[GOAT_SFX] Audio creation failed:", err);
        }
      }
      // guard: under20 sound should not play when >=60
      under20SoundPlayedRef.current = true;
    } else if (status === "RESULT" && score < 20 && !under20SoundPlayedRef.current) {
      under20SoundPlayedRef.current = true;
      goatSoundPlayedRef.current = true; // prevent goat from re-triggering if score changes unexpectedly
      try {
        const audio = new Audio("/sfx/under20.mp3");
        audio.volume = 0.5;
        audio.play().catch((err) => {
          console.log("[UNDER20_SFX] Audio play blocked or failed:", err);
        });
      } catch (err) {
        console.log("[UNDER20_SFX] Audio creation failed:", err);
      }
    }
    // 게임 재시작 시 플래그 리셋
    if (status === "PLAYING") {
      goatSoundPlayedRef.current = false;
      goatSelectedSrcRef.current = null;
      under20SoundPlayedRef.current = false;
    }
  }, [status, score, goatSounds]);

  const nextQuestion = () => {
    if (dailyMode && Array.isArray(dailyDeck) && dailyDeck.length > 0) {
      dailyPosRef.current = (dailyPosRef.current + 1) || 1;
      const pos = dailyPosRef.current;
      if (pos >= dailyDeck.length) {
        // loop or end - pick adaptive fallback
        let q = pickAdaptiveQuestion(questions, usedIdsRef.current, targetDiff);
        if (!q && questions.length > 0) {
          console.warn('[Single] nextQuestion: pickAdaptiveQuestion returned null, using random fallback');
          q = questions[Math.floor(Math.random() * questions.length)];
        }
        if (q?.id) usedIdsRef.current.add(q.id);
        setCurrent(q);
      } else {
        const idx = dailyDeck[pos];
        const q = questions[idx];
        if (q?.id) usedIdsRef.current.add(q.id);
        setCurrent(q);
      }
    } else {
      let q = pickAdaptiveQuestion(questions, usedIdsRef.current, targetDiff);
      if (!q && questions.length > 0) {
        console.warn('[Single] nextQuestion: pickAdaptiveQuestion returned null, using random fallback');
        q = questions[Math.floor(Math.random() * questions.length)];
      }
      if (q?.id) usedIdsRef.current.add(q.id);
      setCurrent(q);
    }

    setTeamA("");
    setTeamB("");
    setTeamAValid(false);
    setTeamBValid(false);
    setTeamAError("");
    setTeamBError("");
    setScoreA("");
    setScoreB("");
    goatSoundPlayedRef.current = false;
    goatSelectedSrcRef.current = null;
    under20SoundPlayedRef.current = false;
  };

  const canSubmitSingle = useMemo(() => {
    const filled = (v) => String(v || "").trim().length > 0;
    return (
      status === "PLAYING" &&
      teamAValid &&
      teamBValid &&
      !sameTeam &&
      filled(scoreA) &&
      filled(scoreB)
    );
  }, [status, teamAValid, teamBValid, sameTeam, scoreA, scoreB]);

  const submit = () => {
    if (status !== "PLAYING") return;
    if (!current) return;
    if (timeLeftMs <= 0) return;
    if (!teamAValid || !teamBValid || sameTeam) {
      toast({
        title: "Select teams from the list.",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }
    if (!canSubmitSingle) {
      toast({
        title: "Fill in all answers before submitting.",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    const sA = String(scoreA).trim();
    const sB = String(scoreB).trim();
    const scoreStr = sA !== "" && sB !== "" ? `${sA}-${sB}` : "";

    // Track answer submission event
    trackEvent("answer_submit", { 
      mode: dailyMode ? "daily" : "practice",
      round_number: solved + 1
    });

    // IMPORTANT: This scoring logic is shared by BOTH Single mode and Daily Challenge mode.
    // Daily Challenge (dailyMode=true) uses the exact same scoreAnswer function.
    // Scoring rules: +2 one team, +5 both teams, +10 perfect, 0 score-only
    const result = scoreAnswer(
      { teamA, teamB, score: scoreStr },
      {
        teamA: current?.correct?.teamA ?? "",
        teamB: current?.correct?.teamB ?? "",
        score: current?.correct?.score ?? "",
      }
    );

    const gained = result.points;

    setTargetDiff((d) => {
      if (gained === 10) return Math.min(5, d + 1);
      if (gained >= 5) return d;
      if (gained >= 2) return Math.max(1, d - 1);
      return Math.max(1, d - 1);
    });

    setScore((p) => p + gained);
    setSolved((p) => p + 1);
    if (result.category === "perfect") setPerfect((p) => p + 1);
    if (result.category === "bothTeams") setBothTeams((p) => p + 1);
    if (result.category === "oneTeam") setOneTeam((p) => p + 1);

    setFeedback({
      gained,
      message: result.message,
      correct: `${current?.correct?.teamA ?? ""} vs ${current?.correct?.teamB ?? ""} (${current?.correct?.score ?? ""})`,
    });

    setTimeout(() => {
      setFeedback(null);
      if (Date.now() - startAtRef.current >= 60_000) {
        setStatus("RESULT");
        return;
      }
      nextQuestion();
    }, 500);
  };

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  // load local stats
  useEffect(() => {
    try {
      const pb = Number(safeGetLS("fta_personalBest") || 0) || 0;
      const todayKey = `fta_today_${new Date().toISOString().slice(0,10)}`;
      const td = Number(safeGetLS(todayKey) || 0) || 0;
      setPersonalBest(pb);
      setTodayBest(td);
    } catch (e) {
      // ignore
    }
  }, []);

  // save bests on result and record daily challenge/leaderboard
  useEffect(() => {
    if (status === "RESULT") {
      // Track game completion event
      trackEvent("game_complete", {
        mode: dailyMode ? "daily" : "practice",
        total_score: score
      });

      try {
        const pb = Number(safeGetLS("fta_personalBest") || 0) || 0;
        const todayKey = `fta_today_${new Date().toISOString().slice(0,10)}`;
        const td = Number(safeGetLS(todayKey) || 0) || 0;
        if (score > pb) {
          safeSetLS("fta_personalBest", String(score));
          setPersonalBest(score);
        }
        if (score > td) {
          safeSetLS(todayKey, String(score));
          setTodayBest(score);
        }

        // Daily challenge record: if played in dailyMode, persist and append to today's leaderboard
        if (dailyMode) {
          const dk = getDateKey();
          try {
            safeSetLS(`fta_daily_${dk}`, String(score));
            // ensure user exists
            ensureLocalUser();
            const lbKey = `fta_leaderboard_${dk}`;
            const raw = safeGetLS(lbKey) || "[]";
            const list = JSON.parse(raw);
            const entry = { userId: userId || safeGetLS("fta_userId"), nickname: localNick || safeGetLS("fta_nick") || "Player", score, dateKey: dk, ts: Date.now() };
            // update existing or push
            const idx = list.findIndex((e) => e.userId === entry.userId);
            if (idx !== -1) {
              if (entry.score > list[idx].score) list[idx] = entry;
            } else {
              list.push(entry);
            }
            list.sort((a,b)=>b.score - a.score || a.ts - b.ts);
            safeSetLS(lbKey, JSON.stringify(list.slice(0, 200)));
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {}
    }
  }, [status]);

  // Fetch leaderboard when in daily mode (on mount or date change)
  useEffect(() => {
    if (dailyMode) {
      const today = getDateKey();
      fetchTodaysLeaderboard(today);
    }
  }, [dailyMode, fetchTodaysLeaderboard]);

  // Submit daily score to backend leaderboard when Daily Challenge ends
  useEffect(() => {
    if (status === "RESULT" && dailyMode && clientId) {
      // Small delay to ensure state is settled
      const timer = setTimeout(() => {
        submitDailyToLeaderboard();
        // Refetch after submit to get updated list
        const today = getDateKey();
        leaderboardFetchedDateRef.current = null; // Reset to allow refetch
        fetchTodaysLeaderboard(today);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [status, dailyMode, clientId, fetchTodaysLeaderboard]);

  function TodayLeaderboard() {
    const [items, setItems] = useState([]);
    useEffect(() => {
      try {
        const dk = getDateKey();
        const key = `fta_leaderboard_${dk}`;
        const raw = safeGetLS(key) || '[]';
        const list = JSON.parse(raw);
        list.sort((a,b)=>b.score - a.score || a.ts - b.ts);
        setItems(list.slice(0,20));
      } catch (e) { setItems([]); }
    }, [showLeaderboard]);

    if (!items || items.length === 0) return <Text fontSize="sm" color="gray.600">No scores yet.</Text>;

    return (
      <VStack align="stretch" spacing={2}>
        {items.map((p, idx) => {
          const isMe = p.userId && (p.userId === userId || p.userId === safeGetLS('fta_userId'));
          return (
            <HStack key={`${p.userId}_${p.ts}`} justify="space-between" bg={isMe ? 'orange.50' : undefined} p={isMe ? 2 : 0} borderRadius={isMe ? 'md' : undefined}>
              <Text width="28px">{idx + 1}</Text>
              <Text flex="1" isTruncated>{p.nickname}</Text>
              <Text fontWeight="bold">{p.score}</Text>
            </HStack>
          );
        })}
      </VStack>
    );
  }

  const percent = Math.round((timeLeftMs / 60000) * 100);
  const singleTimeRatio = timeLeftMs / 60000;
  const singleTimerColorScheme = singleTimeRatio > 0.5 ? "green" : singleTimeRatio > 0.2 ? "orange" : "red";

  return (
    <>
      {/* Mobile-only sticky timer for Single mode IN_PROGRESS phase */}
      {status === "PLAYING" && (
        <Box
          display={{ base: "block", md: "none" }}
          position="sticky"
          top={0}
          zIndex={10}
          bg="white"
          borderBottom="2px solid"
          borderColor={singleTimeRatio > 0.5 ? "green.300" : singleTimeRatio > 0.2 ? "orange.300" : "red.300"}
          p={3}
          boxShadow="md"
        >
          <HStack justify="space-between" align="center">
            <Text fontSize="sm" fontWeight="bold" color="gray.700">
              Time Left
            </Text>
            <Progress
              value={percent}
              size="sm"
              colorScheme={singleTimerColorScheme}
              borderRadius="md"
              flex={1}
              mx={3}
              h="6px"
            />
            <Text fontSize="sm" fontWeight="bold" color="gray.700" minW="50px" textAlign="right">
              {Math.ceil(timeLeftMs / 1000)}s
            </Text>
          </HStack>
        </Box>
      )}
      <Container maxW="container.xl" p={4}>
        <Grid
          templateColumns={{ base: "1fr", lg: "3fr 1fr" }}
          gap={{ base: 4, lg: 8 }}
        >
          {/* Left Column: Main Game Area */}
          <VStack spacing={4} align="stretch">
            <HStack>
              <Button onClick={() => router.push("/")} variant="outline" size={{ base: "sm", md: "md" }}>
                ← Menu
              </Button>
              <Heading as="h2" size={{ base: "md", md: "lg" }} isTruncated>
                60s Rush — Single
              </Heading>
            </HStack>

          {loadingQ && (
            <Box p={4} borderWidth="1px" borderRadius="md">Loading questions from server...</Box>
          )}

          {!!loadErr && (
            <Box p={4} borderWidth="1px" borderRadius="md" borderColor="red.300">
              Failed to load questions: {loadErr}
              <Box mt={2} fontSize="sm" opacity={0.8}>Check that the backend server is accessible at {API_BASE}</Box>
            </Box>
          )}

          {status === "READY" && (
            <>
            <Box p={6} borderWidth="1px" borderRadius="md" bg="gray.50">
              <Heading size="md" mb={1}>⚡ 60s Rush</Heading>
              <Text fontSize="sm" color="gray.600" mb={2}>Beat your best in 60 seconds.</Text>

              <HStack mb={3} spacing={3}>
                <Text fontSize="sm" color="gray.600">Mode:</Text>
                <Select size="sm" value={filterType} onChange={(e) => setFilterType(e.target.value)} maxW="200px">
                  <option value="ALL">ALL</option>
                  <option value="INTERNATIONAL">INTERNATIONAL</option>
                  <option value="CLUB">CLUB</option>
                </Select>
              </HStack>

              <VStack align="stretch" spacing={3} mb={4}>
                <Box as="ul" pl={4} m={0} color="gray.700" spacing={1}>
                  <Text as="li" fontSize="sm">One team correct: +2 pts</Text>
                  <Text as="li" fontSize="sm">Both teams correct: +5 pts</Text>
                  <Text as="li" fontSize="sm">Exact score (with both teams): +10 pts</Text>
                  <Text as="li" fontSize="sm">Difficulty adapts to you</Text>
                </Box>
              </VStack>

              <Button onClick={startGame} isDisabled={loadingQ || !questions.length} colorScheme="teal" w="100%" size="lg" py={6} fontSize="md" fontWeight="bold">
                Start
              </Button>

              <HStack mt={3} spacing={4} justify="space-between">
                <Box>
                  <Text fontSize="sm" color="gray.600">Personal Best</Text>
                  <Text fontWeight="bold">{personalBest} pts</Text>
                </Box>
                <Box textAlign="right">
                  <Text fontSize="sm" color="gray.600">Best Today</Text>
                  <Text fontWeight="bold">{todayBest} pts</Text>
                </Box>
              </HStack>

              <Box mt={4} p={3} borderWidth="1px" borderRadius="md" bg="white">
                <Text fontSize="sm" color="gray.600" mb={1}>💡 Tip</Text>
                <Text fontSize="sm">Type teams first—guessing score is a bonus.</Text>
              </Box>
            </Box>

            <Box mt={4} p={5} borderWidth="2px" borderRadius="md" bg="orange.50" borderColor="orange.400">
              <Heading size="md" mb={2}>🔥 Daily Challenge</Heading>
              <Text fontSize="sm" color="gray.700" mb={3}>New puzzle daily. Compete on the global leaderboard.</Text>
              {(() => {
                const dk = new Date().toISOString().slice(0,10);
                const played = safeGetLS(`fta_daily_${dk}`);
                const playedScore = played ? Number(played) : null;
                return (
                  <>
                    <HStack spacing={3} mb={3}>
                      <Button colorScheme="orange" onClick={() => startDailyChallenge()} isDisabled={!!played || loadingQ || !questions.length} w="100%" size="lg">
                        {played ? "✓ Done" : "🏆 Play Daily"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowLeaderboard((v) => !v)} w="100%" size="lg">
                        {showLeaderboard ? "Hide" : "📊 Scores"}
                      </Button>
                    </HStack>
                    {playedScore != null && (
                      <Box mb={2}>
                        <Text fontSize="sm">My score today: <b>{playedScore}</b></Text>
                      </Box>
                    )}
                    {showLeaderboard && (
                      <Box mt={3} borderTop="1px" pt={3}>
                        <Heading size="sm" mb={2}>Today’s Leaderboard</Heading>
                        <TodayLeaderboard />
                      </Box>
                    )}
                  </>
                );
              })()}
            </Box>
            </>
          )}

          {status === "PLAYING" && current && (
            <>
              {dailyMode && (
                <Box mb={3} p={3} borderRadius="md" bg="orange.50">
                  <HStack justify="space-between">
                    <Text fontWeight="bold">🔥 Daily Challenge</Text>
                    <Text fontSize="sm" color="gray.600">Same deck for everyone • once per day</Text>
                  </HStack>
                </Box>
              )}
              <Box
                pos="relative"
                width="100%"
                pt="56.25%"
                bg="gray.800"
                borderRadius="lg"
                overflow="hidden"
                boxShadow="lg"
              >
                <Box pos="absolute" top="0" left="0" right="0" bottom="0" style={{ aspectRatio: "16/9" }}>
                  <Image
                    src={imageSrc}
                    alt="match"
                    fill
                    style={{ objectFit: "contain" }}
                    sizes="(max-width: 768px) 100vw, 900px"
                    quality={75}
                    priority={false}
                    placeholder="blur"
                    blurDataURL={BLUR_PLACEHOLDER}
                  />
                </Box>
              </Box>

              {feedback && (
                <Alert status="success" borderRadius="md">
                  <VStack align="start">
                    <Text fontWeight="bold" fontSize="lg">
                      {feedback.message || (feedback.gained > 0 ? `+${feedback.gained} pts` : "+0 pts")}
                    </Text>
                    <Text fontSize="sm">✓ {feedback.correct}</Text>
                  </VStack>
                </Alert>
              )}

              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
                <FormControl isInvalid={!!teamAError || sameTeam}>
                  <Input
                    list="teams-list"
                    placeholder="Team A"
                    value={teamA}
                    onChange={(e) => handleTeamChange(e.target.value, setTeamA, setTeamAValid, setTeamAError)}
                    onBlur={() => finalizeTeamField(teamA, setTeamA, setTeamAValid, setTeamAError)}
                    autoComplete="off"
                    size="lg"
                  />
                  <FormErrorMessage>{teamAError || (sameTeam ? "Team A and Team B must be different." : "")}</FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={!!teamBError || sameTeam}>
                  <Input
                    list="teams-list"
                    placeholder="Team B"
                    value={teamB}
                    onChange={(e) => handleTeamChange(e.target.value, setTeamB, setTeamBValid, setTeamBError)}
                    onBlur={() => finalizeTeamField(teamB, setTeamB, setTeamBValid, setTeamBError)}
                    autoComplete="off"
                    size="lg"
                  />
                  <FormErrorMessage>{teamBError || (sameTeam ? "Team A and Team B must be different." : "")}</FormErrorMessage>
                </FormControl>
                <HStack>
                  <Input type="number" min="0" placeholder="A" value={scoreA} onChange={(e) => setScoreA(e.target.value)} size="lg" textAlign="center" />
                  <Text fontSize="xl" fontWeight="bold">:</Text>
                  <Input type="number" min="0" placeholder="B" value={scoreB} onChange={(e) => setScoreB(e.target.value)} size="lg" textAlign="center" />
                </HStack>
              </SimpleGrid>

              <Button onClick={submit} isDisabled={!canSubmitSingle} colorScheme="green" size="lg" w="100%" py={6} fontSize="lg" fontWeight="bold">
                Submit
              </Button>

              <datalist id="teams-list">
                {teams.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </>
          )}

          {status === "RESULT" && (
            <>
              {dailyMode ? (
                <Box p={5} borderWidth="2px" borderRadius="lg" boxShadow="lg" borderColor="orange.400" borderLeft="8px solid #F97316" bg="white">
                  <Heading size="lg" mb={4} textAlign="center">🎉 Daily Challenge Complete!</Heading>
                  <VStack align="stretch" spacing={3}>
                    <Box p={4} bg="orange.50" borderRadius="md" textAlign="center">
                      <Text fontSize="sm" color="gray.600" mb={1}>Your Score</Text>
                      <Text fontSize="4xl" fontWeight="bold" color="orange.500">{score}</Text>
                    </Box>
                    <HStack justify="space-between" bg="gray.50" p={3} borderRadius="md">
                      <Text color="gray.600">Best Today</Text>
                      <Text fontWeight="bold" fontSize="lg">{todayBest}</Text>
                    </HStack>
                    {(() => {
                      try {
                        const dk = getDateKey();
                        const key = `fta_leaderboard_${dk}`;
                        const raw = safeGetLS(key) || '[]';
                        const list = JSON.parse(raw);
                        const total = list.length || 0;
                        const idx = list.findIndex((e) => e.userId === (userId || safeGetLS('fta_userId')));
                        const rank = idx >= 0 ? idx + 1 : null;
                        return (
                          <Box bg="white" p={3} borderRadius="md" textAlign="center" border="1px" borderColor="gray.200">
                            <Text color="gray.600" fontSize="sm" mb={1}>Rank</Text>
                            <Text fontWeight="bold" fontSize="xl" color={rank && rank <= 10 ? 'green.500' : 'gray.700'}>
                              {rank ? `🏅 ${rank} / ${total}` : `Get on the leaderboard!`}
                            </Text>
                          </Box>
                        );
                      } catch (e) { return null; }
                    })()}
                    <Box bg="blue.50" p={3} borderRadius="md" textAlign="center" borderLeft="4px" borderColor="blue.400">
                      <Text fontSize="sm" color="blue.700" fontWeight="500">✨ Come back tomorrow for a new set!</Text>
                    </Box>
                  </VStack>

                  {/* Daily Leaderboard Display */}
                  {leaderboardItems.length > 0 && (
                    <Box mt={5} p={4} bg="gray.50" borderRadius="md" borderWidth="1px" borderColor="gray.200">
                      <Heading size="sm" mb={3}>📊 Today's Top Scores</Heading>
                      <VStack align="stretch" spacing={2}>
                        {leaderboardItems.slice(0, 10).map((item, idx) => {
                          const isCurrentPlayer = clientId && item.client_id === clientId;
                          // Display name with client_id suffix if name is generic
                          const displayName = (() => {
                            const name = item.name || "Player";
                            if (name === "Player" || name === "Anonymous" || !name.trim()) {
                              const suffix = item.client_id ? item.client_id.slice(-4) : "????";
                              return `Player#${suffix}`;
                            }
                            return name;
                          })();
                          return (
                            <HStack
                              key={`${item.client_id}_${idx}`}
                              justify="space-between"
                              p={2}
                              bg={isCurrentPlayer ? "orange.100" : "white"}
                              borderRadius="sm"
                              borderWidth={isCurrentPlayer ? "2px" : "1px"}
                              borderColor={isCurrentPlayer ? "orange.400" : "gray.200"}
                            >
                              <Text width="28px" fontWeight="bold">{idx + 1}</Text>
                              <Text flex="1" isTruncated fontSize="sm">
                                {displayName}
                              </Text>
                              <Text fontWeight="bold" fontSize="sm" textAlign="right" minW="45px">
                                {item.score}
                              </Text>
                            </HStack>
                          );
                        })}
                      </VStack>
                      {leaderboardLoading && (
                        <Spinner size="sm" mt={2} />
                      )}
                    </Box>
                  )}

                  <HStack spacing={3} mt={4}>
                    <Button colorScheme="orange" w="100%" size="lg" onClick={() => router.push('/game?mode=single&daily=1&leaderboard=1')}>📊 Full Leaderboard</Button>
                    <Button variant="outline" w="100%" size="lg" onClick={() => router.push('/')}>Menu</Button>
                  </HStack>
                </Box>
              ) : (
                <Box p={4} borderWidth="1px" borderRadius="md">
                  <Heading size="md" mb={3}>Results</Heading>
                  <VStack align="stretch" spacing={2}>
                    <Text><b>Score:</b> {score} pts</Text>
                    <Text><b>Correct:</b> {solved}</Text>
                    <Text><b>Perfect:</b> {perfect} (10 pts)</Text>
                    <Text><b>Both teams:</b> {bothTeams} (5 pts)</Text>
                    <Text><b>One team:</b> {oneTeam} (2 pts)</Text>
                  </VStack>
                  {score < 20 && (
                    <Box mt={3} p={3} borderRadius="md" bg="blue.50" borderLeft="4px" borderColor="blue.400">
                      <Text fontSize="sm" color="blue.700">💪 It’s normal to find it tough at first. Play daily to improve!</Text>
                    </Box>
                  )}
                  {score >= 20 && score < 35 && (
                    <Box mt={3} p={3} borderRadius="md" bg="green.50" borderLeft="4px" borderColor="green.400">
                      <Text fontSize="sm" color="green.700">👍 Great start! Keep going and you’ll get even better.</Text>
                    </Box>
                  )}
                  {score >= 35 && score < 50 && (
                    <Box mt={3} p={3} borderRadius="md" bg="purple.50" borderLeft="4px" borderColor="purple.400">
                      <Text fontSize="sm" color="purple.700">🔥 Amazing score! Keep challenging yourself.</Text>
                    </Box>
                  )}
                  {score >= 50 && (
                    <Box mt={3} p={3} borderRadius="md" bg="orange.50" borderLeft="4px" borderColor="orange.400">
                      <Text fontSize="sm" color="orange.700">🐐 GOAT level. Messi or Ronaldo? You decide.</Text>
                    </Box>
                  )}
                  <HStack spacing={3} mt={4} align="stretch">
                    <Button colorScheme="teal" flex={1} size="lg" onClick={startGame} isDisabled={loadingQ || !questions.length}>Play Again</Button>
                    <Button variant="outline" flex={1} size="lg" onClick={() => router.push("/")}>Menu</Button>
                    <IconButton
                      aria-label="Share results"
                      icon={<MdShare />}
                      size="lg"
                      variant="outline"
                      onClick={handleShareResults}
                      title="Share results"
                    />
                  </HStack>
                </Box>
              )}
            </>
          )}
        </VStack>

        {/* Right Column: Stats Sidebar */}
        <VStack spacing={4} align="stretch">
          {status !== "READY" ? (
            <Box p={4} borderWidth="1px" borderRadius="lg" boxShadow="base">
              <Heading size="md" mb={3}>📊 Stats</Heading>
              <VStack align="stretch" spacing={2}>
                <Text display={{ base: "none", md: "block" }}><b>Time:</b> {Math.ceil(timeLeftMs / 1000)}s</Text>
                <Text><b>Score:</b> {score}</Text>
                <Text><b>Solved:</b> {solved}</Text>
                {/* Hidden from UI: internal difficulty metrics */}
              </VStack>
              {status === "PLAYING" && (
                <Box mt={4} display={{ base: "none", md: "block" }}>
                  <Progress value={percent} size="lg" colorScheme={singleTimerColorScheme} borderRadius="md" />
                </Box>
              )}
            </Box>
          ) : (
            <Box p={4} borderWidth="1px" borderRadius="lg" boxShadow="base" bg="gray.50">
              <Heading size="md" mb={3}>About This Mode</Heading>
              <VStack align="stretch" spacing={2}>
                <Text fontSize="sm">- Solve as many as possible in 60 seconds to beat your best.</Text>
                <Text fontSize="sm">- Difficulty adjusts automatically.</Text>
                <Text fontSize="sm">- Quick tips and your personal best appear on the left.</Text>
              </VStack>
              <Box mt={4} p={3} borderWidth="1px" borderRadius="md" bg="white" textAlign="center">
                <Text fontSize="sm" color="gray.500">Ad space (reserved)</Text>
                <Box height="48px" />
              </Box>
            </Box>
          )}
        </VStack>
      </Grid>
      </Container>
    </>
    );
  }

/** ================== GamePage: Single + PvP 통합 ================== */
export default function GamePage({ mode = "", code = "" }) {
  const router = useRouter();
  const resolvedMode = (router.query.mode || mode || "pvp").toString();
  const resolvedCode = router.query.code?.toString() || code || "";
  
  // Debug mode: enabled via ?debug=1
  const debugMode = router.query.debug === "1";

  // ✅ Derive OG URLs from current hostname dynamically (works in dev & prod)
  const getOrigin = () => {
    if (typeof window === "undefined") return "https://footyguessr.io";
    return window.location.origin;
  };
  const origin = getOrigin();

  const isInvite = resolvedMode === "pvp" && Boolean(resolvedCode);
  const ogTitle = isInvite ? `FootyGuessr — Private Match (${resolvedCode})` : "FootyGuessr";
  const ogDescription = isInvite ? `Join my private match. Code: ${resolvedCode}` : "Guess the match in one photo.";
  const ogUrl = isInvite
    ? `${origin}/game?mode=pvp&code=${encodeURIComponent(resolvedCode)}`
    : `${origin}/game`;
  const ogImage = `${origin}/og/og-default.png`;

  // Single은 그냥 렌더
  if (resolvedMode === "single")
    return (
      <>
        <MetaHead title={ogTitle} description={ogDescription} url={ogUrl} image={ogImage} />
        <SingleTimeAttack />
      </>
    );

  // PvP
  const roomId = router.query.roomId?.toString() || null;
  const urlCode = resolvedCode;

  // 로비 입력
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [quickMode, setQuickMode] = useState("ALL");   // Quick Match preference
  const [privateMode, setPrivateMode] = useState("ALL"); // Private/Invite room mode

  // PvP 상태
  const [round, setRound] = useState(null);
  const [players, setPlayers] = useState([]);
  const [phase, setPhase] = useState("LOBBY"); // LOBBY | MATCHED | IN_ROUND | ROUND_RESULT | GAME_END | ...
  const [opponentSubmitted, setOpponentSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [waitingForMatch, setWaitingForMatch] = useState(false);
  const [isSearchingQuickMatch, setIsSearchingQuickMatch] = useState(false);
  const [opponentLeftShown, setOpponentLeftShown] = useState(false);

  const [currentRound, setCurrentRound] = useState(0);
  const [maxRounds, setMaxRounds] = useState(3);
  const [transition, setTransition] = useState(null);
  const [showPvpCountdownHint, setShowPvpCountdownHint] = useState(false);

  const [teams, setTeams] = useState([]);

  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [finalScoreboard, setFinalScoreboard] = useState(null);
  const [finishedResult, setFinishedResult] = useState(null);
  const [serverPhase, setServerPhase] = useState(null);
  const [matchFinished, setMatchFinished] = useState(false);
  const [rematchClicked, setRematchClicked] = useState(false);
  const [opponentLeftNotice, setOpponentLeftNotice] = useState(null);
  const [roomMode, setRoomMode] = useState("ALL");
  const [finishNote, setFinishNote] = useState(null);
  const [endBanner, setEndBanner] = useState(null);
  // Persistent flag: set once on forfeit, only cleared when leaving to menu/new room
  const [forfeitEnd, setForfeitEnd] = useState(false);

  const timerRef = useRef(null);
  const [readySent, setReadySent] = useState(false);
  const hasLeftRef = useRef(false);
  const inRoomRef = useRef(false);
  const hadOpponentRef = useRef(false);
  const matchFinishedRef = useRef(false);
  const serverPhaseRef = useRef(null);
  const opponentLeftShownRef = useRef(false);
  const youWinSoundPlayedRef = useRef(false);
  const pvpStartSoundPlayedRef = useRef(false);

  // ✅ Persist playerToken for reconnection
  const [playerToken, setPlayerToken] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      let token = localStorage.getItem("fg_playerToken");
      if (!token) {
        token = `player_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        localStorage.setItem("fg_playerToken", token);
      }
      return token;
    } catch {
      return `player_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }
  });

  // 메인에서 name 넘겨준 거 받기 + 링크 code 자동 세팅
 
  useEffect(() => {
    if (urlCode) setJoinCode(urlCode.toUpperCase());
    const qname = router.query.name ?? router.query.nickname ?? null;
    if (qname) setName(String(qname));
  }, [urlCode]);

  // META 수신
  useEffect(() => {
    const onMeta = ({ teams }) => setTeams(Array.isArray(teams) ? teams : []);
    socket.on("META", onMeta);

    const req = () => socket.emit("GET_META");
    if (socket.connected) req();
    else socket.once("connect", req);

    return () => {
      socket.off("META", onMeta);
      socket.off("connect", req);
    };
  }, []);

  // ✅ Reset answer inputs whenever round changes (including after resume)
  useEffect(() => {
    if (!round) return;
    // Use roundId as the stable key to detect round changes
    const roundKey = round.roundId || round.imageUrl || "";
    if (!roundKey) return;

    // Clear all input fields for the new round
    setTeamA("");
    setTeamB("");
    setScoreA("");
    setScoreB("");
    setSubmitted(false);

    if (DEBUG_PVP) {
      console.log("[ROUND_CHANGE] Reset input fields", { roundKey });
    }
  }, [round?.roundId, round?.imageUrl]);

  // Socket connection health monitoring (debug mode only)
  useEffect(() => {
    if (!debugMode) return;

    const logSocketEvent = (eventName, data = {}) => {
      console.log(`[SOCKET_DEBUG] ${eventName}`, {
        timestamp: Date.now(),
        time: new Date().toISOString(),
        transport: socket?.io?.engine?.transport?.name,
        ...data,
      });
    };

    const onConnect = () => logSocketEvent("connect", { socketId: socket.id });
    const onDisconnect = (reason) => logSocketEvent("disconnect", { reason });
    const onReconnectAttempt = (attemptNumber) => logSocketEvent("reconnect_attempt", { attemptNumber });
    const onReconnect = (attemptNumber) => logSocketEvent("reconnect", { attemptNumber });
    const onConnectError = (error) => logSocketEvent("connect_error", { error: error?.message || String(error) });

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect_attempt", onReconnectAttempt);
    socket.io.on("reconnect", onReconnect);
    socket.on("connect_error", onConnectError);

    // Log initial state
    logSocketEvent("initial_state", {
      connected: socket.connected,
      socketId: socket.id,
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
      socket.io.off("reconnect", onReconnect);
      socket.off("connect_error", onConnectError);
    };
  }, [debugMode]);

  // ✅ Auto-reconnect & rejoin on visibility/focus recovery
  useEffect(() => {
    if (!roomId) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (process.env.NODE_ENV !== "production") {
          console.info("[VISIBILITY] page hidden");
        }
      } else {
        // Page became visible (from background)
        if (process.env.NODE_ENV !== "production") {
          console.info("[VISIBILITY] page visible, reconnecting if needed");
        }
        if (!socket.connected) {
          socket.connect();
        }
        // ✅ Rejoin with playerToken to resume match within grace period
        if (playerToken) {
          socket.emit("pvp:rejoin", { roomId, token: playerToken });
        }
        socket.emit("GET_ROOM_STATE", { roomId });
      }
    };

    const handleFocus = () => {
      if (process.env.NODE_ENV !== "production") {
        console.info("[FOCUS] window focused");
      }
      if (!socket.connected) {
        socket.connect();
      }
      if (playerToken) {
        socket.emit("pvp:rejoin", { roomId, token: playerToken });
      }
      socket.emit("GET_ROOM_STATE", { roomId });
    };

    const handlePageShow = (e) => {
      // bfcache recovery (mobile back/forward)
      if (e.persisted) {
        if (process.env.NODE_ENV !== "production") {
          console.info("[PAGESHOW] bfcache restored");
        }
        if (!socket.connected) {
          socket.connect();
        }
        if (playerToken) {
          socket.emit("pvp:rejoin", { roomId, token: playerToken });
        }
        socket.emit("GET_ROOM_STATE", { roomId });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [roomId, playerToken]);

  const toast = useToast();

  useEffect(() => {
    opponentLeftShownRef.current = opponentLeftShown;
  }, [opponentLeftShown]);

  useEffect(() => {
    matchFinishedRef.current = matchFinished;
  }, [matchFinished]);

  useEffect(() => {
    serverPhaseRef.current = serverPhase;
  }, [serverPhase]);

  useEffect(() => {
    if (matchFinished && finishedResult?.reason === "FORFEIT") {
      if (DEBUG_PVP) {
        console.log("[PVP] suppressing forfeit UI because matchFinished=true", { roomId });
      }
    }
  }, [matchFinished, finishedResult, roomId]);

  // PvP 승리 시 결과 화면에서 1회만 축하 사운드 재생
  useEffect(() => {
    if (phase !== "GAME_END") {
      youWinSoundPlayedRef.current = false;
      return;
    }
    if (!finalScoreboard || finalScoreboard.length === 0) return;
    const myScore = finalScoreboard.find((p) => p.socketId === socket?.id)?.points ?? 0;
    const opponentScore = finalScoreboard.find((p) => p.socketId !== socket?.id)?.points ?? 0;
    if (myScore > opponentScore && !youWinSoundPlayedRef.current) {
      youWinSoundPlayedRef.current = true;
      try {
        const audio = new Audio("/sfx/youwin.mp3");
        audio.volume = 0.6;
        audio.play().catch((err) => {
          console.log("[YOUWIN_SFX] Audio play blocked or failed:", err);
        });
      } catch (err) {
        console.log("[YOUWIN_SFX] Audio creation failed:", err);
      }
    }
  }, [phase, finalScoreboard, socket?.id]);

  const handleOpponentLeft = useCallback(() => {
    if (opponentLeftShownRef.current) return;
    setOpponentLeftShown(true);
    toast({
      title: "Opponent left",
      description: "The other player has left the match.",
      status: "warning",
      duration: 5000,
      isClosable: true,
    });
    setPhase("ABANDONED");
    setReadySent(false);
    setRound(null);
    setSubmitted(false);
    setOpponentSubmitted(false);
    setLastResult(null);
    setTransition(null);
  }, [toast]);

  const leaveCurrentRoom = useCallback((reason = "nav", { redirect } = {}) => {
    if (!roomId || hasLeftRef.current || !inRoomRef.current) return;
    hasLeftRef.current = true;
    const finished = matchFinishedRef.current || serverPhaseRef.current === "FINISHED";
    
    // Track game exit midway event (only if game not finished)
    if (!finished && phase && ["WAITING", "MATCHED", "TRANSITION", "IN_ROUND", "ROUND_RESULT"].includes(phase)) {
      trackEvent("game_exit_midway", {
        mode: "pvp",
        round_number: currentRound
      });
    }
    
    try {
      if (DEBUG_PVP) {
        console.log("[PVP_LEAVE_EMIT]", { roomId, reason, finished });
      }
      socket.emit("pvp:leave", { roomId, reason });
    } catch (e) {}
    if (!finished) setPhase("ABANDONED");
    setRound(null);
    setSubmitted(false);
    setOpponentSubmitted(false);
    setLastResult(null);
    setTransition(null);
    setReadySent(false);
    setFinalScoreboard(null);
    setFinishedResult(null);
    if (redirect) {
      router.push("/");
    }
  }, [roomId, router, phase, currentRound]);

  useEffect(() => {
    hasLeftRef.current = false;
    inRoomRef.current = false;
    hadOpponentRef.current = false;
    setMatchFinished(false);
    setServerPhase(null);
    setRematchClicked(false);
    setOpponentLeftNotice(null);
    setFinishNote(null);
    setEndBanner(null);
    // Clear forfeit state only when room changes (e.g., returning to menu or rematch)
    setForfeitEnd(false);
    pvpStartSoundPlayedRef.current = false;
  }, [roomId]);

  const goToMenu = useCallback(() => {
    if (DEBUG_PVP) console.log("[PVP] Menu click", { matchFinished: matchFinishedRef.current, serverPhase: serverPhaseRef.current, roomId, phase });
    // Block menu during active gameplay (not LOBBY or GAME_END)
    const activeGamePhases = ["WAITING", "MATCHED", "TRANSITION", "IN_ROUND", "ROUND_RESULT"];
    if (roomId && activeGamePhases.includes(phase)) {
      toast({
        title: "Game in progress",
        description: "Finish the match to return to menu.",
        status: "warning",
        duration: 2500,
        isClosable: true,
      });
      return;
    }
    if (roomId) {
      leaveCurrentRoom("menu", { redirect: true });
    } else {
      router.push("/");
    }
  }, [roomId, leaveCurrentRoom, router, phase, toast]);

  useEffect(() => {
    if (!roomId) return;
    const onRouteChange = () => {
      if (inRoomRef.current) {
        if (DEBUG_PVP) console.log("[ROUTE_LEAVE]");
        leaveCurrentRoom("route");
      }
    };
    router.events.on("routeChangeStart", onRouteChange);
    return () => router.events.off("routeChangeStart", onRouteChange);
  }, [roomId, leaveCurrentRoom, router.events]);

  useEffect(() => {
    if (!roomId) return;
    const onUnload = () => {
      if (inRoomRef.current) {
        if (DEBUG_PVP) console.log("[UNLOAD_LEAVE]");
        leaveCurrentRoom("unload");
      }
    };
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onUnload);
    };
  }, [roomId, leaveCurrentRoom]);

  const hello = () => {
    const n = String(name || "").trim();
    if (!n) {
      toast({
        title: "Nickname required",
        description: "Please enter a nickname to start.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      throw new Error("Please enter a nickname");
    }
    socket.emit("HELLO", { name: n, token: playerToken });
  };

  const createRoom = () => {
    try {
      hello();
      socket.emit("CREATE_ROOM", { mode: privateMode });
    } catch (e) {
      // toast in hello() will be shown
    }
  };

  const joinRoom = () => {
    const code = String(joinCode || "").trim().toUpperCase();
    if (!code) {
      toast({
        title: "Invite code required",
        description: "Enter the room code to join.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    try {
      hello();
      setWaitingForMatch(true); // Show loading spinner
      const timeout = setTimeout(() => {
        setWaitingForMatch(false);
        toast({
          title: "Connection timeout",
          description: "Server response took too long. Please try again.",
          status: "warning",
          duration: 4000,
          isClosable: true,
        });
      }, 5000);

      socket.emit(
        "JOIN_ROOM",
        { code },
        (resp) => {
          clearTimeout(timeout);
          setWaitingForMatch(false);
          if (resp?.ok) {
            // Server will emit ROOM_JOINED or MATCH_FOUND
            if (process.env.NODE_ENV !== "production") {
              console.info("[JOIN_ROOM_ACK] success", resp);
            }
          } else {
            const errorMsg =
              resp?.error === "ROOM_NOT_FOUND"
                ? "Room not found. Check the invite code."
                : resp?.error === "ROOM_FULL"
                ? "Room is full."
                : "Failed to join room. Please try again.";
            toast({
              title: "Cannot join room",
              description: errorMsg,
              status: "error",
              duration: 4000,
              isClosable: true,
            });
            if (process.env.NODE_ENV !== "production") {
              console.info("[JOIN_ROOM_ACK] error", resp);
            }
          }
        }
      );
    } catch (e) {
      setWaitingForMatch(false);
      // toast in hello() will be shown
    }
  };

  const joinQueue = () => {
    if (isSearchingQuickMatch) return;
    try {
      hello();
      setWaitingForMatch(true);
      setIsSearchingQuickMatch(true);
      
      // Track PvP matchmaking start event
      trackEvent("pvp_matchmaking_start");
      
      socket.emit("JOIN_QUEUE", { preferenceMode: quickMode });
    } catch (e) {
      setWaitingForMatch(false);
      setIsSearchingQuickMatch(false);
    }
  };

  const cancelSearch = () => {
    if (!isSearchingQuickMatch) return;
    socket.emit("quick:cancel");
  };

  // 로비 -> roomId 세팅 이벤트들
  useEffect(() => {
    const onRoomCreated = ({ roomId, code }) => {
      setReadySent(false);
      setIsSearchingQuickMatch(false);
      setWaitingForMatch(false);
      setOpponentLeftShown(false);
      setFinishedResult(null);
      setMatchFinished(false);
      setServerPhase(null);
      setRematchClicked(false);
      inRoomRef.current = false;
      hadOpponentRef.current = false;
      router.replace(`/game?mode=pvp&roomId=${roomId}&code=${code}`);
    };

    const onRoomJoined = ({ roomId, code }) => {
      setReadySent(false);
      setIsSearchingQuickMatch(false);
      setWaitingForMatch(false);
      setOpponentLeftShown(false);
      setFinishedResult(null);
      setMatchFinished(false);
      setServerPhase(null);
      setRematchClicked(false);
      inRoomRef.current = false;
      hadOpponentRef.current = false;
      router.replace(`/game?mode=pvp&roomId=${roomId}&code=${code}`);
    };

    const onMatchFound = ({ roomId }) => {
      // Track PvP match found event
      trackEvent("pvp_match_found");
      
      setReadySent(false);
      setWaitingForMatch(false);
      setIsSearchingQuickMatch(false);
      setOpponentLeftShown(false);
      setFinishedResult(null);
      setMatchFinished(false);
      setServerPhase(null);
      setRematchClicked(false);
      inRoomRef.current = false;
      hadOpponentRef.current = false;
      router.replace(`/game?mode=pvp&roomId=${roomId}`);
    };

    const onQuickCancelled = () => {
      setIsSearchingQuickMatch(false);
      setWaitingForMatch(false);
    };// Track PvP match failed event (user blocked from quick matching)
      trackEvent("pvp_match_failed");
      
      

    const onQuickBlocked = ({ cooldownUntil }) => {
      setIsSearchingQuickMatch(false);
      setWaitingForMatch(false);
      const leftMs = Math.max(0, (cooldownUntil || 0) - Date.now());
      const mins = Math.ceil(leftMs / 60000);
      toast({
        title: "Quick Match blocked",
        description: `Too many quits. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
    };

    const onOpponentLeft = (payload) => {
      hadOpponentRef.current = true;
      if (DEBUG_PVP) {
        console.log("[PVP] opponent_left received", payload);
      }

      // If match already finished, just inform without changing result view
      if (payload?.phase === "FINISHED") {
        if (opponentLeftShownRef.current) return;
        setOpponentLeftShown(true);
        setOpponentLeftNotice(payload || {});
        const friendly = payload?.mode === "PRIVATE" || payload?.roomType === "PRIVATE";
        toast({
          title: friendly ? "Friend left" : "Opponent left",
          description: friendly ? "The other player left the game." : "Opponent left the match.",
          status: "info",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      // For PRIVATE games during play, show friendly message and abandon state
      if (payload?.mode === "PRIVATE") {
        if (opponentLeftShownRef.current) return;
        setOpponentLeftShown(true);
        toast({
          title: "Friend left",
          description: "The other player left the game.",
          status: "info",
          duration: 5000,
          isClosable: true,
        });
        setPhase("ABANDONED");
        setReadySent(false);
        setRound(null);
        setSubmitted(false);
        setOpponentSubmitted(false);
        setLastResult(null);
        setTransition(null);
        if (DEBUG_PVP) {
          console.log("[PVP][PRIVATE] opponent_left received", { roomId, mode: payload.mode, reason: payload.reason });
        }
      } else {
        // QUICK mode: use existing handler
        handleOpponentLeft();
      }
    };

    const onFinished = (payload) => {
      // Track PvP game complete event
      const normalized = payload?.result || payload || null;
      const finalScore = normalized?.points ?? payload?.points ?? 0;
      trackEvent("pvp_game_complete", {
        total_score: finalScore
      });

      const reason = normalized?.reason || payload?.reason;
      const winnerSocketId = normalized?.winnerSocketId ?? payload?.winnerSocketId;
      const loserSocketId = normalized?.loserSocketId ?? payload?.loserSocketId;
      const note = payload?.note || normalized?.note || null;
      const mergedResult = normalized
        ? { ...normalized, reason, winnerSocketId, loserSocketId }
        : null;
      const nextPhase = payload?.phase || "FINISHED";
      setFinishedResult(mergedResult);
      setServerPhase(nextPhase);
      setMatchFinished(true);
      matchFinishedRef.current = true;
      serverPhaseRef.current = nextPhase;
      setFinishNote(note);
      clearInterval(timerRef.current);
      setRound(null);
      setTransition(null);
      if (DEBUG_PVP) {
        console.log("[PVP] finished received", { payload, mergedResult });
      }
      if (reason === "FORFEIT" || note === "WIN_BY_FORFEIT" || note === "LOSS_BY_LEAVE") {
        const iAmWinner = winnerSocketId === socket.id;
        setEndBanner({
          type: iAmWinner ? "FORFEIT_WIN" : "FORFEIT_LOSS",
          title: "Opponent left",
          message: iAmWinner ? "You win by forfeit." : "You left the match. This counts as a loss.",
        });
        setForfeitEnd(true);
      }
      setPhase("GAME_END");
    };

    const onRematchStarted = ({ newRoomId }) => {
      if (DEBUG_PVP) console.log("[REMATCH_STARTED]", newRoomId);
      // Reset all state
      setReadySent(false);
      setIsSearchingQuickMatch(false);
      setWaitingForMatch(false);
      setOpponentLeftShown(false);
      setFinishedResult(null);
      setMatchFinished(false);
      setServerPhase(null);
      setRematchClicked(false);
      setSubmitted(false);
      setOpponentSubmitted(false);
      setLastResult(null);
      setFinalScoreboard(null);
      setTransition(null);
      setRound(null);
      setCurrentRound(0);
      setMaxRounds(3);
      setPhase("LOADING");
      inRoomRef.current = false;
      hadOpponentRef.current = false;
      hasLeftRef.current = false;
      pvpStartSoundPlayedRef.current = false;
      // Navigate to new room
      router.replace(`/game?mode=pvp&roomId=${newRoomId}`);
    };

    socket.on("ROOM_CREATED", onRoomCreated);
    socket.on("ROOM_JOINED", onRoomJoined);
    socket.on("MATCH_FOUND", onMatchFound);
    socket.on("quick:cancelled", onQuickCancelled);
    socket.on("quick:blocked", onQuickBlocked);
    socket.on("pvp:opponent_left", onOpponentLeft);
    socket.on("pvp:finished", onFinished);
    socket.on("pvp:rematch_started", onRematchStarted);

    return () => {
      socket.off("ROOM_CREATED", onRoomCreated);
      socket.off("ROOM_JOINED", onRoomJoined);
      socket.off("MATCH_FOUND", onMatchFound);
      socket.off("quick:cancelled", onQuickCancelled);
      socket.off("quick:blocked", onQuickBlocked);
      socket.off("pvp:opponent_left", onOpponentLeft);
      socket.off("pvp:finished", onFinished);
      socket.off("pvp:rematch_started", onRematchStarted);
    };
  }, [router, handleOpponentLeft, toast]);

  // in-room 이벤트들 (roomId 있을 때만)
  useEffect(() => {
    if (!roomId || !socket) return;

    // 1. 상태 초기화 및 로딩 단계 설정
    setSubmitted(false);
    setOpponentSubmitted(false);
    setLastResult(null);
    setTransition(null);
    setPhase("LOADING");
    setRound(null);

    // 2. 서버에 상태를 요청하는 함수
    const requestState = () => {
      socket.emit("GET_ROOM_STATE", { roomId });
    };

    // 3. 소켓 연결 상태에 따라 상태 요청을 보냄
    if (socket.connected) {
      requestState();
    } else {
      // 연결되어 있지 않다면, 'connect' 이벤트를 한 번만 수신하여 처리
      socket.once("connect", requestState);
    }

    // (no periodic polling)

    // 4. 서버로부터 오는 다른 이벤트들을 처리할 리스너 설정
    const onRoundStart = ({ round, currentRound: cr, maxRounds: mr }) => {
      // Debug logging
      if (debugMode) {
        console.log("[ROUND_DEBUG] ROUND_START received", {
          event: "ROUND_START",
          timestamp: Date.now(),
          time: new Date().toISOString(),
          currentPhase: phase,
          roundNumber: cr,
          maxRounds: mr,
          startedAt: round?.startedAt,
          startedAtTime: round?.startedAt ? new Date(round.startedAt).toISOString() : null,
          msUntilStart: round?.startedAt ? Math.max(0, round.startedAt - Date.now()) : 0,
          imageUrl: round?.imageUrl,
        });
      }

      // Leak guard: do nothing if match ended by forfeit or abandoned
      if (
        forfeitEnd ||
        phase === "ABANDONED" ||
        (phase === "GAME_END" && (finishNote === "WIN_BY_FORFEIT" || finishedResult?.reason === "FORFEIT"))
      ) {
        if (debugMode) {
          console.log("[ROUND_DEBUG] ROUND_START ignored (forfeit/abandoned)", { phase, forfeitEnd });
        }
        return;
      }
      setCurrentRound(cr ?? 0);
      setMaxRounds(mr ?? 3);
      setLastResult(null);
      setRound(round);
      setOpponentSubmitted(false);
      setSubmitted(false);
      setTeamA("");
      setTeamB("");
      setScoreA("");
      setScoreB("");

      if (!pvpStartSoundPlayedRef.current) {
        playGameStartSound();
        pvpStartSoundPlayedRef.current = true;
      }

      const msToStart = Math.max(0, (round?.startedAt ?? Date.now()) - Date.now());
      if (msToStart > 0) {
        // Leak guard: do not transition if forfeit end
        if (
          forfeitEnd ||
          phase === "ABANDONED" ||
          (phase === "GAME_END" && (finishNote === "WIN_BY_FORFEIT" || finishedResult?.reason === "FORFEIT"))
        ) {
          return;
        }
        if (debugMode) {
          console.log("[ROUND_DEBUG] Entering TRANSITION phase", {
            timestamp: Date.now(),
            msToStart,
            countdownSeconds: Math.ceil(msToStart / 1000),
          });
        }
        setPhase("TRANSITION");
        const tick = () => {
          // Leak guard: stop tick work if match ended by forfeit
          if (
            forfeitEnd ||
            phase === "ABANDONED" ||
            (phase === "GAME_END" && (finishNote === "WIN_BY_FORFEIT" || finishedResult?.reason === "FORFEIT"))
          ) {
            return;
          }
          const left = Math.max(0, round.startedAt - Date.now());
          const sec = Math.ceil(left / 1000);
          setTransition({ nextRound: cr ?? 0, countdown: sec });
          if (left <= 0) {
            if (debugMode) {
              console.log("[ROUND_DEBUG] Transition complete, entering IN_ROUND", {
                timestamp: Date.now(),
                roundNumber: cr,
              });
            }
            setPhase("IN_ROUND");
            setTransition(null);
            clearInterval(t);
          }
        };
        const t = setInterval(tick, 200);
        return () => clearInterval(t);
      }
      if (debugMode) {
        console.log("[ROUND_DEBUG] No countdown needed, entering IN_ROUND immediately", {
          timestamp: Date.now(),
        });
      }
      setPhase("IN_ROUND");
      setTransition(null);
    };

    const onOpponentSubmitted = () => setOpponentSubmitted(true);

    const onRoomState = (s) => {
      // Debug logging
      if (debugMode) {
        console.log("[ROUND_DEBUG] ROOM_STATE received", {
          event: "ROOM_STATE",
          timestamp: Date.now(),
          time: new Date().toISOString(),
          currentPhase: phase,
          serverStatus: s.status,
          serverPhase: s.phase,
          roundNumber: s.currentRound,
          maxRounds: s.maxRounds,
          hasRound: !!s.round,
          roundStartedAt: s.round?.startedAt,
          roundStartedAtTime: s.round?.startedAt ? new Date(s.round.startedAt).toISOString() : null,
          imageUrl: s.round?.imageUrl,
        });
      }

      // Leak guard: ignore late room updates after forfeit end
      if (
        forfeitEnd ||
        phase === "ABANDONED" ||
        (phase === "GAME_END" && (finishNote === "WIN_BY_FORFEIT" || finishedResult?.reason === "FORFEIT"))
      ) {
        if (debugMode) {
          console.log("[ROUND_DEBUG] ROOM_STATE ignored (forfeit/abandoned)", { phase, forfeitEnd });
        }
        return;
      }
      const playerList = s.players || [];
      setPlayers(playerList);
      // 항상 서버에서 전달된 round로 덮어쓰기(재대결 시 이전 라운드가 남는 문제 방지)
      setRound(s.round || null);
      if (s.currentRound != null) setCurrentRound(s.currentRound);
      if (s.maxRounds != null) setMaxRounds(s.maxRounds);
      if (s.status) setPhase(s.status);
      if (s.phase) setServerPhase(s.phase);
      else if (s.status) setServerPhase(s.status);
      if (s.phase === "FINISHED" || s.status === "GAME_END") {
        setMatchFinished(true);
        matchFinishedRef.current = true;
        serverPhaseRef.current = s.phase || s.status || null;
      }
      if (s.mode) setRoomMode(String(s.mode).toUpperCase());
      const hasMe = playerList.some((p) => p.socketId === socket.id);
      if (hasMe) inRoomRef.current = true;
      if (playerList.length >= 2) hadOpponentRef.current = true;
      const sawOpponentDrop = hadOpponentRef.current && playerList.length < 2 && s.status && s.status !== "WAITING";
      if (s.status === "ABANDONED" && hadOpponentRef.current) handleOpponentLeft();
      else if (sawOpponentDrop) handleOpponentLeft();
      // Use mode-filtered team options from server if available
      if (Array.isArray(s.teamOptions) && s.teamOptions.length > 0) {
        setTeams(s.teamOptions);
      }
    };

    const onRoundResult = ({ correct, results }) => {
      if (debugMode) {
        console.log("[ROUND_DEBUG] ROUND_RESULT received", {
          event: "ROUND_RESULT",
          timestamp: Date.now(),
          time: new Date().toISOString(),
          currentPhase: phase,
          correct,
          resultsCount: results?.length,
        });
      }
      setPhase("ROUND_RESULT");
      const me = results.find((r) => r.socketId === socket.id);
      setLastResult({ correct, me: me || null, results: results || [] });
    };

    const onGameEnd = ({ scoreboard, note }) => {
      if (debugMode) {
        console.log("[ROUND_DEBUG] GAME_END received", {
          event: "GAME_END",
          timestamp: Date.now(),
          time: new Date().toISOString(),
          currentPhase: phase,
          note,
          scoreboardCount: scoreboard?.length,
        });
      }
      setPhase("GAME_END");
      setServerPhase("FINISHED");
      setMatchFinished(true);
      matchFinishedRef.current = true;
      serverPhaseRef.current = "FINISHED";
      clearInterval(timerRef.current);
      setTransition(null);
      setRound(null);
      setFinalScoreboard(scoreboard || []);
    };

    const onRoomStateFail = () => {
      toast({
        title: "Room not found",
        description: "The match is no longer active.",
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      hasLeftRef.current = true;
      setPhase("LOBBY");
      setRoomMode("ALL");
      setRound(null);
      setPlayers([]);
      setCurrentRound(0);
      setMaxRounds(3);
      setSubmitted(false);
      setOpponentSubmitted(false);
      setTransition(null);
      setLastResult(null);
      setFinalScoreboard(null);
      setFinishedResult(null);
      router.replace("/");
    };

    socket.on("ROUND_START", onRoundStart);
    socket.on("OPPONENT_SUBMITTED", onOpponentSubmitted);
    socket.on("ROOM_STATE", onRoomState);
    socket.on("ROUND_RESULT", onRoundResult);
    socket.on("GAME_END", onGameEnd);
    socket.on("ROOM_STATE_FAIL", onRoomStateFail);

    // 5. 컴포넌트 언마운트 시 모든 리스너 정리
    return () => {
      socket.off("connect", requestState);
      socket.off("ROUND_START", onRoundStart);
      socket.off("OPPONENT_SUBMITTED", onOpponentSubmitted);
      socket.off("ROOM_STATE", onRoomState);
      socket.off("ROUND_RESULT", onRoundResult);
      socket.off("GAME_END", onGameEnd);
      socket.off("ROOM_STATE_FAIL", onRoomStateFail);
    };
  }, [roomId, handleOpponentLeft, toast, router]); // roomId가 바뀔 때만 이 effect를 실행합니다.

  // 자동 Ready: Quick Match와 Private Room 모두 MATCHED phase에서 자동으로 READY 전송
  // (플레이어가 수동으로 "I'm Ready!" 클릭할 필요 없음)
  useEffect(() => {
    // Leak guard: don't auto-ready after forfeit/abandon
    if (
      forfeitEnd ||
      phase === "ABANDONED" ||
      (phase === "GAME_END" && (finishNote === "WIN_BY_FORFEIT" || finishedResult?.reason === "FORFEIT"))
    ) {
      return;
    }
    if (roomId && phase === "MATCHED" && !readySent) {
      if (DEBUG_PVP) {
        console.log("[AUTO_READY] Sending automatic READY", { roomId, phase, isQuickMatch });
      }
      socket.emit("READY", { roomId });
      setReadySent(true);
    }
  }, [roomId, phase, readySent]);

  // PvP 첫 라운드 카운트다운(canAnswer=false)에서만 안내 힌트 노출
  useEffect(() => {
    // Leak guard: suppress hint after forfeit/abandon
    if (
      forfeitEnd ||
      phase === "ABANDONED" ||
      (phase === "GAME_END" && (finishNote === "WIN_BY_FORFEIT" || finishedResult?.reason === "FORFEIT"))
    ) {
      setShowPvpCountdownHint(false);
      return;
    }
    // 조건: PvP + IN_ROUND + round 존재 + canAnswer=false (즉, startedAt이 미래)
    const isInCountdown = resolvedMode === "pvp" && phase === "IN_ROUND" && round && Date.now() < (round.startedAt ?? 0);
    
    if (!isInCountdown) {
      setShowPvpCountdownHint(false);
      return;
    }

    if (typeof window === "undefined") return;
    try {
      const key = "fg_seen_pvp_countdown_hint";
      const seen = localStorage.getItem(key);
      if (!seen) {
        if (DEBUG_PVP) console.log("[PVP_COUNTDOWN_HINT] First countdown, showing hint");
        setShowPvpCountdownHint(true);
        localStorage.setItem(key, "1");
      } else {
        if (DEBUG_PVP) console.log("[PVP_COUNTDOWN_HINT] Already seen, hiding");
        setShowPvpCountdownHint(false);
      }
    } catch (e) {
      if (DEBUG_PVP) console.log("[PVP_COUNTDOWN_HINT] Storage error, showing anyway");
      setShowPvpCountdownHint(true);
    }
  }, [resolvedMode, phase, round?.roundId, round?.startedAt]);

  // \u2705 Preload current round image for better perceived performance (PvP)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!round?.imageUrl) return;
    const preloader = new window.Image();
    preloader.src = round.imageUrl;
    return () => {
      preloader.src = "";
    };
  }, [round?.imageUrl]);

  // 타이머
  useEffect(() => {
    // Leak guard: stop timer after forfeit/abandon
    if (
      forfeitEnd ||
      phase === "ABANDONED" ||
      (phase === "GAME_END" && (finishNote === "WIN_BY_FORFEIT" || finishedResult?.reason === "FORFEIT"))
    ) {
      return;
    }
    if (!round) return;

    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (
        forfeitEnd ||
        phase === "ABANDONED" ||
        (phase === "GAME_END" && (finishNote === "WIN_BY_FORFEIT" || finishedResult?.reason === "FORFEIT"))
      ) {
        return;
      }
      setTimeLeft(msLeft(round.startedAt, round.durationMs));
    }, 100);

    return () => clearInterval(timerRef.current);
  }, [round]);

  const canAnswer = round && Date.now() >= (round.startedAt ?? 0) && phase === "IN_ROUND";

  // Determine if Menu button should be disabled (during active gameplay)
  const isMenuDisabled = roomId && ["WAITING", "MATCHED", "TRANSITION", "IN_ROUND", "ROUND_RESULT"].includes(phase);

  const submit = () => {
    // Hard guard: prevent submit after forfeit end
    if (forfeitEnd) return;
    if (!roomId || !round) return;
    if (submitted) return;

    const sA = String(scoreA).trim();
    const sB = String(scoreB).trim();
    const score = sA !== "" && sB !== "" ? `${sA}-${sB}` : "";

    // Track PvP answer submission event
    trackEvent("answer_submit", {
      mode: "pvp",
      round_number: currentRound
    });

    socket.emit("SUBMIT_ANSWER", { roomId, answer: { teamA, teamB, score } });
    setSubmitted(true);
  };

  // ✅ roomId 없으면 = 로비
  if (!roomId) {
    return (
      <>
        <MetaHead title={ogTitle} description={ogDescription} url={ogUrl} image={ogImage} />
        <Container maxW="container.lg" p={4}>
          <Button onClick={goToMenu} mb={6} variant="outline">
            ← Menu
          </Button>

          <VStack spacing={8} align="stretch">
            <Box textAlign="center">
              <Heading as="h1" size="xl">
                PVP Lobby
              </Heading>
            </Box>

            <Box p={6} borderWidth="1px" borderRadius="lg" boxShadow="base">
              <FormControl isRequired isInvalid={nameTouched && !String(name || "").trim()}>
                <FormLabel htmlFor="nickname">Nickname</FormLabel>
                <Input
                  id="nickname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setNameTouched(true)}
                  placeholder="Your name"
                  size="lg"
                />
                <FormHelperText>
                  Shown to opponent.
                </FormHelperText>
                <FormErrorMessage>Enter a nickname to play.</FormErrorMessage>
              </FormControl>
            </Box>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={10}>
              <Box p={6} borderWidth="1px" borderRadius="lg" boxShadow="base">
                <VStack spacing={4} align="stretch">
                  <Heading as="h3" size="lg">
                    Matchmaking
                  </Heading>
                  <Text>Play against a random opponent instantly.</Text>
                  <HStack>
                    <Text fontSize="sm" color="gray.600">Mode</Text>
                    <Select size="sm" maxW="220px" value={quickMode} onChange={(e) => setQuickMode(e.target.value)} isDisabled={isSearchingQuickMatch}>
                      <option value="ALL">ALL</option>
                      <option value="INTERNATIONAL">INTERNATIONAL</option>
                      <option value="CLUB">CLUB</option>
                    </Select>
                  </HStack>
                  {isSearchingQuickMatch ? (
                  <VStack align="stretch" spacing={3}>
                    <Box p={4} borderWidth="1px" borderRadius="md" textAlign="center" bg="blue.50">
                      <Spinner />
                      <Text mt={2}>Searching...</Text>
                    </Box>
                    <Button colorScheme="red" variant="outline" size="lg" onClick={cancelSearch}>
                      Cancel Search
                    </Button>
                  </VStack>
                ) : (
                  <Button colorScheme="teal" size="lg" onClick={joinQueue} isDisabled={!String(name || "").trim()}>
                    Find Match
                  </Button>
                )}
              </VStack>
            </Box>

            <Box p={6} borderWidth="1px" borderRadius="lg" boxShadow="base">
              <VStack spacing={4} align="stretch">
                <Heading as="h3" size="lg">
                  Private Game
                </Heading>
                <HStack>
                  <Text fontSize="sm" color="gray.600">Mode</Text>
                  <Select size="sm" maxW="220px" value={privateMode} onChange={(e) => setPrivateMode(e.target.value)}>
                    <option value="ALL">ALL</option>
                    <option value="INTERNATIONAL">INTERNATIONAL</option>
                    <option value="CLUB">CLUB</option>
                  </Select>
                </HStack>
                <Button onClick={createRoom} size="lg" variant="outline" isDisabled={!String(name || "").trim()}>
                  Create Invite Code
                </Button>
                <HStack>
                  <Input
                    value={joinCode}
                    onChange={(e) =>
                      setJoinCode(e.target.value.toUpperCase())
                    }
                    placeholder="Enter invite code"
                    size="lg"
                  />
                  <Button onClick={joinRoom} size="lg" colorScheme="blue" isDisabled={!String(name || "").trim() || !String(joinCode || "").trim()}>
                    Join
                  </Button>
                </HStack>
              </VStack>
            </Box>
          </SimpleGrid>
        </VStack>
      </Container>
      </>
    );
  }

  // ✅ roomId 있으면 인게임
  const inviteLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/game?mode=pvp&code=${encodeURIComponent(
          urlCode || ""
        )}`
      : "";

  // 게임 종료 화면
  if (phase === "GAME_END" && finalScoreboard && finalScoreboard.length > 0) {
    const myScore = finalScoreboard.find((p) => p.socketId === socket?.id)?.points ?? 0;
    const opponentScore = finalScoreboard.find((p) => p.socketId !== socket?.id)?.points ?? 0;
    
    let result = "Draw";
    let resultColor = "blue";
    
    if (myScore > opponentScore) {
      result = "Victory!";
      resultColor = "green";
    } else if (myScore < opponentScore) {
      result = "Defeat";
      resultColor = "red";
    }

    return (
      <>
        <MetaHead title={ogTitle} description={ogDescription} url={ogUrl} image={ogImage} />
        <Container maxW="container.lg" p={4}>
        <Tooltip label="Finish the match to return to menu" isDisabled={!isMenuDisabled}>
          <Button onClick={goToMenu} mb={6} variant="outline" isDisabled={isMenuDisabled}>
            ← Menu
          </Button>
        </Tooltip>

        {roomMode === "QUICK" && (finishNote === "WIN_BY_FORFEIT" || finishNote === "LOSS_BY_LEAVE") && (
          <Alert status="warning" borderRadius="md" mb={4}>
            <VStack align="start" spacing={2} width="100%">
              <Heading size="md">
                Opponent left
              </Heading>
              <Text>
                {finishNote === "WIN_BY_FORFEIT" 
                  ? "Your opponent left the match. You win by forfeit." 
                  : "You left the match. This counts as a loss."}
              </Text>
              <Button size="sm" colorScheme="yellow" onClick={goToMenu}>
                Return to Menu
              </Button>
            </VStack>
          </Alert>
        )}

        {opponentLeftNotice && (
          <Alert status="info" borderRadius="md" mb={4}>
            <VStack align="start" spacing={2} width="100%">
              <Heading size="md">
                Opponent left the match.
              </Heading>
              <Tooltip label="Finish the match to return to menu" isDisabled={!isMenuDisabled}>
                <Button size="sm" colorScheme="blue" onClick={goToMenu} isDisabled={isMenuDisabled}>
                  Return to Menu
                </Button>
              </Tooltip>
            </VStack>
          </Alert>
        )}

        <VStack spacing={8} align="stretch" textAlign="center">
          <Box>
            <Heading as="h2" size="xl" color={`${resultColor}.500`}>
              {result}
            </Heading>
          </Box>

          <Box p={8} borderWidth="2px" borderRadius="lg" boxShadow="lg" bg="gray.50" borderColor={`${resultColor}.200`}>
            <SimpleGrid columns={2} spacing={8}>
              {finalScoreboard.map((player) => {
                const isMe = player.socketId === socket?.id;
                return (
                  <Box key={player.socketId} p={6} bg="white" borderRadius="lg" boxShadow="md">
                    <Text fontSize="xs" color="gray.500" mb={2}>
                      {isMe ? "You" : "Opponent"}
                    </Text>
                    <Heading size="lg" mb={4}>
                      {player.name}
                    </Heading>
                    <Heading as="h3" size="2xl" color="teal.600">
                      {player.points} pts
                    </Heading>
                  </Box>
                );
              })}
            </SimpleGrid>
          </Box>

          <VStack spacing={4} align="center" width="100%">
            {(() => {
              const me = players.find((p) => p.socketId === socket?.id) || {};
              const myReq = !!me.rematchRequested;

              return (
                <Button
                  colorScheme={myReq ? "green" : "purple"}
                  size="lg"
                  onClick={() => {
                    if (DEBUG_PVP) console.log("[PVP] rematch click", { roomId, alreadyClicked: rematchClicked, myReq });
                    setRematchClicked(true);
                    socket.emit("pvp:rematch_request", { oldRoomId: roomId });
                  }}
                  isDisabled={myReq || rematchClicked}
                >
                  {myReq ? "Rematch Pending" : "Rematch?"}
                </Button>
              );
            })()}
          </VStack>

          {/* 상대 상태는 아래에 별도로 중앙 정렬로 표시 */}
          <Box textAlign="center" mt={2}>
            {(() => {
              const opp = players.find((p) => p.socketId !== socket?.id) || {};
              const oppReq = !!opp.rematchRequested;
              return (
                <Text fontSize="sm" color={oppReq ? "green.600" : "gray.600"}>
                  {oppReq ? "Opponent wants rematch" : "Waiting for opponent..."}
                </Text>
              );
            })()}
          </Box>
        </VStack>
      </Container>
      </>
    );
  }

  return (
    <>
      <MetaHead title={ogTitle} description={ogDescription} url={ogUrl} image={ogImage} />
      {/* Mobile-only sticky timer for PvP IN_ROUND phase */}
      {phase === "IN_ROUND" && round && (
        (() => {
          const pvpTimeRatio = timeLeft / (round.durationMs ?? 1);
          const pvpTimerColorScheme = pvpTimeRatio > 0.5 ? "green" : pvpTimeRatio > 0.2 ? "orange" : "red";
          return (
            <Box
              display={{ base: "block", md: "none" }}
              position="sticky"
              top={0}
              zIndex={10}
              bg="white"
              borderBottom="2px solid"
              borderColor={pvpTimeRatio > 0.5 ? "green.300" : pvpTimeRatio > 0.2 ? "orange.300" : "red.300"}
              p={3}
              boxShadow="md"
            >
              <HStack justify="space-between" align="center">
                <Text fontSize="sm" fontWeight="bold" color="gray.700">
                  Time Left
                </Text>
                <Progress
                  value={pvpTimeRatio * 100}
                  size="sm"
                  colorScheme={pvpTimerColorScheme}
                  borderRadius="md"
                  flex={1}
                  mx={3}
                  h="6px"
                />
                <Text fontSize="sm" fontWeight="bold" color="gray.700" minW="50px" textAlign="right">
                  {Math.ceil(timeLeft / 1000)}s
                </Text>
              </HStack>
            </Box>
          );
        })()
      )}
      <Container maxW="container.xl" p={4}>
      <Grid
        templateColumns={{ base: "1fr", lg: "3fr 1fr" }}
        gap={{ base: 4, lg: 8 }}
      >
        {/* Left Column: Main Game Area */}
        <VStack spacing={4} align="stretch">
          <HStack>
            <Tooltip label="Finish the match to return to menu" isDisabled={!isMenuDisabled}>
              <Button onClick={goToMenu} variant="outline" isDisabled={isMenuDisabled}>
                ← Menu
              </Button>
            </Tooltip>
            <Heading as="h2" size="lg" isTruncated>
              Room: {roomId.split("-")[0]}...
            </Heading>
            <Box flex="1" />
            <Text fontSize="sm" color="gray.600">Mode: {roomMode}</Text>
          </HStack>

          {endBanner && (
            <Alert 
              status={endBanner.type === "FORFEIT_WIN" ? "warning" : "error"} 
              borderRadius="md"
            >
              <VStack align="start" spacing={2} width="100%">
                <Heading size="md">{endBanner.title}</Heading>
                <Text>{endBanner.message}</Text>
                <Button 
                  size="sm" 
                  colorScheme={endBanner.type === "FORFEIT_WIN" ? "yellow" : "red"} 
                  onClick={goToMenu}
                >
                  Return to Menu
                </Button>
              </VStack>
            </Alert>
          )}

          {opponentLeftNotice && (
            <Alert status="info" borderRadius="md">
              <VStack align="start" spacing={2} width="100%">
                <Heading size="md">
                  Opponent left the match.
                </Heading>
                <Text>Return to the lobby to start a new match.</Text>
                <Button size="sm" colorScheme="blue" onClick={goToMenu}>
                  Return to Menu
                </Button>
              </VStack>
            </Alert>
          )}

          {phase === "ABANDONED" && !opponentLeftNotice && (
            <Alert status="warning" borderRadius="md">
              <VStack align="start" spacing={2} width="100%">
                <Heading size="md">Opponent left</Heading>
                <Text>Return to the lobby to start a new match.</Text>
                <Button size="sm" colorScheme="yellow" onClick={goToMenu}>
                  Return to Menu
                </Button>
              </VStack>
            </Alert>
          )}

          {finishedResult && !matchFinished && (
            <Alert status={finishedResult.winnerSocketId === socket.id ? "success" : "warning"} borderRadius="md">
              <VStack align="start" spacing={2} width="100%">
                <Heading size="md">
                  {finishedResult.winnerSocketId === socket.id
                    ? "You win by forfeit"
                    : "Leaving counts as a loss"}
                </Heading>
                <Text>Match ended: {finishedResult.reason || "FORFEIT"}</Text>
                <Button size="sm" colorScheme="yellow" onClick={goToMenu}>
                  Return to Menu
                </Button>
              </VStack>
            </Alert>
          )}

          {phase === "ROUND_RESULT" && lastResult && (
            <Alert status="info" borderRadius="md">
              <VStack align="start">
                <Heading size="md">🏁 Round Done</Heading>
                <Text>
                  ✓ {lastResult.correct.teamA} vs {lastResult.correct.teamB} ({lastResult.correct.score})
                </Text>
                <Text fontWeight="bold">
                  +{lastResult.me?.gained ?? 0} pts (Total: {lastResult.me?.total ?? 0})
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Next round starts soon.
                </Text>
              </VStack>
            </Alert>
          )}

          {!round &&
            (phase === "MATCHED" ||
              phase === "LOADING" ||
              phase === "WAITING") && (
              <Box
                p={10}
                borderWidth="1px"
                borderRadius="lg"
                boxShadow="base"
                textAlign="center"
              >
                <Heading size="md">Match Found!</Heading>
                <Text mt={2}>
                  Starting soon...
                </Text>
              </Box>
            )}

          {round && (
            <>
              {/* PvP countdown hint: show only when canAnswer=false (before startedAt) */}
              {showPvpCountdownHint && !canAnswer && (
                <Alert status="info" borderRadius="md" mb={4}>
                  <VStack align="start" spacing={1} width="100%">
                    <Heading size="sm">Match starting soon</Heading>
                    <Text fontSize="sm">
                      This is not lag. To ensure a fair start, the match will begin in 3 seconds.
                    </Text>
                  </VStack>
                </Alert>
              )}

              <Box
                pos="relative"
                width="100%"
                // Use aspect ratio to maintain shape
                pt="56.25%" // 16:9 aspect ratio
                bg="gray.800"
                borderRadius="lg"
                overflow="hidden"
                boxShadow="lg"
                filter={canAnswer ? "none" : "blur(8px)"}
                opacity={canAnswer ? 1 : 0.4}
                transition="all 300ms ease-in-out"
              >
                <Box pos="absolute" top="0" left="0" right="0" bottom="0" style={{ aspectRatio: "16/9" }}>
                  <Image
                    src={round.imageUrl}
                    alt="match"
                    fill
                    style={{ objectFit: "contain" }}
                    sizes="(max-width: 768px) 100vw, 900px"
                    quality={75}
                    priority={currentRound === 1}
                    placeholder="blur"
                    blurDataURL={BLUR_PLACEHOLDER}
                  />
                </Box>
              </Box>

              <SimpleGrid
                columns={{ base: 1, md: 3 }}
                spacing={4}
                mt={4}
              >
                <Input
                  list="teams-list"
                  placeholder="Team A"
                  value={teamA}
                  onChange={(e) => setTeamA(e.target.value)}
                  disabled={submitted || !canAnswer}
                  autoComplete="off"
                  size="lg"
                />
                <Input
                  list="teams-list"
                  placeholder="Team B"
                  value={teamB}
                  onChange={(e) => setTeamB(e.target.value)}
                  disabled={submitted || !canAnswer}
                  autoComplete="off"
                  size="lg"
                />
                <HStack>
                  <Input
                    type="number"
                    min="0"
                    placeholder="A"
                    value={scoreA}
                    onChange={(e) => setScoreA(e.target.value)}
                    disabled={submitted || !canAnswer}
                    size="lg"
                    textAlign="center"
                  />
                  <Text fontSize="xl" fontWeight="bold">
                    :
                  </Text>
                  <Input
                    type="number"
                    min="0"
                    placeholder="B"
                    value={scoreB}
                    onChange={(e) => setScoreB(e.target.value)}
                    disabled={submitted || !canAnswer}
                    size="lg"
                    textAlign="center"
                  />
                </HStack>
              </SimpleGrid>

              <Button
                onClick={submit}
                size="lg"
                colorScheme={submitted ? "gray" : "green"}
                w="100%"
                mt={4}
                disabled={submitted || !canAnswer}
              >
                {submitted ? "✓ Sent" : "Submit"}
              </Button>

              <datalist id="teams-list">
                {teams.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </>
          )}
        </VStack>

        {/* Right Column: Info Sidebar */}
        <VStack spacing={4} align="stretch">
          {!!urlCode && (
            <Box p={4} borderWidth="1px" borderRadius="lg" boxShadow="base">
              <Heading size="md" mb={2}>
                🔗 Invite Link
              </Heading>
              <HStack>
                <Input
                  isReadOnly
                  value={inviteLink}
                  size="sm"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    toast({ title: "Copied!", status: "success", duration: 1500 });
                  }}
                >
                  Copy
                </Button>
              </HStack>
            </Box>
          )}

          <Box p={4} borderWidth="1px" borderRadius="lg" boxShadow="base">
            <Heading size="md" mb={2}>
              👥 Players
            </Heading>
            <VStack align="stretch">
              {players.map((p) => (
                <HStack
                  key={p.socketId}
                  justify="space-between"
                  p={2}
                  bg={p.socketId === socket?.id ? "teal.50" : "gray.50"}
                  borderRadius="md"
                >
                  <Text fontWeight="bold">{p.name}</Text>
                  <Text>{p.points} pts</Text>
                  {p.submitted && <Text>✅</Text>}
                </HStack>
              ))}
            </VStack>
          </Box>

          <Box p={4} borderWidth="1px" borderRadius="lg" boxShadow="base">
            <Heading size="md" mb={2}>
              📊 Status
            </Heading>
            <VStack align="stretch">
               <Text><b>Phase:</b> {phase}</Text>
               <Text><b>Round:</b> {currentRound} / {maxRounds}</Text>
               <Text><b>Opponent:</b> {opponentSubmitted ? "Submitted ✅" : "Not yet"}</Text>
            </VStack>
             {round && (
                (() => {
                  const pvpSidebarRatio = timeLeft / round.durationMs;
                  const pvpSidebarColorScheme = pvpSidebarRatio > 0.5 ? "green" : pvpSidebarRatio > 0.2 ? "orange" : "red";
                  return (
                    <Box mt={4} display={{ base: "none", md: "block" }}>
                      <Text mb={1} fontWeight="bold">Time Left</Text>
                      <Progress value={pvpSidebarRatio * 100} size="lg" colorScheme={pvpSidebarColorScheme} borderRadius="md" />
                    </Box>
                  );
                })()
             )}
          </Box>
        </VStack>
      </Grid>
      </Container>
    </>
  );
}
