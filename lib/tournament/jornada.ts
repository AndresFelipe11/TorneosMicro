import { formatTime, teamName, weekdayLabel } from "@/lib/format";
import { fridayOfWeekBogota, mondayOfWeekBogota, toBogotaDateString, weekdayBogota } from "@/lib/tournament/dates";
import { displayVenue, isCreditGoalsMatch } from "@/lib/tournament/match";

export type JornadaPosterMatch = {
  home: string;
  away: string;
  when: string;
  time: string;
  dateKey: string;
  dayHeading: string;
  venue: string;
  group: string | null;
};

export type JornadaPoster = {
  tournamentName: string;
  venue: string;
  coverImage: string | null;
  weekKey: string;
  weekLabel: string;
  matches: JornadaPosterMatch[];
  filename: string;
};

export type JornadaPosterPack = {
  defaultWeekKey: string;
  posters: JornadaPoster[];
};

type JornadaMatchInput = {
  phase: string;
  round: number;
  scheduledAt: Date | string;
  venue?: string | null;
  knockoutRound?: string | null;
  status?: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  group?: { name: string } | null;
};

type JornadaTournamentInput = {
  name: string;
  venue?: string | null;
  coverImage?: string | null;
  matches: JornadaMatchInput[];
};

const LEAGUE_PHASES = new Set(["ROUND_ROBIN", "GROUP", "QUADRANGULAR"]);
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

function fileSafeName(name: string) {
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return cleaned || "torneo";
}

export function leagueJornadaMatches<
  T extends {
    phase: string;
    venue?: string | null;
    homeTeam?: { name?: string | null } | null;
    awayTeam?: { name?: string | null } | null;
  },
>(matches: T[]): T[] {
  return matches.filter(
    (match) => LEAGUE_PHASES.has(match.phase) && !isCreditGoalsMatch(match),
  );
}

export function jornadaRounds(matches: { phase: string; round: number }[]): number[] {
  const rounds = new Set(leagueJornadaMatches(matches).map((match) => match.round));
  return [...rounds].sort((a, b) => a - b);
}

export function jornadaMatches<T extends { phase: string; round: number; scheduledAt: Date | string }>(
  matches: T[],
  round: number,
): T[] {
  return leagueJornadaMatches(matches)
    .filter((match) => match.round === round)
    .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
}

export function defaultJornadaRound(matches: JornadaMatchInput[]): number | null {
  const rounds = jornadaRounds(matches);
  if (rounds.length === 0) return null;
  const upcoming = rounds.find((round) =>
    jornadaMatches(matches, round).some((match) => !match.status || match.status === "SCHEDULED"),
  );
  return upcoming ?? rounds[0];
}

function weekKeyOf(value: Date | string) {
  return mondayOfWeekBogota(toBogotaDateString(new Date(value)));
}

function formatWeekLabel(monday: string) {
  const friday = fridayOfWeekBogota(monday);
  const [, startMonth, startDay] = monday.split("-");
  const [, endMonth, endDay] = friday.split("-");
  return `${Number(startDay)} ${MONTHS_SHORT[Number(startMonth) - 1]} – ${Number(endDay)} ${MONTHS_SHORT[Number(endMonth) - 1]}`;
}

function formatDayHeading(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  return `${weekdayLabel(weekdayBogota(isoDate))} ${Number(day)} ${MONTHS_SHORT[Number(month) - 1]}`.toLocaleUpperCase("es-CO");
}

export function weekKeys(matches: { scheduledAt: Date | string }[]): string[] {
  return [...new Set(matches.map((match) => weekKeyOf(match.scheduledAt)))].sort();
}

export function weekMatches<T extends { scheduledAt: Date | string }>(matches: T[], monday: string): T[] {
  return matches
    .filter((match) => weekKeyOf(match.scheduledAt) === monday)
    .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
}

export function defaultWeekKey(matches: JornadaMatchInput[]): string | null {
  const weeks = weekKeys(matches);
  if (weeks.length === 0) return null;
  const todayWeek = mondayOfWeekBogota(toBogotaDateString(new Date()));
  if (weeks.includes(todayWeek)) return todayWeek;
  const upcoming = weeks.find((week) =>
    weekMatches(matches, week).some((match) => !match.status || match.status === "SCHEDULED"),
  );
  return upcoming ?? weeks[0];
}

export function buildJornadaPoster(tournament: JornadaTournamentInput, monday: string): JornadaPoster | null {
  const matches = weekMatches(tournament.matches, monday);
  if (matches.length === 0) return null;
  const venue = displayVenue(null, tournament.venue);
  const weekLabel = formatWeekLabel(monday);
  return {
    tournamentName: tournament.name.trim(),
    venue,
    coverImage: tournament.coverImage?.trim() || null,
    weekKey: monday,
    weekLabel,
    filename: `semana-${monday}-${fileSafeName(tournament.name)}.png`,
    matches: matches.map((match) => {
      const dateKey = toBogotaDateString(new Date(match.scheduledAt));
      const time = formatTime(match.scheduledAt);
      const dayHeading = formatDayHeading(dateKey);
      return {
        home: teamName(match.homeTeam.name),
        away: teamName(match.awayTeam.name),
        when: `${dayHeading} · ${time}`,
        time,
        dateKey,
        dayHeading,
        venue: displayVenue(match.venue, tournament.venue),
        group: match.group?.name ?? null,
      };
    }),
  };
}

export function buildJornadaPosters(tournament: JornadaTournamentInput): JornadaPosterPack | null {
  const posters = weekKeys(tournament.matches)
    .map((monday) => buildJornadaPoster(tournament, monday))
    .filter((poster): poster is JornadaPoster => poster != null);
  const defaultKey = defaultWeekKey(tournament.matches);
  if (posters.length === 0 || defaultKey == null) return null;
  return { defaultWeekKey: defaultKey, posters };
}
