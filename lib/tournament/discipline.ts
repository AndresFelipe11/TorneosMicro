export type PlayerCardSummary = {
  playerId: string;
  playerName: string;
  playerNumber: number | null;
  teamId: string;
  teamName: string;
  yellows: number;
  reds: number;
  unpaidYellowIds: string[];
};

export function computePlayerCards(
  players: {
    id: string;
    name: string;
    number: number | null;
    teamId: string;
    teamName: string;
  }[],
  matches: {
    status: string;
    cards: { id: string; playerId: string; type: "YELLOW" | "RED"; paid?: boolean }[];
  }[],
): PlayerCardSummary[] {
  const table = new Map(
    players.map((player) => [
      player.id,
      {
        playerId: player.id,
        playerName: player.name,
        playerNumber: player.number,
        teamId: player.teamId,
        teamName: player.teamName,
        yellows: 0,
        reds: 0,
        unpaidYellowIds: [] as string[],
      },
    ]),
  );

  for (const match of matches) {
    if (match.status !== "PLAYED") continue;
    for (const card of match.cards) {
      const row = table.get(card.playerId);
      if (!row) continue;
      if (card.type === "RED") {
        row.reds += 1;
        continue;
      }
      if (card.paid) continue;
      row.yellows += 1;
      row.unpaidYellowIds.push(card.id);
    }
  }

  return [...table.values()]
    .filter((row) => row.yellows > 0 || row.reds > 0)
    .sort((a, b) => {
      if (b.reds !== a.reds) return b.reds - a.reds;
      if (b.yellows !== a.yellows) return b.yellows - a.yellows;
      return a.playerName.localeCompare(b.playerName, "es");
    });
}

export function cardsForTeams(rows: PlayerCardSummary[], teamIds: string[]) {
  const allowed = new Set(teamIds);
  return rows.filter((row) => allowed.has(row.teamId));
}
