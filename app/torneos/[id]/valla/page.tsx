import { notFound } from "next/navigation";
import { defenseFor, getTournament } from "@/lib/queries";
import { TournamentTabs } from "@/components/TournamentTabs";
import { DefenseTable } from "@/components/DefenseTable";

export default async function DefensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="display text-4xl">{tournament.name}</h1>
      <p className="mb-4 text-muted">
        Valla menos vencida: menos goles en contra. Desempate por vallas invictas (VI) y partidos jugados.
      </p>
      <TournamentTabs id={id} />
      <DefenseTable rows={defenseFor(tournament)} />
    </div>
  );
}
