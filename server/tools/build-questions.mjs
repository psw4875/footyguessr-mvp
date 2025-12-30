import fs from "fs";
import path from "path";

/** ---------------- CSV ---------------- */
function parseCSV(text) {
  // 아주 단순 CSV 파서(쉼표 포함 필드가 없다는 가정; MVP용)
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = lines.shift().split(",").map((s) => s.trim());
  return lines.map((line) => {
    const cols = line.split(",").map((s) => s.trim());
    const row = {};
    header.forEach((h, i) => (row[h] = cols[i] ?? ""));
    return row;
  });
}

/** ---------------- utils ---------------- */
function normScore(s) {
  // "7-1", "7:1", "7 - 1" -> "7-1"
  const m = String(s || "")
    .trim()
    .match(/^(\d+)\s*[-:]\s*(\d+)$/);
  if (!m) return null;
  return `${Number(m[1])}-${Number(m[2])}`;
}

function required(row, key) {
  if (!row[key] || !String(row[key]).trim()) {
    throw new Error(`Missing "${key}" in row: ${JSON.stringify(row)}`);
  }
  return String(row[key]).trim();
}

function fileBaseId(imageFile) {
  // "bra-ger-2014.jpg" -> "bra-ger-2014"
  return path.basename(imageFile, path.extname(imageFile));
}

function parseNullableInt(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseTags(v) {
  const s = String(v ?? "").trim();
  if (!s) return [];
  return s
    .split(/[\|,;]/g)
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseMatchType(v, tournament) {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "CLUB") return "CLUB";
  if (s === "INTERNATIONAL" || s === "NATIONAL") return "INTERNATIONAL";
  
  // Infer from tournament if matchType column is empty
  if (!s && tournament) {
    const t = String(tournament).toLowerCase();
    if (t.includes("champions league") || 
        t.includes("europa league") || 
        t.includes("premier league") || 
        t.includes("la liga") || 
        t.includes("serie a") || 
        t.includes("bundesliga") || 
        t.includes("ligue 1") ||
        t.includes("ucl") ||
        t.includes("epl")) {
      return "CLUB";
    }
  }
  
  // default
  return "INTERNATIONAL";
}

function parseString(v) {
  const s = String(v ?? "").trim();
  return s || null;
}

function normalizeStage(v) {
  const s = String(v ?? "").trim();
  return s || null;
}

function normalizeTournament(v) {
  const s = String(v ?? "").trim();
  return s || null;
}

function readExistingQuestions(outJsonPath) {
  if (!fs.existsSync(outJsonPath)) return [];
  try {
    const raw = fs.readFileSync(outJsonPath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function defaultMeta() {
  return {
    tournament: null,
    year: null,
    stage: null,
    difficulty: null,
    tags: [],
    matchType: "INTERNATIONAL",
    competitionCode: null,
    season: null,
    leg: null,
    venueCity: null,
    venueStadium: null,
  };
}

/** ---------------- paths ---------------- */
const ROOT = path.resolve(process.cwd()); // server 폴더에서 실행
const CSV_PATH = path.join(ROOT, "data", "questions.csv");
const OUT_JSON = path.join(ROOT, "questions.json");
const WEB_MATCHES_DIR = path.resolve(ROOT, "..", "web", "public", "matches");

/** ---------------- load ---------------- */
const csvText = fs.readFileSync(CSV_PATH, "utf-8");
const rows = parseCSV(csvText);

console.log("HEADER KEYS:", Object.keys(rows[0] || {}));
console.log(
  "ROW0 difficulty raw:",
  rows[0]?.difficulty,
  "→ parsed:",
  parseNullableInt(rows[0]?.difficulty)
);

/** ---------------- existing ---------------- */
const existing = readExistingQuestions(OUT_JSON);

const existingByImageUrl = new Map();
const existingById = new Map();
for (const q of existing) {
  if (q?.imageUrl) existingByImageUrl.set(q.imageUrl, q);
  if (q?.id) existingById.set(q.id, q);
}

/** ---------------- build ---------------- */
const questions = rows.map((r, idx) => {
  const imageFile = required(r, "imageFile");
  const teamA = required(r, "teamA");
  const teamB = required(r, "teamB");
  const scoreRaw = required(r, "score");

  const score = normScore(scoreRaw);
  if (!score) {
    throw new Error(
      `Bad score format at row ${idx + 2}: "${scoreRaw}" (use 2-1 or 2:1)`
    );
  }

  const imgPath = path.join(WEB_MATCHES_DIR, imageFile);
  if (!fs.existsSync(imgPath)) {
    throw new Error(`Image not found: ${imgPath} (row ${idx + 2})`);
  }

  const id = fileBaseId(imageFile);
  const imageUrl = `/matches/${imageFile}`;

  const prev =
    existingByImageUrl.get(imageUrl) || existingById.get(id) || null;

  // ✅ 기본 meta + 기존 meta 병합
  const meta = {
    ...defaultMeta(),
    ...(prev?.meta ?? {}),
  };

  // ✅ CSV 값은 "있으면 무조건 덮어씀"
  const csvTournament = normalizeTournament(r.tournament);
  const csvYear = parseNullableInt(r.year);
  const csvStage = normalizeStage(r.stage);
  const csvDifficulty = parseNullableInt(r.difficulty);
  const csvTags = parseTags(r.tags);
  const csvMatchType = parseMatchType(r.matchType, csvTournament);
  const csvCompetitionCode = parseString(r.competitionCode);
  const csvSeason = parseString(r.season);
  const csvLeg = parseNullableInt(r.leg);
  const csvVenueCity = parseString(r.venueCity);
  const csvVenueStadium = parseString(r.venueStadium);

  // CLUB validation: must have year or season
  if (csvMatchType === "CLUB" && (csvYear == null) && (!csvSeason)) {
    console.warn(
      `[SKIP] CLUB row missing both year and season at row ${idx + 2}: ${imageFile}`
    );
    return null;
  }

  if (csvTournament !== null) meta.tournament = csvTournament;
  if (csvYear !== null) meta.year = csvYear;
  if (csvStage !== null) meta.stage = csvStage;
  if (csvDifficulty !== null) {
    if (!(csvDifficulty >= 1 && csvDifficulty <= 5)) {
      throw new Error(
        `Invalid difficulty (must be 1~5) at row ${idx + 2}: ${csvDifficulty}`
      );
    }
    meta.difficulty = csvDifficulty;
  }
  if (csvTags.length) meta.tags = csvTags;
  meta.matchType = csvMatchType || meta.matchType || "INTERNATIONAL";
  if (csvCompetitionCode !== null) meta.competitionCode = csvCompetitionCode;
  if (csvSeason !== null) meta.season = csvSeason;
  if (csvLeg !== null) {
    if (csvLeg !== 1 && csvLeg !== 2) {
      throw new Error(`Invalid leg (must be 1 or 2) at row ${idx + 2}: ${csvLeg}`);
    }
    meta.leg = csvLeg;
  }
  if (csvVenueCity !== null) meta.venueCity = csvVenueCity;
  if (csvVenueStadium !== null) meta.venueStadium = csvVenueStadium;

  // Validation: year required for INTERNATIONAL
  if (meta.matchType === "INTERNATIONAL" && (meta.year == null)) {
    throw new Error(`Missing year for INTERNATIONAL at row ${idx + 2}`);
  }

  const question = {
    id,
    imageUrl,
    correct: { teamA, teamB, score },
    meta,
    // Normalized shape (additive, preserves backward compatibility)
    teams: {
      home: { name: teamA, type: meta.matchType === "INTERNATIONAL" ? "NATIONAL_TEAM" : "CLUB" },
      away: { name: teamB, type: meta.matchType === "INTERNATIONAL" ? "NATIONAL_TEAM" : "CLUB" },
    },
    score,
    competition: {
      name: meta.tournament,
      code: meta.competitionCode || null,
      year: meta.year,
      season: meta.season || null,
    },
    stage: meta.stage,
    difficulty: meta.difficulty,
    tags: meta.tags,
  };
  return question;
}).filter(Boolean);

/** ---------------- write ---------------- */
fs.writeFileSync(OUT_JSON, JSON.stringify(questions, null, 2), "utf-8");
console.log(`✅ Built ${questions.length} questions -> ${OUT_JSON}`);
