import type { ScorerRow } from "./types";

export type GoalInput = {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
};

export function computeScorers(goals: GoalInput[]): ScorerRow[] {
  const map = new Map<string, ScorerRow>();
  for (const goal of goals) {
    const current = map.get(goal.playerId) ?? {
      playerId: goal.playerId,
      playerName: goal.playerName,
      teamId: goal.teamId,
      teamName: goal.teamName,
      goals: 0,
    };
    current.goals += 1;
    map.set(goal.playerId, current);
  }
  return [...map.values()].sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    return a.playerName.localeCompare(b.playerName, "es");
  });
}
