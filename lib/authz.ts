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
  tournamentIds: string[];
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
      tournaments: { select: { tournamentId: true } },
    },
  });
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tournamentIds: user.tournaments.map((item) => item.tournamentId),
  };
});

export function isGlobalAdmin(user: AdminUser) {
  return user.role === "GLOBAL_ADMIN";
}

export function canManageTournament(user: AdminUser, tournamentId: string) {
  return isGlobalAdmin(user) || user.tournamentIds.includes(tournamentId);
}

export async function requireAnyAdmin() {
  const user = await getAdminUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireGlobalAdmin() {
  const user = await requireAnyAdmin();
  if (!isGlobalAdmin(user)) redirect("/admin");
  return user;
}

export async function requireTournamentPage(tournamentId: string) {
  const user = await requireAnyAdmin();
  if (!canManageTournament(user, tournamentId)) notFound();
  return user;
}

export async function requireAnyAdminMutation() {
  const user = await getAdminUser();
  if (!user) return { ok: false as const, error: "Debes iniciar sesión." };
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

export async function getAdminTournaments(user: AdminUser) {
  return prisma.tournament.findMany({
    where: isGlobalAdmin(user) ? undefined : { id: { in: user.tournamentIds } },
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { teams: true, matches: true } },
    },
  });
}
