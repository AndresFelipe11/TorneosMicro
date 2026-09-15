import ExcelJS from "exceljs";
import {
  cardLabel,
  formatDate,
  formatDateTime,
  formatLabel,
  knockoutLabel,
  nextPhaseLabel,
  phaseLabel,
  playerLabel,
  playingDaysLabel,
  scoreLabel,
  statusLabel,
} from "@/lib/format";
import { defenseFor, scorersFor, standingsFor, type TournamentDetail } from "@/lib/queries";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF0B429" },
};

function addSheet(workbook: ExcelJS.Workbook, name: string, headers: string[], rows: (string | number | null)[][]) {
  const sheet = workbook.addWorksheet(name.slice(0, 31));
  const header = sheet.addRow(headers);
  header.font = { bold: true, color: { argb: "FF14110A" } };
  header.fill = HEADER_FILL;
  header.alignment = { vertical: "middle" };
  for (const row of rows) sheet.addRow(row);
  headers.forEach((title, index) => {
    const longest = rows.reduce((max, item) => Math.max(max, String(item[index] ?? "").length), title.length);
    sheet.getColumn(index + 1).width = Math.min(36, Math.max(14, longest + 2));
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };
  return sheet;
}

function fileSafeName(name: string) {
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return cleaned || "torneo";
}

export function tournamentExcelFilename(tournament: TournamentDetail) {
  return `${fileSafeName(tournament.name)}.xlsx`;
}

export async function buildTournamentWorkbook(tournament: TournamentDetail) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TorneosMicro";
  workbook.created = new Date();

  addSheet(
    workbook,
    "Resumen",
    ["Campo", "Valor"],
    [
      ["Nombre", tournament.name],
      ["Formato", formatLabel(tournament.format)],
      ["Estado", statusLabel(tournament.status)],
      ["Inicio", formatDate(tournament.startDate)],
      ["Fin", formatDate(tournament.endDate)],
      ["Días de juego", playingDaysLabel(tournament.playingDays)],
      ["Hora de inicio", tournament.startTime],
      ["Cancha / sede", tournament.venue ?? "—"],
      ["Descripción", tournament.description ?? "—"],
      ["Valor de la inscripción", tournament.registrationFee ?? "—"],
      ["Premiación", tournament.prizes ?? "—"],
      ["Partidos por día", tournament.maxMatchesPerDay],
      ["Duración (min)", tournament.matchDurationMinutes],
      ["Siguiente fase", tournament.format === "GROUPS" ? nextPhaseLabel(tournament.nextPhase) : "—"],
      ["Equipos", tournament.teams.length],
      ["Partidos", tournament.matches.length],
    ],
  );

  addSheet(
    workbook,
    "Equipos",
    ["Equipo", "Grupo", "Jugadores"],
    tournament.teams.map((team) => [team.name, team.group?.name ?? "—", team.players.length]),
  );

  addSheet(
    workbook,
    "Jugadores",
    ["Equipo", "Grupo", "Jugador"],
    tournament.teams.flatMap((team) =>
      team.players.map((player) => [team.name, team.group?.name ?? "—", player.name]),
    ),
  );

  addSheet(
    workbook,
    "Calendario",
    ["Fecha", "Fase", "Grupo", "Ronda", "Cancha", "Local", "Visitante", "Marcador", "Estado", "Planilla"],
    tournament.matches.map((match) => [
      formatDateTime(match.scheduledAt),
      phaseLabel(match.phase),
      match.group?.name ?? "—",
      match.knockoutRound ? knockoutLabel(match.knockoutRound) : `Jornada ${match.round}`,
      match.venue ?? tournament.venue ?? "—",
      match.homeTeam.name,
      match.awayTeam.name,
      scoreLabel(match.homeScore, match.awayScore, {
        homePenalties: match.homePenalties,
        awayPenalties: match.awayPenalties,
        walkover: match.status === "WALKOVER",
      }),
      match.status === "WALKOVER" ? "W.O." : match.status === "PLAYED" ? "Jugado" : "Programado",
      match.scoresheet ? "Sí" : "No",
    ]),
  );

  addSheet(
    workbook,
    "Goles",
    ["Fecha", "Local", "Visitante", "Jugador", "Equipo"],
    tournament.matches.flatMap((match) =>
      match.goals.map((goal) => [
        formatDateTime(match.scheduledAt),
        match.homeTeam.name,
        match.awayTeam.name,
        playerLabel(goal.player.name, goal.player.number),
        tournament.teams.find((team) => team.id === goal.teamId)?.name ?? "",
      ]),
    ),
  );

  const standingsRows: (string | number | null)[][] = [];
  for (const [table, rows] of standingsFor(tournament)) {
    rows.forEach((row, index) => {
      standingsRows.push([
        table,
        index + 1,
        row.teamName,
        row.played,
        row.won,
        row.drawn,
        row.lost,
        row.gf,
        row.ga,
        row.gd,
        row.points,
      ]);
    });
  }
  addSheet(
    workbook,
    "Posiciones",
    ["Tabla", "Pos", "Equipo", "PJ", "PG", "PE", "PP", "GF", "GC", "DG", "Pts"],
    standingsRows,
  );

  addSheet(
    workbook,
    "Goleadores",
    ["Pos", "Jugador", "Equipo", "Goles"],
    scorersFor(tournament).map((row, index) => [
      index + 1,
      playerLabel(row.playerName, row.playerNumber),
      row.teamName,
      row.goals,
    ]),
  );

  addSheet(
    workbook,
    "Valla",
    ["Pos", "Equipo", "PJ", "GC", "Promedio GC"],
    defenseFor(tournament).map((row, index) => [
      index + 1,
      row.teamName,
      row.played,
      row.ga,
      row.average,
    ]),
  );

  addSheet(
    workbook,
    "Tarjetas",
    ["Fecha", "Local", "Visitante", "Jugador", "Equipo", "Tipo", "Pago"],
    tournament.matches.flatMap((match) =>
      match.cards.map((card) => [
        formatDateTime(match.scheduledAt),
        match.homeTeam.name,
        match.awayTeam.name,
        playerLabel(card.player.name, card.player.number),
        tournament.teams.find((team) => team.id === card.teamId)?.name ?? "",
        cardLabel(card.type),
        card.type === "YELLOW" ? (card.paid ? "Pagada" : "Sin pagar") : "",
      ]),
    ),
  );

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
