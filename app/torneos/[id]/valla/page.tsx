import { notFound } from "next/navigation";
import { defenseFor, getTournament } from "@/lib/queries";
import { tournamentFilter } from "@/lib/search";
import { TournamentTabs } from "@/components/TournamentTabs";
import { DefenseTable } from "@/components/DefenseTable";
import { TournamentFilterNote } from "@/components/TournamentFilterNote";

export default async function DefensePage({
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
      <p className="mb-4 text-muted">
        Valla menos vencida: menos goles en contra. Desempate por partidos jugados.
      </p>
      <TournamentTabs id={id} registrationOpen={tournament.registrationOpen} query={filter.query} />
      <TournamentFilterNote query={filter.query} labels={filter.labels} found={filter.found} path={`/torneos/${id}/valla`} />
      <DefenseTable rows={defenseFor(tournament)} highlightTeamIds={filter.teamIds} />
    </div>
  );
}
