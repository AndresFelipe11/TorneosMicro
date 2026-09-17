import { isClosedMatch } from "./match";
import { rebuildLeagueRounds } from "./roundRobin";
import { scheduleMatches, type OccupiedMatch } from "./schedule";
import type { GeneratedMatch, UnscheduledMatch } from "./types";

export type FixtureMatch = UnscheduledMatch & {
  status?: string;
  scheduledAt?: Date | string | null;
};

export function scheduleLeagueFixture(
  matches: FixtureMatch[],
  config: Parameters<typeof scheduleMatches>[1],
  scope?: { groupName?: string },
): { error?: string; rounds: FixtureMatch[]; dates: GeneratedMatch[] } {
  const rounds = rebuildLeagueRounds(matches);
  const inScope = (match: FixtureMatch) => !scope?.groupName || match.groupName === scope.groupName;
  const occupied: OccupiedMatch[] = rounds
    .filter(
      (match) =>
        isClosedMatch(match.status ?? "SCHEDULED") || match.phase === "KNOCKOUT" || !inScope(match),
    )
    .filter((match) => match.scheduledAt)
    .map((match) => ({
      homeTeamName: match.homeTeamName,
      awayTeamName: match.awayTeamName,
      scheduledAt: match.scheduledAt as Date | string,
    }));
  const pending = rounds.filter(
    (match) =>
      !isClosedMatch(match.status ?? "SCHEDULED") && match.phase !== "KNOCKOUT" && inScope(match),
  );
  if (pending.length === 0) {
    return { rounds, dates: [] };
  }
  const scheduled = scheduleMatches(pending, config, occupied);
  if (scheduled.error) return { error: scheduled.error, rounds, dates: [] };
  return { rounds, dates: scheduled.matches };
}
