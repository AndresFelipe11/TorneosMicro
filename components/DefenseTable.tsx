import type { DefenseRow } from "@/lib/tournament/types";

export function DefenseTable({ rows }: { rows: DefenseRow[] }) {
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
              <th>VI</th>
              <th>Prom.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.teamId} className={index === 0 && row.played > 0 ? "bg-lime/10" : undefined}>
                <td className="font-bold">{index + 1}</td>
                <td className="font-semibold">{row.teamName}</td>
                <td>{row.played}</td>
                <td className="display text-2xl text-lime">{row.ga}</td>
                <td>{row.cleanSheets}</td>
                <td>{row.played === 0 ? "—" : row.average.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
