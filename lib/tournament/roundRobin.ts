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

const LEAGUE_PHASES = new Set<MatchPhase>(["ROUND_ROBIN", "GROUP", "QUADRANGULAR"]);

function pairKey(a: string, b: string) {
  return [a, b].sort((left, right) => left.localeCompare(right, "es")).join("\0");
}

export function rebuildLeagueRounds<T extends UnscheduledMatch>(matches: T[]): T[] {
  const buckets = new Map<string, T[]>();
  const others: T[] = [];
  for (const match of matches) {
    if (!LEAGUE_PHASES.has(match.phase)) {
      others.push(match);
      continue;
    }
    const key = `${match.phase}::${match.groupName ?? ""}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(match);
    buckets.set(key, bucket);
  }

  const rebuilt: T[] = [];
  for (const groupMatches of buckets.values()) {
    const teams = [
      ...new Set(groupMatches.flatMap((match) => [match.homeTeamName, match.awayTeamName])),
    ].sort((left, right) => left.localeCompare(right, "es"));
    const roundByPair = new Map<string, number>();
    for (const pair of roundRobinPairs(teams)) {
      roundByPair.set(pairKey(pair.home, pair.away), pair.round);
    }
    for (const match of groupMatches) {
      rebuilt.push({
        ...match,
        round: roundByPair.get(pairKey(match.homeTeamName, match.awayTeamName)) ?? match.round,
      });
    }
  }
  return [...rebuilt, ...others];
}
