import Link from "next/link";
import { notFound } from "next/navigation";
import { getTournament, scorersFor, standingsFor } from "@/lib/queries";
import { playerLabel } from "@/lib/format";
import { tournamentFilter, withSearchQuery } from "@/lib/search";
import { TournamentTabs } from "@/components/TournamentTabs";
import { MatchList } from "@/components/MatchList";
import { StandingsTable } from "@/components/StandingsTable";
import { ScorersTable } from "@/components/ScorersTable";
import { isClosedMatch } from "@/lib/tournament/match";

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; teamId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id, teamId } = await params;
  const { q } = await searchParams;
  const tournament = await getTournament(id);
  if (!tournament) notFound();
  const team = tournament.teams.find((item) => item.id === teamId);
  if (!team) notFound();

  const filter = tournamentFilter(tournament, q);
  const standings = standingsFor(tournament);
  const matches = tournament.matches.filter(
    (match) => match.homeTeamId === team.id || match.awayTeamId === team.id,
  );
  const upcoming = matches.filter((match) => match.status === "SCHEDULED");
  const played = matches.filter((match) => isClosedMatch(match.status));
  const scorers = scorersFor(tournament).filter((row) => row.teamId === team.id);
  const tableEntries = [...standings.entries()].filter(([, rows]) =>
    rows.some((row) => row.teamId === team.id),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-sm">
        <Link className="font-bold text-lime no-underline" href={withSearchQuery(`/torneos/${id}/equipos`, q)}>
          ← Equipos
        </Link>
      </p>
      <h1 className="display mt-2 text-4xl">{team.name}</h1>
      <p className="mb-4 text-muted">
        {team.group?.name ? `${team.group.name} · ` : ""}
        {tournament.name}
      </p>
      <TournamentTabs id={id} registrationOpen={tournament.registrationOpen} query={filter.query} />

      <section className="card mb-6 p-5">
        <h2 className="display text-2xl">Plantilla</h2>
        {team.players.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Todavía no hay jugadores cargados.</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {team.players.map((player) => (
              <li key={player.id}>{playerLabel(player.name, player.number)}</li>
            ))}
          </ul>
        )}
      </section>

      {tableEntries.map(([title, rows]) => (
        <div key={title} className="mb-6">
          <StandingsTable title={title} rows={rows} highlightTeamIds={[team.id]} tournamentId={id} />
        </div>
      ))}

      <div className="mb-6">
        <h2 className="display mb-3 text-2xl">Goleadores del equipo</h2>
        <ScorersTable rows={scorers} highlightTeamIds={[team.id]} />
      </div>

      <div className="mb-6">
        <h2 className="display mb-3 text-2xl">Próximos partidos</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted">No tiene partidos pendientes.</p>
        ) : (
          <MatchList
            matches={upcoming}
            hrefFor={(matchId) => `/torneos/${id}/partidos/${matchId}`}
            tournamentVenue={tournament.venue}
          />
        )}
      </div>

      {played.length > 0 ? (
        <div>
          <h2 className="display mb-3 text-2xl">Resultados</h2>
          <MatchList
            matches={played}
            hrefFor={(matchId) => `/torneos/${id}/partidos/${matchId}`}
            tournamentVenue={tournament.venue}
          />
        </div>
      ) : null}
    </div>
  );
}
