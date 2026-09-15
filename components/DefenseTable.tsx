import Link from "next/link";
import type { DefenseRow } from "@/lib/tournament/types";

export function DefenseTable({
  rows,
  highlightTeamIds = [],
  tournamentId,
}: {
  rows: DefenseRow[];
  highlightTeamIds?: string[];
  tournamentId?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-muted">Todavía no hay equipos para calcular la valla.</p>;
  }

  return (
    <section className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Equipo</th>
              <th>PJ</th>
              <th>GC</th>
              <th>Prom.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const highlighted = highlightTeamIds.includes(row.teamId);
              return (
              <tr
                key={row.teamId}
                className={
                  highlighted
                    ? "bg-lime/30 ring-2 ring-inset ring-lime"
                    : index === 0 && row.played > 0
                      ? "bg-lime/10"
                      : undefined
                }
              >
                <td className="font-bold">{index + 1}</td>
                <td className="font-semibold">
                  {tournamentId ? (
                    <Link className="text-cream no-underline hover:text-lime" href={`/torneos/${tournamentId}/equipos/${row.teamId}`}>
                      {row.teamName}
                    </Link>
                  ) : (
                    row.teamName
                  )}
                </td>
                <td>{row.played}</td>
                <td className="display text-2xl text-lime">{row.ga}</td>
                <td>{row.played === 0 ? "—" : row.average.toFixed(2)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
