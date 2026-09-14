"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCardsPaidAction } from "@/lib/actions/tournaments";
import { playerLabel } from "@/lib/format";

export type CardWarningRow = {
  playerName: string;
  playerNumber: number | null;
  teamName: string;
  yellows: number;
  reds: number;
  unpaidYellowIds: string[];
};

function tally(yellows: number, reds: number) {
  const parts: string[] = [];
  if (yellows > 0) parts.push(`${yellows} amarilla${yellows === 1 ? "" : "s"} sin pagar`);
  if (reds > 0) parts.push(`${reds} roja${reds === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

export function CardWarning({
  rows,
  canMarkPaid = false,
}: {
  rows: CardWarningRow[];
  canMarkPaid?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (rows.length === 0) return null;

  function markPaid(cardIds: string[]) {
    setError(null);
    startTransition(async () => {
      const result = await setCardsPaidAction(cardIds, true);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-orange-400/30 bg-orange-400/10 p-3 text-sm">
      <p className="font-bold text-orange-200">Tarjetas pendientes</p>
      <ul className="mt-1 space-y-2">
        {rows.map((row) => (
          <li
            key={`${row.teamName}-${row.playerName}`}
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <span>
              {playerLabel(row.playerName, row.playerNumber)} · {row.teamName} · {tally(row.yellows, row.reds)}
            </span>
            {canMarkPaid && row.unpaidYellowIds.length > 0 ? (
              <button
                type="button"
                className="btn btn-ghost text-xs"
                disabled={pending}
                onClick={() => markPaid(row.unpaidYellowIds)}
              >
                {pending ? "Guardando..." : "Marcar pagada"}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {error ? <p className="mt-2 font-semibold text-red-400">{error}</p> : null}
    </div>
  );
}
