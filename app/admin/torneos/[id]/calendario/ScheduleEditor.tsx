"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAskConfirm } from "@/components/ConfirmDialog";
import { updateTournamentScheduleAction } from "@/lib/actions/tournaments";
import { formatDateTime, phaseLabel, WEEKDAYS } from "@/lib/format";
import { scheduleMatches } from "@/lib/tournament/schedule";
import type { OccupiedMatch } from "@/lib/tournament/schedule";
import { scheduleFromDate } from "@/lib/tournament/dates";
import { rebuildLeagueRounds } from "@/lib/tournament/roundRobin";
import type { UnscheduledMatch } from "@/lib/tournament/types";

type ScheduleDraft = {
  startDate: string;
  endDate: string;
  playingDays: number[];
  maxMatchesPerDay: number;
  minDaysBetweenMatches: number;
  matchDurationMinutes: number;
  startTime: string;
  venue: string;
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
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingSave, startTransition] = useTransition();
  const ask = useAskConfirm();

  const rebuiltPending = useMemo(() => rebuildLeagueRounds(pending), [pending]);
  const preview = useMemo(
    () =>
      rebuiltPending.length === 0
        ? { matches: [], error: undefined as string | undefined, slotsAvailable: 0, slotsNeeded: 0 }
        : scheduleMatches(
            rebuiltPending,
            { ...draft, fromDate: scheduleFromDate(draft.startDate) },
            occupied,
          ),
    [draft, occupied, rebuiltPending],
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

  async function submit() {
    setError(null);
    setMessage(null);
    if (preview.error) {
      setError(preview.error);
      return;
    }
    const ok = await ask({
      title: "Aplicar calendario",
      message:
        pendingCount === 0
          ? "¿Guardar esta configuración del calendario?"
          : `¿Reconstruir las jornadas y aplicar el nuevo calendario? Se reorganizarán todos los partidos pendientes (${pendingCount}) para que cada jornada tenga los cruces correctos, dejando ${draft.minDaysBetweenMatches} días entre partidos del mismo equipo. Los ya jugados no se tocan.`,
      confirmLabel: "Aplicar",
    });
    if (!ok) return;
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
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-5">
        <div>
          <h2 className="display text-2xl">Días y fechas del torneo</h2>
          <p className="text-sm text-muted">
            Los partidos pendientes se vuelven a armar por jornada y se mueven a las nuevas franjas. Un equipo no
            juega tan seguido: con 3 días de separación, si juega lunes el siguiente puede ser el jueves.
            {playedCount > 0 ? ` Los ${playedCount} partidos ya jugados no se tocan.` : ""}
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
            <span className="text-sm font-semibold">Días entre partidos del mismo equipo</span>
            <input
              className="field"
              disabled={finished}
              max={14}
              min={1}
              type="number"
              value={draft.minDaysBetweenMatches}
              onChange={(event) => update("minDaysBetweenMatches", Number(event.target.value))}
            />
            <span className="text-xs text-muted">3 = si juega lunes, puede volver el jueves.</span>
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
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-semibold">Cancha / sede</span>
            <input
              className="field"
              disabled={finished}
              placeholder="Ej. Cancha 1 · Parque El Salitre"
              value={draft.venue}
              onChange={(event) => update("venue", event.target.value)}
            />
            <span className="text-xs text-muted">Se aplica a los partidos pendientes que no tengan otra cancha.</span>
          </label>
        </div>
        <p className="text-sm text-muted">
          Los partidos se programan cada hora. Si el primero es a las 7:00, el siguiente queda a las 8:00.
          Un equipo no vuelve a jugar antes de los días de descanso configurados.
        </p>
        {preview.error ? (
          <p className="font-semibold text-red-400">{preview.error}</p>
        ) : (
          <p className="text-sm text-muted">
            {pendingCount === 0
              ? "No hay partidos sin jugar. Igual puedes dejar lista la configuración para fases nuevas."
              : `${pendingCount} partidos aún no tienen resultado. Si aplicas, solo se les cambia la fecha (${preview.slotsAvailable} franjas libres). Los jugados no se tocan.`}
          </p>
        )}
        {error ? <p className="font-semibold text-red-400">{error}</p> : null}
        {message ? <p className="font-semibold text-lime">{message}</p> : null}
        <button className="btn btn-lime" disabled={finished || pendingSave} type="button" onClick={submit}>
          {pendingSave ? "Guardando..." : "Reprogramar todas las jornadas"}
        </button>
      </div>

      {!preview.error && preview.matches.length > 0 ? (
        <details className="card p-4 sm:p-5">
          <summary className="cursor-pointer text-sm font-bold">
            Cómo quedarían las fechas de los {preview.matches.length} partidos sin jugar
          </summary>
          <p className="mt-2 text-sm text-muted">
            Esta lista no se vacía al reprogramar: son los partidos que todavía no tienen marcador. Abajo, en
            Partidos, está el calendario real.
          </p>
          <div className="mt-3 space-y-2">
            {preview.matches.map((match) => (
              <div key={match.id ?? `${match.homeTeamName}-${match.awayTeamName}-${match.round}`} className="rounded-2xl bg-black/20 p-3">
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
        </details>
      ) : null}
    </div>
  );
}
