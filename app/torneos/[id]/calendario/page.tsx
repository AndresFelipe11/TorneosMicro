import { notFound } from "next/navigation";
import { getTournament } from "@/lib/queries";
import { tournamentFilter } from "@/lib/search";
import { TournamentTabs } from "@/components/TournamentTabs";
import { MatchList } from "@/components/MatchList";
import { TournamentFilterNote } from "@/components/TournamentFilterNote";

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q } = await searchParams;
  const tournament = await getTournament(id);
  if (!tournament) notFound();
  const filter = tournamentFilter(tournament, q);
  const matches = filter.found
    ? tournament.matches.filter(
        (match) =>
          filter.teamIds.includes(match.homeTeamId) || filter.teamIds.includes(match.awayTeamId),
      )
    : filter.active
      ? []
      : tournament.matches;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="display text-4xl">{tournament.name}</h1>
      <p className="mb-4 text-muted">Calendario generado según las fechas y los días de juego.</p>
      <TournamentTabs id={id} registrationOpen={tournament.registrationOpen && tournament.status !== "FINISHED"} query={filter.query} />
      <TournamentFilterNote query={filter.query} labels={filter.labels} found={filter.found} path={`/torneos/${id}/calendario`} />
      {filter.active && !filter.found ? null : filter.found && matches.length === 0 ? (
        <p className="text-muted">Ese equipo no tiene partidos en el calendario.</p>
      ) : (
        <MatchList
          matches={matches}
          hrefFor={(matchId) => `/torneos/${id}/partidos/${matchId}`}
          tournamentVenue={tournament.venue}
          highlightTeamIds={filter.teamIds}
        />
      )}
    </div>
  );
}
