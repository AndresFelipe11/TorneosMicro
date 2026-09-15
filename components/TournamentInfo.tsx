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
  editHref,
}: {
  description?: string | null;
  registrationFee?: string | null;
  prizes?: string | null;
  editHref?: string;
}) {
  const descriptionText = description?.trim() ?? "";
  const feeText = registrationFee?.trim() ?? "";
  const prizesText = prizes?.trim() ?? "";
  if (!descriptionText && !feeText && !prizesText && !editHref) return null;

  return (
    <section className="card mb-6 grid gap-4 p-5 sm:grid-cols-2">
      {descriptionText ? (
        <div className="sm:col-span-2">
          <InfoBlock title="Descripción" text={descriptionText} />
        </div>
      ) : null}
      {feeText ? <InfoBlock title="Valor de la inscripción" text={feeText} /> : null}
      {prizesText ? <InfoBlock title="Premiación" text={prizesText} /> : null}
      {!descriptionText && !feeText && !prizesText ? (
        <p className="sm:col-span-2 text-sm text-muted">Aún no hay descripción, inscripción ni premiación.</p>
      ) : null}
      {editHref ? (
        <div className="sm:col-span-2">
          <Link href={editHref} className="btn btn-dark w-full text-center text-sm sm:w-auto">
            Editar nombre, descripción y premiación
          </Link>
        </div>
      ) : null}
    </section>
  );
}
