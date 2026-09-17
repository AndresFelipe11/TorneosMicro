import { notFound } from "next/navigation";
import { getTournament, standingsFor } from "@/lib/queries";
import { tournamentFilter } from "@/lib/search";
import { TournamentTabs } from "@/components/TournamentTabs";
import { StandingsTable } from "@/components/StandingsTable";
import { TournamentFilterNote } from "@/components/TournamentFilterNote";

export default async function StandingsPage({
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
  const standings = standingsFor(tournament);
  const filter = tournamentFilter(tournament, q);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="display text-4xl">{tournament.name}</h1>
      <p className="mb-4 text-muted">3 puntos por victoria, 1 por empate. Desempate: diferencia, goles y enfrentamiento directo.</p>
      <TournamentTabs id={id} registrationOpen={tournament.registrationOpen && tournament.status !== "FINISHED"} query={filter.query} />
      <TournamentFilterNote query={filter.query} labels={filter.labels} found={filter.found} path={`/torneos/${id}/posiciones`} />
      <div className="space-y-5">
        {[...standings.entries()].map(([title, rows]) => (
          <StandingsTable
            key={title}
            title={title}
            rows={rows}
            highlightTeamIds={filter.teamIds}
            tournamentId={id}
          />
        ))}
      </div>
    </div>
  );
}
