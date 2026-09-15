import { prisma } from "@/lib/prisma";
import { requireGlobalAdmin } from "@/lib/authz";
import { UsersManager } from "./UsersManager";

export default async function UsersPage() {
  const admin = await requireGlobalAdmin();
  const [users, tournaments] = await Promise.all([
    prisma.user.findMany({
      where: { role: { not: "CAPTAIN" } },
      orderBy: { createdAt: "asc" },
      include: {
        tournaments: { select: { tournamentId: true } },
        scorekeeperFor: { select: { tournamentId: true } },
      },
    }),
    prisma.tournament.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="display text-4xl">Usuarios</h1>
      <p className="mb-6 text-muted">
        Crea administradores globales, admins por torneo o planilleros que solo cargan marcadores.
      </p>
      <UsersManager
        currentUserId={admin.id}
        tournaments={tournaments}
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as "GLOBAL_ADMIN" | "TOURNAMENT_ADMIN" | "SCOREKEEPER",
          whatsapp: user.whatsapp ?? "",
          tournamentIds:
            user.role === "SCOREKEEPER"
              ? user.scorekeeperFor.map((item) => item.tournamentId)
              : user.tournaments.map((item) => item.tournamentId),
        }))}
      />
    </div>
  );
}
