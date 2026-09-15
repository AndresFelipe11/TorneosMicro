import { notFound } from "next/navigation";
import Link from "next/link";
import { getTournament } from "@/lib/queries";
import { canManageTournament, getAdminUser } from "@/lib/authz";
import { TournamentTabs } from "@/components/TournamentTabs";

export default async function TournamentRulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tournament, admin] = await Promise.all([getTournament(id), getAdminUser()]);
  if (!tournament) notFound();
  const canEdit = Boolean(admin && canManageTournament(admin, id));
  const rules = tournament.rules?.trim() ?? "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="display text-4xl">{tournament.name}</h1>
      <p className="mb-4 text-muted">Reglamento del torneo.</p>
      <TournamentTabs id={id} registrationOpen={tournament.registrationOpen} />
      <section className="card p-5">
        <h2 className="display text-2xl">Reglamento</h2>
        {rules ? (
          <p className="mt-3 whitespace-pre-wrap break-words leading-7">{rules}</p>
        ) : (
          <p className="mt-3 text-sm text-muted">Todavía no hay un reglamento publicado.</p>
        )}
        {canEdit ? (
          <p className="mt-4">
            <Link href={`/admin/torneos/${id}/datos`} className="font-bold text-lime no-underline">
              Editar reglamento →
            </Link>
          </p>
        ) : null}
      </section>
    </div>
  );
}
