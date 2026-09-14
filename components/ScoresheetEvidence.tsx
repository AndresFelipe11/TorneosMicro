export function ScoresheetEvidence({
  matchId,
  uploadedAt,
  fileName,
}: {
  matchId: string;
  uploadedAt?: Date | string | null;
  fileName?: string | null;
}) {
  const when = uploadedAt
    ? new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Bogota",
      }).format(typeof uploadedAt === "string" ? new Date(uploadedAt) : uploadedAt)
    : null;

  return (
    <section className="card overflow-hidden p-4">
      <h2 className="display text-xl">Planilla del partido</h2>
      <p className="mt-1 text-sm text-muted">
        Evidencia del resultado{when ? ` · cargada el ${when}` : ""}
        {fileName ? ` · ${fileName}` : ""}.
      </p>
      <a href={`/api/planillas/${matchId}`} target="_blank" rel="noreferrer" className="mt-3 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/planillas/${matchId}`}
          alt="Planilla del partido"
          className="max-h-[32rem] w-full rounded-xl object-contain bg-black/5"
        />
      </a>
    </section>
  );
}
