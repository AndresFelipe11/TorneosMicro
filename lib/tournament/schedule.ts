import type { GeneratedMatch, ScheduleResult, TournamentConfig, UnscheduledMatch } from "./types";
import { buildSlots, dayKey } from "./dates";

type ScheduleOptions = Pick<
  TournamentConfig,
  "startDate" | "endDate" | "playingDays" | "maxMatchesPerDay" | "matchDurationMinutes" | "startTime"
> & { fromDate?: Date };

export type OccupiedMatch = {
  homeTeamName: string;
  awayTeamName: string;
  scheduledAt: Date | string;
};

const NOT_ENOUGH_SLOTS =
  "No caben todos los partidos en las franjas libres. Amplía la fecha de fin del torneo, añade otro día de la semana para jugar, o programa un partido más por día.";

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

  const ordered = [...matches].sort((a, b) => {
    const phaseDiff = phaseOrder(a.phase) - phaseOrder(b.phase);
    if (phaseDiff !== 0) return phaseDiff;
    if (a.round !== b.round) return a.round - b.round;
    return (a.groupName ?? "").localeCompare(b.groupName ?? "", "es");
  });

  const used = new Set<number>();
  const teamDays = new Map<string, Set<string>>();
  const scheduled: GeneratedMatch[] = [];

  const teamBusy = (team: string, key: string) => teamDays.get(team)?.has(key) ?? false;

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
      error: `No caben ${needed} partidos en las ${freeSlots} franjas libres. Amplía la fecha de fin del torneo, añade otro día de la semana para jugar, o programa un partido más por día.`,
    };
  }

  const pickSlot = (match: UnscheduledMatch): number => {
    for (let i = 0; i < slots.length; i++) {
      if (used.has(i)) continue;
      const key = dayKey(slots[i]);
      if (!teamBusy(match.homeTeamName, key) && !teamBusy(match.awayTeamName, key)) {
        return i;
      }
    }
    for (let i = 0; i < slots.length; i++) {
      if (!used.has(i)) return i;
    }
    return -1;
  };

  for (const match of ordered) {
    const index = pickSlot(match);
    if (index < 0) {
      return {
        matches: [],
        slotsAvailable: slots.length,
        slotsNeeded: needed,
        error: NOT_ENOUGH_SLOTS,
      };
    }
    used.add(index);
    const when = slots[index];
    const key = dayKey(when);
    mark(match.homeTeamName, key);
    mark(match.awayTeamName, key);
    scheduled.push({ ...match, scheduledAt: when.toISOString() });
  }

  scheduled.sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
  return { matches: scheduled, slotsAvailable: slots.length, slotsNeeded: needed };
}
