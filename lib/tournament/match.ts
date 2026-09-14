import type { MatchStatus } from "@prisma/client";

export const WALKOVER_GOALS = 3;

export function isClosedMatch(status: MatchStatus | string) {
  return status === "PLAYED" || status === "WALKOVER";
}

export function venueOrNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function displayVenue(matchVenue?: string | null, tournamentVenue?: string | null) {
  return venueOrNull(matchVenue) ?? venueOrNull(tournamentVenue) ?? "";
}
