import { getTournament } from "@/lib/queries";
import { buildTournamentWorkbook, tournamentExcelFilename } from "@/lib/tournament/excel";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) {
    return new Response("Torneo no encontrado", { status: 404 });
  }

  const file = await buildTournamentWorkbook(tournament);
  const filename = tournamentExcelFilename(tournament);
  const encoded = encodeURIComponent(filename);

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, no-store",
    },
  });
}
