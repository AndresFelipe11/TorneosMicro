"use server";

import { revalidatePath } from "next/cache";
import { MatchPhase } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTournamentMutation } from "@/lib/authz";
import { getTournament } from "@/lib/queries";
import { scheduleMatches } from "@/lib/tournament/schedule";
import { scheduleFromDate, startOfNextWeekBogota, toBogotaDateString } from "@/lib/tournament/dates";
import type { MatchPhase as Phase, UnscheduledMatch } from "@/lib/tournament/types";
import { hasTournamentStarted, venueOrNull } from "@/lib/tournament/match";
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
  const unscheduled: UnscheduledMatch[] = opponents.map((team, index) => ({
    homeTeamName: name,
    awayTeamName: team.name,
    phase,
    round: index + 1,
    groupName,
  }));

  const started = hasTournamentStarted(tournament);
  const occupied = tournament.matches.map((match) => ({
    homeTeamName: match.homeTeam.name,
    awayTeamName: match.awayTeam.name,
    scheduledAt: match.scheduledAt,
  }));

  const scheduled =
    unscheduled.length === 0
      ? { matches: [], error: undefined as string | undefined }
      : scheduleMatches(
          unscheduled,
          {
            startDate: dateField(tournament.startDate),
            endDate: dateField(tournament.endDate),
            playingDays: tournament.playingDays,
            maxMatchesPerDay: tournament.maxMatchesPerDay,
            matchDurationMinutes: tournament.matchDurationMinutes,
            startTime: tournament.startTime,
            fromDate: started ? startOfNextWeekBogota() : scheduleFromDate(dateField(tournament.startDate)),
          },
          occupied,
        );

  if (scheduled.error) return { error: scheduled.error };

  const players = input.players.map((player) => player.trim()).filter(Boolean);
  const whatsapp = input.whatsapp?.trim() ? normalizeWhatsApp(input.whatsapp) : null;
  if (input.whatsapp?.trim() && !whatsapp) {
    return { error: "El WhatsApp del capitán no es válido." };
  }

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

    if (scheduled.matches.length > 0) {
      await tx.match.createMany({
        data: scheduled.matches.map((match) => ({
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
  });

  revalidateRoster(tournament.id);
  return {
    ok: true,
    message:
      scheduled.matches.length === 0
        ? "Equipo agregado. Cuando haya más rivales se programarán los partidos."
        : started
          ? `Equipo agregado. Se programaron ${scheduled.matches.length} partidos desde la semana siguiente.`
          : `Equipo agregado. Se programaron ${scheduled.matches.length} partidos, incluida esta semana.`,
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

  const matchIds = [...team.homeMatches, ...team.awayMatches].map((match) => match.id);

  await prisma.$transaction(async (tx) => {
    if (matchIds.length > 0) {
      await tx.match.deleteMany({ where: { id: { in: matchIds } } });
    }
    await tx.team.delete({ where: { id: teamId } });
  });

  revalidateRoster(team.tournamentId);
  return { ok: true };
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
