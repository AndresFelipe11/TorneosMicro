export type TournamentFormat = "ROUND_ROBIN" | "GROUPS" | "QUADRANGULAR";
export type NextPhase = "NONE" | "KNOCKOUT" | "QUADRANGULAR";
export type MatchPhase = "GROUP" | "ROUND_ROBIN" | "QUADRANGULAR" | "KNOCKOUT";
export type KnockoutRound = "R16" | "QF" | "SF" | "F";

export type TeamInput = {
  name: string;
  players: string[];
  groupName?: string;
};

export type TournamentConfig = {
  name: string;
  startDate: string;
  endDate: string;
  format: TournamentFormat;
  groupCount?: number;
  qualifyPerGroup?: number;
  nextPhase?: NextPhase;
  playingDays: number[];
  maxMatchesPerDay: number;
  matchDurationMinutes: number;
  startTime: string;
  teams: TeamInput[];
};

export type UnscheduledMatch = {
  homeTeamName: string;
  awayTeamName: string;
  phase: MatchPhase;
  round: number;
  groupName?: string;
  knockoutRound?: KnockoutRound;
};

export type GeneratedMatch = UnscheduledMatch & {
  scheduledAt: string;
};

export type ScheduleResult = {
  matches: GeneratedMatch[];
  slotsAvailable: number;
  slotsNeeded: number;
  error?: string;
};

export type StandingRow = {
  teamId: string;
  teamName: string;
  groupName?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

export type ScorerRow = {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  goals: number;
};

export type DefenseRow = {
  teamId: string;
  teamName: string;
  played: number;
  ga: number;
  cleanSheets: number;
  average: number;
};
