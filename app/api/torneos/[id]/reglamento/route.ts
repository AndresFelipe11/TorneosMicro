import { getTournament } from "@/lib/queries";
import { buildTournamentRulesPdf, tournamentRulesPdfFilename } from "@/lib/tournament/rules-pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) {
    return new Response("Torneo no encontrado", { status: 404 });
  }

  const highlights = tournament.rulesHighlights?.trim() ?? "";
  const rules = tournament.rules?.trim() ?? "";
  if (!highlights && !rules) {
    return new Response("Todavía no hay un reglamento publicado", { status: 404 });
  }

  const file = await buildTournamentRulesPdf(tournament);
  const filename = tournamentRulesPdfFilename(tournament);
  const encoded = encodeURIComponent(filename);

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, no-store",
    },
  });
}
