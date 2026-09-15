import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatDate, formatLabel } from "@/lib/format";
import type { TournamentFormat } from "@/lib/tournament/types";

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 56;
const GOLD = rgb(240 / 255, 180 / 255, 41 / 255);
const INK = rgb(20 / 255, 17 / 255, 10 / 255);
const MUTED = rgb(90 / 255, 94 / 255, 110 / 255);
const RULE = rgb(230 / 255, 232 / 255, 238 / 255);

export type RulesPdfTournament = {
  name: string;
  startDate: Date;
  endDate: Date;
  venue: string | null;
  format: TournamentFormat;
  coverImage?: string | null;
  rulesHighlights: string | null;
  rules: string | null;
};

function fileSafeName(name: string) {
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return cleaned || "torneo";
}

export function tournamentRulesPdfFilename(tournament: { name: string }) {
  return `reglamento-${fileSafeName(tournament.name)}.pdf`;
}

function encodePdfText(text: string) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\t/g, "  ")
    .split("")
    .map((ch) => (ch.charCodeAt(0) <= 255 ? ch : "?"))
    .join("");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of encodePdfText(text).split(/\r?\n/)) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.trim().split(/\s+/);
    let line = "";
    for (const word of words) {
      for (const piece of splitWord(word, font, size, maxWidth)) {
        const next = line ? `${line} ${piece}` : piece;
        if (font.widthOfTextAtSize(next, size) <= maxWidth) {
          line = next;
        } else {
          if (line) lines.push(line);
          line = piece;
        }
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function splitWord(word: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(word, size) <= maxWidth) return [word];
  const parts: string[] = [];
  let rest = word;
  while (rest.length > 1 && font.widthOfTextAtSize(rest, size) > maxWidth) {
    let cut = rest.length - 1;
    while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut -= 1;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest) parts.push(rest);
  return parts;
}

async function embedCover(doc: PDFDocument, coverImage?: string | null) {
  const relative = coverImage?.trim();
  if (!relative) return null;
  const abs = join(process.cwd(), "public", relative.replace(/^[/\\]+/, ""));
  try {
    const bytes = await readFile(abs);
    const lower = abs.toLowerCase();
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return doc.embedJpg(bytes);
    return doc.embedPng(bytes);
  } catch {
    return null;
  }
}

export async function buildTournamentRulesPdf(tournament: RulesPdfTournament) {
  const highlights = tournament.rulesHighlights?.trim() ?? "";
  const rules = tournament.rules?.trim() ?? "";
  const body = rules || highlights;
  if (!body) {
    throw new Error("NO_RULES");
  }

  const doc = await PDFDocument.create();
  doc.setTitle(`Reglamento · ${tournament.name}`);
  doc.setAuthor("TorneosMicro");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const cover = await embedCover(doc, tournament.coverImage);

  const contentWidth = PAGE.width - MARGIN * 2;
  let page: PDFPage | null = null;
  let y = 0;

  function addPage() {
    page = doc.addPage([PAGE.width, PAGE.height]);
    page.drawRectangle({
      x: 0,
      y: PAGE.height - 8,
      width: PAGE.width,
      height: 8,
      color: GOLD,
    });
    y = PAGE.height - MARGIN;
  }

  function ensureSpace(height: number) {
    if (!page || y - height < MARGIN + 24) addPage();
  }

  function drawFooter() {
    const pages = doc.getPages();
    pages.forEach((item, index) => {
      const label = `TorneosMicro  ·  ${index + 1} / ${pages.length}`;
      item.drawText(label, {
        x: MARGIN,
        y: 28,
        size: 9,
        font: regular,
        color: MUTED,
      });
    });
  }

  function drawLines(lines: string[], font: PDFFont, size: number, lineHeight: number, color = INK) {
    for (const line of lines) {
      ensureSpace(lineHeight);
      if (line) {
        page!.drawText(line, { x: MARGIN, y: y - size, size, font, color });
      }
      y -= lineHeight;
    }
  }

  function heading(title: string) {
    ensureSpace(36);
    y -= 8;
    page!.drawRectangle({
      x: MARGIN,
      y: y - 2,
      width: 28,
      height: 3,
      color: GOLD,
    });
    y -= 18;
    page!.drawText(encodePdfText(title.toUpperCase()), {
      x: MARGIN,
      y,
      size: 11,
      font: bold,
      color: INK,
    });
    y -= 16;
  }

  addPage();
  if (cover) {
    const maxW = 150;
    const maxH = 150;
    const scale = Math.min(maxW / cover.width, maxH / cover.height);
    const width = cover.width * scale;
    const height = cover.height * scale;
    page!.drawImage(cover, {
      x: MARGIN,
      y: y - height,
      width,
      height,
    });
    y -= height + 14;
  }
  drawLines(wrapText("Reglamento", bold, 11, contentWidth), bold, 11, 14, GOLD);
  y -= 4;
  drawLines(wrapText(tournament.name, bold, 22, contentWidth), bold, 22, 26);

  const meta = [
    `${formatDate(tournament.startDate)} — ${formatDate(tournament.endDate)}`,
    formatLabel(tournament.format),
    tournament.venue?.trim() || "",
  ]
    .filter(Boolean)
    .join("  ·  ");
  drawLines(wrapText(meta, regular, 11, contentWidth), regular, 11, 15, MUTED);
  y -= 6;
  page!.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE.width - MARGIN, y },
    thickness: 1,
    color: RULE,
  });
  y -= 18;

  const sameText = highlights && rules && highlights === rules;
  if (highlights && !sameText) {
    heading("Reglas importantes");
    drawLines(wrapText(highlights, regular, 11, contentWidth), regular, 11, 16);
    y -= 10;
  }

  heading(rules ? "Reglamento completo" : "Reglas importantes");
  drawLines(wrapText(body, regular, 11, contentWidth), regular, 11, 16);

  drawFooter();
  return doc.save();
}
