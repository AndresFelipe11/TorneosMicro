import { playerLabel } from "@/lib/format";
import type { ScorerRow } from "@/lib/tournament/types";

export function ScorersTable({
  rows,
  highlightTeamIds = [],
  highlightPlayerIds = [],
}: {
  rows: ScorerRow[];
  highlightTeamIds?: string[];
  highlightPlayerIds?: string[];
}) {
  if (rows.length === 0) {
    return <p className="text-muted">Todavía no hay goles registrados.</p>;
  }

  return (
    <section className="card overflow-hidden">
      <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <table className="min-w-[28rem] text-sm">
          <thead>
            <tr>
              <th>#</th>
              <th>Jugador</th>
              <th>Equipo</th>
              <th>Goles</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const highlighted =
                highlightPlayerIds.includes(row.playerId) || highlightTeamIds.includes(row.teamId);
              return (
              <tr key={row.playerId} className={highlighted ? "bg-lime/30 ring-2 ring-inset ring-lime" : undefined}>
                <td className="font-bold">{index + 1}</td>
                <td className="font-semibold">{playerLabel(row.playerName, row.playerNumber)}</td>
                <td className="uppercase">{row.teamName}</td>
                <td className="display text-2xl text-lime">{row.goals}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
