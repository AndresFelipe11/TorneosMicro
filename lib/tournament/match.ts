import type { MatchStatus } from "@prisma/client";
import { toBogotaDateString } from "./dates";

export const WALKOVER_GOALS = 3;
/** Partidos sintéticos solo para acreditar goles de rivales retirados. */
export const CREDIT_GOALS_VENUE = "__CREDITO_GOLES__";
export const CREDIT_GOALS_OPPONENT = "RIVALES RETIRADOS";

export function isClosedMatch(status: MatchStatus | string) {
  return status === "PLAYED" || status === "WALKOVER";
}

export function isCreditGoalsMatch(match: {
  venue?: string | null;
  homeTeam?: { name?: string | null } | null;
  awayTeam?: { name?: string | null } | null;
}) {
  if (match.venue === CREDIT_GOALS_VENUE) return true;
  const home = match.homeTeam?.name;
  const away = match.awayTeam?.name;
  return home === CREDIT_GOALS_OPPONENT || away === CREDIT_GOALS_OPPONENT;
}

export function isCreditGoalsTeam(team: { name?: string | null }) {
  return team.name === CREDIT_GOALS_OPPONENT;
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
