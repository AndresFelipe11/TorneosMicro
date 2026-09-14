import { notFound } from "next/navigation";
import { getTournament } from "@/lib/queries";
import { TournamentTabs } from "@/components/TournamentTabs";
import { MatchList } from "@/components/MatchList";

export default async function CalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="display text-4xl">{tournament.name}</h1>
      <p className="mb-4 text-muted">Calendario generado según las fechas y los días de juego.</p>
      <TournamentTabs id={id} />
      <MatchList matches={tournament.matches} hrefFor={(matchId) => `/torneos/${id}/partidos/${matchId}`} tournamentVenue={tournament.venue} />
    </div>
  );
}
