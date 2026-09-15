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
    <div className="card mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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
      <Link href={path} className="btn btn-dark w-full text-center text-sm sm:w-auto" scroll={false}>
        Quitar filtro
      </Link>
    </div>
  );
}
