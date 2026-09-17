import { notFound } from "next/navigation";
import { getTournament } from "@/lib/queries";
import { tournamentFilter } from "@/lib/search";
import { TournamentTabs } from "@/components/TournamentTabs";
import { MatchList } from "@/components/MatchList";
import { TournamentFilterNote } from "@/components/TournamentFilterNote";
import { ExportJornadaImageButton } from "@/components/ExportJornadaImageButton";
import { buildJornadaPosters } from "@/lib/tournament/jornada";

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="display text-4xl">{tournament.name}</h1>
      <p className="mb-4 text-muted">Calendario generado según las fechas y los días de juego.</p>
      <TournamentTabs id={id} registrationOpen={tournament.registrationOpen && tournament.status !== "FINISHED"} registrationFee={tournament.registrationFee} query={filter.query} />
      <div className="mb-6">
        <ExportJornadaImageButton pack={buildJornadaPosters(tournament)} />
      </div>
      <TournamentFilterNote query={filter.query} labels={filter.labels} found={filter.found} path={`/torneos/${id}/calendario`} />
      <MatchList
        matches={tournament.matches}
        hrefFor={(matchId) => `/torneos/${id}/partidos/${matchId}`}
        tournamentVenue={tournament.venue}
        highlightTeamIds={filter.teamIds}
      />
    </div>
  );
}
