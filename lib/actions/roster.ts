"use server";

import { revalidatePath } from "next/cache";
import { MatchPhase } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { getTournament } from "@/lib/queries";
import { scheduleMatches } from "@/lib/tournament/schedule";
import type { MatchPhase as Phase, UnscheduledMatch } from "@/lib/tournament/types";

function revalidateRoster(id: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/torneos/${id}`);
  revalidatePath(`/torneos/${id}/calendario`);
  revalidatePath(`/torneos/${id}/posiciones`);
  revalidatePath(`/torneos/${id}/goleadores`);
  revalidatePath(`/torneos/${id}/valla`);
  revalidatePath(`/admin/torneos/${id}`);
  revalidatePath(`/admin/torneos/${id}/editar`);
}

function dateField(value: Date) {
  return value.toISOString().slice(0, 10);
}

function leaguePhase(format: "ROUND_ROBIN" | "GROUPS" | "QUADRANGULAR"): Phase {
  if (format === "GROUPS") return "GROUP";
  if (format === "QUADRANGULAR") return "QUADRANGULAR";
  return "ROUND_ROBIN";
}

export async function updateTournamentNameAction(tournamentId: string, name: string) {
  await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) return { error: "El torneo necesita un nombre." };
  await prisma.tournament.update({ where: { id: tournamentId }, data: { name: trimmed } });
  revalidateRoster(tournamentId);
  return { ok: true };
}

export async function addTeamAction(input: {
  tournamentId: string;
  name: string;
  groupId?: string | null;
  players: string[];
}) {
  await requireAdmin();
  const tournament = await getTournament(input.tournamentId);
  if (!tournament) return { error: "Torneo no encontrado." };
  if (tournament.status === "FINISHED") return { error: "El torneo ya terminó." };

  const name = input.name.trim();
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
            fromDate: new Date(),
          },
          occupied,
        );

  if (scheduled.error) return { error: scheduled.error };

  const players = input.players.map((player) => player.trim()).filter(Boolean);

  await prisma.$transaction(async (tx) => {
    const team = await tx.team.create({
      data: {
        name,
        tournamentId: tournament.id,
        groupId,
        players: {
          create: players.map((playerName, index) => ({ name: playerName, number: index + 1 })),
        },
      },
    });

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
        : `Equipo agregado y se programaron ${scheduled.matches.length} partidos.`,
  };
}

export async function renameTeamAction(teamId: string, name: string) {
  await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) return { error: "El equipo necesita un nombre." };
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { tournament: { include: { teams: true } } },
  });
  if (!team) return { error: "Equipo no encontrado." };
  const clash = team.tournament.teams.some(
    (item) => item.id !== teamId && item.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (clash) return { error: "Ya hay un equipo con ese nombre." };
  await prisma.team.update({ where: { id: teamId }, data: { name: trimmed } });
  revalidateRoster(team.tournamentId);
  return { ok: true };
}

export async function deleteTeamAction(teamId: string) {
  await requireAdmin();
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      homeMatches: true,
      awayMatches: true,
    },
  });
  if (!team) return { error: "Equipo no encontrado." };

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
  await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) return { error: "El jugador necesita un nombre." };
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { players: true },
  });
  if (!team) return { error: "Equipo no encontrado." };
  const nextNumber = team.players.reduce((max, player) => Math.max(max, player.number ?? 0), 0) + 1;
  await prisma.player.create({
    data: { name: trimmed, number: nextNumber, teamId },
  });
  revalidateRoster(team.tournamentId);
  return { ok: true };
}

export async function renamePlayerAction(playerId: string, name: string) {
  await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) return { error: "El jugador necesita un nombre." };
  const player = await prisma.player.update({
    where: { id: playerId },
    data: { name: trimmed },
    include: { team: true },
  });
  revalidateRoster(player.team.tournamentId);
  return { ok: true };
}

export async function deletePlayerAction(playerId: string) {
  await requireAdmin();
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { team: true, _count: { select: { goals: true } } },
  });
  if (!player) return { error: "Jugador no encontrado." };
  if (player._count.goals > 0) {
    return { error: "No se puede eliminar: ese jugador ya tiene goles. Edita el partido primero." };
  }
  await prisma.player.delete({ where: { id: playerId } });
  revalidateRoster(player.team.tournamentId);
  return { ok: true };
}
