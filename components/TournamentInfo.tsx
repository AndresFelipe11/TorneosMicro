import Link from "next/link";

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wide text-muted">{title}</h3>
      <p className="mt-1 whitespace-pre-wrap break-words">{text}</p>
    </div>
  );
}

export function TournamentInfo({
  description,
  registrationFee,
  prizes,
  rules,
  rulesHref,
  editHref,
}: {
  description?: string | null;
  registrationFee?: string | null;
  prizes?: string | null;
  rules?: string | null;
  rulesHref?: string;
  editHref?: string;
}) {
  const descriptionText = description?.trim() ?? "";
  const feeText = registrationFee?.trim() ?? "";
  const prizesText = prizes?.trim() ?? "";
  const rulesText = rules?.trim() ?? "";
  const empty = !descriptionText && !feeText && !prizesText && !rulesText;
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
      {rulesText && rulesHref ? (
        <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Reglamento</h3>
            <p className="mt-1 text-sm text-muted">Duración, tarjetas, W.O. y el resto de normas del torneo.</p>
          </div>
          <Link href={rulesHref} className="btn btn-dark w-full text-center text-sm sm:w-auto">
            Ver reglamento
          </Link>
        </div>
      ) : null}
      {rulesText && !rulesHref ? (
        <div className="sm:col-span-2">
          <InfoBlock title="Reglamento" text={rulesText} />
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
