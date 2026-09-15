"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAnyAdminMutation, requireTournamentMutation } from "@/lib/authz";
import { addTeamToTournament } from "@/lib/actions/roster";
import { normalizeWhatsApp, registrationWhatsAppMessage, whatsappChatUrl } from "@/lib/whatsapp";
import { teamName } from "@/lib/format";

function revalidateRegistration(id: string) {
  revalidatePath("/");
  revalidatePath(`/torneos/${id}`);
  revalidatePath(`/torneos/${id}/inscribirme`);
  revalidatePath(`/admin/torneos/${id}`);
  revalidatePath(`/admin/torneos/${id}/inscripciones`);
  revalidatePath(`/admin/torneos/${id}/editar`);
}

export async function resolveTournamentWhatsApp(tournamentId: string) {
  const assigned = await prisma.tournamentAdmin.findMany({
    where: { tournamentId },
    include: { user: { select: { whatsapp: true } } },
  });
  for (const row of assigned) {
    const phone = normalizeWhatsApp(row.user.whatsapp);
    if (phone) return phone;
  }
  const globals = await prisma.user.findMany({
    where: { role: "GLOBAL_ADMIN" },
    select: { whatsapp: true },
  });
  for (const user of globals) {
    const phone = normalizeWhatsApp(user.whatsapp);
    if (phone) return phone;
  }
  return null;
}

function parsePlayers(players: string[]) {
  return players
    .flatMap((value) => value.split(/[,;\n]/))
    .map((name) => name.trim())
    .filter(Boolean);
}

export async function requestTeamRegistrationAction(input: {
  tournamentId: string;
  name: string;
  players: string[];
  whatsapp: string;
  groupId?: string | null;
}) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: input.tournamentId },
    include: {
      teams: { select: { name: true } },
      groups: { select: { id: true, name: true } },
      registrations: { where: { status: "PENDING" }, select: { name: true } },
    },
  });
  if (!tournament) return { error: "Torneo no encontrado." };
  if (tournament.status === "FINISHED") return { error: "El torneo ya terminó." };
  if (!tournament.registrationOpen) return { error: "Este torneo no está recibiendo equipos." };

  const phone = await resolveTournamentWhatsApp(tournament.id);
  if (!phone) return { error: "El torneo no tiene un WhatsApp de contacto." };

  const name = teamName(input.name);
  if (!name) return { error: "El equipo necesita un nombre." };
  const players = parsePlayers(input.players);
  if (players.length === 0) return { error: "Agrega al menos un jugador." };
  const captainWhatsApp = normalizeWhatsApp(input.whatsapp);
  if (!captainWhatsApp) return { error: "El WhatsApp del capitán no es válido." };

  const taken = [...tournament.teams, ...tournament.registrations].some(
    (item) => item.name.toLowerCase() === name.toLowerCase(),
  );
  if (taken) return { error: "Ya hay un equipo o una inscripción con ese nombre." };

  let groupId: string | null = input.groupId ?? null;
  if (tournament.format === "GROUPS") {
    if (!groupId) return { error: "Elige el grupo de tu equipo." };
    if (!tournament.groups.some((group) => group.id === groupId)) {
      return { error: "Ese grupo no existe." };
    }
  } else {
    groupId = null;
  }

  await prisma.teamRegistration.create({
    data: {
      tournamentId: tournament.id,
      name,
      players,
      whatsapp: captainWhatsApp,
      groupId,
    },
  });

  revalidateRegistration(tournament.id);
  return {
    ok: true,
    message: "Inscripción enviada. Solo falta la confirmación por WhatsApp.",
    whatsappUrl: whatsappChatUrl(
      phone,
      registrationWhatsAppMessage(tournament.name, name, players, captainWhatsApp),
    ),
  };
}

export async function setRegistrationOpenAction(tournamentId: string, open: boolean) {
  const access = await requireTournamentMutation(tournamentId);
  if (!access.ok) return { error: access.error };
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { status: true },
  });
  if (!tournament) return { error: "Torneo no encontrado." };
  if (open) {
    if (tournament.status === "FINISHED") return { error: "El torneo ya terminó." };
    const phone = await resolveTournamentWhatsApp(tournamentId);
    if (!phone) {
      return { error: "Pon un número de WhatsApp en un administrador del torneo para abrir las inscripciones." };
    }
  }
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { registrationOpen: open },
  });
  revalidateRegistration(tournamentId);
  return {
    ok: true,
    message: open ? "El torneo ya recibe equipos." : "Se cerraron las inscripciones.",
  };
}

export async function updateMyWhatsAppAction(whatsapp: string) {
  const access = await requireAnyAdminMutation();
  if (!access.ok) return { error: access.error };
  const phone = normalizeWhatsApp(whatsapp);
  if (whatsapp.trim() && !phone) return { error: "El número de WhatsApp no es válido." };
  await prisma.user.update({
    where: { id: access.user.id },
    data: { whatsapp: phone },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  return { ok: true, message: phone ? "WhatsApp guardado." : "WhatsApp quitado." };
}

export async function acceptTeamRegistrationAction(input: {
  registrationId: string;
  groupId?: string | null;
}) {
  const registration = await prisma.teamRegistration.findUnique({
    where: { id: input.registrationId },
  });
  if (!registration) return { error: "Inscripción no encontrada." };
  const access = await requireTournamentMutation(registration.tournamentId);
  if (!access.ok) return { error: access.error };
  if (registration.status !== "PENDING") return { error: "Esa inscripción ya se resolvió." };

  const result = await addTeamToTournament({
    tournamentId: registration.tournamentId,
    name: registration.name,
    groupId: input.groupId ?? registration.groupId,
    players: registration.players,
    whatsapp: registration.whatsapp,
  });
  if (result.error) return result;

  await prisma.teamRegistration.update({
    where: { id: registration.id },
    data: { status: "ACCEPTED", groupId: input.groupId ?? registration.groupId },
  });
  revalidateRegistration(registration.tournamentId);
  return { ok: true, message: result.message ?? "Equipo aceptado." };
}

export async function rejectTeamRegistrationAction(registrationId: string) {
  const registration = await prisma.teamRegistration.findUnique({
    where: { id: registrationId },
  });
  if (!registration) return { error: "Inscripción no encontrada." };
  const access = await requireTournamentMutation(registration.tournamentId);
  if (!access.ok) return { error: access.error };
  if (registration.status !== "PENDING") return { error: "Esa inscripción ya se resolvió." };
  await prisma.teamRegistration.update({
    where: { id: registration.id },
    data: { status: "REJECTED" },
  });
  revalidateRegistration(registration.tournamentId);
  return { ok: true, message: "Inscripción rechazada." };
}
