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

export function knockoutLabel(round: KnockoutRound) {
  return knockoutLabels[round];
}

export function playingDaysLabel(days: number[]) {
  return [...days].sort((a, b) => a - b).map((day) => dayLabels[day]).join(", ");
}

export function weekdayLabel(day: number) {
  return dayFullLabels[day] ?? "";
}

export function formatDateTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(date);
}

export function formatDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(date);
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

export function playerLabel(name: string, number?: number | null) {
  return number == null ? name : `#${number} ${name}`;
}

export function cardLabel(type: "YELLOW" | "RED") {
  return type === "RED" ? "Roja" : "Amarilla";
}
