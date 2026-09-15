import type { MatchStatus } from "@prisma/client";
import { toBogotaDateString } from "./dates";

export const WALKOVER_GOALS = 3;

export function isClosedMatch(status: MatchStatus | string) {
  return status === "PLAYED" || status === "WALKOVER";
}

export function hasTournamentStarted(input: {
  status: string;
  startDate: Date | string;
  matches: { status: string; scheduledAt: Date | string }[];
}) {
  if (input.status === "IN_PROGRESS" || input.status === "FINISHED") return true;
  if (input.matches.some((match) => isClosedMatch(match.status))) return true;
  const firstKickoff = input.matches
    .map((match) => new Date(match.scheduledAt).getTime())
    .filter((time) => !Number.isNaN(time))
    .sort((a, b) => a - b)[0];
  if (firstKickoff != null) return Date.now() >= firstKickoff;
  const startKey =
    typeof input.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.startDate)
      ? input.startDate
      : toBogotaDateString(new Date(input.startDate));
  return toBogotaDateString(new Date()) >= startKey;
}

export function venueOrNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function displayVenue(matchVenue?: string | null, tournamentVenue?: string | null) {
  return venueOrNull(matchVenue) ?? venueOrNull(tournamentVenue) ?? "";
}
