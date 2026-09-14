import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { generateTournamentSchedule, withDistributedGroups } from "../lib/tournament/generate";
import type { TournamentConfig } from "../lib/tournament/types";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@torneosmicro.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("Define ADMIN_PASSWORD en .env");
  }
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name: "Administrador", role: "GLOBAL_ADMIN" },
    create: { email, passwordHash, name: "Administrador", role: "GLOBAL_ADMIN" },
  });

  const existing = await prisma.tournament.findFirst({
    where: { name: "Copa Micro Demo" },
  });
  if (existing) {
    console.log("El torneo demo ya existe.");
    return;
  }

  const config: TournamentConfig = withDistributedGroups({
    name: "Copa Micro Demo",
    startDate: "2026-09-19",
    endDate: "2026-11-15",
    format: "GROUPS",
    groupCount: 2,
    qualifyPerGroup: 2,
    nextPhase: "KNOCKOUT",
    playingDays: [0, 6],
    maxMatchesPerDay: 4,
    matchDurationMinutes: 40,
    startTime: "09:00",
    teams: [
      { name: "Leones", groupName: "Grupo A", players: ["Carlos Mesa", "Andrés Ríos", "Julián Soto", "Mateo Cruz", "Diego Pardo"] },
      { name: "Tigres", groupName: "Grupo A", players: ["Luis Peña", "Sebastián Ortiz", "Camilo Díaz", "Iván Mora", "Felipe Ruiz"] },
      { name: "Águilas", groupName: "Grupo A", players: ["Nicolás Vega", "Juan Cárdenas", "Santiago Gil", "Pablo León", "Esteban Rueda"] },
      { name: "Halcones", groupName: "Grupo A", players: ["David Nieto", "Kevin Arias", "Brayan Castaño", "Oscar Pinto", "Hugo Salas"] },
      { name: "Pumas", groupName: "Grupo B", players: ["Miguel Ángel", "Jorge Palacio", "Cristian Mejía", "Alex Torres", "Raúl Gómez"] },
      { name: "Lobos", groupName: "Grupo B", players: ["Hernán Suárez", "Daniel Quintero", "Mauricio Peña", "Samuel Ortiz", "Tomás Villa"] },
      { name: "Toros", groupName: "Grupo B", players: ["Wilson Castro", "Edgar Molina", "Ricardo Paz", "Álvaro Cifuentes", "Jaime Rojas"] },
      { name: "Caimanes", groupName: "Grupo B", players: ["Pedro Marín", "Gustavo León", "Iván Cano", "César Duarte", "Fabián Soto"] },
    ],
  });

  const schedule = generateTournamentSchedule(config);
  if (schedule.error) {
    throw new Error(schedule.error);
  }

  await prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.create({
      data: {
        name: config.name,
        startDate: new Date(Date.UTC(2026, 8, 19, 12, 0, 0)),
        endDate: new Date(Date.UTC(2026, 10, 15, 12, 0, 0)),
        status: "IN_PROGRESS",
        format: "GROUPS",
        groupCount: 2,
        qualifyPerGroup: 2,
        nextPhase: "KNOCKOUT",
        playingDays: [0, 6],
        maxMatchesPerDay: 4,
        matchDurationMinutes: 40,
        startTime: "09:00",
      },
    });

    const groupA = await tx.group.create({
      data: { name: "Grupo A", tournamentId: tournament.id, phase: "GROUP" },
    });
    const groupB = await tx.group.create({
      data: { name: "Grupo B", tournamentId: tournament.id, phase: "GROUP" },
    });
    const groups = { "Grupo A": groupA.id, "Grupo B": groupB.id };

    const teamIds = new Map<string, string>();
    const playerIds = new Map<string, string>();

    for (const team of config.teams) {
      const row = await tx.team.create({
        data: {
          name: team.name,
          tournamentId: tournament.id,
          groupId: team.groupName ? groups[team.groupName as keyof typeof groups] : null,
          players: {
            create: team.players.map((name, index) => ({ name, number: index + 1 })),
          },
        },
        include: { players: true },
      });
      teamIds.set(team.name, row.id);
      for (const player of row.players) {
        playerIds.set(`${team.name}:${player.name}`, player.id);
      }
    }

    const createdMatches = [];
    for (const match of schedule.matches) {
      const row = await tx.match.create({
        data: {
          tournamentId: tournament.id,
          homeTeamId: teamIds.get(match.homeTeamName)!,
          awayTeamId: teamIds.get(match.awayTeamName)!,
          phase: match.phase,
          round: match.round,
          groupId: match.groupName ? groups[match.groupName as keyof typeof groups] : null,
          scheduledAt: new Date(match.scheduledAt),
        },
      });
      createdMatches.push({ ...row, homeName: match.homeTeamName, awayName: match.awayTeamName });
    }

    const results: {
      home: string;
      away: string;
      homeScore: number;
      awayScore: number;
      scorers: { team: string; player: string; minute: number }[];
    }[] = [
      {
        home: "Leones",
        away: "Tigres",
        homeScore: 4,
        awayScore: 1,
        scorers: [
          { team: "Leones", player: "Carlos Mesa", minute: 8 },
          { team: "Leones", player: "Andrés Ríos", minute: 15 },
          { team: "Leones", player: "Carlos Mesa", minute: 22 },
          { team: "Leones", player: "Julián Soto", minute: 31 },
          { team: "Tigres", player: "Luis Peña", minute: 18 },
        ],
      },
      {
        home: "Águilas",
        away: "Halcones",
        homeScore: 2,
        awayScore: 2,
        scorers: [
          { team: "Águilas", player: "Nicolás Vega", minute: 6 },
          { team: "Halcones", player: "David Nieto", minute: 12 },
          { team: "Águilas", player: "Juan Cárdenas", minute: 27 },
          { team: "Halcones", player: "Kevin Arias", minute: 35 },
        ],
      },
      {
        home: "Pumas",
        away: "Lobos",
        homeScore: 3,
        awayScore: 0,
        scorers: [
          { team: "Pumas", player: "Miguel Ángel", minute: 4 },
          { team: "Pumas", player: "Jorge Palacio", minute: 19 },
          { team: "Pumas", player: "Cristian Mejía", minute: 33 },
        ],
      },
      {
        home: "Toros",
        away: "Caimanes",
        homeScore: 1,
        awayScore: 2,
        scorers: [
          { team: "Toros", player: "Wilson Castro", minute: 11 },
          { team: "Caimanes", player: "Pedro Marín", minute: 21 },
          { team: "Caimanes", player: "Gustavo León", minute: 38 },
        ],
      },
    ];

    for (const result of results) {
      const match = createdMatches.find(
        (item) =>
          (item.homeName === result.home && item.awayName === result.away) ||
          (item.homeName === result.away && item.awayName === result.home),
      );
      if (!match) continue;
      const homeIsResultHome = match.homeName === result.home;
      await tx.match.update({
        where: { id: match.id },
        data: {
          status: "PLAYED",
          homeScore: homeIsResultHome ? result.homeScore : result.awayScore,
          awayScore: homeIsResultHome ? result.awayScore : result.homeScore,
          winnerId:
            result.homeScore === result.awayScore
              ? null
              : result.homeScore > result.awayScore
                ? teamIds.get(result.home)
                : teamIds.get(result.away),
          goals: {
            create: result.scorers.map((scorer) => ({
              playerId: playerIds.get(`${scorer.team}:${scorer.player}`)!,
              teamId: teamIds.get(scorer.team)!,
              minute: scorer.minute,
            })),
          },
        },
      });
    }
  }, { timeout: 60000 });

  console.log("Seed listo. Admin:", email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
