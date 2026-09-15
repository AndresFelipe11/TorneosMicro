import Link from "next/link";
import { requireCaptain } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatDateTime, phaseLabel, postponeWindowLabel, teamName } from "@/lib/format";
import { displayVenue } from "@/lib/tournament/match";
import { StatusBadge } from "@/components/MatchList";
import { PostponeForm } from "./PostponeForm";

export default async function CaptainHomePage() {
  const user = await requireCaptain();
  const team = await prisma.team.findUnique({
    where: { id: user.team!.id },
    include: {
      tournament: { select: { id: true, name: true, venue: true } },
      homeMatches: {
        include: { homeTeam: true, awayTeam: true, postponeRequests: true },
        orderBy: { scheduledAt: "asc" },
      },
      awayMatches: {
        include: { homeTeam: true, awayTeam: true, postponeRequests: true },
        orderBy: { scheduledAt: "asc" },
      },
    },
  });
  if (!team) return null;

  const matches = [...team.homeMatches, ...team.awayMatches].sort(
    (a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt),
  );
  const upcoming = matches.filter((match) => match.status === "SCHEDULED");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm font-bold uppercase tracking-widest text-muted">Capitán</p>
      <h1 className="display text-4xl">{team.name}</h1>
      <p className="mb-6 text-muted">
        {team.tournament.name}. Entras con el nombre del equipo y el WhatsApp del capitán.
      </p>
      <p className="mb-4">
        <Link href={`/torneos/${team.tournamentId}`} className="font-bold text-lime">
          Ver el torneo →
        </Link>
      </p>
      <section className="space-y-4">
        <h2 className="display text-2xl">Próximos partidos</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted">No tienes partidos pendientes.</p>
        ) : (
          upcoming.map((match) => {
            const mine = match.postponeRequests.filter((item) => item.teamId === team.id);
            const pending = mine.find((item) => item.status === "PENDING");
            return (
              <article key={match.id} className="card space-y-2 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {teamName(match.homeTeam.name)} vs {teamName(match.awayTeam.name)}
                  </p>
                  <StatusBadge status={match.status} />
                </div>
                <p className="text-sm text-muted">
                  {formatDateTime(match.scheduledAt)} · {phaseLabel(match.phase)}
                  {displayVenue(match.venue, team.tournament.venue)
                    ? ` · ${displayVenue(match.venue, team.tournament.venue)}`
                    : ""}
                </p>
                <Link href={`/torneos/${team.tournamentId}/partidos/${match.id}`} className="text-sm font-bold text-lime">
                  Ver partido →
                </Link>
                {pending ? (
                  <p className="text-sm text-lime">
                    {`Petición enviada${
                      postponeWindowLabel(pending.proposedWindow)
                        ? ` · piden ${postponeWindowLabel(pending.proposedWindow)?.toLowerCase()}`
                        : pending.proposedAt
                          ? ` · propones ${formatDateTime(pending.proposedAt)}`
                          : ""
                    }. Esperando al administrador.`}
                  </p>
                ) : (
                  <PostponeForm
                    matchId={match.id}
                    homeTeam={teamName(match.homeTeam.name)}
                    awayTeam={teamName(match.awayTeam.name)}
                    currentScheduledAt={match.scheduledAt}
                  />
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
