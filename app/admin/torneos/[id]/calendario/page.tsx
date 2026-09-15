import { notFound } from "next/navigation";
import { getTournament } from "@/lib/queries";
import { requireTournamentManagePage } from "@/lib/authz";
import { toBogotaDateString } from "@/lib/tournament/dates";
import { hasTournamentStarted, isClosedMatch } from "@/lib/tournament/match";
import { TournamentTabs } from "@/components/TournamentTabs";
import { MatchList } from "@/components/MatchList";
import { ScheduleEditor } from "./ScheduleEditor";

export default async function AdminCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTournamentManagePage(id);
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  const pending = tournament.matches.filter((match) => match.status === "SCHEDULED");
  const played = tournament.matches.filter((match) => isClosedMatch(match.status));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="display text-4xl">{tournament.name}</h1>
      <p className="mb-4 text-muted">
        Si el torneo no ha empezado, cambiar los días reprograma también esa misma semana. Si ya
        inició, los partidos se quedan y el cambio se hace partido por partido.
      </p>
      <TournamentTabs id={id} admin />
      <ScheduleEditor
        tournamentId={tournament.id}
        finished={tournament.status === "FINISHED"}
        started={hasTournamentStarted(tournament)}
        pendingCount={pending.length}
        playedCount={played.length}
        initial={{
          startDate: toBogotaDateString(tournament.startDate),
          endDate: toBogotaDateString(tournament.endDate),
          playingDays: tournament.playingDays,
          maxMatchesPerDay: tournament.maxMatchesPerDay,
          matchDurationMinutes: tournament.matchDurationMinutes,
          startTime: tournament.startTime,
          venue: tournament.venue ?? "",
        }}
        pending={pending.map((match) => ({
          id: match.id,
          homeTeamName: match.homeTeam.name,
          awayTeamName: match.awayTeam.name,
          phase: match.phase,
          round: match.round,
          groupName: match.group?.name,
          knockoutRound: match.knockoutRound ?? undefined,
        }))}
        occupied={played.map((match) => ({
          homeTeamName: match.homeTeam.name,
          awayTeamName: match.awayTeam.name,
          scheduledAt: match.scheduledAt.toISOString(),
        }))}
      />
      <h2 className="display mb-3 mt-8 text-2xl">Partidos</h2>
      <MatchList
        matches={tournament.matches}
        hrefFor={(matchId) => `/admin/torneos/${id}/partidos/${matchId}`}
        tournamentVenue={tournament.venue}
      />
    </div>
  );
}
