import Link from "next/link";
import { notFound } from "next/navigation";
import { getTournament, standingsFor } from "@/lib/queries";
import { tournamentFilter } from "@/lib/search";
import { formatDateTime, teamName } from "@/lib/format";
import { TournamentTabs } from "@/components/TournamentTabs";
import { TournamentFilterNote } from "@/components/TournamentFilterNote";

export default async function TeamsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q } = await searchParams;
  const tournament = await getTournament(id);
  if (!tournament) notFound();
  const filter = tournamentFilter(tournament, q);
  const standings = standingsFor(tournament);
  const teams = filter.found
    ? tournament.teams.filter((team) => filter.teamIds.includes(team.id))
    : tournament.teams;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="display text-4xl">{tournament.name}</h1>
      <p className="mb-4 text-muted">Plantillas, tabla y próximo partido de cada equipo.</p>
      <TournamentTabs id={id} registrationOpen={tournament.registrationOpen} query={filter.query} />
      <TournamentFilterNote
        query={filter.query}
        labels={filter.labels}
        found={filter.found}
        path={`/torneos/${id}/equipos`}
      />
      {teams.length === 0 ? (
        <p className="text-muted">Todavía no hay equipos en este torneo.</p>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => {
            const next = tournament.matches.find(
              (match) =>
                match.status === "SCHEDULED" &&
                (match.homeTeamId === team.id || match.awayTeamId === team.id),
            );
            let position: string | null = null;
            for (const [table, rows] of standings) {
              const index = rows.findIndex((row) => row.teamId === team.id);
              if (index >= 0) {
                position = `${index + 1}.º en ${table}`;
                break;
              }
            }
            return (
              <Link
                key={team.id}
                href={`/torneos/${id}/equipos/${team.id}${filter.query.length >= 2 ? `?q=${encodeURIComponent(filter.query)}` : ""}`}
                className="card block p-5 no-underline text-ink"
              >
                <h2 className="display text-2xl">{team.name}</h2>
                <p className="text-sm text-muted">
                  {team.group?.name ? `${team.group.name} · ` : ""}
                  {team.players.length} {team.players.length === 1 ? "jugador" : "jugadores"}
                  {position ? ` · ${position}` : ""}
                </p>
                {next ? (
                  <p className="mt-2 text-sm">
                    Próximo: {formatDateTime(next.scheduledAt)} vs{" "}
                    {teamName(next.homeTeamId === team.id ? next.awayTeam.name : next.homeTeam.name)}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted">No tiene partidos pendientes.</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
