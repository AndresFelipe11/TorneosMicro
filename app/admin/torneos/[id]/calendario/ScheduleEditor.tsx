"use client";

import { useMemo, useState, useTransition } from "react";
import { updateTournamentScheduleAction } from "@/lib/actions/tournaments";
import { formatDateTime, phaseLabel, WEEKDAYS } from "@/lib/format";
import { scheduleMatches } from "@/lib/tournament/schedule";
import type { OccupiedMatch } from "@/lib/tournament/schedule";
import { scheduleFromDate } from "@/lib/tournament/dates";
import type { UnscheduledMatch } from "@/lib/tournament/types";

type ScheduleDraft = {
  startDate: string;
  endDate: string;
  playingDays: number[];
  maxMatchesPerDay: number;
  matchDurationMinutes: number;
  startTime: string;
};

export function ScheduleEditor({
  tournamentId,
  finished,
  pendingCount,
  playedCount,
  initial,
  pending,
  occupied,
}: {
  tournamentId: string;
  finished: boolean;
  pendingCount: number;
  playedCount: number;
  initial: ScheduleDraft;
  pending: UnscheduledMatch[];
  occupied: OccupiedMatch[];
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingSave, startTransition] = useTransition();

  const preview = useMemo(
    () =>
      pending.length === 0
        ? { matches: [], error: undefined as string | undefined, slotsAvailable: 0, slotsNeeded: 0 }
        : scheduleMatches(
            pending,
            { ...draft, fromDate: scheduleFromDate(draft.startDate) },
            occupied,
          ),
    [draft, occupied, pending],
  );

  function update<K extends keyof ScheduleDraft>(key: K, value: ScheduleDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  function toggleDay(day: number) {
    update(
      "playingDays",
      draft.playingDays.includes(day)
        ? draft.playingDays.filter((item) => item !== day)
        : [...draft.playingDays, day],
    );
  }

  function submit() {
    setError(null);
    setMessage(null);
    if (preview.error) {
      setError(preview.error);
      return;
    }
    startTransition(async () => {
      const result = await updateTournamentScheduleAction({
        tournamentId,
        ...draft,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Calendario actualizado.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-5">
        <div>
          <h2 className="display text-2xl">Días y fechas del torneo</h2>
          <p className="text-sm text-muted">
            Si quitas un día (por ejemplo los martes), los partidos sin jugar se mueven a las nuevas
            franjas. Los {playedCount} partidos ya jugados no se tocan.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Inicio</span>
            <input
              className="field"
              disabled={finished}
              type="date"
              value={draft.startDate}
              onChange={(event) => update("startDate", event.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Fin</span>
            <input
              className="field"
              disabled={finished}
              type="date"
              value={draft.endDate}
              onChange={(event) => update("endDate", event.target.value)}
            />
          </label>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Días de juego</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day.value}
                disabled={finished}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`rounded-full px-3 py-2 text-sm font-bold ${
                  draft.playingDays.includes(day.value) ? "bg-lime text-pitch" : "bg-card"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Partidos por día</span>
            <input
              className="field"
              disabled={finished}
              max={12}
              min={1}
              type="number"
              value={draft.maxMatchesPerDay}
              onChange={(event) => update("maxMatchesPerDay", Number(event.target.value))}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Hora de inicio</span>
            <input
              className="field"
              disabled={finished}
              type="time"
              value={draft.startTime}
              onChange={(event) => update("startTime", event.target.value)}
            />
          </label>
        </div>
        <p className="text-sm text-muted">
          Los partidos se programan cada hora. Si el primero es a las 7:00, el siguiente queda a las 8:00.
        </p>
        {preview.error ? (
          <p className="font-semibold text-red-400">{preview.error}</p>
        ) : (
          <p className="text-sm text-muted">
            {pendingCount === 0
              ? "No hay partidos pendientes. Igual puedes dejar lista la configuración para fases nuevas."
              : `Se moverán ${pendingCount} partidos pendientes a las nuevas franjas (${preview.slotsAvailable} libres).`}
          </p>
        )}
        {error ? <p className="font-semibold text-red-400">{error}</p> : null}
        {message ? <p className="font-semibold text-lime">{message}</p> : null}
        <button className="btn btn-lime" disabled={finished || pendingSave} type="button" onClick={submit}>
          {pendingSave ? "Reprogramando..." : "Aplicar nuevo calendario"}
        </button>
      </div>

      {!preview.error && preview.matches.length > 0 ? (
        <div className="space-y-2">
          <h3 className="display text-xl">Vista previa de pendientes</h3>
          {preview.matches.map((match) => (
            <div key={match.id ?? `${match.homeTeamName}-${match.awayTeamName}-${match.round}`} className="card p-3">
              <p className="text-xs uppercase tracking-wide text-muted">
                {formatDateTime(match.scheduledAt)} · {phaseLabel(match.phase)}
                {match.groupName ? ` · ${match.groupName}` : ""} · Jornada {match.round}
              </p>
              <p className="display text-xl">
                {match.homeTeamName} vs {match.awayTeamName}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
