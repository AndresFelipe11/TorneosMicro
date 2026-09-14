import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const scoresheet = await prisma.matchScoresheet.findUnique({
    where: { matchId },
  });

  if (!scoresheet) {
    return new Response("Planilla no encontrada", { status: 404 });
  }

  return new Response(new Uint8Array(scoresheet.data), {
    headers: {
      "Content-Type": scoresheet.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(scoresheet.fileName)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
