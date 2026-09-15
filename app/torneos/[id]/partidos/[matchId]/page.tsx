import { notFound } from "next/navigation";
import Link from "next/link";
import { getTournament, playerCardsFor } from "@/lib/queries";
import { cardLabel, formatDateTime, knockoutLabel, phaseLabel, playerLabel, scoreLabel } from "@/lib/format";
import { displayVenue } from "@/lib/tournament/match";
import { cardsForTeams } from "@/lib/tournament/discipline";
import { StatusBadge } from "@/components/MatchList";
import { ScoresheetEvidence } from "@/components/ScoresheetEvidence";
import { CardWarning } from "@/components/CardWarning";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const { id, matchId } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();
  const match = tournament.matches.find((item) => item.id === matchId);
  if (!match) notFound();

  const homeGoals = match.goals.filter((goal) => goal.teamId === match.homeTeamId);
  const awayGoals = match.goals.filter((goal) => goal.teamId === match.awayTeamId);
  const homeCards = match.cards.filter((card) => card.teamId === match.homeTeamId);
  const awayCards = match.cards.filter((card) => card.teamId === match.awayTeamId);
  const venue = displayVenue(match.venue, tournament.venue);
  const cardWarnings =
    match.status === "SCHEDULED"
      ? cardsForTeams(playerCardsFor(tournament), [match.homeTeamId, match.awayTeamId])
      : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/torneos/${id}/calendario`} className="text-sm font-bold text-lime">
        ← Calendario
      </Link>
      <p className="mt-4 text-sm uppercase tracking-wide text-muted">
        {formatDateTime(match.scheduledAt)} · {phaseLabel(match.phase)}
        {match.group ? ` · ${match.group.name}` : ""}
        {match.knockoutRound ? ` · ${knockoutLabel(match.knockoutRound)}` : ""}
        {venue ? ` · ${venue}` : ""}
      </p>
      <div className="card mt-3 p-6 text-center">
        <StatusBadge status={match.status} />
        <h1 className="display mt-4 text-4xl">
          {match.homeTeam.name}{" "}
          <span className="text-lime">
            {scoreLabel(match.homeScore, match.awayScore, {
              homePenalties: match.homePenalties,
              awayPenalties: match.awayPenalties,
              walkover: match.status === "WALKOVER",
            })}
          </span>{" "}
          {match.awayTeam.name}
        </h1>
        {match.status === "WALKOVER" ? (
          <p className="mt-2 text-sm text-muted">El partido se dio por ganado 3-0 (W.O.).</p>
        ) : null}
      </div>
      {match.status === "SCHEDULED" ? (
        <div className="mt-4">
          <CardWarning rows={cardWarnings} />
        </div>
      ) : null}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <GoalList title={match.homeTeam.name} goals={homeGoals} />
        <GoalList title={match.awayTeam.name} goals={awayGoals} />
      </div>
      {match.cards.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <CardList title={match.homeTeam.name} cards={homeCards} />
          <CardList title={match.awayTeam.name} cards={awayCards} />
        </div>
      ) : null}
      {match.scoresheet ? (
        <div className="mt-6">
          <ScoresheetEvidence
            matchId={match.id}
            fileName={match.scoresheet.fileName}
            uploadedAt={match.scoresheet.uploadedAt}
          />
        </div>
      ) : null}
    </div>
  );
}

function GoalList({
  title,
  goals,
}: {
  title: string;
  goals: { id: string; player: { name: string; number: number | null } }[];
}) {
  return (
    <section className="card p-4">
      <h2 className="display text-xl">{title}</h2>
      {goals.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Sin goles registrados.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {goals.map((goal) => (
            <li key={goal.id}>{playerLabel(goal.player.name, goal.player.number)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CardList({
  title,
  cards,
}: {
  title: string;
  cards: {
    id: string;
    type: "YELLOW" | "RED";
    paid: boolean;
    player: { name: string; number: number | null };
  }[];
}) {
  return (
    <section className="card p-4">
      <h2 className="display text-xl">Tarjetas · {title}</h2>
      {cards.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Sin tarjetas.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {cards.map((card) => (
            <li key={card.id}>
              {cardLabel(card.type)} · {playerLabel(card.player.name, card.player.number)}
              {card.type === "YELLOW" ? (card.paid ? " · Pagada" : " · Sin pagar") : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
