"use server";

import { revalidatePath } from "next/cache";
import { PostponeWindow } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCaptainMutation, requireTournamentMutation } from "@/lib/authz";
import { suggestedPostponeLocal, toBogotaDateTimeLocal } from "@/lib/tournament/dates";
import { isClosedMatch, venueOrNull } from "@/lib/tournament/match";
import { formatDateTime, POSTPONE_WINDOWS, postponeWindowLabel, type PostponeWindowId } from "@/lib/format";
import { resolveTournamentWhatsApp } from "@/lib/actions/registration";
import { postponeWhatsAppMessage, whatsappChatUrl } from "@/lib/whatsapp";
import { rescheduleMatchAction } from "@/lib/actions/tournaments";

function revalidatePostpone(tournamentId: string, matchId: string) {
  revalidatePath("/");
  revalidatePath("/mi-equipo");
  revalidatePath(`/torneos/${tournamentId}`);
  revalidatePath(`/torneos/${tournamentId}/calendario`);
  revalidatePath(`/torneos/${tournamentId}/partidos/${matchId}`);
  revalidatePath(`/admin/torneos/${tournamentId}`);
  revalidatePath(`/admin/torneos/${tournamentId}/calendario`);
  revalidatePath(`/admin/torneos/${tournamentId}/partidos/${matchId}`);
}

const WINDOWS = new Set<string>(POSTPONE_WINDOWS.map((item) => item.id));

function asWindow(value: string | null | undefined): PostponeWindow | null {
  if (!value || !WINDOWS.has(value)) return null;
  return value as PostponeWindow;
}

export async function requestPostponeAction(input: {
  matchId: string;
  window: PostponeWindowId;
  reason?: string;
}) {
  const access = await requireCaptainMutation();
  if (!access.ok) return { error: access.error };
  const team = access.team;
  const proposedWindow = asWindow(input.window);
  if (!proposedWindow) return { error: "Elige cuándo pueden jugar." };

  const match = await prisma.match.findUnique({
    where: { id: input.matchId },
    include: {
      homeTeam: true,
      awayTeam: true,
      tournament: { select: { id: true, name: true, status: true } },
    },
  });
  if (!match) return { error: "Partido no encontrado." };
  if (match.tournamentId !== team.tournamentId) {
    return { error: "Ese partido no es de tu torneo." };
  }
  if (match.homeTeamId !== team.id && match.awayTeamId !== team.id) {
    return { error: "Solo puedes pedir aplazamiento de un partido de tu equipo." };
  }
  if (match.tournament.status === "FINISHED") return { error: "El torneo ya terminó." };
  if (isClosedMatch(match.status)) return { error: "Ese partido ya se jugó." };

  const pending = await prisma.matchPostponeRequest.findFirst({
    where: { matchId: match.id, teamId: team.id, status: "PENDING" },
  });
  if (pending) return { error: "Ya hay una petición pendiente para este partido." };

  const reason = input.reason?.trim() || null;
  await prisma.matchPostponeRequest.create({
    data: {
      matchId: match.id,
      teamId: team.id,
      userId: access.user.id,
      reason,
      proposedWindow,
      proposedAt: null,
    },
  });

  revalidatePostpone(match.tournamentId, match.id);

  const adminPhone = await resolveTournamentWhatsApp(match.tournamentId);
  const whatsappUrl = adminPhone
    ? whatsappChatUrl(
        adminPhone,
        postponeWhatsAppMessage({
          tournamentName: match.tournament.name,
          teamName: team.name,
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          currentWhen: formatDateTime(match.scheduledAt),
          proposedWhen: postponeWindowLabel(proposedWindow),
          reason,
        }),
      )
    : null;

  return {
    ok: true,
    message: "Petición enviada. El administrador la revisa y te confirma.",
    whatsappUrl,
  };
}

export async function resolvePostponeAction(input: {
  requestId: string;
  accept: boolean;
  scheduledAt?: string;
  venue?: string | null;
}) {
  const request = await prisma.matchPostponeRequest.findUnique({
    where: { id: input.requestId },
    include: { match: true, team: true },
  });
  if (!request) return { error: "Petición no encontrada." };
  const access = await requireTournamentMutation(request.match.tournamentId);
  if (!access.ok) return { error: access.error };
  if (request.status !== "PENDING") return { error: "Esa petición ya se resolvió." };

  if (!input.accept) {
    await prisma.matchPostponeRequest.update({
      where: { id: request.id },
      data: { status: "REJECTED", resolvedAt: new Date() },
    });
    revalidatePostpone(request.match.tournamentId, request.matchId);
    return { ok: true, message: "Petición rechazada." };
  }

  const whenLocal =
    input.scheduledAt?.trim() ||
    (request.proposedAt ? toBogotaDateTimeLocal(request.proposedAt) : null) ||
    suggestedPostponeLocal(request.match.scheduledAt, request.proposedWindow);

  if (!whenLocal) return { error: "Elige la nueva fecha para aceptar el aplazamiento." };

  const result = await rescheduleMatchAction({
    matchId: request.matchId,
    scheduledAt: whenLocal,
    venue: venueOrNull(input.venue) ?? request.match.venue,
  });
  if (result.error) return result;

  await prisma.matchPostponeRequest.update({
    where: { id: request.id },
    data: { status: "ACCEPTED", resolvedAt: new Date() },
  });
  revalidatePostpone(request.match.tournamentId, request.matchId);
  return {
    ok: true,
    warning: result.warning,
    message: result.warning
      ? `Aplazamiento aceptado. El partido quedó reprogramado. Alerta: ${result.warning}`
      : "Aplazamiento aceptado. El partido quedó reprogramado.",
  };
}
