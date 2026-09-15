import Link from "next/link";
import { notFound } from "next/navigation";
import { defenseFor, getTournament, scorersFor, standingsFor } from "@/lib/queries";
import { formatDate, formatLabel, nextPhaseLabel, playingDaysLabel } from "@/lib/format";
import { tournamentFilter } from "@/lib/search";
import { TournamentTabs } from "@/components/TournamentTabs";
import { StatusBadge, MatchList } from "@/components/MatchList";
import { StandingsTable } from "@/components/StandingsTable";
import { ScorersTable } from "@/components/ScorersTable";
import { DefenseTable } from "@/components/DefenseTable";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { TournamentInfo } from "@/components/TournamentInfo";
import { TournamentFilterNote } from "@/components/TournamentFilterNote";
import { TournamentHeading } from "@/components/TournamentCover";
import { canManageTournament, getAdminUser } from "@/lib/authz";

export default async function TournamentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q } = await searchParams;
  const [tournament, admin] = await Promise.all([getTournament(id), getAdminUser()]);
  if (!tournament) notFound();
  const canEditInfo = Boolean(admin && canManageTournament(admin, id));

  const filter = tournamentFilter(tournament, q);
  const standings = standingsFor(tournament);
  const allScorers = scorersFor(tournament);
  const allDefense = defenseFor(tournament);
  const scorers = filter.found
    ? allScorers.filter(
        (row) => filter.teamIds.includes(row.teamId) || filter.playerIds.includes(row.playerId),
      )
    : allScorers.slice(0, 5);
  const defense = filter.found ? allDefense : allDefense.slice(0, 5);
  const upcoming = tournament.matches
    .filter((match) => match.status === "SCHEDULED")
    .filter(
      (match) =>
        !filter.found ||
        filter.teamIds.includes(match.homeTeamId) ||
        filter.teamIds.includes(match.awayTeamId),
    )
    .slice(0, filter.found ? 8 : 5);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <TournamentHeading
        src={tournament.coverImage}
        name={tournament.name}
        kicker={formatLabel(tournament.format)}
        details={
          <>
            <p>
              {formatDate(tournament.startDate)} — {formatDate(tournament.endDate)} · Juega{" "}
              {playingDaysLabel(tournament.playingDays)}
              {tournament.venue ? ` · ${tournament.venue}` : ""}
            </p>
            {tournament.format === "GROUPS" ? (
              <p className="text-sm">Después de grupos: {nextPhaseLabel(tournament.nextPhase)}</p>
            ) : null}
          </>
        }
        actions={
          <>
            <StatusBadge status={tournament.status} />
            <ExportExcelButton tournamentId={id} />
          </>
        }
        description={tournament.description}
      />
      <TournamentTabs id={id} registrationOpen={tournament.registrationOpen} query={filter.query} />
      <TournamentFilterNote query={filter.query} labels={filter.labels} found={filter.found} path={`/torneos/${id}`} />
      <TournamentInfo
        tournamentId={id}
        registrationFee={tournament.registrationFee}
        prizes={tournament.prizes}
        rulesHighlights={tournament.rulesHighlights}
        rules={tournament.rules}
        rulesHref={`/torneos/${id}/reglamento`}
        editHref={canEditInfo ? `/admin/torneos/${id}/datos` : undefined}
      />
      {tournament.registrationOpen && tournament.status !== "FINISHED" ? (
        <div className="card mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <p className="display text-xl">Inscripciones abiertas</p>
            <p className="text-sm text-muted">Puedes añadir tu equipo.</p>
          </div>
          <Link href={`/torneos/${id}/inscribirme`} className="btn btn-lime w-full sm:w-auto">
            Inscribirme
          </Link>
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="display mb-3 text-2xl">
            {filter.found ? "Próximos partidos del equipo" : "Próximos partidos"}
          </h2>
          {filter.found && upcoming.length === 0 ? (
            <p className="text-muted">Ese equipo no tiene partidos pendientes.</p>
          ) : (
            <MatchList
              matches={upcoming}
              hrefFor={(matchId) => `/torneos/${id}/partidos/${matchId}`}
              tournamentVenue={tournament.venue}
              highlightTeamIds={filter.teamIds}
            />
          )}
        </div>
        <div className="space-y-6">
          <div>
            <h2 className="display mb-3 text-2xl">Posiciones</h2>
            <div className="space-y-4">
              {[...standings.entries()].map(([title, rows]) => (
                <StandingsTable
                  key={title}
                  title={title}
                  rows={rows}
                  highlightTeamIds={filter.teamIds}
                  tournamentId={id}
                />
              ))}
            </div>
          </div>
          <div>
            <h2 className="display mb-3 text-2xl">Goleadores</h2>
            <ScorersTable
              rows={scorers}
              highlightTeamIds={filter.teamIds}
              highlightPlayerIds={filter.playerIds}
            />
          </div>
          <div>
            <h2 className="display mb-3 text-2xl">Valla menos vencida</h2>
            <DefenseTable rows={defense} highlightTeamIds={filter.teamIds} tournamentId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}
