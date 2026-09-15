import { notFound } from "next/navigation";
import { getTournament } from "@/lib/queries";
import { requireTournamentManagePage } from "@/lib/authz";
import { syncCaptainsFromAcceptedRegistrations } from "@/lib/captain";
import { TournamentTabs } from "@/components/TournamentTabs";
import { RosterEditor } from "./RosterEditor";

export default async function EditTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTournamentManagePage(id);
  await syncCaptainsFromAcceptedRegistrations(id);
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
        venue={tournament.venue ?? ""}
        description={tournament.description ?? ""}
        registrationFee={tournament.registrationFee ?? ""}
        prizes={tournament.prizes ?? ""}
        rulesHighlights={tournament.rulesHighlights ?? ""}
        rules={tournament.rules ?? ""}
      />
    </div>
  );
}
