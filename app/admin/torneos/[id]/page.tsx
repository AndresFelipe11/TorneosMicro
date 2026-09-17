import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTournament, getTournamentResultLogs } from "@/lib/queries";
import { canManageTournament, isGlobalAdmin, isScorekeeper, requireTournamentPage } from "@/lib/authz";
import { ResultAuditLog } from "@/components/ResultAuditLog";
import { finalsPlanLabel, formatDate, formatLabel } from "@/lib/format";
import { TournamentTabs } from "@/components/TournamentTabs";
import { MatchList, StatusBadge } from "@/components/MatchList";
import { AdvanceButton, DeleteTournamentButton, FinishButton } from "@/components/AdminActions";
import { TournamentAdminsPanel } from "./TournamentAdminsPanel";
import { TournamentScorekeepersPanel } from "./TournamentScorekeepersPanel";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { ExportJornadaImageButton } from "@/components/ExportJornadaImageButton";
import { TournamentInfo } from "@/components/TournamentInfo";
import { buildJornadaPosters } from "@/lib/tournament/jornada";
import { TournamentHeading } from "@/components/TournamentCover";
import { PostponeRequestsPanel } from "@/components/PostponeRequestsPanel";
import { FinalsSettings } from "@/components/FinalsSettings";

export default async function AdminTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireTournamentPage(id);
  const tournament = await getTournament(id);
  if (!tournament) notFound();
  const manage = canManageTournament(admin, id);
  const [resultLogs, adminCandidates, assignedAdminIds, scorekeeperCandidates, assignedScorekeeperIds, postponeRequests] =
    await Promise.all([
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
      manage
        ? prisma.matchPostponeRequest.findMany({
            where: { status: "PENDING", match: { tournamentId: id } },
            orderBy: { createdAt: "asc" },
            include: {
              team: { select: { name: true } },
              match: {
                select: {
                  id: true,
                  scheduledAt: true,
                  venue: true,
                  homeTeam: { select: { name: true } },
                  awayTeam: { select: { name: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <TournamentHeading
        src={tournament.coverImage}
        name={tournament.name}
        details={
          <>
            <p>
              {formatLabel(tournament.format)} · {formatDate(tournament.startDate)} — {formatDate(tournament.endDate)}
              {tournament.venue ? ` · ${tournament.venue}` : ""}
            </p>
            {finalsPlanLabel(tournament.format, tournament.nextPhase, tournament.qualifyPerGroup) ? (
              <p className="text-sm">{finalsPlanLabel(tournament.format, tournament.nextPhase, tournament.qualifyPerGroup)}</p>
            ) : null}
          </>
        }
        actions={<StatusBadge status={tournament.status} />}
        description={manage ? undefined : tournament.description}
      />
      {manage ? (
        <div className="mb-6">
          <ExportJornadaImageButton pack={buildJornadaPosters(tournament)} />
        </div>
      ) : null}
      <TournamentTabs id={id} admin scorekeeper={isScorekeeper(admin)} />
      {manage ? null : (
        <TournamentInfo
          tournamentId={id}
          registrationFee={tournament.registrationFee}
          prizes={tournament.prizes}
          rulesHighlights={tournament.rulesHighlights}
          rules={tournament.rules}
          rulesHref={`/torneos/${id}/reglamento`}
        />
      )}
      {manage ? (
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href={`/admin/torneos/${id}/calendario`} className="btn btn-lime w-full sm:w-auto">
            Editar calendario
          </Link>
          <Link href={`/admin/torneos/${id}/datos`} className="btn btn-dark w-full sm:w-auto">
            Editar datos
          </Link>
          <Link href={`/admin/torneos/${id}/editar`} className="btn btn-dark w-full sm:w-auto">
            Editar equipos
          </Link>
          <ExportExcelButton tournamentId={id} />
          {(tournament.format === "GROUPS" || tournament.format === "ROUND_ROBIN") &&
          tournament.nextPhase !== "NONE" ? (
            <AdvanceButton tournamentId={id} />
          ) : null}
          <FinishButton tournamentId={id} />
          {isGlobalAdmin(admin) ? <DeleteTournamentButton tournamentId={id} /> : null}
        </div>
      ) : null}
      {manage && tournament.format === "ROUND_ROBIN" ? (
        <FinalsSettings
          tournamentId={id}
          nextPhase={tournament.nextPhase}
          qualifyCount={tournament.qualifyPerGroup}
          locked={tournament.matches.some((match) => match.phase === "KNOCKOUT" || match.phase === "QUADRANGULAR")}
        />
      ) : null}
      {manage ? (
        <PostponeRequestsPanel
          requests={postponeRequests.map((item) => ({
            id: item.id,
            reason: item.reason,
            proposedWindow: item.proposedWindow,
            proposedAt: item.proposedAt,
            createdAt: item.createdAt,
            teamName: item.team.name,
            homeTeam: item.match.homeTeam.name,
            awayTeam: item.match.awayTeam.name,
            currentScheduledAt: item.match.scheduledAt,
            matchId: item.match.id,
            venue: item.match.venue ?? tournament.venue ?? "",
          }))}
        />
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
