export function ExportExcelButton({ tournamentId }: { tournamentId: string }) {
  return (
    <a className="btn btn-dark" href={`/api/torneos/${tournamentId}/excel`} download>
      Exportar Excel
    </a>
  );
}
