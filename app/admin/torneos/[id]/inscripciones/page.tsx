import { notFound } from "next/navigation";
import { getTeamRegistrations, getTournament } from "@/lib/queries";
import { requireTournamentManagePage } from "@/lib/authz";
import { resolveTournamentWhatsApp } from "@/lib/actions/registration";
import { syncCaptainsFromAcceptedRegistrations } from "@/lib/captain";
import { TournamentTabs } from "@/components/TournamentTabs";
import { RegistrationPanel } from "@/components/RegistrationPanel";

export default async function TournamentRegistrationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireTournamentManagePage(id);
  await syncCaptainsFromAcceptedRegistrations(id);
  const tournament = await getTournament(id);
  if (!tournament) notFound();
  const [registrations, contactWhatsApp] = await Promise.all([
    getTeamRegistrations(id),
    resolveTournamentWhatsApp(id),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="display text-4xl">{tournament.name}</h1>
      <p className="mb-4 text-muted">Abre las inscripciones, revisa solicitudes y habla con el capitán.</p>
      <TournamentTabs id={id} admin />
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
  );
}
