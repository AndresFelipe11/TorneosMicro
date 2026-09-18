"use client";

import { useMemo, useState, useTransition } from "react";
import { useAskConfirm } from "@/components/ConfirmDialog";
import { rescheduleMatchAction } from "@/lib/actions/tournaments";
import { formatDateTime } from "@/lib/format";
import { fromBogotaDateTimeLocal, teamRestWarnings } from "@/lib/tournament/dates";

export function RescheduleForm({
  matchId,
  homeTeam,
  awayTeam,
  currentScheduledAt,
  initialLocal,
  venue: initialVenue,
  minDaysBetweenMatches,
  otherMatches,
}: {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  currentScheduledAt: Date | string;
  initialLocal: string;
  venue: string;
  minDaysBetweenMatches: number;
  otherMatches: { homeTeamName: string; awayTeamName: string; scheduledAt: Date | string }[];
}) {
  const [value, setValue] = useState(initialLocal);
  const [venue, setVenue] = useState(initialVenue);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ask = useAskConfirm();

  const liveWarnings = useMemo(() => {
    const when = fromBogotaDateTimeLocal(value);
    if (!when) return [];
    return teamRestWarnings(otherMatches, homeTeam, awayTeam, when, minDaysBetweenMatches);
  }, [awayTeam, homeTeam, minDaysBetweenMatches, otherMatches, value]);

  async function submit() {
    const when = fromBogotaDateTimeLocal(value);
    const whenLabel = when ? formatDateTime(when) : value;
    const alertText = liveWarnings.length > 0 ? `\n\nAlerta:\n${liveWarnings.join("\n")}\nSe puede guardar igual.` : "";
    const ok = await ask({
      title: "Reprogramar partido",
      message: `¿Reprogramar ${homeTeam} vs ${awayTeam}?\nAhora: ${formatDateTime(currentScheduledAt)}\nNueva fecha: ${whenLabel}${alertText}`,
      confirmLabel: liveWarnings.length > 0 ? "Reprogramar igual" : "Reprogramar",
    });
    if (!ok) return;
    setError(null);
    setMessage(null);
    setWarning(null);
    startTransition(async () => {
      const result = await rescheduleMatchAction({ matchId, scheduledAt: value, venue });
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Partido reprogramado.");
      if (result.warning) setWarning(result.warning);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted">
          Si {homeTeam} o {awayTeam} no pueden en la fecha actual, elige otra. Puede ser un día
          distinto a los días habituales del torneo. Si el descanso entre partidos queda corto, verás
          una alerta, pero igual puedes guardar. Esta acción es del administrador.
        </p>
        <p className="mt-2 text-sm">
          Ahora: <strong>{formatDateTime(currentScheduledAt)}</strong>
        </p>
      </div>
      <label className="block space-y-1">
        <span className="text-sm font-semibold">Nueva fecha y hora (Bogotá)</span>
        <input
          className="field"
          type="datetime-local"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      {liveWarnings.length > 0 ? (
        <div className="rounded-2xl border border-orange-400/30 bg-orange-400/10 p-3 text-sm text-orange-200">
          <p className="font-bold">Alerta de descanso</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {liveWarnings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <label className="block space-y-1">
        <span className="text-sm font-semibold">Cancha / sede</span>
        <input className="field" value={venue} onChange={(event) => setVenue(event.target.value)} />
      </label>
      {error ? <p className="font-semibold text-red-400">{error}</p> : null}
      {warning ? <p className="font-semibold text-orange-200">{warning}</p> : null}
      {message && !warning ? <p className="font-semibold text-lime">{message}</p> : null}
      {message && warning ? <p className="font-semibold text-lime">El partido quedó reprogramado.</p> : null}
      <button className="btn btn-lime" disabled={pending} type="button" onClick={submit}>
        {pending ? "Guardando..." : "Reprogramar"}
      </button>
    </div>
  );
}
