"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { KnockoutRound, MatchPhase, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireGlobalMutation, requireTournamentMutation } from "@/lib/authz";
import { dayKey, fromBogotaDateTimeLocal, parseLocalDate, scheduleFromDate, toBogotaDateString } from "@/lib/tournament/dates";
import { generateRoundRobin } from "@/lib/tournament/roundRobin";
import { scheduleMatches } from "@/lib/tournament/schedule";
import { generateKnockoutMatches, generateNextKnockout, pairQualified, qualifiedFromStandings } from "@/lib/tournament/knockout";
import { validateConfig, withDistributedGroups } from "@/lib/tournament/generate";
import type { GeneratedMatch, TournamentConfig, UnscheduledMatch } from "@/lib/tournament/types";
import { getTournament, standingsFor } from "@/lib/queries";
import { readScoresheetFile } from "@/lib/scoresheet";

function revalidateTournament(id: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/torneos/${id}`);
  revalidatePath(`/torneos/${id}/calendario`);
  revalidatePath(`/torneos/${id}/posiciones`);
  revalidatePath(`/torneos/${id}/goleadores`);
  revalidatePath(`/torneos/${id}/valla`);
  revalidatePath(`/admin/torneos/${id}`);
  revalidatePath(`/admin/torneos/${id}/editar`);
  revalidatePath(`/admin/torneos/${id}/calendario`);
}

export async function createTournamentAction(input: {
  config: TournamentConfig;
  matches: GeneratedMatch[];
}) {
  const access = await requireGlobalMutation();
  if (!access.ok) return { error: access.error };
  const config = withDistributedGroups(input.config);
  const error = validateConfig(config);
  if (error) return { error };
  if (input.matches.length === 0) return { error: "No hay partidos para guardar." };

  const tournament = await prisma.$transaction(async (tx) => {
    const created = await tx.tournament.create({
      data: {
        name: config.name.trim(),
        startDate: parseLocalDate(config.startDate),
        endDate: parseLocalDate(config.endDate),
        status: "SCHEDULED",
        format: config.format,
        groupCount: config.format === "GROUPS" ? config.groupCount : null,
        qualifyPerGroup: config.qualifyPerGroup ?? 2,
        nextPhase: config.format === "GROUPS" ? (config.nextPhase ?? "NONE") : "NONE",
        playingDays: config.playingDays,
        maxMatchesPerDay: config.maxMatchesPerDay,
        matchDurationMinutes: config.matchDurationMinutes,
        startTime: config.startTime,
      },
    });

    const groupIds = new Map<string, string>();
    if (config.format === "GROUPS" && config.groupCount) {
      for (let i = 0; i < config.groupCount; i++) {
        const letter = String.fromCharCode(65 + i);
        const name = `Grupo ${letter}`;
        const group = await tx.group.create({
          data: { name, tournamentId: created.id, phase: "GROUP" },
        });
        groupIds.set(name, group.id);
      }
    }

    const teamIds = new Map<string, string>();
    for (const team of config.teams.filter((item) => item.name.trim())) {
      const row = await tx.team.create({
        data: {
          name: team.name.trim(),
          tournamentId: created.id,
          groupId: team.groupName ? groupIds.get(team.groupName) : null,
          players: {
            create: team.players
              .map((player) => player.trim())
              .filter(Boolean)
              .map((name, index) => ({ name, number: index + 1 })),
          },
        },
      });
      teamIds.set(team.name.trim(), row.id);
    }

    for (const match of input.matches) {
      const homeTeamId = teamIds.get(match.homeTeamName);
      const awayTeamId = teamIds.get(match.awayTeamName);
      if (!homeTeamId || !awayTeamId) {
        throw new Error(`No se encontró un equipo de ${match.homeTeamName} vs ${match.awayTeamName}`);
      }
      await tx.match.create({
        data: {
          tournamentId: created.id,
          homeTeamId,
          awayTeamId,
          phase: match.phase,
          round: match.round,
          groupId: match.groupName ? groupIds.get(match.groupName) : null,
          knockoutRound: match.knockoutRound as KnockoutRound | undefined,
          scheduledAt: new Date(match.scheduledAt),
        },
      });
    }

    return created;
  });

  revalidateTournament(tournament.id);
  redirect(`/admin/torneos/${tournament.id}`);
}

export async function deleteTournamentAction(id: string) {
  const access = await requireGlobalMutation();
  if (!access.ok) return { error: access.error };
  await prisma.tournament.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}

function scheduleConfigFrom(input: {
  startDate: string;
  endDate: string;
  playingDays: number[];
  maxMatchesPerDay: number;
  matchDurationMinutes: number;
  startTime: string;
}):
  | { error: string }
  | {
      startDate: string;
      endDate: string;
      playingDays: number[];
      maxMatchesPerDay: number;
      matchDurationMinutes: number;
      startTime: string;
    } {
  const playingDays = [...new Set(input.playingDays)].filter((day) => day >= 0 && day <= 6).sort((a, b) => a - b);
  const startTime = input.startTime.trim();
  if (!/^\d{2}:\d{2}$/.test(startTime)) return { error: "La hora de inicio no es válida." };
  if (!input.startDate || !input.endDate) return { error: "Indica las fechas de inicio y fin." };
  if (input.endDate < input.startDate) return { error: "La fecha de fin no puede ser anterior al inicio." };
  if (playingDays.length === 0) return { error: "Elige al menos un día de juego." };
  if (input.maxMatchesPerDay < 1 || input.maxMatchesPerDay > 12) {
    return { error: "Los partidos por día deben estar entre 1 y 12." };
  }
  if (input.matchDurationMinutes < 20 || input.matchDurationMinutes > 90) {
    return { error: "La duración debe estar entre 20 y 90 minutos." };
  }
  return {
    startDate: input.startDate,
    endDate: input.endDate,
    playingDays,
    maxMatchesPerDay: input.maxMatchesPerDay,
    matchDurationMinutes: input.matchDurationMinutes,
    startTime,
  };
}

function sameDayTeamConflict(
  others: {
    homeTeam: { id: string; name: string };
    awayTeam: { id: string; name: string };
    scheduledAt: Date;
  }[],
  homeTeam: { id: string; name: string },
  awayTeam: { id: string; name: string },
  when: Date,
) {
  const key = dayKey(when);
  const clash = others.find((match) => {
    if (dayKey(match.scheduledAt) !== key) return false;
    const ids = [match.homeTeam.id, match.awayTeam.id];
    return ids.includes(homeTeam.id) || ids.includes(awayTeam.id);
  });
  if (!clash) return null;
  const teamName =
    clash.homeTeam.id === homeTeam.id || clash.awayTeam.id === homeTeam.id ? homeTeam.name : awayTeam.name;
  return `${teamName} ya tiene partido ese día: ${clash.homeTeam.name} vs ${clash.awayTeam.name}.`;
}

export async function updateTournamentScheduleAction(input: {
  tournamentId: string;
  startDate: string;
  endDate: string;
  playingDays: number[];
  maxMatchesPerDay: number;
  matchDurationMinutes: number;
  startTime: string;
}): Promise<{ error: string; message?: undefined } | { error?: undefined; ok: true; moved: number; message: string }> {
  const admin = await requireTournamentMutation(input.tournamentId);
  if (!admin.ok) return { error: admin.error };
  const tournament = await getTournament(input.tournamentId);
  if (!tournament) return { error: "Torneo no encontrado." };
  if (tournament.status === "FINISHED") return { error: "El torneo ya terminó." };

  const config = scheduleConfigFrom(input);
  if ("error" in config) return { error: config.error };

  const pending = tournament.matches.filter((match) => match.status === "SCHEDULED");
  const occupied = tournament.matches
    .filter((match) => match.status === "PLAYED")
    .map((match) => ({
      homeTeamName: match.homeTeam.name,
      awayTeamName: match.awayTeam.name,
      scheduledAt: match.scheduledAt,
    }));

  const unscheduled: UnscheduledMatch[] = pending.map((match) => ({
    id: match.id,
    homeTeamName: match.homeTeam.name,
    awayTeamName: match.awayTeam.name,
    phase: match.phase,
    round: match.round,
    groupName: match.group?.name,
    knockoutRound: match.knockoutRound ?? undefined,
  }));

  const scheduled =
    unscheduled.length === 0
      ? { matches: [] as GeneratedMatch[], error: undefined as string | undefined }
      : scheduleMatches(
          unscheduled,
          {
            ...config,
            fromDate: scheduleFromDate(config.startDate),
          },
          occupied,
        );

  if (scheduled.error) return { error: scheduled.error };

  await prisma.$transaction(async (tx) => {
    await tx.tournament.update({
      where: { id: tournament.id },
      data: {
        startDate: parseLocalDate(config.startDate),
        endDate: parseLocalDate(config.endDate),
        playingDays: config.playingDays,
        maxMatchesPerDay: config.maxMatchesPerDay,
        matchDurationMinutes: config.matchDurationMinutes,
        startTime: config.startTime,
      },
    });

    for (const match of scheduled.matches) {
      if (!match.id) continue;
      await tx.match.update({
        where: { id: match.id },
        data: { scheduledAt: new Date(match.scheduledAt) },
      });
    }
  });

  revalidateTournament(tournament.id);
  return {
    ok: true,
    moved: scheduled.matches.length,
    message:
      scheduled.matches.length === 0
        ? "Se actualizaron los días de juego. No había partidos pendientes por mover."
        : `Se reprogramaron ${scheduled.matches.length} partidos pendientes.`,
  };
}

export async function rescheduleMatchAction(input: {
  matchId: string;
  scheduledAt: string;
}): Promise<{ error: string; message?: undefined } | { error?: undefined; ok: true; message: string }> {
  const when = fromBogotaDateTimeLocal(input.scheduledAt);
  if (!when || Number.isNaN(when.getTime())) {
    return { error: "La fecha y hora no son válidas." };
  }

  const match = await prisma.match.findUnique({
    where: { id: input.matchId },
    include: {
      homeTeam: true,
      awayTeam: true,
      tournament: {
        include: {
          matches: {
            include: { homeTeam: true, awayTeam: true },
          },
        },
      },
    },
  });
  if (!match) return { error: "Partido no encontrado." };
  const access = await requireTournamentMutation(match.tournamentId);
  if (!access.ok) return { error: "Solo el administrador de este torneo puede reprogramar el partido." };
  if (match.tournament.status === "FINISHED") return { error: "El torneo ya terminó." };
  if (match.status === "PLAYED") {
    return { error: "Ese partido ya se jugó. Si la hora real fue otra, ajústala al guardar el resultado." };
  }

  const conflict = sameDayTeamConflict(
    match.tournament.matches.filter((item) => item.id !== match.id),
    match.homeTeam,
    match.awayTeam,
    when,
  );
  if (conflict) return { error: conflict };

  await prisma.match.update({
    where: { id: match.id },
    data: { scheduledAt: when },
  });

  revalidateTournament(match.tournamentId);
  revalidatePath(`/admin/torneos/${match.tournamentId}/partidos/${match.id}`);
  revalidatePath(`/torneos/${match.tournamentId}/partidos/${match.id}`);
  return { ok: true, message: "El partido quedó reprogramado." };
}

async function refreshTournamentStatus(tournamentId: string) {
  const matches = await prisma.match.findMany({
    where: { tournamentId },
    select: { status: true },
  });
  if (matches.length === 0) return;
  const played = matches.filter((match) => match.status === "PLAYED").length;
  const status =
    played === 0 ? "SCHEDULED" : played === matches.length ? "FINISHED" : "IN_PROGRESS";
  await prisma.tournament.update({ where: { id: tournamentId }, data: { status } });
}

export async function saveMatchResultAction(input: {
  matchId: string;
  homeScore: number;
  awayScore: number;
  winnerId?: string | null;
  scheduledAt?: string;
  goals: { playerId?: string; playerName?: string; teamId: string; minute?: number | null }[];
  scoresheet?: File | null;
  removeScoresheet?: boolean;
}) {
  const match = await prisma.match.findUnique({
    where: { id: input.matchId },
    include: { tournament: true },
  });
  if (!match) return { error: "Partido no encontrado." };
  const access = await requireTournamentMutation(match.tournamentId);
  if (!access.ok) return { error: access.error };
  if (input.homeScore < 0 || input.awayScore < 0) return { error: "El marcador no puede ser negativo." };

  let winnerId = input.winnerId ?? null;
  if (input.homeScore > input.awayScore) winnerId = match.homeTeamId;
  else if (input.awayScore > input.homeScore) winnerId = match.awayTeamId;
  else if (match.phase === "KNOCKOUT" && !winnerId) {
    return { error: "En eliminación no hay empate. Indica el ganador por penales." };
  }

  const photo = await readScoresheetFile(input.scoresheet);
  if (photo && "error" in photo) return { error: photo.error };

  try {
    await prisma.$transaction(async (tx) => {
      const players = await resolveGoalPlayers(tx, [match.homeTeamId, match.awayTeamId], input.goals);
      if ("error" in players) {
        throw new ResultSaveError(players.error);
      }

      await tx.goal.deleteMany({ where: { matchId: match.id } });
      await tx.match.update({
        where: { id: match.id },
        data: {
          homeScore: input.homeScore,
          awayScore: input.awayScore,
          winnerId,
          status: "PLAYED",
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : match.scheduledAt,
          goals: {
            create: players.players.map((goal) => ({
              playerId: goal.playerId,
              teamId: goal.teamId,
              minute: goal.minute,
            })),
          },
        },
      });

      if (input.removeScoresheet && !photo) {
        await tx.matchScoresheet.deleteMany({ where: { matchId: match.id } });
      } else if (photo && "data" in photo) {
        await tx.matchScoresheet.upsert({
          where: { matchId: match.id },
          create: {
            matchId: match.id,
            mimeType: photo.mimeType,
            fileName: photo.fileName,
            data: photo.data,
          },
          update: {
            mimeType: photo.mimeType,
            fileName: photo.fileName,
            data: photo.data,
            uploadedAt: new Date(),
          },
        });
      }
    });
  } catch (error) {
    if (error instanceof ResultSaveError) return { error: error.message };
    throw error;
  }

  await refreshTournamentStatus(match.tournamentId);
  revalidateTournament(match.tournamentId);
  revalidatePath(`/admin/torneos/${match.tournamentId}/partidos/${match.id}`);
  revalidatePath(`/torneos/${match.tournamentId}/partidos/${match.id}`);
  return { ok: true };
}

function lastMatchDate(dates: Date[]) {
  return dates.reduce((latest, date) => (date > latest ? date : latest), dates[0]);
}

class ResultSaveError extends Error {}

function normalizePlayerName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

async function resolveGoalPlayers(
  tx: Prisma.TransactionClient,
  teamIds: string[],
  goals: { playerId?: string; playerName?: string; teamId: string; minute?: number | null }[],
) {
  const allowed = new Set(teamIds);
  const resolved: { playerId: string; teamId: string; minute: number | null }[] = [];
  const cache = new Map<string, string>();
  const nextNumber = new Map<string, number>();

  for (const teamId of teamIds) {
    const last = await tx.player.aggregate({
      where: { teamId },
      _max: { number: true },
    });
    nextNumber.set(teamId, (last._max.number ?? 0) + 1);
  }

  for (const goal of goals) {
    if (!allowed.has(goal.teamId)) {
      return { error: "Hay un gol asignado a un equipo que no jugó este partido." };
    }

    const name = normalizePlayerName(goal.playerName ?? "");
    let playerId = goal.playerId?.trim() || "";

    if (playerId) {
      const existing = await tx.player.findFirst({
        where: { id: playerId, teamId: goal.teamId },
      });
      if (existing) {
        cache.set(`${goal.teamId}:${existing.name.toLowerCase()}`, existing.id);
        resolved.push({ playerId: existing.id, teamId: goal.teamId, minute: goal.minute ?? null });
        continue;
      }
    }

    if (!name) {
      return { error: "Cada gol necesita un jugador de la lista o un nombre nuevo." };
    }

    const cacheKey = `${goal.teamId}:${name.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      resolved.push({ playerId: cached, teamId: goal.teamId, minute: goal.minute ?? null });
      continue;
    }

    const existing = await tx.player.findFirst({
      where: { teamId: goal.teamId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      cache.set(cacheKey, existing.id);
      resolved.push({ playerId: existing.id, teamId: goal.teamId, minute: goal.minute ?? null });
      continue;
    }

    const number = nextNumber.get(goal.teamId) ?? 1;
    const created = await tx.player.create({
      data: { name, number, teamId: goal.teamId },
    });
    nextNumber.set(goal.teamId, number + 1);
    cache.set(cacheKey, created.id);
    resolved.push({ playerId: created.id, teamId: goal.teamId, minute: goal.minute ?? null });
  }

  return { players: resolved };
}

function toDateInput(date: Date) {
  return toBogotaDateString(date);
}

export async function advancePhaseAction(tournamentId: string) {
  const access = await requireTournamentMutation(tournamentId);
  if (!access.ok) return { error: access.error };
  const tournament = await getTournament(tournamentId);
  if (!tournament) return { error: "Torneo no encontrado." };

  const groupMatches = tournament.matches.filter((match) => match.phase === "GROUP");
  const knockoutMatches = tournament.matches.filter((match) => match.phase === "KNOCKOUT");
  const quadMatches = tournament.matches.filter((match) => match.phase === "QUADRANGULAR");

  if (tournament.format === "GROUPS" && tournament.nextPhase !== "NONE") {
    const groupsDone = groupMatches.length > 0 && groupMatches.every((match) => match.status === "PLAYED");
    if (!groupsDone) return { error: "Todavía hay partidos de grupos sin resultado." };

    if (tournament.nextPhase === "QUADRANGULAR" && quadMatches.length === 0) {
      const standings = [...standingsFor(tournament).values()].flat();
      const qualified = qualifiedFromStandings(standings, tournament.qualifyPerGroup);
      if (qualified.length !== 4) {
        return { error: "El cuadrangular final necesita 4 clasificados." };
      }
      const unscheduled = generateRoundRobin(
        qualified.map((item) => item.teamName),
        "QUADRANGULAR",
      );
      const fromDate = lastMatchDate(groupMatches.map((match) => match.scheduledAt));
      const scheduled = scheduleMatches(unscheduled, {
        startDate: toDateInput(fromDate),
        endDate: toDateInput(tournament.endDate) > toDateInput(fromDate)
          ? toDateInput(tournament.endDate)
          : toDateInput(new Date(fromDate.getTime() + 1000 * 60 * 60 * 24 * 28)),
        playingDays: tournament.playingDays,
        maxMatchesPerDay: tournament.maxMatchesPerDay,
        matchDurationMinutes: tournament.matchDurationMinutes,
        startTime: tournament.startTime,
        fromDate: new Date(fromDate.getTime() + 1000 * 60 * 60 * 24),
      });
      if (scheduled.error) return { error: scheduled.error };
      const teamIds = new Map(tournament.teams.map((team) => [team.name, team.id]));
      await prisma.match.createMany({
        data: scheduled.matches.map((match) => ({
          tournamentId,
          homeTeamId: teamIds.get(match.homeTeamName)!,
          awayTeamId: teamIds.get(match.awayTeamName)!,
          phase: "QUADRANGULAR" as MatchPhase,
          round: match.round,
          scheduledAt: new Date(match.scheduledAt),
        })),
      });
      await prisma.tournament.update({ where: { id: tournamentId }, data: { status: "IN_PROGRESS" } });
      revalidateTournament(tournamentId);
      return { ok: true, message: "Se programó el cuadrangular final." };
    }

    if (tournament.nextPhase === "KNOCKOUT") {
      if (knockoutMatches.length === 0) {
        const grouped = standingsFor(tournament);
        const standings = [...grouped.entries()].flatMap(([groupName, rows]) =>
          rows.map((row) => ({ ...row, groupName })),
        );
        const qualified = qualifiedFromStandings(standings, tournament.qualifyPerGroup);
        const pairs = pairQualified(qualified);
        const unscheduled = generateKnockoutMatches(pairs);
        if (unscheduled.length === 0) {
          return { error: "No se pudieron armar las llaves de eliminación." };
        }
        const fromDate = lastMatchDate(groupMatches.map((match) => match.scheduledAt));
        const scheduled = scheduleMatches(unscheduled, {
          startDate: toDateInput(fromDate),
          endDate: toDateInput(tournament.endDate),
          playingDays: tournament.playingDays,
          maxMatchesPerDay: tournament.maxMatchesPerDay,
          matchDurationMinutes: tournament.matchDurationMinutes,
          startTime: tournament.startTime,
          fromDate: new Date(fromDate.getTime() + 1000 * 60 * 60 * 24),
        });
        if (scheduled.error) {
          const retry = scheduleMatches(unscheduled, {
            startDate: toDateInput(fromDate),
            endDate: toDateInput(new Date(fromDate.getTime() + 1000 * 60 * 60 * 24 * 45)),
            playingDays: tournament.playingDays,
            maxMatchesPerDay: tournament.maxMatchesPerDay,
            matchDurationMinutes: tournament.matchDurationMinutes,
            startTime: tournament.startTime,
            fromDate: new Date(fromDate.getTime() + 1000 * 60 * 60 * 24),
          });
          if (retry.error) return { error: retry.error };
          scheduled.matches = retry.matches;
          scheduled.error = undefined;
        }
        const teamIds = new Map(tournament.teams.map((team) => [team.name, team.id]));
        await prisma.match.createMany({
          data: scheduled.matches.map((match) => ({
            tournamentId,
            homeTeamId: teamIds.get(match.homeTeamName)!,
            awayTeamId: teamIds.get(match.awayTeamName)!,
            phase: "KNOCKOUT" as MatchPhase,
            round: match.round,
            knockoutRound: match.knockoutRound as KnockoutRound,
            scheduledAt: new Date(match.scheduledAt),
          })),
        });
        await prisma.tournament.update({ where: { id: tournamentId }, data: { status: "IN_PROGRESS" } });
        revalidateTournament(tournamentId);
        return { ok: true, message: "Se programó la fase de eliminación." };
      }

      const latestRound = knockoutMatches.reduce<KnockoutRound>(
        (current, match) => match.knockoutRound ?? current,
        knockoutMatches[0]?.knockoutRound ?? "SF",
      );
      const currentRoundMatches = knockoutMatches.filter((match) => match.knockoutRound === latestRound);
      if (!currentRoundMatches.every((match) => match.status === "PLAYED")) {
        return { error: "Faltan resultados en la ronda de eliminación actual." };
      }
      if (latestRound === "F") {
        await prisma.tournament.update({ where: { id: tournamentId }, data: { status: "FINISHED" } });
        revalidateTournament(tournamentId);
        return { ok: true, message: "El torneo quedó finalizado." };
      }
      const winners = currentRoundMatches.map((match) => {
        const winnerId = match.winnerId ?? (match.homeScore! > match.awayScore! ? match.homeTeamId : match.awayTeamId);
        const team = tournament.teams.find((item) => item.id === winnerId);
        return team?.name ?? "";
      }).filter(Boolean);
      const unscheduled = generateNextKnockout(winners);
      if (unscheduled.length === 0) {
        await prisma.tournament.update({ where: { id: tournamentId }, data: { status: "FINISHED" } });
        revalidateTournament(tournamentId);
        return { ok: true, message: "El torneo quedó finalizado." };
      }
      const fromDate = lastMatchDate(currentRoundMatches.map((match) => match.scheduledAt));
      const scheduled = scheduleMatches(unscheduled, {
        startDate: toDateInput(fromDate),
        endDate: toDateInput(new Date(fromDate.getTime() + 1000 * 60 * 60 * 24 * 30)),
        playingDays: tournament.playingDays,
        maxMatchesPerDay: tournament.maxMatchesPerDay,
        matchDurationMinutes: tournament.matchDurationMinutes,
        startTime: tournament.startTime,
        fromDate: new Date(fromDate.getTime() + 1000 * 60 * 60 * 24),
      });
      if (scheduled.error) return { error: scheduled.error };
      const teamIds = new Map(tournament.teams.map((team) => [team.name, team.id]));
      await prisma.match.createMany({
        data: scheduled.matches.map((match) => ({
          tournamentId,
          homeTeamId: teamIds.get(match.homeTeamName)!,
          awayTeamId: teamIds.get(match.awayTeamName)!,
          phase: "KNOCKOUT" as MatchPhase,
          round: match.round,
          knockoutRound: match.knockoutRound as KnockoutRound,
          scheduledAt: new Date(match.scheduledAt),
        })),
      });
      revalidateTournament(tournamentId);
      return { ok: true, message: "Se programó la siguiente ronda." };
    }
  }

  const allPlayed = tournament.matches.every((match) => match.status === "PLAYED");
  if (allPlayed) {
    await prisma.tournament.update({ where: { id: tournamentId }, data: { status: "FINISHED" } });
    revalidateTournament(tournamentId);
    return { ok: true, message: "El torneo quedó finalizado." };
  }

  return { error: "Aún no se puede avanzar de fase." };
}

export async function finishTournamentAction(tournamentId: string) {
  const access = await requireTournamentMutation(tournamentId);
  if (!access.ok) return { error: access.error };
  await prisma.tournament.update({ where: { id: tournamentId }, data: { status: "FINISHED" } });
  revalidateTournament(tournamentId);
}
