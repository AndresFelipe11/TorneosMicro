"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAskConfirm } from "@/components/ConfirmDialog";
import { resolvePostponeAction } from "@/lib/actions/postpone";
import { formatDateTime } from "@/lib/format";
import { toBogotaDateTimeLocal } from "@/lib/tournament/dates";

export type PostponeRow = {
  id: string;
  reason: string | null;
  proposedAt: Date | string | null;
  createdAt: Date | string;
  teamName: string;
  homeTeam: string;
  awayTeam: string;
  currentScheduledAt: Date | string;
  matchId: string;
  venue: string;
};

export function PostponeRequestsPanel({ requests }: { requests: PostponeRow[] }) {
  const router = useRouter();
  const ask = useAskConfirm();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dates, setDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      requests.map((item) => [
        item.id,
        item.proposedAt
          ? toBogotaDateTimeLocal(new Date(item.proposedAt))
          : toBogotaDateTimeLocal(new Date(item.currentScheduledAt)),
      ]),
    ),
  );

  if (requests.length === 0) return null;

  function run(requestId: string, accept: boolean) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const row = requests.find((item) => item.id === requestId);
      const ok = await ask({
        title: accept ? "Aceptar aplazamiento" : "Rechazar petición",
        message: accept
          ? `¿Reprogramar ${row?.homeTeam} vs ${row?.awayTeam}?`
          : `¿Rechazar la petición de ${row?.teamName}?`,
        confirmLabel: accept ? "Aceptar y mover" : "Rechazar",
        danger: !accept,
      });
      if (!ok) return;
      const result = await resolvePostponeAction({
        requestId,
        accept,
        scheduledAt: accept ? dates[requestId] : undefined,
        venue: row?.venue,
      });
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Listo.");
      router.refresh();
    });
  }

  return (
    <section className="card mb-6 space-y-4 p-5">
      <div>
        <h2 className="display text-2xl">Peticiones de aplazamiento</h2>
        <p className="text-sm text-muted">Los capitanes piden mover un partido. Tú confirmas la nueva fecha.</p>
      </div>
      {requests.map((item) => (
        <div key={item.id} className="space-y-2 rounded-2xl border border-white/10 p-4">
          <p className="font-semibold">
            {item.teamName} · {item.homeTeam} vs {item.awayTeam}
          </p>
          <p className="text-sm text-muted">Ahora: {formatDateTime(item.currentScheduledAt)}</p>
          {item.reason ? <p className="text-sm">{item.reason}</p> : null}
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Nueva fecha</span>
            <input
              className="field"
              type="datetime-local"
              value={dates[item.id] ?? ""}
              onChange={(event) => setDates((current) => ({ ...current, [item.id]: event.target.value }))}
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="btn btn-lime" disabled={pending} type="button" onClick={() => run(item.id, true)}>
              Aceptar
            </button>
            <button className="btn btn-ghost" disabled={pending} type="button" onClick={() => run(item.id, false)}>
              Rechazar
            </button>
          </div>
        </div>
      ))}
      {error ? <p className="font-semibold text-red-400">{error}</p> : null}
      {message ? <p className="font-semibold text-lime">{message}</p> : null}
    </section>
  );
}
