import Link from "next/link";
import type { StandingRow } from "@/lib/tournament/types";

export function StandingsTable({
  title,
  rows,
  highlightTeamIds = [],
  tournamentId,
}: {
  title?: string;
  rows: StandingRow[];
  highlightTeamIds?: string[];
  tournamentId?: string;
}) {
  return (
    <section className="card overflow-hidden">
      {title ? (
        <header className="border-b border-white/10 px-4 py-3">
          <h3 className="display text-xl">{title}</h3>
        </header>
      ) : null}
      <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <table className="min-w-[40rem] text-sm">
          <thead>
            <tr>
              <th>#</th>
              <th>Equipo</th>
              <th>PJ</th>
              <th>PG</th>
              <th>PE</th>
              <th>PP</th>
              <th>GF</th>
              <th>GC</th>
              <th>DG</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const highlighted = highlightTeamIds.includes(row.teamId);
              return (
              <tr
                key={row.teamId}
                className={highlighted ? "bg-lime/30 ring-2 ring-inset ring-lime" : index < 2 ? "bg-lime/10" : undefined}
              >
                <td className="font-bold">{index + 1}</td>
                <td className="whitespace-nowrap font-semibold uppercase">
                  {tournamentId ? (
                    <Link className="text-cream no-underline hover:text-lime" href={`/torneos/${tournamentId}/equipos/${row.teamId}`}>
                      {row.teamName}
                    </Link>
                  ) : (
                    row.teamName
                  )}
                </td>
                <td>{row.played}</td>
                <td>{row.won}</td>
                <td>{row.drawn}</td>
                <td>{row.lost}</td>
                <td>{row.gf}</td>
                <td>{row.ga}</td>
                <td>{row.gd}</td>
                <td className="font-extrabold">{row.points}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
