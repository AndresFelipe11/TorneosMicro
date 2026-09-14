"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminUser, requireGlobalMutation } from "@/lib/authz";

function revalidateUsers() {
  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseRole(value: string): UserRole | null {
  if (value === "GLOBAL_ADMIN" || value === "TOURNAMENT_ADMIN") return value;
  return null;
}

export async function createAdminUserAction(input: {
  name: string;
  email: string;
  password: string;
  role: string;
  tournamentIds: string[];
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

  const tournamentIds = role === "TOURNAMENT_ADMIN" ? [...new Set(input.tournamentIds)] : [];
  if (role === "TOURNAMENT_ADMIN" && tournamentIds.length > 0) {
    const count = await prisma.tournament.count({ where: { id: { in: tournamentIds } } });
    if (count !== tournamentIds.length) return { error: "Hay un torneo que no existe." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      tournaments: {
        create: tournamentIds.map((tournamentId) => ({ tournamentId })),
      },
    },
  });

  revalidateUsers();
  return { ok: true, message: "Usuario creado." };
}

export async function updateAdminUserAction(input: {
  userId: string;
  name: string;
  role: string;
  password?: string;
  tournamentIds: string[];
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

  const tournamentIds = role === "TOURNAMENT_ADMIN" ? [...new Set(input.tournamentIds)] : [];
  if (role === "TOURNAMENT_ADMIN" && tournamentIds.length > 0) {
    const count = await prisma.tournament.count({ where: { id: { in: tournamentIds } } });
    if (count !== tournamentIds.length) return { error: "Hay un torneo que no existe." };
  }

  const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : undefined;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        name,
        role,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });
    await tx.tournamentAdmin.deleteMany({ where: { userId: user.id } });
    if (tournamentIds.length > 0) {
      await tx.tournamentAdmin.createMany({
        data: tournamentIds.map((tournamentId) => ({ userId: user.id, tournamentId })),
      });
    }
  });

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
    if (users.some((user) => user.role === "GLOBAL_ADMIN")) {
      return { error: "El admin global ya tiene acceso a todos los torneos." };
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
