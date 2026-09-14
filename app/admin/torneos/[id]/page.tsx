import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTournament } from "@/lib/queries";
import { isGlobalAdmin, requireTournamentPage } from "@/lib/authz";
import { formatDate, formatLabel, nextPhaseLabel } from "@/lib/format";
import { TournamentTabs } from "@/components/TournamentTabs";
import { MatchList, StatusBadge } from "@/components/MatchList";
import { AdvanceButton, DeleteTournamentButton, FinishButton } from "@/components/AdminActions";
import { TournamentAdminsPanel } from "./TournamentAdminsPanel";

export default async function AdminTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireTournamentPage(id);
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  const candidates = isGlobalAdmin(admin)
    ? await prisma.user.findMany({
        where: { role: "TOURNAMENT_ADMIN" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true },
      })
    : [];
  const assignedIds = isGlobalAdmin(admin)
    ? (
        await prisma.tournamentAdmin.findMany({
          where: { tournamentId: id },
          select: { userId: true },
        })
      ).map((item) => item.userId)
    : [];

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
        <Link href={`/admin/torneos/${id}/calendario`} className="btn btn-lime">
          Editar calendario
        </Link>
        <Link href={`/admin/torneos/${id}/editar`} className="btn btn-dark">
          Editar equipos
        </Link>
        {tournament.format === "GROUPS" && tournament.nextPhase !== "NONE" ? (
          <AdvanceButton tournamentId={id} />
        ) : null}
        <FinishButton tournamentId={id} />
        {isGlobalAdmin(admin) ? <DeleteTournamentButton tournamentId={id} /> : null}
      </div>
      <p className="mb-3 text-sm text-muted">
        Entra a un partido para cargar el marcador o reprogramarlo si un equipo no puede.
      </p>
      <MatchList
        matches={tournament.matches}
        hrefFor={(matchId) => `/admin/torneos/${id}/partidos/${matchId}`}
      />
      {isGlobalAdmin(admin) ? (
        <div className="mt-8">
          <TournamentAdminsPanel
            key={assignedIds.join("-")}
            tournamentId={id}
            assignedIds={assignedIds}
            candidates={candidates}
          />
        </div>
      ) : null}
      <p className="mt-6">
        <Link href={`/torneos/${id}`} className="font-bold text-lime">
          Ver como visitante →
        </Link>
      </p>
    </div>
  );
}
