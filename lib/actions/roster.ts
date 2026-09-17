"use server";

import { revalidatePath } from "next/cache";
import { MatchPhase, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTournamentMutation } from "@/lib/authz";
import { getTournament } from "@/lib/queries";
import { scheduleOptionsFrom } from "@/lib/tournament/schedule";
import { scheduleLeagueFixture, type FixtureMatch } from "@/lib/tournament/fixture";
import { scheduleFromDate, startOfNextWeekBogota, toBogotaDateString } from "@/lib/tournament/dates";
import type { GeneratedMatch, MatchPhase as Phase } from "@/lib/tournament/types";
import { hasTournamentStarted, isClosedMatch, venueOrNull } from "@/lib/tournament/match";
import { upsertTeamCaptain } from "@/lib/captain";
import { normalizeWhatsApp } from "@/lib/whatsapp";
import { teamName } from "@/lib/format";

function revalidateRoster(id: string) {
  revalidatePath("/mi-equipo");
  revalidatePath(`/torneos/${id}`);
  revalidatePath(`/torneos/${id}/calendario`);
  revalidatePath(`/torneos/${id}/posiciones`);
  revalidatePath(`/torneos/${id}/goleadores`);
  revalidatePath(`/torneos/${id}/valla`);
  revalidatePath(`/torneos/${id}/inscribirme`);
  revalidatePath(`/torneos/${id}/reglamento`);
  revalidatePath(`/torneos/${id}/equipos`);
  revalidatePath(`/admin/torneos/${id}`);
  revalidatePath(`/admin/torneos/${id}/datos`);
  revalidatePath(`/admin/torneos/${id}/inscripciones`);
  revalidatePath(`/admin/torneos/${id}/editar`);
  revalidatePath(`/admin/torneos/${id}/calendario`);
}

function dateField(value: Date) {
  return toBogotaDateString(value);
}

function leaguePhase(format: "ROUND_ROBIN" | "GROUPS" | "QUADRANGULAR"): Phase {
  if (format === "GROUPS") return "GROUP";
  if (format === "QUADRANGULAR") return "QUADRANGULAR";
  return "ROUND_ROBIN";
}

function toFixtureMatch(match: {
  id: string;
  status: string;
  phase: Phase;
  round: number;
  scheduledAt: Date;
  knockoutRound?: "R16" | "QF" | "SF" | "F" | null;
  homeTeam: { name: string };
  awayTeam: { name: string };
  group?: { name: string } | null;
}): FixtureMatch {
  return {
    id: match.id,
    homeTeamName: match.homeTeam.name,
    awayTeamName: match.awayTeam.name,
    phase: match.phase,
    round: match.round,
    groupName: match.group?.name,
    knockoutRound: match.knockoutRound ?? undefined,
    status: match.status,
    scheduledAt: match.scheduledAt,
  };
}

function fixtureConfig(
  tournament: {
    startDate: Date;
    endDate: Date;
    playingDays: number[];
    maxMatchesPerDay: number;
    matchDurationMinutes: number;
    startTime: string;
    minDaysBetweenMatches?: number | null;
    status: string;
    matches: { status: string; scheduledAt: Date | string }[];
  },
) {
  const started = hasTournamentStarted(tournament);
  return {
    started,
    config: scheduleOptionsFrom(tournament, {
      startDate: dateField(tournament.startDate),
      endDate: dateField(tournament.endDate),
      fromDate: started ? startOfNextWeekBogota() : scheduleFromDate(dateField(tournament.startDate)),
    }),
  };
}

async function applyExistingFixture(
  tx: Prisma.TransactionClient,
  rounds: FixtureMatch[],
  dates: GeneratedMatch[],
) {
  const scheduledAtById = new Map(
    dates.filter((match) => match.id).map((match) => [match.id as string, match.scheduledAt]),
  );
  const toUpdate = rounds.filter((match) => match.id);
  for (let i = 0; i < toUpdate.length; i += 10) {
    await Promise.all(
      toUpdate.slice(i, i + 10).map((match) => {
        const nextAt = scheduledAtById.get(match.id as string);
        return tx.match.update({
          where: { id: match.id },
          data: {
            round: match.round,
            ...(nextAt ? { scheduledAt: new Date(nextAt) } : {}),
          },
        });
      }),
    );
  }
}

export async function updateTournamentNameAction(
  tournamentId: string,
  name: string,
  venue?: string | null,
  info?: {
    description?: string | null;
    registrationFee?: string | null;
    prizes?: string | null;
    rulesHighlights?: string | null;
    rules?: string | null;
  },
) {
  const access = await requireTournamentMutation(tournamentId);
  if (!access.ok) return { error: access.error };
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { venue: true },
  });
  if (!tournament) return { error: "Torneo no encontrado." };
  const trimmed = name.trim();
  if (!trimmed) return { error: "El torneo necesita un nombre." };
  const nextVenue = venueOrNull(venue);
  await prisma.$transaction(async (tx) => {
    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        name: trimmed,
        venue: nextVenue,
        ...(info
          ? {
              description: venueOrNull(info.description),
              registrationFee: venueOrNull(info.registrationFee),
              prizes: venueOrNull(info.prizes),
              rulesHighlights: venueOrNull(info.rulesHighlights),
              rules: venueOrNull(info.rules),
            }
          : {}),
      },
    });
    await tx.match.updateMany({
      where: {
        tournamentId,
        status: "SCHEDULED",
        OR: [{ venue: null }, ...(tournament.venue ? [{ venue: tournament.venue }] : [])],
      },
      data: { venue: nextVenue },
    });
  });
  revalidateRoster(tournamentId);
  return { ok: true };
}

export async function updateTournamentInfoAction(
  tournamentId: string,
  info: {
    name: string;
    description?: string | null;
    registrationFee?: string | null;
    prizes?: string | null;
    rulesHighlights?: string | null;
    rules?: string | null;
  },
) {
  const access = await requireTournamentMutation(tournamentId);
  if (!access.ok) return { error: access.error };
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true },
  });
  if (!tournament) return { error: "Torneo no encontrado." };
  const trimmed = info.name.trim();
  if (!trimmed) return { error: "El torneo necesita un nombre." };
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      name: trimmed,
      description: venueOrNull(info.description),
      registrationFee: venueOrNull(info.registrationFee),
      prizes: venueOrNull(info.prizes),
      rulesHighlights: venueOrNull(info.rulesHighlights),
      rules: venueOrNull(info.rules),
    },
  });
  revalidateRoster(tournamentId);
  return { ok: true };
}

export async function addTeamToTournament(input: {
  tournamentId: string;
  name: string;
  groupId?: string | null;
  players: string[];
  whatsapp?: string | null;
}) {
  const tournament = await getTournament(input.tournamentId);
  if (!tournament) return { error: "Torneo no encontrado." };
  if (tournament.status === "FINISHED") return { error: "El torneo ya terminó." };

  const name = teamName(input.name);
  if (!name) return { error: "El equipo necesita un nombre." };
  const exists = tournament.teams.some((team) => team.name.toLowerCase() === name.toLowerCase());
  if (exists) return { error: "Ya hay un equipo con ese nombre." };

  let groupId: string | null = input.groupId ?? null;
  let groupName: string | undefined;
  if (tournament.format === "GROUPS") {
    if (!groupId) return { error: "Asigna el equipo a un grupo." };
    const group = tournament.groups.find((item) => item.id === groupId);
    if (!group) return { error: "Ese grupo no existe." };
    groupName = group.name;
  } else {
    groupId = null;
  }

  const opponents = tournament.teams.filter((team) => (groupId ? team.groupId === groupId : true));
  const phase = leaguePhase(tournament.format);
  const newcomers: FixtureMatch[] = opponents.map((team) => ({
    homeTeamName: name,
    awayTeamName: team.name,
    phase,
    round: 1,
    groupName,
    status: "SCHEDULED",
  }));
  const { started, config } = fixtureConfig(tournament);
  const plan = scheduleLeagueFixture(
    [...tournament.matches.map(toFixtureMatch), ...newcomers],
    config,
    groupName ? { groupName } : undefined,
  );
  if (plan.error) return { error: plan.error };

  const players = input.players.map((player) => player.trim()).filter(Boolean);
  const whatsapp = input.whatsapp?.trim() ? normalizeWhatsApp(input.whatsapp) : null;
  if (input.whatsapp?.trim() && !whatsapp) {
    return { error: "El WhatsApp del capitán no es válido." };
  }

  const newDates = plan.dates.filter((match) => !match.id);

  await prisma.$transaction(async (tx) => {
    const team = await tx.team.create({
      data: {
        name,
        tournamentId: tournament.id,
        groupId,
        whatsapp,
        players: {
          create: players.map((playerName, index) => ({ name: playerName, number: index + 1 })),
        },
      },
    });

    if (whatsapp) {
      await upsertTeamCaptain(tx, { teamId: team.id, teamName: name, whatsapp });
    }

    const ids = new Map(tournament.teams.map((item) => [item.name, item.id]));
    ids.set(name, team.id);

    if (newDates.length > 0) {
      await tx.match.createMany({
        data: newDates.map((match) => ({
          tournamentId: tournament.id,
          homeTeamId: ids.get(match.homeTeamName)!,
          awayTeamId: ids.get(match.awayTeamName)!,
          phase: match.phase as MatchPhase,
          round: match.round,
          groupId,
          scheduledAt: new Date(match.scheduledAt),
          venue: tournament.venue,
        })),
      });
    }

    await applyExistingFixture(tx, plan.rounds, plan.dates);
  }, { timeout: 60_000 });

  revalidateRoster(tournament.id);
  const jornadaCount = new Set(plan.dates.map((match) => match.round)).size;
  return {
    ok: true,
    message:
      opponents.length === 0
        ? "Equipo agregado. Cuando haya más rivales se armarán las jornadas."
        : started
          ? `Equipo agregado. Se reconstruyeron ${jornadaCount} jornadas y se reprogramó el calendario desde la semana siguiente.`
          : `Equipo agregado. Se reconstruyeron ${jornadaCount} jornadas y se reprogramó todo el calendario.`,
  };
}

export async function addTeamAction(input: {
  tournamentId: string;
  name: string;
  groupId?: string | null;
  players: string[];
  whatsapp?: string | null;
}) {
  const access = await requireTournamentMutation(input.tournamentId);
  if (!access.ok) return { error: access.error };
  return addTeamToTournament(input);
}

export async function setTeamCaptainAction(teamId: string, whatsapp: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true, tournamentId: true },
  });
  if (!team) return { error: "Equipo no encontrado." };
  const access = await requireTournamentMutation(team.tournamentId);
  if (!access.ok) return { error: access.error };
  const phone = whatsapp.trim() ? normalizeWhatsApp(whatsapp) : null;
  if (whatsapp.trim() && !phone) return { error: "El WhatsApp del capitán no es válido." };
  await prisma.$transaction(async (tx) => {
    await upsertTeamCaptain(tx, { teamId: team.id, teamName: team.name, whatsapp: phone });
  });
  revalidateRoster(team.tournamentId);
  return {
    ok: true,
    message: phone
      ? `El capitán de ${team.name} entra con el nombre del equipo y ese número.`
      : "Se quitó el acceso del capitán.",
  };
}

export async function renameTeamAction(teamId: string, name: string) {
  const trimmed = teamName(name);
  if (!trimmed) return { error: "El equipo necesita un nombre." };
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { tournament: { include: { teams: true } } },
  });
  if (!team) return { error: "Equipo no encontrado." };
  const access = await requireTournamentMutation(team.tournamentId);
  if (!access.ok) return { error: access.error };
  const clash = team.tournament.teams.some(
    (item) => item.id !== teamId && item.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (clash) return { error: "Ya hay un equipo con ese nombre." };
  await prisma.$transaction(async (tx) => {
    await tx.team.update({ where: { id: teamId }, data: { name: trimmed } });
    await tx.user.updateMany({
      where: { teamId, role: "CAPTAIN" },
      data: { name: trimmed },
    });
  });
  revalidateRoster(team.tournamentId);
  return { ok: true };
}

export async function deleteTeamAction(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      homeMatches: true,
      awayMatches: true,
    },
  });
  if (!team) return { error: "Equipo no encontrado." };
  const access = await requireTournamentMutation(team.tournamentId);
  if (!access.ok) return { error: access.error };

  const ownMatches = [...team.homeMatches, ...team.awayMatches];
  if (ownMatches.some((match) => isClosedMatch(match.status))) {
    return { error: "No se puede quitar: ese equipo ya tiene partidos jugados." };
  }

  const tournament = await getTournament(team.tournamentId);
  if (!tournament) return { error: "Torneo no encontrado." };
  if (tournament.status === "FINISHED") return { error: "El torneo ya terminó." };

  const remaining = tournament.matches.filter(
    (match) => match.homeTeamId !== teamId && match.awayTeamId !== teamId,
  );
  const groupName = tournament.teams.find((item) => item.id === teamId)?.group?.name;
  const { config } = fixtureConfig(tournament);
  const plan = scheduleLeagueFixture(
    remaining.map(toFixtureMatch),
    config,
    groupName ? { groupName } : undefined,
  );
  if (plan.error) return { error: plan.error };

  const matchIds = ownMatches.map((match) => match.id);

  await prisma.$transaction(async (tx) => {
    if (matchIds.length > 0) {
      await tx.match.deleteMany({ where: { id: { in: matchIds } } });
    }
    await tx.team.delete({ where: { id: teamId } });
    await applyExistingFixture(tx, plan.rounds, plan.dates);
  }, { timeout: 60_000 });

  revalidateRoster(team.tournamentId);
  return { ok: true, message: "Equipo eliminado. Se reconstruyeron las jornadas del calendario." };
}

export async function addPlayerAction(teamId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { error: "El jugador necesita un nombre." };
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { tournamentId: true },
  });
  if (!team) return { error: "Equipo no encontrado." };
  const access = await requireTournamentMutation(team.tournamentId);
  if (!access.ok) return { error: access.error };
  await prisma.player.create({
    data: { name: trimmed, teamId },
  });
  revalidateRoster(team.tournamentId);
  return { ok: true };
}

export async function updatePlayerAction(playerId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { error: "El jugador necesita un nombre." };
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { team: true },
  });
  if (!player) return { error: "Jugador no encontrado." };
  const access = await requireTournamentMutation(player.team.tournamentId);
  if (!access.ok) return { error: access.error };
  await prisma.player.update({
    where: { id: playerId },
    data: { name: trimmed },
  });
  revalidateRoster(player.team.tournamentId);
  return { ok: true };
}

export async function renamePlayerAction(playerId: string, name: string) {
  return updatePlayerAction(playerId, name);
}

export async function deletePlayerAction(playerId: string) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { team: true, _count: { select: { goals: true, cards: true } } },
  });
  if (!player) return { error: "Jugador no encontrado." };
  const access = await requireTournamentMutation(player.team.tournamentId);
  if (!access.ok) return { error: access.error };
  if (player._count.goals > 0 || player._count.cards > 0) {
    return { error: "No se puede eliminar: ese jugador ya tiene goles o tarjetas. Edita el partido primero." };
  }
  await prisma.player.delete({ where: { id: playerId } });
  revalidateRoster(player.team.tournamentId);
  return { ok: true };
}
