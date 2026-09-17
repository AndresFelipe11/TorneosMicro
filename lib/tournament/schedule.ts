import type { GeneratedMatch, ScheduleResult, TournamentConfig, UnscheduledMatch } from "./types";
import { buildSlots, clampMinDaysBetweenMatches, dayKey, teamNeedsRest } from "./dates";

type ScheduleOptions = Pick<
  TournamentConfig,
  "startDate" | "endDate" | "playingDays" | "maxMatchesPerDay" | "matchDurationMinutes" | "startTime"
> & { fromDate?: Date; minDaysBetweenMatches?: number };

export type OccupiedMatch = {
  homeTeamName: string;
  awayTeamName: string;
  scheduledAt: Date | string;
};

export function scheduleOptionsFrom(
  tournament: {
    playingDays: number[];
    maxMatchesPerDay: number;
    matchDurationMinutes: number;
    startTime: string;
    minDaysBetweenMatches?: number | null;
  },
  range: { startDate: string; endDate: string; fromDate?: Date },
): ScheduleOptions {
  return {
    startDate: range.startDate,
    endDate: range.endDate,
    fromDate: range.fromDate,
    playingDays: tournament.playingDays,
    maxMatchesPerDay: tournament.maxMatchesPerDay,
    matchDurationMinutes: tournament.matchDurationMinutes,
    startTime: tournament.startTime,
    minDaysBetweenMatches: clampMinDaysBetweenMatches(tournament.minDaysBetweenMatches),
  };
}

function notEnoughSlots(minDays: number) {
  return `No caben todos los partidos dejando ${minDays} días entre partidos del mismo equipo. Si juega lunes, el siguiente puede ser el jueves. Amplía la fecha de fin, añade otro día de la semana, o baja los días de descanso.`;
}

function phaseOrder(phase: UnscheduledMatch["phase"]): number {
  if (phase === "GROUP" || phase === "ROUND_ROBIN") return 0;
  if (phase === "QUADRANGULAR") return 1;
  return 2;
}

export function scheduleMatches(
  matches: UnscheduledMatch[],
  config: ScheduleOptions,
  occupied: OccupiedMatch[] = [],
): ScheduleResult {
  const slots = buildSlots(config);
  const needed = matches.length;
  const minDays = clampMinDaysBetweenMatches(config.minDaysBetweenMatches);

  const ordered = [...matches].sort((a, b) => {
    const phaseDiff = phaseOrder(a.phase) - phaseOrder(b.phase);
    if (phaseDiff !== 0) return phaseDiff;
    if (a.round !== b.round) return a.round - b.round;
    return (a.groupName ?? "").localeCompare(b.groupName ?? "", "es");
  });

  const used = new Set<number>();
  const teamDays = new Map<string, Set<string>>();
  const scheduled: GeneratedMatch[] = [];

  const teamBusy = (team: string, key: string) => teamNeedsRest(teamDays.get(team) ?? [], key, minDays);

  const mark = (team: string, key: string) => {
    const set = teamDays.get(team) ?? new Set<string>();
    set.add(key);
    teamDays.set(team, set);
  };

  for (const item of occupied) {
    const when = new Date(item.scheduledAt);
    const time = when.getTime();
    slots.forEach((slot, index) => {
      if (Math.abs(slot.getTime() - time) < 60_000) used.add(index);
    });
    const key = dayKey(when);
    mark(item.homeTeamName, key);
    mark(item.awayTeamName, key);
  }

  const freeSlots = slots.length - used.size;
  if (freeSlots < needed) {
    return {
      matches: [],
      slotsAvailable: freeSlots,
      slotsNeeded: needed,
      error: notEnoughSlots(minDays),
    };
  }

  const pickSlot = (match: UnscheduledMatch, from = 0): number => {
    for (let i = from; i < slots.length; i++) {
      if (used.has(i)) continue;
      const key = dayKey(slots[i]);
      if (!teamBusy(match.homeTeamName, key) && !teamBusy(match.awayTeamName, key)) {
        return i;
      }
    }
    return -1;
  };

  let from = 0;
  let currentPhase: UnscheduledMatch["phase"] | null = null;
  let currentRound: number | null = null;
  let roundMax = -1;

  for (const match of ordered) {
    if (currentPhase != null && (match.phase !== currentPhase || match.round !== currentRound)) {
      from = roundMax + 1;
    }
    currentPhase = match.phase;
    currentRound = match.round;
    const index = pickSlot(match, from);
    if (index < 0) {
      return {
        matches: [],
        slotsAvailable: slots.length,
        slotsNeeded: needed,
        error: notEnoughSlots(minDays),
      };
    }
    used.add(index);
    roundMax = Math.max(roundMax, index);
    const when = slots[index];
    const key = dayKey(when);
    mark(match.homeTeamName, key);
    mark(match.awayTeamName, key);
    scheduled.push({ ...match, scheduledAt: when.toISOString() });
  }

  scheduled.sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
  return { matches: scheduled, slotsAvailable: slots.length, slotsNeeded: needed };
}
