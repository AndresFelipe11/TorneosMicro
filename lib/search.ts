import { prisma } from "@/lib/prisma";
import {
  getTournament,
  playerCardsFor,
  scorersFor,
  standingsFor,
  type TournamentDetail,
} from "@/lib/queries";
import { isClosedMatch } from "@/lib/tournament/match";
import type { StandingRow } from "@/lib/tournament/types";

const TEAM_LIMIT = 10;
const PLAYER_LIMIT = 10;
const TOURNAMENT_LIMIT = 8;

export function normalizeSearchQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function withSearchQuery(href: string, query?: string) {
  const trimmed = normalizeSearchQuery(query ?? "");
  if (trimmed.length < 2) return href;
  return `${href}?q=${encodeURIComponent(trimmed)}`;
}

export type TournamentFilter = {
  query: string;
  active: boolean;
  found: boolean;
  teamIds: string[];
  playerIds: string[];
  labels: string[];
};

export function tournamentFilter(tournament: TournamentDetail, rawQuery?: string): TournamentFilter {
  const query = normalizeSearchQuery(rawQuery ?? "");
  if (query.length < 2) {
    return { query, active: false, found: false, teamIds: [], playerIds: [], labels: [] };
  }

  const needle = query.toLocaleLowerCase("es");
  const teamIds = new Set<string>();
  const playerIds = new Set<string>();
  const labels: string[] = [];

  for (const team of tournament.teams) {
    if (team.name.toLocaleLowerCase("es").includes(needle)) {
      teamIds.add(team.id);
      labels.push(team.name);
    }
    for (const player of team.players) {
      if (player.name.toLocaleLowerCase("es").includes(needle)) {
        playerIds.add(player.id);
        teamIds.add(team.id);
        labels.push(player.name);
      }
    }
  }

  return {
    query,
    active: true,
    found: teamIds.size > 0,
    teamIds: [...teamIds],
    playerIds: [...playerIds],
    labels,
  };
}

export async function resolveSearchTournament(rawQuery: string, preferredTournamentId?: string) {
  const query = normalizeSearchQuery(rawQuery);
  if (query.length < 2) return null;
  if (preferredTournamentId) return preferredTournamentId;

  const team = await prisma.team.findFirst({
    where: { name: { contains: query, mode: "insensitive" } },
    orderBy: { name: "asc" },
    select: { tournamentId: true },
  });
  if (team) return team.tournamentId;

  const player = await prisma.player.findFirst({
    where: { name: { contains: query, mode: "insensitive" } },
    orderBy: { name: "asc" },
    select: { team: { select: { tournamentId: true } } },
  });
  return player?.team.tournamentId ?? null;
}

function standingOf(tournament: TournamentDetail, teamId: string) {
  for (const [table, rows] of standingsFor(tournament)) {
    const index = rows.findIndex((row) => row.teamId === teamId);
    if (index >= 0) return { table, position: index + 1, row: rows[index] };
  }
  return null;
}

function matchesOf(tournament: TournamentDetail, teamId: string) {
  return tournament.matches.filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId);
}

function nextMatchOf(tournament: TournamentDetail, teamId: string) {
  return matchesOf(tournament, teamId).find((match) => match.status === "SCHEDULED") ?? null;
}

function lastMatchOf(tournament: TournamentDetail, teamId: string) {
  return (
    [...matchesOf(tournament, teamId)].reverse().find((match) => isClosedMatch(match.status)) ?? null
  );
}

function opponentName(match: TournamentDetail["matches"][number], teamId: string) {
  return match.homeTeamId === teamId ? match.awayTeam.name : match.homeTeam.name;
}

function teamScoreLine(match: TournamentDetail["matches"][number], teamId: string) {
  if (match.homeScore == null || match.awayScore == null) return null;
  const own = match.homeTeamId === teamId ? match.homeScore : match.awayScore;
  const other = match.homeTeamId === teamId ? match.awayScore : match.homeScore;
  const extra =
    match.homePenalties != null && match.awayPenalties != null
      ? ` (${match.homeTeamId === teamId ? match.homePenalties : match.awayPenalties}–${
          match.homeTeamId === teamId ? match.awayPenalties : match.homePenalties
        } pen.)`
      : "";
  const wo = match.status === "WALKOVER" ? " W.O." : "";
  return `${own} – ${other}${extra}${wo}`;
}

export type TeamSearchHit = {
  kind: "team";
  id: string;
  name: string;
  groupName: string | null;
  tournamentId: string;
  tournamentName: string;
  standing: { table: string; position: number; row: StandingRow } | null;
  nextMatch: {
    id: string;
    opponent: string;
    scheduledAt: Date;
    venue: string | null;
  } | null;
  lastMatch: {
    id: string;
    opponent: string;
    scheduledAt: Date;
    score: string | null;
  } | null;
};

export type PlayerSearchHit = {
  kind: "player";
  id: string;
  name: string;
  number: number | null;
  teamId: string;
  teamName: string;
  tournamentId: string;
  tournamentName: string;
  goals: number;
  scorerRank: number | null;
  scorerCount: number;
  yellows: number;
  reds: number;
  standing: { table: string; position: number; row: StandingRow } | null;
  nextMatch: TeamSearchHit["nextMatch"];
};

function toTeamHit(tournament: TournamentDetail, teamId: string, name: string, groupName: string | null): TeamSearchHit {
  const next = nextMatchOf(tournament, teamId);
  const last = lastMatchOf(tournament, teamId);
  return {
    kind: "team",
    id: teamId,
    name,
    groupName,
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    standing: standingOf(tournament, teamId),
    nextMatch: next
      ? {
          id: next.id,
          opponent: opponentName(next, teamId),
          scheduledAt: next.scheduledAt,
          venue: next.venue,
        }
      : null,
    lastMatch: last
      ? {
          id: last.id,
          opponent: opponentName(last, teamId),
          scheduledAt: last.scheduledAt,
          score: teamScoreLine(last, teamId),
        }
      : null,
  };
}

export async function searchDirectory(rawQuery: string, tournamentId?: string) {
  const query = normalizeSearchQuery(rawQuery);
  if (query.length < 2) {
    return { query, teams: [] as TeamSearchHit[], players: [] as PlayerSearchHit[] };
  }

  const scoped = tournamentId ? { tournamentId } : {};

  const [teams, players] = await Promise.all([
    prisma.team.findMany({
      where: { ...scoped, name: { contains: query, mode: "insensitive" } },
      take: TEAM_LIMIT,
      orderBy: { name: "asc" },
      select: { id: true, name: true, tournamentId: true, group: { select: { name: true } } },
    }),
    prisma.player.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
        team: scoped,
      },
      take: PLAYER_LIMIT,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        number: true,
        teamId: true,
        team: { select: { name: true, tournamentId: true } },
      },
    }),
  ]);

  const tournamentIds = [...new Set([...teams.map((team) => team.tournamentId), ...players.map((player) => player.team.tournamentId)])].slice(
    0,
    TOURNAMENT_LIMIT,
  );

  const details = (
    await Promise.all(tournamentIds.map((id) => getTournament(id)))
  ).filter((item): item is TournamentDetail => Boolean(item));
  const byId = new Map(details.map((item) => [item.id, item]));

  const teamHits = teams.flatMap((team) => {
    const tournament = byId.get(team.tournamentId);
    if (!tournament) return [];
    return [toTeamHit(tournament, team.id, team.name, team.group?.name ?? null)];
  });

  const playerHits = players.flatMap((player) => {
    const tournament = byId.get(player.team.tournamentId);
    if (!tournament) return [];
    const scorers = scorersFor(tournament);
    const scorerIndex = scorers.findIndex((row) => row.playerId === player.id);
    const scorer = scorerIndex >= 0 ? scorers[scorerIndex] : null;
    const cards = playerCardsFor(tournament).find((row) => row.playerId === player.id);
    const team = toTeamHit(tournament, player.teamId, player.team.name, null);
    return [
      {
        kind: "player" as const,
        id: player.id,
        name: player.name,
        number: player.number,
        teamId: player.teamId,
        teamName: player.team.name,
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        goals: scorer?.goals ?? 0,
        scorerRank: scorer ? scorerIndex + 1 : null,
        scorerCount: scorers.length,
        yellows: cards?.yellows ?? 0,
        reds: cards?.reds ?? 0,
        standing: team.standing,
        nextMatch: team.nextMatch,
      } satisfies PlayerSearchHit,
    ];
  });

  return { query, teams: teamHits, players: playerHits };
}
