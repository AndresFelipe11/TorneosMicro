"use client";

import { useState, useTransition } from "react";
import { rescheduleMatchAction } from "@/lib/actions/tournaments";
import { formatDateTime } from "@/lib/format";

export function RescheduleForm({
  matchId,
  homeTeam,
  awayTeam,
  currentScheduledAt,
  initialLocal,
  venue: initialVenue,
}: {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  currentScheduledAt: Date | string;
  initialLocal: string;
  venue: string;
}) {
  const [value, setValue] = useState(initialLocal);
  const [venue, setVenue] = useState(initialVenue);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await rescheduleMatchAction({ matchId, scheduledAt: value, venue });
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Partido reprogramado.");
    });
  }

  return (
    <div className="card space-y-4 p-5">
      <div>
        <h2 className="display text-2xl">Reprogramar partido</h2>
        <p className="text-sm text-muted">
          Si {homeTeam} o {awayTeam} no pueden en la fecha actual, elige otra. Puede ser un día
          distinto a los días habituales del torneo. No se permite si alguno ya juega ese mismo día.
          Esta acción solo está disponible para el administrador.
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
      <label className="block space-y-1">
        <span className="text-sm font-semibold">Cancha / sede</span>
        <input className="field" value={venue} onChange={(event) => setVenue(event.target.value)} />
      </label>
      {error ? <p className="font-semibold text-red-400">{error}</p> : null}
      {message ? <p className="font-semibold text-lime">{message}</p> : null}
      <button className="btn btn-lime" disabled={pending} type="button" onClick={submit}>
        {pending ? "Guardando..." : "Reprogramar"}
      </button>
    </div>
  );
}
