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

  function highlighted(row: ScorerRow) {
    return highlightPlayerIds.includes(row.playerId) || highlightTeamIds.includes(row.teamId);
  }

  return (
    <section className="card overflow-hidden">
      <div className="sm:hidden">
        <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-x-2 px-3 py-2 text-[0.65rem] uppercase tracking-wide text-muted">
          <span>#</span>
          <span>Jugador</span>
          <span className="text-right">Goles</span>
        </div>
        {rows.map((row, index) => (
          <div
            key={row.playerId}
            className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-2 border-t border-white/5 px-3 py-2.5 ${
              highlighted(row) ? "bg-lime/30 ring-2 ring-inset ring-lime" : ""
            }`}
          >
            <span className="text-sm font-bold">{index + 1}</span>
            <div className="min-w-0">
              <p className="font-semibold leading-tight">{playerLabel(row.playerName, row.playerNumber)}</p>
              <p className="mt-0.5 text-xs uppercase text-muted">{row.teamName}</p>
            </div>
            <span className="display text-2xl leading-none text-lime">{row.goals}</span>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>#</th>
              <th>Jugador</th>
              <th>Equipo</th>
              <th className="text-center">Goles</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.playerId}
                className={highlighted(row) ? "bg-lime/30 ring-2 ring-inset ring-lime" : undefined}
              >
                <td className="font-bold">{index + 1}</td>
                <td className="font-semibold">{playerLabel(row.playerName, row.playerNumber)}</td>
                <td className="uppercase">{row.teamName}</td>
                <td className="display text-center text-2xl text-lime">{row.goals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
