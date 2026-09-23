import Link from "next/link";
import type { StandingRow } from "@/lib/tournament/types";

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

function rowClass(highlighted: boolean, index: number) {
  if (highlighted) return "bg-lime/30 ring-2 ring-inset ring-lime";
  if (index < 2) return "bg-lime/10";
  return undefined;
}

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

      <div className="sm:hidden">
        <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-x-2 px-3 py-2 text-[0.65rem] uppercase tracking-wide text-muted">
          <span>#</span>
          <span>Equipo</span>
          <span className="text-right">Pts</span>
        </div>
        {rows.map((row, index) => {
          const highlighted = highlightTeamIds.includes(row.teamId);
          return (
            <div
              key={row.teamId}
              className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-2 border-t border-white/5 px-3 py-2.5 ${rowClass(highlighted, index) ?? ""}`}
            >
              <span className="text-sm font-bold">{index + 1}</span>
              <div className="min-w-0">
                <TeamName tournamentId={tournamentId} teamId={row.teamId} teamName={row.teamName} />
                <p className="mt-0.5 text-xs text-muted">
                  {row.played} PJ · {row.won}-{row.drawn}-{row.lost} · {row.gf}:{row.ga} · DG {row.gd > 0 ? `+${row.gd}` : row.gd}
                </p>
              </div>
              <span className="display text-2xl leading-none text-lime">{row.points}</span>
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
              <th className="text-center">PG</th>
              <th className="text-center">PE</th>
              <th className="text-center">PP</th>
              <th className="text-center">GF</th>
              <th className="text-center">GC</th>
              <th className="text-center">DG</th>
              <th className="text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const highlighted = highlightTeamIds.includes(row.teamId);
              return (
                <tr key={row.teamId} className={rowClass(highlighted, index)}>
                  <td className="font-bold">{index + 1}</td>
                  <td>
                    <TeamName tournamentId={tournamentId} teamId={row.teamId} teamName={row.teamName} />
                  </td>
                  <td className="text-center tabular-nums">{row.played}</td>
                  <td className="text-center tabular-nums">{row.won}</td>
                  <td className="text-center tabular-nums">{row.drawn}</td>
                  <td className="text-center tabular-nums">{row.lost}</td>
                  <td className="text-center tabular-nums">{row.gf}</td>
                  <td className="text-center tabular-nums">{row.ga}</td>
                  <td className="text-center tabular-nums">{row.gd}</td>
                  <td className="text-center font-extrabold tabular-nums">{row.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
