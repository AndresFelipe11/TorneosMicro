import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTeamRegistrations, getTournament, getTournamentResultLogs } from "@/lib/queries";
import { canManageTournament, isGlobalAdmin, isScorekeeper, requireTournamentPage } from "@/lib/authz";
import { resolveTournamentWhatsApp } from "@/lib/actions/registration";
import { RegistrationPanel } from "@/components/RegistrationPanel";
import { ResultAuditLog } from "@/components/ResultAuditLog";
import { formatDate, formatLabel, nextPhaseLabel } from "@/lib/format";
import { TournamentTabs } from "@/components/TournamentTabs";
import { MatchList, StatusBadge } from "@/components/MatchList";
import { AdvanceButton, DeleteTournamentButton, FinishButton } from "@/components/AdminActions";
import { TournamentAdminsPanel } from "./TournamentAdminsPanel";
import { TournamentScorekeepersPanel } from "./TournamentScorekeepersPanel";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { TournamentInfo } from "@/components/TournamentInfo";
import { TournamentInfoEditor } from "@/components/TournamentInfoEditor";

export default async function AdminTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireTournamentPage(id);
  const tournament = await getTournament(id);
  if (!tournament) notFound();
  const manage = canManageTournament(admin, id);
  const [registrations, contactWhatsApp, resultLogs, adminCandidates, assignedAdminIds, scorekeeperCandidates, assignedScorekeeperIds] =
    await Promise.all([
      manage ? getTeamRegistrations(id) : Promise.resolve([]),
      manage ? resolveTournamentWhatsApp(id) : Promise.resolve(null),
      getTournamentResultLogs(id),
      isGlobalAdmin(admin)
        ? prisma.user.findMany({
            where: { role: "TOURNAMENT_ADMIN" },
            orderBy: { name: "asc" },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
      isGlobalAdmin(admin)
        ? prisma.tournamentAdmin
            .findMany({ where: { tournamentId: id }, select: { userId: true } })
            .then((rows) => rows.map((item) => item.userId))
        : Promise.resolve([]),
      manage
        ? prisma.user.findMany({
            where: { role: "SCOREKEEPER" },
            orderBy: { name: "asc" },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
      manage
        ? prisma.tournamentScorekeeper
            .findMany({ where: { tournamentId: id }, select: { userId: true } })
            .then((rows) => rows.map((item) => item.userId))
        : Promise.resolve([]),
    ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="display text-4xl">{tournament.name}</h1>
          <p className="text-muted">
            {formatLabel(tournament.format)} · {formatDate(tournament.startDate)} — {formatDate(tournament.endDate)}
            {tournament.venue ? ` · ${tournament.venue}` : ""}
          </p>
          {tournament.format === "GROUPS" ? (
            <p className="text-sm text-muted">Siguiente fase: {nextPhaseLabel(tournament.nextPhase)}</p>
          ) : null}
        </div>
        <StatusBadge status={tournament.status} />
      </div>
      <TournamentTabs id={id} admin scorekeeper={isScorekeeper(admin)} />
      {manage ? (
        <TournamentInfoEditor
          tournamentId={id}
          name={tournament.name}
          description={tournament.description ?? ""}
          registrationFee={tournament.registrationFee ?? ""}
          prizes={tournament.prizes ?? ""}
        />
      ) : (
        <TournamentInfo
          description={tournament.description}
          registrationFee={tournament.registrationFee}
          prizes={tournament.prizes}
        />
      )}
      {manage ? (
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
      ) : null}
      {manage ? (
        <div className="mb-6 flex flex-wrap gap-3">
          <Link href={`/admin/torneos/${id}/calendario`} className="btn btn-lime">
            Editar calendario
          </Link>
          <Link href="#info" className="btn btn-dark">
            Editar nombre y descripción
          </Link>
          <Link href={`/admin/torneos/${id}/editar`} className="btn btn-dark">
            Editar equipos
          </Link>
          <ExportExcelButton tournamentId={id} />
          {tournament.format === "GROUPS" && tournament.nextPhase !== "NONE" ? (
            <AdvanceButton tournamentId={id} />
          ) : null}
          <FinishButton tournamentId={id} />
          {isGlobalAdmin(admin) ? <DeleteTournamentButton tournamentId={id} /> : null}
        </div>
      ) : null}
      <p className="mb-3 text-sm text-muted">
        {isScorekeeper(admin)
          ? "Entra a un partido para cargar o corregir el marcador."
          : "Entra a un partido para cargar el marcador o reprogramarlo si un equipo no puede."}
      </p>
      <MatchList
        matches={tournament.matches}
        hrefFor={(matchId) => `/admin/torneos/${id}/partidos/${matchId}`}
        tournamentVenue={tournament.venue}
      />
      <div className="mt-8">
        <ResultAuditLog logs={resultLogs} showMatch />
      </div>
      {manage ? (
        <div className="mt-8">
          <TournamentScorekeepersPanel
            key={assignedScorekeeperIds.join("-")}
            tournamentId={id}
            assignedIds={assignedScorekeeperIds}
            candidates={scorekeeperCandidates}
          />
        </div>
      ) : null}
      {isGlobalAdmin(admin) ? (
        <div className="mt-8">
          <TournamentAdminsPanel
            key={assignedAdminIds.join("-")}
            tournamentId={id}
            assignedIds={assignedAdminIds}
            candidates={adminCandidates}
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
