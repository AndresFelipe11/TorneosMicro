import { notFound } from "next/navigation";
import { getTournament } from "@/lib/queries";
import { TournamentTabs } from "@/components/TournamentTabs";
import { RosterEditor } from "./RosterEditor";

export default async function EditTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="display text-4xl">{tournament.name}</h1>
      <p className="mb-4 text-muted">
        Agrega o quita equipos y jugadores. Si entra un equipo nuevo, se le arman los partidos pendientes.
      </p>
      <TournamentTabs id={id} admin />
      <RosterEditor
        tournamentId={tournament.id}
        tournamentName={tournament.name}
        format={tournament.format}
        groups={tournament.groups}
        teams={tournament.teams}
      />
    </div>
  );
}
