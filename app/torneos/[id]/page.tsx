import { notFound } from "next/navigation";
import { defenseFor, getTournament, scorersFor, standingsFor } from "@/lib/queries";
import { formatDate, formatLabel, nextPhaseLabel, playingDaysLabel } from "@/lib/format";
import { TournamentTabs } from "@/components/TournamentTabs";
import { StatusBadge, MatchList } from "@/components/MatchList";
import { StandingsTable } from "@/components/StandingsTable";
import { ScorersTable } from "@/components/ScorersTable";
import { DefenseTable } from "@/components/DefenseTable";
import { ExportExcelButton } from "@/components/ExportExcelButton";

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  const standings = standingsFor(tournament);
  const scorers = scorersFor(tournament).slice(0, 5);
  const defense = defenseFor(tournament).slice(0, 5);
  const upcoming = tournament.matches.filter((match) => match.status === "SCHEDULED").slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-muted">{formatLabel(tournament.format)}</p>
          <h1 className="display text-4xl">{tournament.name}</h1>
          <p className="text-muted">
            {formatDate(tournament.startDate)} — {formatDate(tournament.endDate)} · Juega{" "}
            {playingDaysLabel(tournament.playingDays)}
          </p>
          {tournament.format === "GROUPS" ? (
            <p className="text-sm text-muted">Después de grupos: {nextPhaseLabel(tournament.nextPhase)}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={tournament.status} />
          <ExportExcelButton tournamentId={id} />
        </div>
      </div>
      <TournamentTabs id={id} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="display mb-3 text-2xl">Próximos partidos</h2>
          <MatchList matches={upcoming} hrefFor={(matchId) => `/torneos/${id}/partidos/${matchId}`} />
        </div>
        <div className="space-y-6">
          <div>
            <h2 className="display mb-3 text-2xl">Posiciones</h2>
            <div className="space-y-4">
              {[...standings.entries()].map(([title, rows]) => (
                <StandingsTable key={title} title={title} rows={rows} />
              ))}
            </div>
          </div>
          <div>
            <h2 className="display mb-3 text-2xl">Goleadores</h2>
            <ScorersTable rows={scorers} />
          </div>
          <div>
            <h2 className="display mb-3 text-2xl">Valla menos vencida</h2>
            <DefenseTable rows={defense} />
          </div>
        </div>
      </div>
    </div>
  );
}
