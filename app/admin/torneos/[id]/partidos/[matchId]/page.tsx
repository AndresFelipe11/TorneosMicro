import Link from "next/link";
import { notFound } from "next/navigation";
import { playerCardsFor, getTournament } from "@/lib/queries";
import { requireTournamentPage } from "@/lib/authz";
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
  await requireTournamentPage(id);
  const tournament = await getTournament(id);
  if (!tournament) notFound();
  const match = tournament.matches.find((item) => item.id === matchId);
  if (!match) notFound();

  const homePlayers = tournament.teams.find((team) => team.id === match.homeTeamId)?.players ?? [];
  const awayPlayers = tournament.teams.find((team) => team.id === match.awayTeamId)?.players ?? [];
  const cardWarnings = cardsForTeams(playerCardsFor(tournament), [match.homeTeamId, match.awayTeamId]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/admin/torneos/${id}`} className="text-sm font-bold text-lime">
        ← Volver al torneo
      </Link>
      {" · "}
      <Link href={`/admin/torneos/${id}/calendario`} className="text-sm font-bold text-lime">
        Calendario
      </Link>
      <p className="mt-4 text-sm uppercase tracking-wide text-muted">
        {formatDateTime(match.scheduledAt)} · {phaseLabel(match.phase)}
        {match.knockoutRound ? ` · ${knockoutLabel(match.knockoutRound)}` : ` · Jornada ${match.round}`}
        {displayVenue(match.venue, tournament.venue) ? ` · ${displayVenue(match.venue, tournament.venue)}` : ""}
      </p>
      <h1 className="display mb-5 text-4xl">
        {match.homeTeam.name} vs {match.awayTeam.name}
      </h1>
      <div className="space-y-6">
        {match.status === "SCHEDULED" ? (
          <RescheduleForm
            matchId={match.id}
            homeTeam={match.homeTeam.name}
            awayTeam={match.awayTeam.name}
            currentScheduledAt={match.scheduledAt}
            initialLocal={toBogotaDateTimeLocal(match.scheduledAt)}
            venue={displayVenue(match.venue, tournament.venue)}
          />
        ) : null}
        <ResultForm
          key={`${match.status}-${match.homeScore}-${match.awayScore}-${match.cards.length}-${match.goals.length}`}
          matchId={match.id}
          knockout={match.phase === "KNOCKOUT"}
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
              minute: goal.minute,
            })),
            cards: match.cards.map((card) => ({
              playerId: card.playerId,
              playerName: card.player.name,
              teamId: card.teamId,
              type: card.type,
              minute: card.minute,
              paid: card.paid,
            })),
            scoresheet: match.scoresheet,
          }}
        />
      </div>
    </div>
  );
}
