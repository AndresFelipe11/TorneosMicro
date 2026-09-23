import Link from "next/link";
import type { DefenseRow } from "@/lib/tournament/types";

function TeamName({
  tournamentId,
  teamId,
  teamName,
}: {
  tournamentId?: string;
  teamId: string;
  teamName: string;
}) {
  const name = <span className="font-semibold uppercase leading-tight">{teamName}</span>;
  if (!tournamentId) return name;
  return (
    <Link className="text-cream no-underline hover:text-lime" href={`/torneos/${tournamentId}/equipos/${teamId}`}>
      {name}
    </Link>
  );
}

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
      <div className="sm:hidden">
        <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-x-2 px-3 py-2 text-[0.65rem] uppercase tracking-wide text-muted">
          <span>#</span>
          <span>Equipo</span>
          <span className="text-right">GC</span>
        </div>
        {rows.map((row, index) => {
          const highlighted = highlightTeamIds.includes(row.teamId);
          return (
            <div
              key={row.teamId}
              className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-2 border-t border-white/5 px-3 py-2.5 ${
                highlighted
                  ? "bg-lime/30 ring-2 ring-inset ring-lime"
                  : index === 0 && row.played > 0
                    ? "bg-lime/10"
                    : ""
              }`}
            >
              <span className="text-sm font-bold">{index + 1}</span>
              <div className="min-w-0">
                <TeamName tournamentId={tournamentId} teamId={row.teamId} teamName={row.teamName} />
                <p className="mt-0.5 text-xs text-muted">
                  {row.played} PJ · Prom. {row.played === 0 ? "—" : row.average.toFixed(2)}
                </p>
              </div>
              <span className="display text-2xl leading-none text-lime">{row.ga}</span>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>#</th>
              <th>Equipo</th>
              <th className="text-center">PJ</th>
              <th className="text-center">GC</th>
              <th className="text-center">Prom.</th>
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
                  <td>
                    <TeamName tournamentId={tournamentId} teamId={row.teamId} teamName={row.teamName} />
                  </td>
                  <td className="text-center tabular-nums">{row.played}</td>
                  <td className="display text-center text-2xl text-lime">{row.ga}</td>
                  <td className="text-center tabular-nums">{row.played === 0 ? "—" : row.average.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
