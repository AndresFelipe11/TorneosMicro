import { notFound } from "next/navigation";
import Link from "next/link";
import { getTournament } from "@/lib/queries";
import { formatDateTime, knockoutLabel, phaseLabel, scoreLabel } from "@/lib/format";
import { StatusBadge } from "@/components/MatchList";
import { ScoresheetEvidence } from "@/components/ScoresheetEvidence";

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/torneos/${id}/calendario`} className="text-sm font-bold text-lime">
        ← Calendario
      </Link>
      <p className="mt-4 text-sm uppercase tracking-wide text-muted">
        {formatDateTime(match.scheduledAt)} · {phaseLabel(match.phase)}
        {match.group ? ` · ${match.group.name}` : ""}
        {match.knockoutRound ? ` · ${knockoutLabel(match.knockoutRound)}` : ""}
      </p>
      <div className="card mt-3 p-6 text-center">
        <StatusBadge status={match.status} />
        <h1 className="display mt-4 text-4xl">
          {match.homeTeam.name}{" "}
          <span className="text-lime">{scoreLabel(match.homeScore, match.awayScore)}</span>{" "}
          {match.awayTeam.name}
        </h1>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <GoalList title={match.homeTeam.name} goals={homeGoals} />
        <GoalList title={match.awayTeam.name} goals={awayGoals} />
      </div>
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
  goals: { id: string; minute: number | null; player: { name: string } }[];
}) {
  return (
    <section className="card p-4">
      <h2 className="display text-xl">{title}</h2>
      {goals.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Sin goles registrados.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {goals.map((goal) => (
            <li key={goal.id}>
              {goal.player.name}
              {goal.minute != null ? ` · ${goal.minute}'` : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
