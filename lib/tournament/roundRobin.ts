import type { MatchPhase, UnscheduledMatch } from "./types";

const BYE = "__BYE__";

export function roundRobinPairs(teamNames: string[]): { round: number; home: string; away: string }[] {
  const teams = [...teamNames];
  if (teams.length < 2) return [];
  if (teams.length % 2 === 1) teams.push(BYE);

  const n = teams.length;
  const rounds = n - 1;
  const half = n / 2;
  const rotation = [...teams];
  const matches: { round: number; home: string; away: string }[] = [];

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < half; i++) {
      const home = rotation[i];
      const away = rotation[n - 1 - i];
      if (home === BYE || away === BYE) continue;
      const swap = round % 2 === 1;
      matches.push({
        round: round + 1,
        home: swap ? away : home,
        away: swap ? home : away,
      });
    }
    const fixed = rotation[0];
    const rest = rotation.slice(1);
    const last = rest.pop();
    if (last) rest.unshift(last);
    rotation.splice(0, rotation.length, fixed, ...rest);
  }

  return matches;
}

export function generateRoundRobin(
  teamNames: string[],
  phase: MatchPhase,
  groupName?: string,
): UnscheduledMatch[] {
  return roundRobinPairs(teamNames).map((match) => ({
    homeTeamName: match.home,
    awayTeamName: match.away,
    phase,
    round: match.round,
    groupName,
  }));
}
