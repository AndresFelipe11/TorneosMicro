import { notFound } from "next/navigation";
import { getTournament, scorersFor } from "@/lib/queries";
import { TournamentTabs } from "@/components/TournamentTabs";
import { ScorersTable } from "@/components/ScorersTable";

export default async function ScorersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="display text-4xl">{tournament.name}</h1>
      <p className="mb-4 text-muted">Tabla de goleadores del torneo.</p>
      <TournamentTabs id={id} />
      <ScorersTable rows={scorersFor(tournament)} />
    </div>
  );
}
