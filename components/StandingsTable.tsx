import type { StandingRow } from "@/lib/tournament/types";

export function StandingsTable({
  title,
  rows,
}: {
  title?: string;
  rows: StandingRow[];
}) {
  return (
    <section className="card overflow-hidden">
      {title ? (
        <header className="border-b border-white/10 px-4 py-3">
          <h3 className="display text-xl">{title}</h3>
        </header>
      ) : null}
      <div className="overflow-x-auto">
        <table>
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
            {rows.map((row, index) => (
              <tr key={row.teamId} className={index < 2 ? "bg-lime/10" : undefined}>
                <td className="font-bold">{index + 1}</td>
                <td className="font-semibold">{row.teamName}</td>
                <td>{row.played}</td>
                <td>{row.won}</td>
                <td>{row.drawn}</td>
                <td>{row.lost}</td>
                <td>{row.gf}</td>
                <td>{row.ga}</td>
                <td>{row.gd}</td>
                <td className="font-extrabold">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
