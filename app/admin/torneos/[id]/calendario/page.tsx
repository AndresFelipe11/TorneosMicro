import { notFound } from "next/navigation";
import { getTournament } from "@/lib/queries";
import { requireTournamentManagePage } from "@/lib/authz";
import { toBogotaDateString } from "@/lib/tournament/dates";
import { isClosedMatch } from "@/lib/tournament/match";
import { TournamentTabs } from "@/components/TournamentTabs";
import { MatchList } from "@/components/MatchList";
import { ExportJornadaImageButton } from "@/components/ExportJornadaImageButton";
import { buildJornadaPosters } from "@/lib/tournament/jornada";
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
        Al aplicar el calendario se reconstruyen las jornadas (cada fecha con sus cruces) y se
        reprograman los partidos pendientes, dejando días de descanso entre partidos del mismo equipo.
        Los ya jugados no se tocan.
      </p>
      <TournamentTabs id={id} admin />
      <div className="mb-6">
        <ExportJornadaImageButton pack={buildJornadaPosters(tournament)} />
      </div>
      <ScheduleEditor
        tournamentId={tournament.id}
        finished={tournament.status === "FINISHED"}
        pendingCount={pending.length}
        playedCount={played.length}
        initial={{
          startDate: toBogotaDateString(tournament.startDate),
          endDate: toBogotaDateString(tournament.endDate),
          playingDays: tournament.playingDays,
          maxMatchesPerDay: tournament.maxMatchesPerDay,
          minDaysBetweenMatches: tournament.minDaysBetweenMatches,
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
