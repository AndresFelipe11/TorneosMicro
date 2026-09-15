import { notFound } from "next/navigation";
import { getTournament } from "@/lib/queries";
import { requireTournamentManagePage } from "@/lib/authz";
import { TournamentTabs } from "@/components/TournamentTabs";
import { TournamentInfoEditor } from "@/components/TournamentInfoEditor";
import { TournamentHeading } from "@/components/TournamentCover";

export default async function TournamentDataPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTournamentManagePage(id);
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <TournamentHeading
        src={tournament.coverImage}
        name={tournament.name}
        details={
          <p>
            Edita el nombre, la descripción, la inscripción, la premiación, las reglas importantes y el reglamento.
          </p>
        }
      />
      <TournamentTabs id={id} admin />
      <TournamentInfoEditor
        tournamentId={id}
        name={tournament.name}
        description={tournament.description ?? ""}
        registrationFee={tournament.registrationFee ?? ""}
        prizes={tournament.prizes ?? ""}
        rulesHighlights={tournament.rulesHighlights ?? ""}
        rules={tournament.rules ?? ""}
      />
    </div>
  );
}
