import type { DefenseRow } from "./types";
import type { PlayedMatch, TeamRef } from "./standings";
import { teamName } from "../format";

export function computeDefense(teams: TeamRef[], matches: PlayedMatch[]): DefenseRow[] {
  const table = new Map<string, DefenseRow>(
    teams.map((team) => [
      team.id,
      {
        teamId: team.id,
        teamName: teamName(team.name),
        played: 0,
        ga: 0,
        cleanSheets: 0,
        average: 0,
      },
    ]),
  );

  for (const match of matches) {
    const home = table.get(match.homeTeamId);
    const away = table.get(match.awayTeamId);
    if (home) {
      home.played += 1;
      home.ga += match.awayScore;
      if (match.awayScore === 0) home.cleanSheets += 1;
    }
    if (away) {
      away.played += 1;
      away.ga += match.homeScore;
      if (match.homeScore === 0) away.cleanSheets += 1;
    }
  }

  const rows = [...table.values()].map((row) => ({
    ...row,
    average: row.played === 0 ? 0 : Number((row.ga / row.played).toFixed(2)),
  }));

  rows.sort((a, b) => {
    if (a.played === 0 && b.played === 0) return a.teamName.localeCompare(b.teamName, "es");
    if (a.played === 0) return 1;
    if (b.played === 0) return -1;
    if (a.ga !== b.ga) return a.ga - b.ga;
    if (b.cleanSheets !== a.cleanSheets) return b.cleanSheets - a.cleanSheets;
    if (b.played !== a.played) return b.played - a.played;
    if (a.average !== b.average) return a.average - b.average;
    return a.teamName.localeCompare(b.teamName, "es");
  });

  return rows;
}
