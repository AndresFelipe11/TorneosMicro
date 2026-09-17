import type { KnockoutRound, MatchPhase, NextPhase, TournamentFormat } from "@/lib/tournament/types";

type TournamentStatus = "DRAFT" | "SCHEDULED" | "IN_PROGRESS" | "FINISHED";

const formatLabels: Record<TournamentFormat, string> = {
  ROUND_ROBIN: "Todos contra todos",
  GROUPS: "Fases de grupos",
  QUADRANGULAR: "Cuadrangular",
};

const statusLabels: Record<TournamentStatus, string> = {
  DRAFT: "Borrador",
  SCHEDULED: "Programado",
  IN_PROGRESS: "En juego",
  FINISHED: "Finalizado",
};

const phaseLabels: Record<MatchPhase, string> = {
  GROUP: "Fase de grupos",
  ROUND_ROBIN: "Todos contra todos",
  QUADRANGULAR: "Cuadrangular",
  KNOCKOUT: "Eliminación",
};

const nextPhaseLabels: Record<NextPhase, string> = {
  NONE: "Sin fase extra",
  KNOCKOUT: "Eliminación directa",
  QUADRANGULAR: "Cuadrangular final",
};

const knockoutLabels: Record<KnockoutRound, string> = {
  R16: "Octavos",
  QF: "Cuartos",
  SF: "Semifinal",
  F: "Final",
};

const dayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const dayFullLabels = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export const WEEKDAYS = dayFullLabels.map((label, value) => ({ value, label }));

export function formatLabel(format: TournamentFormat) {
  return formatLabels[format];
}

export function statusLabel(status: TournamentStatus) {
  return statusLabels[status];
}

export function phaseLabel(phase: MatchPhase) {
  return phaseLabels[phase];
}

export function nextPhaseLabel(phase: NextPhase) {
  return nextPhaseLabels[phase];
}

export function finalsPlanLabel(format: TournamentFormat, nextPhase: NextPhase, qualifyCount: number) {
  if (nextPhase === "NONE") return null;
  if (format === "GROUPS") {
    return `Después de grupos: ${nextPhaseLabel(nextPhase)}`;
  }
  if (format === "ROUND_ROBIN") {
    if (nextPhase === "KNOCKOUT") {
      return qualifyCount <= 4
        ? "Después de la liga: semifinales y final (mejores 4)"
        : "Después de la liga: cuartos, semis y final (mejores 8)";
    }
    if (nextPhase === "QUADRANGULAR") return "Después de la liga: cuadrangular entre los mejores 4";
  }
  return nextPhaseLabel(nextPhase);
}

export function knockoutLabel(round: KnockoutRound) {
  return knockoutLabels[round];
}

export function playingDaysLabel(days: number[]) {
  return [...days].sort((a, b) => a - b).map((day) => dayLabels[day]).join(", ");
}

export function weekdayLabel(day: number) {
  return dayFullLabels[day] ?? "";
}

const MONTHS_LONG = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

function bogotaClock(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const shifted = new Date(date.getTime() - 5 * 60 * 60 * 1000);
  return {
    isoDate: `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`,
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

function clockLabel(hours: number, minutes: number) {
  const hour12 = hours % 12 || 12;
  const suffix = hours < 12 ? "a. m." : "p. m.";
  return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function formatDateTime(value: Date | string) {
  const { year, month, day, weekday, hours, minutes } = bogotaClock(value);
  return `${dayLabels[weekday]?.toLowerCase() ?? ""}, ${day} ${MONTHS_SHORT[month - 1]} ${year}, ${clockLabel(hours, minutes)}`;
}

export function formatDate(value: Date | string) {
  const { year, month, day } = bogotaClock(value);
  return `${day} de ${MONTHS_LONG[month - 1]} de ${year}`;
}

export function formatTime(value: Date | string) {
  const { hours, minutes } = bogotaClock(value);
  return clockLabel(hours, minutes);
}

export function scoreLabel(
  home?: number | null,
  away?: number | null,
  extra?: {
    homePenalties?: number | null;
    awayPenalties?: number | null;
    walkover?: boolean;
  },
) {
  if (home == null || away == null) return "vs";
  let label = `${home} – ${away}`;
  if (extra?.homePenalties != null && extra?.awayPenalties != null) {
    label += ` (${extra.homePenalties}–${extra.awayPenalties} pen.)`;
  }
  if (extra?.walkover) label += " W.O.";
  return label;
}

export function playerLabel(name: string, _number?: number | null) {
  return name;
}

export function cardLabel(type: "YELLOW" | "RED") {
  return type === "RED" ? "Roja" : "Amarilla";
}

export function roleLabel(role: string) {
  if (role === "GLOBAL_ADMIN") return "Admin global";
  if (role === "SCOREKEEPER") return "Planillero";
  if (role === "CAPTAIN") return "Capitán";
  return "Admin de torneo";
}

export function teamName(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleUpperCase("es-CO");
}

export function teamNameInput(value: string) {
  return value.toLocaleUpperCase("es-CO");
}

export const POSTPONE_WINDOWS = [
  { id: "SAME_DAY", label: "Mismo día, otra hora" },
  { id: "TOMORROW", label: "Al otro día" },
  { id: "THIS_WEEK", label: "Esta semana" },
  { id: "NEXT_WEEK", label: "La otra semana" },
] as const;

export type PostponeWindowId = (typeof POSTPONE_WINDOWS)[number]["id"];

export function postponeWindowLabel(value: string | null | undefined) {
  return POSTPONE_WINDOWS.find((item) => item.id === value)?.label ?? null;
}

export function registrationIsOpen(tournament: { registrationOpen: boolean; status: string }) {
  return tournament.registrationOpen && tournament.status !== "FINISHED";
}
