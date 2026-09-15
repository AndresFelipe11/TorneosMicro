import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeWhatsApp } from "@/lib/whatsapp";
import { teamName } from "@/lib/format";

export function captainEmailFor(teamId: string) {
  return `captain.${teamId}@equipo.local`;
}

export function passwordCandidates(raw: string) {
  const candidates = new Set<string>();
  const trimmed = raw.trim();
  if (trimmed) candidates.add(trimmed);
  const phone = normalizeWhatsApp(raw);
  if (phone) {
    candidates.add(phone);
    if (phone.startsWith("57") && phone.length === 12) candidates.add(phone.slice(2));
  }
  const digits = raw.replace(/\D/g, "");
  if (digits) candidates.add(digits);
  return [...candidates];
}

export async function passwordMatches(raw: string, passwordHash: string) {
  for (const candidate of passwordCandidates(raw)) {
    if (await bcrypt.compare(candidate, passwordHash)) return true;
  }
  return false;
}

export async function upsertTeamCaptain(
  tx: Prisma.TransactionClient,
  input: { teamId: string; teamName: string; whatsapp: string | null | undefined },
) {
  const phone = normalizeWhatsApp(input.whatsapp);
  const existing = await tx.user.findUnique({ where: { teamId: input.teamId } });
  if (!phone) {
    if (existing) {
      await tx.user.delete({ where: { id: existing.id } });
    }
    await tx.team.update({
      where: { id: input.teamId },
      data: { whatsapp: null },
    });
    return { ok: true as const, created: false };
  }

  const passwordHash = await bcrypt.hash(phone, 10);
  const email = captainEmailFor(input.teamId);
  await tx.team.update({
    where: { id: input.teamId },
    data: { whatsapp: phone },
  });
  if (existing) {
    await tx.user.update({
      where: { id: existing.id },
      data: {
        name: teamName(input.teamName),
        email,
        passwordHash,
        whatsapp: phone,
        role: "CAPTAIN",
      },
    });
    return { ok: true as const, created: false };
  }

  await tx.user.create({
    data: {
      name: teamName(input.teamName),
      email,
      passwordHash,
      role: "CAPTAIN",
      whatsapp: phone,
      teamId: input.teamId,
    },
  });
  return { ok: true as const, created: true };
}

export async function ensureUppercaseTeamNames(tournamentId?: string) {
  const teams = await prisma.team.findMany({
    where: tournamentId ? { tournamentId } : undefined,
    select: { id: true, name: true },
  });
  for (const team of teams) {
    const name = teamName(team.name);
    if (!name || name === team.name) continue;
    await prisma.team.update({ where: { id: team.id }, data: { name } });
    await prisma.user.updateMany({ where: { teamId: team.id, role: "CAPTAIN" }, data: { name } });
  }

  const registrations = await prisma.teamRegistration.findMany({
    where: tournamentId ? { tournamentId } : undefined,
    select: { id: true, name: true },
  });
  for (const row of registrations) {
    const name = teamName(row.name);
    if (!name || name === row.name) continue;
    await prisma.teamRegistration.update({ where: { id: row.id }, data: { name } });
  }
}

export async function syncCaptainsFromAcceptedRegistrations(tournamentId: string) {
  await ensureUppercaseTeamNames(tournamentId);
  const [teams, registrations] = await Promise.all([
    prisma.team.findMany({
      where: { tournamentId },
      include: { captain: { select: { id: true, whatsapp: true } } },
    }),
    prisma.teamRegistration.findMany({
      where: { tournamentId, status: "ACCEPTED", whatsapp: { not: null } },
      select: { name: true, whatsapp: true },
    }),
  ]);

  const byName = new Map(
    registrations.flatMap((row) => {
      const phone = normalizeWhatsApp(row.whatsapp);
      return phone ? [[row.name.trim().toLowerCase(), phone] as const] : [];
    }),
  );

  let created = 0;
  let updated = 0;
  for (const team of teams) {
    const phone = byName.get(team.name.trim().toLowerCase());
    if (!phone) continue;
    if (team.captain && team.whatsapp === phone && team.captain.whatsapp === phone) continue;
    await prisma.$transaction(async (tx) => {
      const result = await upsertTeamCaptain(tx, {
        teamId: team.id,
        teamName: team.name,
        whatsapp: phone,
      });
      if (result.created) created += 1;
      else updated += 1;
    });
  }

  return { created, updated };
}
