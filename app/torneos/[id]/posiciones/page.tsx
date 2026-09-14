import { notFound } from "next/navigation";
import { getTournament, standingsFor } from "@/lib/queries";
import { TournamentTabs } from "@/components/TournamentTabs";
import { StandingsTable } from "@/components/StandingsTable";

export default async function StandingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();
  const standings = standingsFor(tournament);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="display text-4xl">{tournament.name}</h1>
      <p className="mb-4 text-muted">3 puntos por victoria, 1 por empate. Desempate: diferencia, goles y enfrentamiento directo.</p>
      <TournamentTabs id={id} />
      <div className="space-y-5">
        {[...standings.entries()].map(([title, rows]) => (
          <StandingsTable key={title} title={title} rows={rows} />
        ))}
      </div>
    </div>
  );
}
