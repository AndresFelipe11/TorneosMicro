import { formatDateTime, teamName } from "@/lib/format";
import { displayVenue } from "@/lib/tournament/match";

export type JornadaPosterMatch = {
  home: string;
  away: string;
  when: string;
  venue: string;
  group: string | null;
};

export type JornadaPoster = {
  tournamentName: string;
  venue: string;
  coverImage: string | null;
  round: number;
  matches: JornadaPosterMatch[];
  filename: string;
};

export type JornadaPosterPack = {
  defaultRound: number;
  posters: JornadaPoster[];
};

type JornadaMatchInput = {
  phase: string;
  round: number;
  scheduledAt: Date | string;
  venue?: string | null;
  knockoutRound?: string | null;
  status?: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  group?: { name: string } | null;
};

type JornadaTournamentInput = {
  name: string;
  venue?: string | null;
  coverImage?: string | null;
  matches: JornadaMatchInput[];
};

const LEAGUE_PHASES = new Set(["ROUND_ROBIN", "GROUP", "QUADRANGULAR"]);

function fileSafeName(name: string) {
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return cleaned || "torneo";
}

export function leagueJornadaMatches<T extends { phase: string }>(
  matches: T[],
): T[] {
  return matches.filter((match) => LEAGUE_PHASES.has(match.phase));
}

export function jornadaRounds(matches: { phase: string; round: number }[]): number[] {
  const rounds = new Set(leagueJornadaMatches(matches).map((match) => match.round));
  return [...rounds].sort((a, b) => a - b);
}

export function jornadaMatches<T extends { phase: string; round: number; scheduledAt: Date | string }>(
  matches: T[],
  round: number,
): T[] {
  return leagueJornadaMatches(matches)
    .filter((match) => match.round === round)
    .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
}

export function defaultJornadaRound(matches: JornadaMatchInput[]): number | null {
  const rounds = jornadaRounds(matches);
  if (rounds.length === 0) return null;
  const upcoming = rounds.find((round) =>
    jornadaMatches(matches, round).some((match) => !match.status || match.status === "SCHEDULED"),
  );
  return upcoming ?? rounds[0];
}

export function buildJornadaPoster(tournament: JornadaTournamentInput, round: number): JornadaPoster | null {
  const matches = jornadaMatches(tournament.matches, round);
  if (matches.length === 0) return null;
  const venue = displayVenue(null, tournament.venue);
  return {
    tournamentName: tournament.name.trim(),
    venue,
    coverImage: tournament.coverImage?.trim() || null,
    round,
    filename: `jornada-${round}-${fileSafeName(tournament.name)}.png`,
    matches: matches.map((match) => ({
      home: teamName(match.homeTeam.name),
      away: teamName(match.awayTeam.name),
      when: formatDateTime(match.scheduledAt),
      venue: displayVenue(match.venue, tournament.venue),
      group: match.group?.name ?? null,
    })),
  };
}

export function buildJornadaPosters(tournament: JornadaTournamentInput): JornadaPosterPack | null {
  const rounds = jornadaRounds(tournament.matches);
  const posters = rounds
    .map((round) => buildJornadaPoster(tournament, round))
    .filter((poster): poster is JornadaPoster => poster != null);
  const defaultRound = defaultJornadaRound(tournament.matches);
  if (posters.length === 0 || defaultRound == null) return null;
  return { defaultRound, posters };
}
