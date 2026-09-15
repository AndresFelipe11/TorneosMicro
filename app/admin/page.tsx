import Link from "next/link";
import { getAdminTournaments, isGlobalAdmin, isScorekeeper, requireAnyAdmin } from "@/lib/authz";
import { formatDate, formatLabel } from "@/lib/format";
import { StatusBadge } from "@/components/MatchList";

export default async function AdminHomePage() {
  const admin = await requireAnyAdmin();
  const tournaments = await getAdminTournaments(admin);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="display text-4xl">Panel</h1>
          <p className="text-muted">
            {isGlobalAdmin(admin)
              ? "Crea torneos, asigna administradores y planilleros, y carga resultados."
              : isScorekeeper(admin)
                ? "Carga o corrige los marcadores de los torneos que te asignaron."
                : "Administra los torneos que te asignaron: calendario, equipos y resultados."}
          </p>
        </div>
        {isGlobalAdmin(admin) ? (
          <Link href="/admin/torneos/nuevo" className="btn btn-lime w-full sm:w-auto">
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
            <div className="min-w-0">
              <h2 className="display text-xl leading-tight sm:text-2xl">{tournament.name}</h2>
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
              : isScorekeeper(admin)
                ? "Aún no tienes torneos asignados. Pídele al admin que te asigne como planillero."
                : "Aún no tienes torneos asignados. Pídele al admin global que te asigne uno."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
