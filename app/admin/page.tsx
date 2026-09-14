import Link from "next/link";
import { getAdminTournaments, isGlobalAdmin, requireAnyAdmin } from "@/lib/authz";
import { formatDate, formatLabel } from "@/lib/format";
import { StatusBadge } from "@/components/MatchList";

export default async function AdminHomePage() {
  const admin = await requireAnyAdmin();
  const tournaments = await getAdminTournaments(admin);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="display text-4xl">Panel</h1>
          <p className="text-muted">
            {isGlobalAdmin(admin)
              ? "Crea torneos, asigna administradores y carga resultados."
              : "Administra los torneos que te asignaron: calendario, equipos y resultados."}
          </p>
        </div>
        {isGlobalAdmin(admin) ? (
          <Link href="/admin/torneos/nuevo" className="btn btn-lime">
            Nuevo torneo
          </Link>
        ) : null}
      </div>
      <div className="grid gap-4">
        {tournaments.map((tournament) => (
          <Link
            key={tournament.id}
            href={`/admin/torneos/${tournament.id}`}
            className="card flex flex-col gap-2 p-5 no-underline text-ink sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 className="display text-2xl">{tournament.name}</h2>
              <p className="text-sm text-muted">
                {formatLabel(tournament.format)} · {formatDate(tournament.startDate)} — {formatDate(tournament.endDate)}
              </p>
            </div>
            <StatusBadge status={tournament.status} />
          </Link>
        ))}
        {tournaments.length === 0 ? (
          <p className="text-muted">
            {isGlobalAdmin(admin)
              ? "No hay torneos todavía."
              : "Aún no tienes torneos asignados. Pídele al admin global que te asigne uno."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
