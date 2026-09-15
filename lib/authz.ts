import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  whatsapp: string | null;
  tournamentIds: string[];
  scorekeeperTournamentIds: string[];
  team: { id: string; name: string; tournamentId: string } | null;
};

export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      whatsapp: true,
      tournaments: { select: { tournamentId: true } },
      scorekeeperFor: { select: { tournamentId: true } },
      team: { select: { id: true, name: true, tournamentId: true } },
    },
  });
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    whatsapp: user.whatsapp,
    tournamentIds: user.tournaments.map((item) => item.tournamentId),
    scorekeeperTournamentIds: user.scorekeeperFor.map((item) => item.tournamentId),
    team: user.team,
  };
});

export function isGlobalAdmin(user: AdminUser) {
  return user.role === "GLOBAL_ADMIN";
}

export function isCaptain(user: AdminUser) {
  return user.role === "CAPTAIN";
}

export function isScorekeeper(user: AdminUser) {
  return user.role === "SCOREKEEPER";
}

export function canManageTournament(user: AdminUser, tournamentId: string) {
  return isGlobalAdmin(user) || user.tournamentIds.includes(tournamentId);
}

export function canEditMatchResults(user: AdminUser, tournamentId: string) {
  return canManageTournament(user, tournamentId) || user.scorekeeperTournamentIds.includes(tournamentId);
}

export function canAccessTournament(user: AdminUser, tournamentId: string) {
  return canEditMatchResults(user, tournamentId);
}

export async function requireAnyAdmin() {
  const user = await getAdminUser();
  if (!user) redirect("/login");
  if (isCaptain(user)) redirect("/mi-equipo");
  return user;
}

export async function requireCaptain() {
  const user = await getAdminUser();
  if (!user) redirect("/login");
  if (!isCaptain(user) || !user.team) redirect("/admin");
  return user;
}

export async function requireGlobalAdmin() {
  const user = await requireAnyAdmin();
  if (!isGlobalAdmin(user)) redirect("/admin");
  return user;
}

export async function requireTournamentPage(tournamentId: string) {
  const user = await requireAnyAdmin();
  if (!canAccessTournament(user, tournamentId)) notFound();
  return user;
}

export async function requireTournamentManagePage(tournamentId: string) {
  const user = await requireAnyAdmin();
  if (!canManageTournament(user, tournamentId)) notFound();
  return user;
}

export async function requireCaptainMutation() {
  const user = await getAdminUser();
  if (!user) return { ok: false as const, error: "Debes iniciar sesión." };
  if (!isCaptain(user) || !user.team) {
    return { ok: false as const, error: "Solo el capitán del equipo puede hacer esta petición." };
  }
  return { ok: true as const, user, team: user.team };
}

export async function requireAnyAdminMutation() {
  const user = await getAdminUser();
  if (!user) return { ok: false as const, error: "Debes iniciar sesión." };
  if (isCaptain(user)) return { ok: false as const, error: "Esta acción es solo para administradores." };
  return { ok: true as const, user };
}

export async function requireGlobalMutation() {
  const user = await getAdminUser();
  if (!user) return { ok: false as const, error: "Debes iniciar sesión." };
  if (!isGlobalAdmin(user)) return { ok: false as const, error: "Solo el administrador global puede hacer este cambio." };
  return { ok: true as const, user };
}

export async function requireTournamentMutation(tournamentId: string) {
  const user = await getAdminUser();
  if (!user) return { ok: false as const, error: "Debes iniciar sesión." };
  if (!canManageTournament(user, tournamentId)) {
    return { ok: false as const, error: "No tienes permiso para administrar este torneo." };
  }
  return { ok: true as const, user };
}

export async function requireMatchResultMutation(tournamentId: string) {
  const user = await getAdminUser();
  if (!user) return { ok: false as const, error: "Debes iniciar sesión." };
  if (!canEditMatchResults(user, tournamentId)) {
    return { ok: false as const, error: "No tienes permiso para cargar resultados de este torneo." };
  }
  return { ok: true as const, user };
}

export async function getAdminTournaments(user: AdminUser) {
  const assignedIds = [...new Set([...user.tournamentIds, ...user.scorekeeperTournamentIds])];
  return prisma.tournament.findMany({
    where: isGlobalAdmin(user) ? undefined : { id: { in: assignedIds } },
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { teams: true, matches: true } },
    },
  });
}
