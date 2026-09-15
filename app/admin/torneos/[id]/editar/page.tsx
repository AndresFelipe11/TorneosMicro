import { notFound } from "next/navigation";
import { getTeamRegistrations, getTournament } from "@/lib/queries";
import { requireTournamentManagePage } from "@/lib/authz";
import { resolveTournamentWhatsApp } from "@/lib/actions/registration";
import { TournamentTabs } from "@/components/TournamentTabs";
import { RegistrationPanel } from "@/components/RegistrationPanel";
import { RosterEditor } from "./RosterEditor";

export default async function EditTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireTournamentManagePage(id);
  const tournament = await getTournament(id);
  if (!tournament) notFound();
  const [registrations, contactWhatsApp] = await Promise.all([
    getTeamRegistrations(id),
    resolveTournamentWhatsApp(id),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="display text-4xl">{tournament.name}</h1>
      <p className="mb-4 text-muted">
        Agrega o quita equipos y jugadores. Si entra un equipo nuevo, se le arman los partidos pendientes.
      </p>
      <TournamentTabs id={id} admin />
      <div className="mb-6">
        <RegistrationPanel
          tournamentId={id}
          registrationOpen={tournament.registrationOpen}
          finished={tournament.status === "FINISHED"}
          whatsapp={admin.whatsapp ?? ""}
          hasContactWhatsApp={Boolean(contactWhatsApp)}
          groups={tournament.format === "GROUPS" ? tournament.groups : []}
          registrations={registrations}
        />
      </div>
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
      />
    </div>
  );
}
