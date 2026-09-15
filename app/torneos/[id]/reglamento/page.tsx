import { notFound } from "next/navigation";
import Link from "next/link";
import { getTournament } from "@/lib/queries";
import { canManageTournament, getAdminUser } from "@/lib/authz";
import { TournamentTabs } from "@/components/TournamentTabs";
import { ExportRulesPdfButton } from "@/components/ExportRulesPdfButton";
import { TournamentHeading } from "@/components/TournamentCover";

export default async function TournamentRulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tournament, admin] = await Promise.all([getTournament(id), getAdminUser()]);
  if (!tournament) notFound();
  const canEdit = Boolean(admin && canManageTournament(admin, id));
  const rules = tournament.rules?.trim() ?? "";
  const highlights = tournament.rulesHighlights?.trim() ?? "";
  const showHighlights = Boolean(highlights && highlights !== rules);
  const body = rules || highlights;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <TournamentHeading
        src={tournament.coverImage}
        name={tournament.name}
        details={<p>Reglamento del torneo.</p>}
      />
      <TournamentTabs id={id} registrationOpen={tournament.registrationOpen} />
      <section className="card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="display text-2xl">Reglamento</h2>
          {body ? <ExportRulesPdfButton tournamentId={id} /> : null}
        </div>
        {showHighlights ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-pitch/50 p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Reglas importantes</h3>
            <p className="mt-2 whitespace-pre-wrap break-words leading-7">{highlights}</p>
          </div>
        ) : null}
        {body ? (
          <p className="mt-4 whitespace-pre-wrap break-words leading-7">{body}</p>
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
