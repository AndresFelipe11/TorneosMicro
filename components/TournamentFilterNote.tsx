import Link from "next/link";

export function TournamentFilterNote({
  query,
  labels,
  found,
  path,
}: {
  query: string;
  labels: string[];
  found: boolean;
  path: string;
}) {
  if (!query) return null;

  return (
    <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
      <p className="text-sm">
        {found ? (
          <>
            <span className="font-bold text-lime">Filtro:</span> {labels.slice(0, 4).join(" · ")}
            {labels.length > 4 ? ` y ${labels.length - 4} más` : ""}
          </>
        ) : (
          <>
            No hay equipos ni jugadores con “{query}” en este torneo.
          </>
        )}
      </p>
      <Link href={path} className="btn btn-dark text-sm" scroll={false}>
        Quitar filtro
      </Link>
    </div>
  );
}
