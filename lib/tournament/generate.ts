import { distributeTeams, teamsByGroup } from "./groups";
import { generateRoundRobin } from "./roundRobin";
import { scheduleMatches } from "./schedule";
import type { ScheduleResult, TournamentConfig, UnscheduledMatch } from "./types";

export function validateConfig(config: TournamentConfig): string | null {
  if (!config.name.trim()) return "El torneo necesita un nombre.";
  if (!config.startDate || !config.endDate) return "Define la fecha de inicio y de fin.";
  if (config.endDate < config.startDate) return "La fecha de fin debe ser posterior al inicio.";
  if (config.playingDays.length === 0) return "Elige al menos un día de juego.";
  if (config.maxMatchesPerDay < 1) return "Debe haber al menos un partido por día.";
  if (config.matchDurationMinutes < 10) return "La duración del partido es demasiado corta.";

  const names = config.teams.map((team) => team.name.trim()).filter(Boolean);
  if (names.length < 2) return "Agrega al menos dos equipos.";
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length) {
    return "Hay equipos con el mismo nombre.";
  }

  if (config.format === "QUADRANGULAR" && names.length !== 4) {
    return "El cuadrangular requiere exactamente 4 equipos.";
  }
  if (config.format === "ROUND_ROBIN" && names.length < 3) {
    return "El todos contra todos requiere al menos 3 equipos.";
  }
  if (config.format === "GROUPS") {
    const groupCount = config.groupCount ?? 0;
    if (groupCount < 2) return "Las fases de grupos necesitan al menos 2 grupos.";
    if (names.length < groupCount * 2) {
      return "Cada grupo debe tener al menos 2 equipos.";
    }
    const qualify = config.qualifyPerGroup ?? 2;
    const qualified = qualify * groupCount;
    const next = config.nextPhase ?? "NONE";
    if (next === "QUADRANGULAR" && qualified !== 4) {
      return "Para un cuadrangular final deben clasificar exactamente 4 equipos (grupos × clasificados).";
    }
    if (next === "KNOCKOUT" && ![2, 4, 8, 16].includes(qualified)) {
      return "Para eliminación directa deben clasificar 2, 4, 8 o 16 equipos.";
    }
  }

  return null;
}

export function generateUnscheduled(config: TournamentConfig): UnscheduledMatch[] {
  const teams = config.teams.filter((team) => team.name.trim());
  if (config.format === "ROUND_ROBIN") {
    return generateRoundRobin(
      teams.map((team) => team.name.trim()),
      "ROUND_ROBIN",
    );
  }
  if (config.format === "QUADRANGULAR") {
    return generateRoundRobin(
      teams.map((team) => team.name.trim()),
      "QUADRANGULAR",
    );
  }

  const groupCount = config.groupCount ?? 2;
  const grouped = teamsByGroup(teams, groupCount);
  const matches: UnscheduledMatch[] = [];
  for (const [groupName, groupTeams] of grouped) {
    matches.push(...generateRoundRobin(groupTeams, "GROUP", groupName));
  }
  return matches;
}

export function generateTournamentSchedule(config: TournamentConfig): ScheduleResult {
  const error = validateConfig(config);
  if (error) {
    return { matches: [], slotsAvailable: 0, slotsNeeded: 0, error };
  }
  const unscheduled = generateUnscheduled(config);
  return scheduleMatches(unscheduled, config);
}

export function withDistributedGroups(config: TournamentConfig): TournamentConfig {
  if (config.format !== "GROUPS" || !config.groupCount) return config;
  return { ...config, teams: distributeTeams(config.teams, config.groupCount) };
}
