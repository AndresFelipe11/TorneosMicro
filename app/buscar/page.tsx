import { redirect } from "next/navigation";
import { resolveSearchTournament, withSearchQuery } from "@/lib/search";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; torneo?: string }>;
}) {
  const { q = "", torneo } = await searchParams;
  const tournamentId = await resolveSearchTournament(q, torneo);
  if (tournamentId) {
    redirect(withSearchQuery(`/torneos/${tournamentId}`, q));
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="display text-4xl">Buscar</h1>
      {q.trim().length > 0 && q.trim().length < 2 ? (
        <p className="mt-4 text-muted">Escribe al menos 2 letras para filtrar un equipo o jugador.</p>
      ) : q.trim() ? (
        <p className="mt-4 text-muted">No encontramos equipos ni jugadores con “{q.trim()}”.</p>
      ) : (
        <p className="mt-4 text-muted">
          Entra a un torneo y usa la barra de búsqueda para filtrar un equipo o jugador.
        </p>
      )}
    </div>
  );
}
