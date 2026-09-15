import type { TeamInput } from "./types";
import { teamName } from "../format";

export const GROUP_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function groupNameAt(index: number): string {
  return `Grupo ${GROUP_LETTERS[index] ?? String(index + 1)}`;
}

export function distributeTeams(teams: TeamInput[], groupCount: number): TeamInput[] {
  const names = GROUP_LETTERS.slice(0, groupCount).map((_, i) => groupNameAt(i));
  return teams.map((team, index) => ({
    ...team,
    groupName: team.groupName && names.includes(team.groupName) ? team.groupName : names[index % groupCount],
  }));
}

export function teamsByGroup(teams: TeamInput[], groupCount: number): Map<string, string[]> {
  const assigned = distributeTeams(teams, groupCount);
  const map = new Map<string, string[]>();
  for (let i = 0; i < groupCount; i++) {
    map.set(groupNameAt(i), []);
  }
  for (const team of assigned) {
    const key = team.groupName ?? groupNameAt(0);
    const list = map.get(key) ?? [];
    list.push(teamName(team.name));
    map.set(key, list);
  }
  return map;
}
