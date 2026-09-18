import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchResultLogs, playerCardsFor, getTournament } from "@/lib/queries";
import { canManageTournament, requireTournamentPage } from "@/lib/authz";
import { ResultAuditLog } from "@/components/ResultAuditLog";
import { formatDateTime, knockoutLabel, phaseLabel } from "@/lib/format";
import { displayVenue } from "@/lib/tournament/match";
import { cardsForTeams } from "@/lib/tournament/discipline";
import { toBogotaDateTimeLocal } from "@/lib/tournament/dates";
import { ResultForm } from "./ResultForm";
import { RescheduleForm } from "./RescheduleForm";

export default async function AdminMatchPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const { id, matchId } = await params;
  const admin = await requireTournamentPage(id);
  const tournament = await getTournament(id);
  if (!tournament) notFound();
  const match = tournament.matches.find((item) => item.id === matchId);
  if (!match) notFound();
  const canSchedule = canManageTournament(admin, id);
  const resultLogs = await getMatchResultLogs(matchId);

  const homePlayers = tournament.teams.find((team) => team.id === match.homeTeamId)?.players ?? [];
  const awayPlayers = tournament.teams.find((team) => team.id === match.awayTeamId)?.players ?? [];
  const cardWarnings = cardsForTeams(playerCardsFor(tournament), [match.homeTeamId, match.awayTeamId]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-bold">
        <Link href={`/admin/torneos/${id}`} className="text-lime">
          ← Volver al torneo
        </Link>
        {canSchedule ? (
          <Link href={`/admin/torneos/${id}/calendario`} className="text-lime">
            Calendario
          </Link>
        ) : null}
      </div>
      <p className="mt-4 text-sm uppercase tracking-wide text-muted">
        {formatDateTime(match.scheduledAt)} · {phaseLabel(match.phase)}
        {match.knockoutRound ? ` · ${knockoutLabel(match.knockoutRound)}` : ` · Jornada ${match.round}`}
        {displayVenue(match.venue, tournament.venue) ? ` · ${displayVenue(match.venue, tournament.venue)}` : ""}
      </p>
      <h1 className="mb-5 text-sm font-bold uppercase tracking-wide text-muted">Cargar resultado</h1>
      <div className="space-y-6">
        <ResultForm
          key={`${match.status}-${match.homeScore}-${match.awayScore}-${match.cards.length}-${match.goals.length}`}
          matchId={match.id}
          knockout={match.phase === "KNOCKOUT"}
          canSchedule={canSchedule}
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          cardWarnings={cardWarnings}
          initial={{
            status: match.status,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            homePenalties: match.homePenalties,
            awayPenalties: match.awayPenalties,
            winnerId: match.winnerId,
            scheduledAt: match.scheduledAt,
            venue: displayVenue(match.venue, tournament.venue),
            goals: match.goals.map((goal) => ({
              playerId: goal.playerId,
              playerName: goal.player.name,
              teamId: goal.teamId,
            })),
            cards: match.cards.map((card) => ({
              playerId: card.playerId,
              playerName: card.player.name,
              teamId: card.teamId,
              type: card.type,
              paid: card.paid,
            })),
            scoresheet: match.scoresheet,
          }}
        />
        {canSchedule && match.status === "SCHEDULED" ? (
          <details className="card p-4 sm:p-5">
            <summary className="cursor-pointer text-sm font-bold">Reprogramar partido</summary>
            <div className="mt-4">
              <RescheduleForm
                matchId={match.id}
                homeTeam={match.homeTeam.name}
                awayTeam={match.awayTeam.name}
                currentScheduledAt={match.scheduledAt}
                initialLocal={toBogotaDateTimeLocal(match.scheduledAt)}
                venue={displayVenue(match.venue, tournament.venue)}
                minDaysBetweenMatches={tournament.minDaysBetweenMatches}
                otherMatches={tournament.matches
                  .filter((item) => item.id !== match.id)
                  .map((item) => ({
                    homeTeamName: item.homeTeam.name,
                    awayTeamName: item.awayTeam.name,
                    scheduledAt: item.scheduledAt,
                  }))}
              />
            </div>
          </details>
        ) : null}
        <ResultAuditLog logs={resultLogs} />
      </div>
    </div>
  );
}
