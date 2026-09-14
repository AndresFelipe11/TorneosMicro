import type { StandingRow } from "./types";

export type PlayedMatch = {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  groupName?: string | null;
};

export type TeamRef = {
  id: string;
  name: string;
  groupName?: string | null;
};

function emptyRow(team: TeamRef): StandingRow {
  return {
    teamId: team.id,
    teamName: team.name,
    groupName: team.groupName ?? undefined,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
  };
}

function applyResult(row: StandingRow, gf: number, ga: number) {
  row.played += 1;
  row.gf += gf;
  row.ga += ga;
  row.gd = row.gf - row.ga;
  if (gf > ga) {
    row.won += 1;
    row.points += 3;
  } else if (gf === ga) {
    row.drawn += 1;
    row.points += 1;
  } else {
    row.lost += 1;
  }
}

function headToHead(
  a: StandingRow,
  b: StandingRow,
  matches: PlayedMatch[],
): number {
  const clash = matches.find(
    (match) =>
      (match.homeTeamId === a.teamId && match.awayTeamId === b.teamId) ||
      (match.homeTeamId === b.teamId && match.awayTeamId === a.teamId),
  );
  if (!clash) return 0;
  const aGoals = clash.homeTeamId === a.teamId ? clash.homeScore : clash.awayScore;
  const bGoals = clash.homeTeamId === b.teamId ? clash.homeScore : clash.awayScore;
  return bGoals - aGoals;
}

export function computeStandings(teams: TeamRef[], matches: PlayedMatch[]): StandingRow[] {
  const table = new Map(teams.map((team) => [team.id, emptyRow(team)]));

  for (const match of matches) {
    const home = table.get(match.homeTeamId);
    const away = table.get(match.awayTeamId);
    if (!home || !away) continue;
    applyResult(home, match.homeScore, match.awayScore);
    applyResult(away, match.awayScore, match.homeScore);
  }

  const rows = [...table.values()];
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    const h2h = headToHead(a, b, matches);
    if (h2h !== 0) return h2h;
    return a.teamName.localeCompare(b.teamName, "es");
  });
  return rows;
}

export function standingsByGroup(teams: TeamRef[], matches: PlayedMatch[]): Map<string, StandingRow[]> {
  const groups = new Map<string, TeamRef[]>();
  for (const team of teams) {
    const key = team.groupName ?? "General";
    const list = groups.get(key) ?? [];
    list.push(team);
    groups.set(key, list);
  }

  const result = new Map<string, StandingRow[]>();
  for (const [name, groupTeams] of groups) {
    const ids = new Set(groupTeams.map((team) => team.id));
    const groupMatches = matches.filter(
      (match) => ids.has(match.homeTeamId) && ids.has(match.awayTeamId),
    );
    result.set(name, computeStandings(groupTeams, groupMatches));
  }
  return result;
}
