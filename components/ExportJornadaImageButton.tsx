"use client";

import { useMemo, useState } from "react";
import type { JornadaPosterPack } from "@/lib/tournament/jornada";

const W = 1080;
const GOLD = "#f0b429";
const CREAM = "#e8edf7";
const MUTED = "#8d95ab";
const CARD = "#151a2c";
const BG = "#090b12";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    if (ctx.measureText(word).width <= maxWidth) {
      line = word;
      continue;
    }
    let chunk = "";
    for (const ch of word) {
      const trial = chunk + ch;
      if (ctx.measureText(trial).width <= maxWidth) chunk = trial;
      else {
        if (chunk) lines.push(chunk);
        chunk = ch;
      }
    }
    line = chunk;
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [text];
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

async function drawPoster(poster: JornadaPoster) {
  const pad = 56;
  const cardGap = 18;
  const cardH = poster.matches.length > 6 ? 150 : 176;
  const nameFont = 54;
  const header = 280;
  const footer = 88;
  const height = Math.max(1080, header + poster.matches.length * (cardH + cardGap) + footer);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear la imagen.");

  await document.fonts.ready.catch(() => undefined);

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, height);
  ctx.strokeStyle = "rgba(240,180,41,0.08)";
  ctx.lineWidth = 1;
  for (let x = 48; x < W; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 48; y < height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(pad + 36, 78, 36, 0, Math.PI * 2);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.fillStyle = "#14110a";
  ctx.font = '800 28px "Barlow Condensed", Impact, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("TM", pad + 36, 80);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = CREAM;
  ctx.font = '800 36px "Barlow Condensed", Impact, sans-serif';
  ctx.fillText("TORNEOSMICRO", pad + 88, 72);
  ctx.fillStyle = GOLD;
  ctx.font = '700 16px Figtree, system-ui, sans-serif';
  ctx.fillText("CALENDARIO  ·  POSICIONES  ·  GOLES", pad + 88, 98);

  const cover = poster.coverImage ? await loadImage(poster.coverImage) : null;
  const titleMax = cover ? W - pad * 2 - 140 : W - pad * 2;
  ctx.fillStyle = GOLD;
  ctx.font = '800 18px Figtree, system-ui, sans-serif';
  ctx.fillText(`JORNADA ${poster.round}`, pad, 160);
  ctx.fillStyle = CREAM;
  ctx.font = `800 ${nameFont}px "Barlow Condensed", Impact, sans-serif`;
  const titleLines = wrapLines(ctx, poster.tournamentName.toLocaleUpperCase("es-CO"), titleMax);
  titleLines.slice(0, 3).forEach((line, index) => {
    ctx.fillText(line, pad, 218 + index * 52);
  });

  if (cover) {
    const size = 112;
    const x = W - pad - size;
    const y = 148;
    roundRect(ctx, x, y, size, size, 18);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "#000";
    ctx.fillRect(x, y, size, size);
    const scale = Math.min(size / cover.width, size / cover.height);
    const dw = cover.width * scale;
    const dh = cover.height * scale;
    ctx.drawImage(cover, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, size, size, 18);
    ctx.stroke();
  }

  poster.matches.forEach((match, index) => {
    const y = header + index * (cardH + cardGap);
    roundRect(ctx, pad, y, W - pad * 2, cardH, 28);
    ctx.fillStyle = CARD;
    ctx.fill();
    ctx.strokeStyle = "rgba(240,180,41,0.22)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = MUTED;
    ctx.font = '700 20px Figtree, system-ui, sans-serif';
    ctx.textAlign = "left";
    const meta = [match.when, match.group, match.venue].filter(Boolean).join("  ·  ");
    ctx.fillText(meta, pad + 32, y + 42, W - pad * 2 - 64);

    const inner = W - pad * 2 - 64;
    ctx.fillStyle = CREAM;
    ctx.font = '800 36px "Barlow Condensed", Impact, sans-serif';
    const homeLines = wrapLines(ctx, match.home, inner);
    ctx.fillText(homeLines[0], pad + 32, y + 88, inner);

    ctx.fillStyle = GOLD;
    ctx.font = '800 22px "Barlow Condensed", Impact, sans-serif';
    ctx.fillText("VS", pad + 32, y + 122);

    ctx.fillStyle = CREAM;
    ctx.font = '800 36px "Barlow Condensed", Impact, sans-serif';
    const awayLines = wrapLines(ctx, match.away, inner);
    ctx.fillText(awayLines[0], pad + 32, y + 158, inner);
  });

  ctx.fillStyle = MUTED;
  ctx.font = '700 18px Figtree, system-ui, sans-serif';
  ctx.textAlign = "center";
  const foot = poster.venue ? `TorneosMicro  ·  ${poster.venue}` : "TorneosMicro";
  ctx.fillText(foot, W / 2, height - 36);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se pudo crear la imagen."));
    }, "image/png");
  });
}

export function ExportJornadaImageButton({
  pack,
  className = "btn btn-dark w-full sm:w-auto",
}: {
  pack: JornadaPosterPack | null;
  className?: string;
}) {
  const posters = pack?.posters ?? [];
  const [round, setRound] = useState(pack?.defaultRound ?? posters[0]?.round ?? 1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const poster = useMemo(
    () => posters.find((item) => item.round === round) ?? posters[0] ?? null,
    [posters, round],
  );

  if (!pack || posters.length === 0 || !poster) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor={`jornada-poster-${poster.filename}`}>
          Jornada
        </label>
        <select
          id={`jornada-poster-${poster.filename}`}
          className="field w-full sm:w-auto sm:min-w-[11rem]"
          disabled={pending}
          value={poster.round}
          onChange={(event) => setRound(Number(event.target.value))}
        >
          {posters.map((item) => (
            <option key={item.round} value={item.round}>
              Jornada {item.round}
              {item.matches.length === 1 ? " · 1 partido" : ` · ${item.matches.length} partidos`}
            </option>
          ))}
        </select>
        <button
          className={className}
          disabled={pending}
          type="button"
          onClick={() => {
            setError(null);
            setPending(true);
            void (async () => {
              try {
                const blob = await drawPoster(poster);
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = poster.filename;
                link.click();
                URL.revokeObjectURL(url);
              } catch {
                setError("No se pudo descargar la imagen.");
              } finally {
                setPending(false);
              }
            })();
          }}
        >
          {pending ? "Preparando..." : "Descargar imagen"}
        </button>
      </div>
      {error ? <p className="text-sm font-semibold text-red-400">{error}</p> : null}
    </div>
  );
}
