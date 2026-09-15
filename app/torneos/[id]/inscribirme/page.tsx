import Link from "next/link";
import { notFound } from "next/navigation";
import { getTournament } from "@/lib/queries";
import { TournamentTabs } from "@/components/TournamentTabs";
import { TournamentInfo } from "@/components/TournamentInfo";
import { TournamentHeading } from "@/components/TournamentCover";
import { RegisterTeamForm } from "./RegisterTeamForm";

export default async function RegisterTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <TournamentHeading
        src={tournament.coverImage}
        name={tournament.name}
        details={<p>Inscribe tu equipo.</p>}
        description={tournament.description}
      />
      <TournamentTabs id={id} registrationOpen={tournament.registrationOpen} />
      <TournamentInfo
        tournamentId={id}
        registrationFee={tournament.registrationFee}
        prizes={tournament.prizes}
        rulesHighlights={tournament.rulesHighlights}
        rules={tournament.rules}
        rulesHref={`/torneos/${id}/reglamento`}
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
