export function ExportRulesPdfButton({
  tournamentId,
  className = "btn btn-lime w-full text-center text-sm sm:w-auto",
}: {
  tournamentId: string;
  className?: string;
}) {
  return (
    <a className={className} href={`/api/torneos/${tournamentId}/reglamento`} download>
      Descargar PDF
    </a>
  );
}
