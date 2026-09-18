"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAskConfirm } from "@/components/ConfirmDialog";
import { resolvePostponeAction } from "@/lib/actions/postpone";
import { formatDateTime, postponeWindowLabel } from "@/lib/format";
import { suggestedPostponeLocal, toBogotaDateTimeLocal } from "@/lib/tournament/dates";

export type PostponeRow = {
  id: string;
  reason: string | null;
  proposedWindow: "SAME_DAY" | "TOMORROW" | "THIS_WEEK" | "NEXT_WEEK" | null;
  proposedAt?: Date | string | null;
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
          : suggestedPostponeLocal(new Date(item.currentScheduledAt), item.proposedWindow),
      ]),
    ),
  );

  if (requests.length === 0) return null;

  function run(requestId: string, accept: boolean) {
    setError(null);
    setMessage(null);
    const row = requests.find((item) => item.id === requestId);
    void (async () => {
      const ok = await ask({
        title: accept ? "Aceptar aplazamiento" : "Rechazar petición",
        message: accept
          ? `¿Reprogramar ${row?.homeTeam} vs ${row?.awayTeam}?`
          : `¿Rechazar la petición de ${row?.teamName}?`,
        confirmLabel: accept ? "Aceptar y mover" : "Rechazar",
        danger: !accept,
      });
      if (!ok) return;
      startTransition(async () => {
        try {
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
          if ("warning" in result && result.warning) {
            setError(null);
          }
          router.refresh();
        } catch {
          setError("No se pudo guardar. Intenta de nuevo.");
        }
      });
    })();
  }

  return (
    <section className="card mb-6 space-y-4 p-5">
      <div>
        <h2 className="display text-2xl">Peticiones de aplazamiento</h2>
        <p className="text-sm text-muted">
          El capitán elige una ventana. Tú pones el día y la hora exactos.
        </p>
      </div>
      {requests.map((item) => (
        <div key={item.id} className="space-y-2 rounded-2xl border border-white/10 p-4">
          <p className="font-semibold">
            {item.teamName} · {item.homeTeam} vs {item.awayTeam}
          </p>
          <p className="text-sm text-muted">Ahora: {formatDateTime(item.currentScheduledAt)}</p>
          <p className="text-sm font-semibold text-lime">
            Piden: {postponeWindowLabel(item.proposedWindow) ?? (item.proposedAt ? formatDateTime(item.proposedAt) : "Sin preferencia")}
          </p>
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
