"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminUser, requireGlobalMutation, requireTournamentMutation } from "@/lib/authz";
import { normalizeWhatsApp } from "@/lib/whatsapp";

function revalidateUsers() {
  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseRole(value: string): UserRole | null {
  if (value === "GLOBAL_ADMIN" || value === "TOURNAMENT_ADMIN" || value === "SCOREKEEPER") return value;
  return null;
}

async function replaceUserTournaments(
  userId: string,
  role: UserRole,
  tournamentIds: string[],
) {
  await prisma.tournamentAdmin.deleteMany({ where: { userId } });
  await prisma.tournamentScorekeeper.deleteMany({ where: { userId } });
  if (role === "TOURNAMENT_ADMIN" && tournamentIds.length > 0) {
    await prisma.tournamentAdmin.createMany({
      data: tournamentIds.map((tournamentId) => ({ userId, tournamentId })),
    });
  }
  if (role === "SCOREKEEPER" && tournamentIds.length > 0) {
    await prisma.tournamentScorekeeper.createMany({
      data: tournamentIds.map((tournamentId) => ({ userId, tournamentId })),
    });
  }
}

export async function createAdminUserAction(input: {
  name: string;
  email: string;
  password: string;
  role: string;
  tournamentIds: string[];
  whatsapp?: string;
}) {
  const access = await requireGlobalMutation();
  if (!access.ok) return { error: access.error };

  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const password = input.password;
  const role = parseRole(input.role);
  if (!name) return { error: "El usuario necesita un nombre." };
  if (!email.includes("@")) return { error: "El correo no es válido." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (!role) return { error: "Elige un rol." };

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "Ya hay un usuario con ese correo." };

  const tournamentIds =
    role === "TOURNAMENT_ADMIN" || role === "SCOREKEEPER" ? [...new Set(input.tournamentIds)] : [];
  if (tournamentIds.length > 0) {
    const count = await prisma.tournament.count({ where: { id: { in: tournamentIds } } });
    if (count !== tournamentIds.length) return { error: "Hay un torneo que no existe." };
  }

  const whatsapp = normalizeWhatsApp(input.whatsapp ?? "");
  if ((input.whatsapp ?? "").trim() && !whatsapp) return { error: "El número de WhatsApp no es válido." };

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      whatsapp,
    },
  });
  await replaceUserTournaments(user.id, role, tournamentIds);

  revalidateUsers();
  return { ok: true, message: "Usuario creado." };
}

export async function updateAdminUserAction(input: {
  userId: string;
  name: string;
  role: string;
  password?: string;
  tournamentIds: string[];
  whatsapp?: string;
}) {
  const access = await requireGlobalMutation();
  if (!access.ok) return { error: access.error };

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) return { error: "Usuario no encontrado." };

  const name = input.name.trim();
  const role = parseRole(input.role);
  if (!name) return { error: "El usuario necesita un nombre." };
  if (!role) return { error: "Elige un rol." };

  if (user.role === "GLOBAL_ADMIN" && role !== "GLOBAL_ADMIN") {
    const globals = await prisma.user.count({ where: { role: "GLOBAL_ADMIN" } });
    if (globals <= 1) return { error: "Debe quedar al menos un administrador global." };
  }

  if (input.password && input.password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const tournamentIds =
    role === "TOURNAMENT_ADMIN" || role === "SCOREKEEPER" ? [...new Set(input.tournamentIds)] : [];
  if (tournamentIds.length > 0) {
    const count = await prisma.tournament.count({ where: { id: { in: tournamentIds } } });
    if (count !== tournamentIds.length) return { error: "Hay un torneo que no existe." };
  }

  const whatsapp = normalizeWhatsApp(input.whatsapp ?? "");
  if ((input.whatsapp ?? "").trim() && !whatsapp) return { error: "El número de WhatsApp no es válido." };

  const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : undefined;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      role,
      whatsapp,
      ...(passwordHash ? { passwordHash } : {}),
    },
  });
  await replaceUserTournaments(user.id, role, tournamentIds);

  revalidateUsers();
  return { ok: true, message: "Usuario actualizado." };
}

export async function deleteAdminUserAction(userId: string) {
  const access = await requireGlobalMutation();
  if (!access.ok) return { error: access.error };

  const current = await getAdminUser();
  if (current?.id === userId) return { error: "No puedes eliminar tu propio usuario." };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Usuario no encontrado." };
  if (user.role === "GLOBAL_ADMIN") {
    const globals = await prisma.user.count({ where: { role: "GLOBAL_ADMIN" } });
    if (globals <= 1) return { error: "Debe quedar al menos un administrador global." };
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidateUsers();
  return { ok: true, message: "Usuario eliminado." };
}

export async function setTournamentAdminsAction(input: { tournamentId: string; userIds: string[] }) {
  const access = await requireGlobalMutation();
  if (!access.ok) return { error: access.error };

  const tournament = await prisma.tournament.findUnique({ where: { id: input.tournamentId } });
  if (!tournament) return { error: "Torneo no encontrado." };

  const userIds = [...new Set(input.userIds)];
  if (userIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, role: true },
    });
    if (users.length !== userIds.length) return { error: "Hay un usuario que no existe." };
    if (users.some((user) => user.role !== "TOURNAMENT_ADMIN")) {
      return { error: "Solo puedes asignar usuarios con rol de admin de torneo." };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.tournamentAdmin.deleteMany({ where: { tournamentId: input.tournamentId } });
    if (userIds.length > 0) {
      await tx.tournamentAdmin.createMany({
        data: userIds.map((userId) => ({ userId, tournamentId: input.tournamentId })),
      });
    }
  });

  revalidatePath(`/admin/torneos/${input.tournamentId}`);
  revalidateUsers();
  return { ok: true, message: "Administradores del torneo actualizados." };
}

export async function setTournamentScorekeepersAction(input: { tournamentId: string; userIds: string[] }) {
  const access = await requireTournamentMutation(input.tournamentId);
  if (!access.ok) return { error: access.error };

  const tournament = await prisma.tournament.findUnique({ where: { id: input.tournamentId } });
  if (!tournament) return { error: "Torneo no encontrado." };

  const userIds = [...new Set(input.userIds)];
  if (userIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, role: true },
    });
    if (users.length !== userIds.length) return { error: "Hay un usuario que no existe." };
    if (users.some((user) => user.role !== "SCOREKEEPER")) {
      return { error: "Solo puedes asignar usuarios con rol de planillero." };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.tournamentScorekeeper.deleteMany({ where: { tournamentId: input.tournamentId } });
    if (userIds.length > 0) {
      await tx.tournamentScorekeeper.createMany({
        data: userIds.map((userId) => ({ userId, tournamentId: input.tournamentId })),
      });
    }
  });

  revalidatePath(`/admin/torneos/${input.tournamentId}`);
  revalidateUsers();
  return { ok: true, message: "Planilleros del torneo actualizados." };
}

export async function createTournamentScorekeeperAction(input: {
  tournamentId: string;
  name: string;
  email: string;
  password: string;
}) {
  const access = await requireTournamentMutation(input.tournamentId);
  if (!access.ok) return { error: access.error };

  const tournament = await prisma.tournament.findUnique({ where: { id: input.tournamentId } });
  if (!tournament) return { error: "Torneo no encontrado." };

  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const password = input.password;
  if (!name) return { error: "El planillero necesita un nombre." };
  if (!email.includes("@")) return { error: "El correo no es válido." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "Ya hay un usuario con ese correo." };

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "SCOREKEEPER",
      scorekeeperFor: {
        create: { tournamentId: input.tournamentId },
      },
    },
  });

  revalidatePath(`/admin/torneos/${input.tournamentId}`);
  revalidateUsers();
  return { ok: true, message: "Planillero creado y asignado a este torneo." };
}
