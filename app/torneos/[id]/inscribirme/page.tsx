import Link from "next/link";
import { notFound } from "next/navigation";
import { getTournament } from "@/lib/queries";
import { TournamentTabs } from "@/components/TournamentTabs";
import { TournamentInfo } from "@/components/TournamentInfo";
import { RegisterTeamForm } from "./RegisterTeamForm";

export default async function RegisterTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="display text-4xl">{tournament.name}</h1>
      <p className="mb-4 text-muted">Inscribe tu equipo.</p>
      <TournamentTabs id={id} registrationOpen={tournament.registrationOpen} />
      <TournamentInfo
        description={tournament.description}
        registrationFee={tournament.registrationFee}
        prizes={tournament.prizes}
      />
      {tournament.registrationOpen && tournament.status !== "FINISHED" ? (
        <RegisterTeamForm
          tournamentId={tournament.id}
          tournamentName={tournament.name}
          groups={tournament.format === "GROUPS" ? tournament.groups : []}
        />
      ) : (
        <div className="card space-y-3 p-5">
          <p className="font-semibold">Este torneo no está recibiendo equipos por ahora.</p>
          <Link href={`/torneos/${id}`} className="font-bold text-lime">
            Volver al torneo →
          </Link>
        </div>
      )}
    </div>
  );
}
