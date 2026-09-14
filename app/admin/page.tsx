import Link from "next/link";
import { getTournaments } from "@/lib/queries";
import { formatDate, formatLabel } from "@/lib/format";
import { StatusBadge } from "@/components/MatchList";

export default async function AdminHomePage() {
  const tournaments = await getTournaments();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="display text-4xl">Panel</h1>
          <p className="text-muted">Crea torneos, revisa el calendario y carga resultados.</p>
        </div>
        <Link href="/admin/torneos/nuevo" className="btn btn-lime">
          Nuevo torneo
        </Link>
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
        {tournaments.length === 0 ? <p className="text-muted">No hay torneos todavía.</p> : null}
      </div>
    </div>
  );
}
