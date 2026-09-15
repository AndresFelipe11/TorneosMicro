import Link from "next/link";
import { ExportRulesPdfButton } from "@/components/ExportRulesPdfButton";

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wide text-muted">{title}</h3>
      <p className="mt-1 whitespace-pre-wrap break-words">{text}</p>
    </div>
  );
}

export function TournamentInfo({
  tournamentId,
  description,
  registrationFee,
  prizes,
  rulesHighlights,
  rules,
  rulesHref,
  editHref,
}: {
  tournamentId: string;
  description?: string | null;
  registrationFee?: string | null;
  prizes?: string | null;
  rulesHighlights?: string | null;
  rules?: string | null;
  rulesHref?: string;
  editHref?: string;
}) {
  const descriptionText = description?.trim() ?? "";
  const feeText = registrationFee?.trim() ?? "";
  const prizesText = prizes?.trim() ?? "";
  const rulesText = rules?.trim() ?? "";
  const highlightsText = rulesHighlights?.trim() || rulesText;
  const canDownloadPdf = Boolean(rulesText || rulesHighlights?.trim());
  const empty = !descriptionText && !feeText && !prizesText && !highlightsText;
  if (empty && !editHref) return null;

  return (
    <section className="card mb-6 grid gap-4 p-5 sm:grid-cols-2">
      {descriptionText ? (
        <div className="sm:col-span-2">
          <InfoBlock title="Descripción" text={descriptionText} />
        </div>
      ) : null}
      {feeText ? <InfoBlock title="Valor de la inscripción" text={feeText} /> : null}
      {prizesText ? <InfoBlock title="Premiación" text={prizesText} /> : null}
      {highlightsText ? (
        <div className="sm:col-span-2">
          <InfoBlock title="Reglas importantes" text={highlightsText} />
          {canDownloadPdf || rulesHref ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {canDownloadPdf ? <ExportRulesPdfButton tournamentId={tournamentId} /> : null}
              {rulesHref ? (
                <Link href={rulesHref} className="btn btn-dark w-full text-center text-sm sm:w-auto">
                  Ver reglamento completo
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {empty ? (
        <p className="sm:col-span-2 text-sm text-muted">Aún no hay descripción, inscripción, premiación ni reglamento.</p>
      ) : null}
      {editHref ? (
        <div className="sm:col-span-2">
          <Link href={editHref} className="btn btn-dark w-full text-center text-sm sm:w-auto">
            Editar datos del torneo
          </Link>
        </div>
      ) : null}
    </section>
  );
}
