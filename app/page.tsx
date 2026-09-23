import Link from "next/link";
import { getTournaments } from "@/lib/queries";
import { formatDate, formatLabel, statusLabel } from "@/lib/format";
import { TournamentCover } from "@/components/TournamentCover";
import { StatusBadge } from "@/components/MatchList";

export default async function HomePage() {
  const tournaments = await getTournaments();

  return (
    <div>
      <section className="pitch-bg text-cream">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
          <p className="text-lime font-bold tracking-[0.2em] uppercase text-xs">Microfútbol</p>
          <h1 className="display mt-3 max-w-3xl text-4xl leading-none sm:text-7xl">
            Programa el torneo. Juega las fechas. Mira la tabla.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-cream/80">
            Crea un todos contra todos, fases de grupos o un cuadrangular. El calendario sale
            solo según las fechas y los días de juego.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2 className="display text-3xl">Torneos</h2>
          <Link href="/admin/torneos/nuevo" className="btn btn-dark shrink-0">
            Crear torneo
          </Link>
        </div>
        {tournaments.length === 0 ? (
          <div className="card p-8">
            <p className="text-muted">Aún no hay torneos. Entra como administrador para crear el primero.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {tournaments.map((tournament) => (
              <article key={tournament.id} className="card overflow-hidden">
                <Link
                  href={`/torneos/${tournament.id}`}
                  className="flex min-w-0 items-start gap-3 p-4 no-underline text-ink sm:gap-4 sm:p-5"
                >
                  <TournamentCover src={tournament.coverImage} alt={tournament.name} variant="card" />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:justify-between">
                      <h3 className="display min-w-0 text-xl leading-tight sm:text-2xl">{tournament.name}</h3>
                      <StatusBadge status={tournament.status} />
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {formatLabel(tournament.format)} · {tournament._count.teams} equipos ·{" "}
                      {tournament._count.matches} partidos
                    </p>
                    <p className="mt-1 text-sm">
                      {formatDate(tournament.startDate)} — {formatDate(tournament.endDate)}
                    </p>
                    {tournament.registrationFee?.trim() ? (
                      <p className="mt-2 text-sm">Inscripción: {tournament.registrationFee}</p>
                    ) : null}
                    <p className="mt-3 text-sm font-bold text-lime">{statusLabel(tournament.status)}</p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
