import type { KnockoutRound, StandingRow, UnscheduledMatch } from "./types";

export function knockoutRoundFor(teamCount: number): KnockoutRound | null {
  if (teamCount === 16) return "R16";
  if (teamCount === 8) return "QF";
  if (teamCount === 4) return "SF";
  if (teamCount === 2) return "F";
  return null;
}

export function nextKnockoutRound(round: KnockoutRound): KnockoutRound | null {
  if (round === "R16") return "QF";
  if (round === "QF") return "SF";
  if (round === "SF") return "F";
  return null;
}

export function knockoutRoundLabel(round: KnockoutRound): string {
  const labels: Record<KnockoutRound, string> = {
    R16: "Octavos de final",
    QF: "Cuartos de final",
    SF: "Semifinales",
    F: "Final",
  };
  return labels[round];
}

export type QualifiedTeam = {
  teamName: string;
  groupName: string;
  rank: number;
};

export function qualifiedFromStandings(
  standings: StandingRow[],
  qualifyPerGroup: number,
): QualifiedTeam[] {
  const byGroup = new Map<string, StandingRow[]>();
  for (const row of standings) {
    const key = row.groupName ?? "General";
    const list = byGroup.get(key) ?? [];
    list.push(row);
    byGroup.set(key, list);
  }

  const qualified: QualifiedTeam[] = [];
  const groupNames = [...byGroup.keys()].sort((a, b) => a.localeCompare(b, "es"));
  for (const groupName of groupNames) {
    const rows = byGroup.get(groupName) ?? [];
    rows.slice(0, qualifyPerGroup).forEach((row, index) => {
      qualified.push({
        teamName: row.teamName,
        groupName,
        rank: index + 1,
      });
    });
  }
  return qualified;
}

export function pairQualified(qualified: QualifiedTeam[]): [string, string][] {
  const groups = [...new Set(qualified.map((item) => item.groupName))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );

  if (qualified.every((item) => item.rank === 1) || groups.length === qualified.length) {
    const names = qualified.map((item) => item.teamName);
    const pairs: [string, string][] = [];
    for (let i = 0; i < names.length; i += 2) {
      if (names[i + 1]) pairs.push([names[i], names[i + 1]]);
    }
    return pairs;
  }

  const firsts = groups
    .map((group) => qualified.find((item) => item.groupName === group && item.rank === 1)?.teamName)
    .filter((name): name is string => Boolean(name));
  const seconds = groups
    .map((group) => qualified.find((item) => item.groupName === group && item.rank === 2)?.teamName)
    .filter((name): name is string => Boolean(name));

  if (firsts.length === seconds.length && firsts.length > 0) {
    return firsts.map((team, index) => [team, seconds[(index + 1) % seconds.length]] as [string, string]);
  }

  const names = qualified.map((item) => item.teamName);
  const pairs: [string, string][] = [];
  for (let i = 0; i < names.length; i += 2) {
    if (names[i + 1]) pairs.push([names[i], names[i + 1]]);
  }
  return pairs;
}

export function generateKnockoutMatches(pairs: [string, string][]): UnscheduledMatch[] {
  const round = knockoutRoundFor(pairs.length * 2);
  if (!round) return [];
  return pairs.map(([home, away], index) => ({
    homeTeamName: home,
    awayTeamName: away,
    phase: "KNOCKOUT" as const,
    round: 1,
    knockoutRound: round,
    groupName: `Llave ${index + 1}`,
  }));
}

export function generateNextKnockout(winners: string[]): UnscheduledMatch[] {
  if (winners.length === 1) return [];
  const round = knockoutRoundFor(winners.length);
  if (!round) return [];
  const pairs: [string, string][] = [];
  for (let i = 0; i < winners.length; i += 2) {
    if (winners[i + 1]) pairs.push([winners[i], winners[i + 1]]);
  }
  return pairs.map(([home, away], index) => ({
    homeTeamName: home,
    awayTeamName: away,
    phase: "KNOCKOUT",
    round: round === "F" ? 99 : 1,
    knockoutRound: round,
    groupName: round === "F" ? "Final" : `Llave ${index + 1}`,
  }));
}
