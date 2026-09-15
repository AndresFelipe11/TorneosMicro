import Link from "next/link";
import { MatchPhase, MatchStatus } from "@prisma/client";
import { formatDateTime, knockoutLabel, phaseLabel, scoreLabel } from "@/lib/format";
import { displayVenue } from "@/lib/tournament/match";

export function StatusBadge({
  status,
}: {
  status: "DRAFT" | "SCHEDULED" | "IN_PROGRESS" | "FINISHED" | MatchStatus;
}) {
  const map: Record<string, string> = {
    DRAFT: "Borrador",
    SCHEDULED: "Programado",
    IN_PROGRESS: "En juego",
    FINISHED: "Finalizado",
    PLAYED: "Jugado",
    WALKOVER: "W.O.",
  };
  const tone: Record<string, string> = {
    DRAFT: "bg-stone-200 text-stone-700",
    SCHEDULED: "bg-lime/20 text-lime",
    IN_PROGRESS: "bg-orange-400/20 text-orange-200",
    FINISHED: "bg-sky-400/20 text-sky-200",
    PLAYED: "bg-sky-400/20 text-sky-200",
    WALKOVER: "bg-orange-400/20 text-orange-200",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone[status] ?? "bg-stone-200"}`}>
      {map[status] ?? status}
    </span>
  );
}

type MatchItem = {
  id: string;
  scheduledAt: Date;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties?: number | null;
  awayPenalties?: number | null;
  status: MatchStatus;
  phase: MatchPhase;
  round: number;
  knockoutRound?: "R16" | "QF" | "SF" | "F" | null;
  venue?: string | null;
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  group?: { name: string } | null;
  scoresheet?: { uploadedAt: Date | string } | null;
};

export function MatchList({
  matches,
  hrefFor,
  tournamentVenue,
  highlightTeamIds = [],
}: {
  matches: MatchItem[];
  hrefFor: (id: string) => string;
  tournamentVenue?: string | null;
  highlightTeamIds?: string[];
}) {
  if (matches.length === 0) {
    return <p className="text-muted">Aún no hay partidos programados.</p>;
  }

  return (
    <div className="grid gap-3">
      {matches.map((match) => {
        const highlighted =
          highlightTeamIds.length > 0 &&
          Boolean(
            (match.homeTeamId && highlightTeamIds.includes(match.homeTeamId)) ||
              (match.awayTeamId && highlightTeamIds.includes(match.awayTeamId)),
          );
        return (
        <Link
          key={match.id}
          href={hrefFor(match.id)}
          className={`card flex flex-col gap-2 p-4 text-ink no-underline sm:flex-row sm:items-center sm:justify-between ${
            highlighted ? "bg-lime/20 ring-2 ring-lime" : ""
          }`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {formatDateTime(match.scheduledAt)} · {phaseLabel(match.phase)}
              {match.group ? ` · ${match.group.name}` : ""}
              {match.knockoutRound ? ` · ${knockoutLabel(match.knockoutRound)}` : ` · Jornada ${match.round}`}
              {match.venue || tournamentVenue ? ` · ${displayVenue(match.venue, tournamentVenue)}` : ""}
            </p>
            <p className="display mt-1 text-2xl">
              {match.homeTeam.name}{" "}
              <span className="text-lime">
                {scoreLabel(match.homeScore, match.awayScore, {
                  homePenalties: match.homePenalties,
                  awayPenalties: match.awayPenalties,
                  walkover: match.status === "WALKOVER",
                })}
              </span>{" "}
              {match.awayTeam.name}
            </p>
            {match.scoresheet ? (
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-lime">Planilla adjunta</p>
            ) : null}
          </div>
          <StatusBadge status={match.status} />
        </Link>
        );
      })}
    </div>
  );
}
