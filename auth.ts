import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { passwordMatches } from "@/lib/captain";

const ROLES: UserRole[] = ["GLOBAL_ADMIN", "TOURNAMENT_ADMIN", "SCOREKEEPER", "CAPTAIN"];

function asRole(value: unknown): UserRole {
  if (value === "GLOBAL_ADMIN" || value === "TOURNAMENT_ADMIN" || value === "SCOREKEEPER" || value === "CAPTAIN") {
    return value;
  }
  return "TOURNAMENT_ADMIN";
}

async function findUserForLogin(login: string, password: string) {
  const email = login.trim().toLowerCase();
  const byEmail = email.includes("@")
    ? await prisma.user.findUnique({ where: { email } })
    : null;
  if (byEmail && (await passwordMatches(password, byEmail.passwordHash))) return byEmail;

  const name = login.trim();
  if (!name) return null;
  const captains = await prisma.user.findMany({
    where: {
      role: "CAPTAIN",
      OR: [
        { name: { equals: name, mode: "insensitive" } },
        { team: { is: { name: { equals: name, mode: "insensitive" } } } },
      ],
    },
  });
  for (const captain of captains) {
    if (await passwordMatches(password, captain.passwordHash)) return captain;
  }
  return null;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const login = String(credentials?.email ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (!login || !password) return null;
        const user = await findUserForLogin(login, password);
        if (!user) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        const role = (user as { role?: UserRole }).role;
        if (role && ROLES.includes(role)) token.role = role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = asRole(token.role);
      }
      return session;
    },
  },
});
