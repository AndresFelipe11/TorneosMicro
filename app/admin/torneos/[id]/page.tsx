import { notFound } from "next/navigation";
import Link from "next/link";
import { getTournament } from "@/lib/queries";
import { formatDate, formatLabel, nextPhaseLabel } from "@/lib/format";
import { TournamentTabs } from "@/components/TournamentTabs";
import { MatchList, StatusBadge } from "@/components/MatchList";
import { AdvanceButton, DeleteTournamentButton, FinishButton } from "@/components/AdminActions";

export default async function AdminTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="display text-4xl">{tournament.name}</h1>
          <p className="text-muted">
            {formatLabel(tournament.format)} · {formatDate(tournament.startDate)} — {formatDate(tournament.endDate)}
          </p>
          {tournament.format === "GROUPS" ? (
            <p className="text-sm text-muted">Siguiente fase: {nextPhaseLabel(tournament.nextPhase)}</p>
          ) : null}
        </div>
        <StatusBadge status={tournament.status} />
      </div>
      <TournamentTabs id={id} admin />
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href={`/admin/torneos/${id}/editar`} className="btn btn-lime">
          Editar equipos
        </Link>
        {tournament.format === "GROUPS" && tournament.nextPhase !== "NONE" ? (
          <AdvanceButton tournamentId={id} />
        ) : null}
        <FinishButton tournamentId={id} />
        <DeleteTournamentButton tournamentId={id} />
      </div>
      <p className="mb-3 text-sm text-muted">Entra a un partido para cargar el marcador y los goleadores.</p>
      <MatchList
        matches={tournament.matches}
        hrefFor={(matchId) => `/admin/torneos/${id}/partidos/${matchId}`}
      />
      <p className="mt-6">
        <Link href={`/torneos/${id}`} className="font-bold text-lime">
          Ver como visitante →
        </Link>
      </p>
    </div>
  );
}
