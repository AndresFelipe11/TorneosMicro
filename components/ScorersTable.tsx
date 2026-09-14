import { playerLabel } from "@/lib/format";
import type { ScorerRow } from "@/lib/tournament/types";

export function ScorersTable({ rows }: { rows: ScorerRow[] }) {
  if (rows.length === 0) {
    return <p className="text-muted">Todavía no hay goles registrados.</p>;
  }

  return (
    <section className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Jugador</th>
              <th>Equipo</th>
              <th>Goles</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.playerId}>
                <td className="font-bold">{index + 1}</td>
                <td className="font-semibold">{playerLabel(row.playerName, row.playerNumber)}</td>
                <td>{row.teamName}</td>
                <td className="display text-2xl text-lime">{row.goals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
