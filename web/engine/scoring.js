function normTeam(s) {
  return String(s || "").trim().toLowerCase();
}

function parseScore(scoreStr) {
  const s = String(scoreStr || "").trim();
  const m = s.match(/^(\d+)\s*[-:]\s*(\d+)$/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

/**
 * answer: { teamA, teamB, score }
 * correct: { teamA, teamB, score }
 * return: { points: number, message: string, category: string }
 * 
 * NEW SCORING RULES (Single mode):
 * - Perfect (both teams + score): +10
 * - Both teams correct (score wrong): +5
 * - One team correct: +2
 * - Score-only correct (teams not both correct): 0
 * - Nothing correct: 0
 */
export function scoreAnswer(answer, correct) {
  const aA = normTeam(answer.teamA);
  const aB = normTeam(answer.teamB);

  const cA = normTeam(correct.teamA);
  const cB = normTeam(correct.teamB);

  const sameOrder = aA === cA && aB === cB;
  const swappedOrder = aA === cB && aB === cA;

  const teamsCorrect = sameOrder || swappedOrder;
  
  // Check individual team correctness
  const teamACorrect = aA === cA || aA === cB;
  const teamBCorrect = aB === cA || aB === cB;
  const oneTeamCorrect = (teamACorrect && !teamBCorrect) || (!teamACorrect && teamBCorrect);

  const u = parseScore(answer.score);
  const c = parseScore(correct.score);

  let scoreCorrect = false;
  if (u && c) {
    const [u1, u2] = u;
    const [c1, c2] = c;

    if (sameOrder) scoreCorrect = u1 === c1 && u2 === c2;
    if (swappedOrder) scoreCorrect = u1 === c2 && u2 === c1;
  }

  // Apply new scoring rules
  if (teamsCorrect && scoreCorrect) {
    return { points: 10, message: "🐐 Perfect! Teams + score (+10)", category: "perfect" };
  }
  if (teamsCorrect) {
    return { points: 5, message: "🔥 Both teams correct (+5)", category: "bothTeams" };
  }
  if (oneTeamCorrect) {
    return { points: 2, message: "✅ One team correct (+2)", category: "oneTeam" };
  }
  if (scoreCorrect) {
    return { points: 0, message: "🎲 Score-only doesn't count (0)", category: "scoreOnly" };
  }
  return { points: 0, message: "❌ No match (0)", category: "none" };
}
