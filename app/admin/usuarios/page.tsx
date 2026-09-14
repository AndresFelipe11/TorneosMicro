import { prisma } from "@/lib/prisma";
import { requireGlobalAdmin } from "@/lib/authz";
import { UsersManager } from "./UsersManager";

export default async function UsersPage() {
  const admin = await requireGlobalAdmin();
  const [users, tournaments] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      include: { tournaments: { select: { tournamentId: true } } },
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
        Crea administradores globales o un admin por torneo para que cargue resultados y reprograme partidos.
      </p>
      <UsersManager
        currentUserId={admin.id}
        tournaments={tournaments}
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tournamentIds: user.tournaments.map((item) => item.tournamentId),
        }))}
      />
    </div>
  );
}
