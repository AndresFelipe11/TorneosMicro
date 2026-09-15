import { prisma } from "@/lib/prisma";
import { computeDefense } from "@/lib/tournament/defense";
import { computePlayerCards } from "@/lib/tournament/discipline";
import { isClosedMatch } from "@/lib/tournament/match";
import { computeScorers } from "@/lib/tournament/scorers";
import { computeStandings, standingsByGroup } from "@/lib/tournament/standings";

function closedMatchesOf(tournament: TournamentDetail) {
  return tournament.matches.filter(
    (match) => isClosedMatch(match.status) && match.homeScore != null && match.awayScore != null,
  );
}

export const tournamentInclude = {
  teams: {
    include: {
      players: { orderBy: { name: "asc" as const } },
      group: true,
      captain: { select: { id: true } },
    },
    orderBy: { name: "asc" as const },
  },
  groups: { orderBy: { name: "asc" as const } },
  matches: {
    include: {
      homeTeam: true,
      awayTeam: true,
      group: true,
      goals: { include: { player: true } },
      cards: { include: { player: true } },
      scoresheet: { select: { fileName: true, uploadedAt: true } },
    },
    orderBy: { scheduledAt: "asc" as const },
  },
} as const;

export async function getTournaments() {
  return prisma.tournament.findMany({
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { teams: true, matches: true } },
    },
  });
}

export async function getTournament(id: string) {
  return prisma.tournament.findUnique({
    where: { id },
    include: tournamentInclude,
  });
}

export async function getTeamRegistrations(tournamentId: string) {
  return prisma.teamRegistration.findMany({
    where: { tournamentId },
    orderBy: { createdAt: "desc" },
  });
}

const resultLogInclude = {
  user: { select: { id: true, name: true, role: true } },
  match: {
    select: {
      id: true,
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
  },
} as const;

export async function getMatchResultLogs(matchId: string) {
  return prisma.matchResultLog.findMany({
    where: { matchId },
    include: resultLogInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getTournamentResultLogs(tournamentId: string, take = 20) {
  return prisma.matchResultLog.findMany({
    where: { match: { tournamentId } },
    include: resultLogInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
}

export type TournamentDetail = NonNullable<Awaited<ReturnType<typeof getTournament>>>;

export function playedMatchesOf(tournament: TournamentDetail) {
  return closedMatchesOf(tournament).map((match) => ({
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    homeScore: match.homeScore ?? 0,
    awayScore: match.awayScore ?? 0,
    groupName: match.group?.name ?? match.homeTeam.groupId,
  }));
}

export function standingsFor(tournament: TournamentDetail) {
  const teams = tournament.teams.map((team) => ({
    id: team.id,
    name: team.name,
    groupName: team.group?.name ?? null,
  }));

  const played = closedMatchesOf(tournament);

  const asPlayed = (list: typeof played) =>
    list.map((match) => ({
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: match.homeScore ?? 0,
      awayScore: match.awayScore ?? 0,
      groupName: match.group?.name,
    }));

  const tables = new Map<string, ReturnType<typeof computeStandings>>();

  if (tournament.format === "GROUPS") {
    for (const [title, rows] of standingsByGroup(teams, asPlayed(played.filter((match) => match.phase === "GROUP")))) {
      tables.set(title, rows);
    }
    const quad = played.filter((match) => match.phase === "QUADRANGULAR");
    if (quad.length > 0) {
      const ids = new Set(quad.flatMap((match) => [match.homeTeamId, match.awayTeamId]));
      tables.set(
        "Cuadrangular final",
        computeStandings(
          teams.filter((team) => ids.has(team.id)),
          asPlayed(quad),
        ),
      );
    }
  } else if (tournament.format === "QUADRANGULAR") {
    tables.set("Cuadrangular", computeStandings(teams, asPlayed(played)));
  } else {
    tables.set("General", computeStandings(teams, asPlayed(played.filter((match) => match.phase === "ROUND_ROBIN"))));
  }

  return tables;
}

export function scorersFor(tournament: TournamentDetail) {
  return computeScorers(
    tournament.matches.flatMap((match) =>
      match.goals.map((goal) => ({
        playerId: goal.playerId,
        playerName: goal.player.name,
        playerNumber: goal.player.number,
        teamId: goal.teamId,
        teamName:
          tournament.teams.find((team) => team.id === goal.teamId)?.name ?? goal.player.name,
      })),
    ),
  );
}

export function defenseFor(tournament: TournamentDetail) {
  const teams = tournament.teams.map((team) => ({
    id: team.id,
    name: team.name,
    groupName: team.group?.name ?? null,
  }));
  const played = closedMatchesOf(tournament).map((match) => ({
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: match.homeScore ?? 0,
      awayScore: match.awayScore ?? 0,
    }));
  return computeDefense(teams, played);
}

export function playerCardsFor(tournament: TournamentDetail) {
  return computePlayerCards(
    tournament.teams.flatMap((team) =>
      team.players.map((player) => ({
        id: player.id,
        name: player.name,
        number: player.number,
        teamId: team.id,
        teamName: team.name,
      })),
    ),
    tournament.matches.map((match) => ({
      status: match.status,
      cards: match.cards.map((card) => ({
        id: card.id,
        playerId: card.playerId,
        type: card.type,
        paid: card.paid,
      })),
    })),
  );
}
