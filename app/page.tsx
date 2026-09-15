import Link from "next/link";
import { getTournaments } from "@/lib/queries";
import { formatDate, formatLabel, registrationIsOpen, statusLabel } from "@/lib/format";
import { TournamentCover } from "@/components/TournamentCover";
import { StatusBadge } from "@/components/MatchList";

export default async function HomePage() {
  const tournaments = await getTournaments();
  const openForTeams = tournaments.filter(registrationIsOpen);

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
          {openForTeams.length > 0 ? (
            <div className="mt-8 max-w-xl rounded-3xl border-2 border-lime bg-lime/15 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime">Inscripciones abiertas</p>
              <p className="display mt-1 text-2xl leading-tight sm:text-3xl">Inscribe tu equipo</p>
              <p className="mt-2 text-sm text-cream/85">
                Llena el formulario y el administrador te confirma por WhatsApp.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {openForTeams.map((tournament) => (
                  <Link
                    key={tournament.id}
                    href={`/torneos/${tournament.id}/inscribirme`}
                    className="btn btn-lime"
                  >
                    {openForTeams.length === 1
                      ? "Inscribir equipo"
                      : `Inscribirme en ${tournament.name}`}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
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
            {tournaments.map((tournament) => {
              const open = registrationIsOpen(tournament);
              return (
                <article
                  key={tournament.id}
                  className={`card overflow-hidden ${open ? "border-lime/50" : ""}`}
                >
                  {open ? (
                    <p className="bg-lime px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.18em] text-pitch">
                      Inscripciones abiertas
                    </p>
                  ) : null}
                  <Link
                    href={`/torneos/${tournament.id}`}
                    className="flex items-start gap-4 p-4 no-underline text-ink sm:p-5"
                  >
                    <TournamentCover src={tournament.coverImage} alt={tournament.name} variant="card" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
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
                  {open ? (
                    <div className="px-4 pb-4 sm:px-5">
                      <Link href={`/torneos/${tournament.id}/inscribirme`} className="btn btn-lime w-full">
                        Inscribir equipo
                      </Link>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
