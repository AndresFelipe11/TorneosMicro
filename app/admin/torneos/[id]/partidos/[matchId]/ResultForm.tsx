"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMatchResultAction } from "@/lib/actions/tournaments";
import { fromBogotaDateTimeLocal, toBogotaDateTimeLocal } from "@/lib/tournament/dates";

type Player = { id: string; name: string; teamId: string };
type GoalDraft = { playerId: string; playerName: string; teamId: string; minute: string };

export function ResultForm({
  matchId,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  initial,
  knockout,
}: {
  matchId: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  homePlayers: Player[];
  awayPlayers: Player[];
  knockout: boolean;
  initial: {
    homeScore: number | null;
    awayScore: number | null;
    winnerId: string | null;
    scheduledAt: Date | string;
    goals: { playerId: string; playerName: string; teamId: string; minute: number | null }[];
    scoresheet: { fileName: string; uploadedAt: Date | string } | null;
  };
}) {
  const router = useRouter();
  const [homeScore, setHomeScore] = useState(String(initial.homeScore ?? 0));
  const [awayScore, setAwayScore] = useState(String(initial.awayScore ?? 0));
  const [winnerId, setWinnerId] = useState(initial.winnerId ?? "");
  const [scheduledAt, setScheduledAt] = useState(toBogotaDateTimeLocal(new Date(initial.scheduledAt)));
  const [goals, setGoals] = useState<GoalDraft[]>(
    initial.goals.map((goal) => ({
      playerId: goal.playerId,
      playerName: goal.playerName,
      teamId: goal.teamId,
      minute: goal.minute == null ? "" : String(goal.minute),
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [scoresheet, setScoresheet] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeScoresheet, setRemoveScoresheet] = useState(false);

  const players = useMemo(() => [...homePlayers, ...awayPlayers], [homePlayers, awayPlayers]);
  const isDraw = Number(homeScore) === Number(awayScore);

  function addGoal(teamId: string) {
    setGoals((current) => [...current, { playerId: "", playerName: "", teamId, minute: "" }]);
  }

  function playersOf(teamId: string) {
    return players.filter((player) => player.teamId === teamId);
  }

  function setGoalPlayer(index: number, playerId: string, teamId: string) {
    const selected = playersOf(teamId).find((player) => player.id === playerId);
    setGoals((current) =>
      current.map((item, i) =>
        i === index
          ? { ...item, playerId, playerName: selected?.name ?? "" }
          : item,
      ),
    );
  }

  function setGoalName(index: number, playerName: string, teamId: string) {
    const match = playersOf(teamId).find(
      (player) => player.name.toLowerCase() === playerName.trim().toLowerCase(),
    );
    setGoals((current) =>
      current.map((item, i) =>
        i === index
          ? { ...item, playerName, playerId: match?.id ?? "" }
          : item,
      ),
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const when = fromBogotaDateTimeLocal(scheduledAt);
      if (!when) {
        setError("La fecha y hora no son válidas.");
        return;
      }
      if (goals.some((goal) => !goal.playerId && !goal.playerName.trim())) {
        setError("Cada gol necesita un jugador de la lista o un nombre nuevo.");
        return;
      }
      const result = await saveMatchResultAction({
        matchId,
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
        winnerId: knockout && isDraw ? winnerId : undefined,
        scheduledAt: when.toISOString(),
        goals: goals.map((goal) => ({
          playerId: goal.playerId || undefined,
          playerName: goal.playerName,
          teamId: goal.teamId,
          minute: goal.minute === "" ? null : Number(goal.minute),
        })),
        scoresheet,
        removeScoresheet,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="card space-y-5 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-semibold">Goles {homeTeam.name}</span>
          <input className="field" type="number" min={0} value={homeScore} onChange={(e) => setHomeScore(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold">Goles {awayTeam.name}</span>
          <input className="field" type="number" min={0} value={awayScore} onChange={(e) => setAwayScore(e.target.value)} />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-sm font-semibold">Fecha y hora (Bogotá)</span>
        <input className="field" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
      </label>
      {knockout && isDraw ? (
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Ganador por penales</span>
          <select className="field" value={winnerId} onChange={(e) => setWinnerId(e.target.value)}>
            <option value="">Selecciona</option>
            <option value={homeTeam.id}>{homeTeam.name}</option>
            <option value={awayTeam.id}>{awayTeam.name}</option>
          </select>
        </label>
      ) : null}

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="display text-xl">Goleadores</h3>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost text-sm" onClick={() => addGoal(homeTeam.id)}>
              Gol {homeTeam.name}
            </button>
            <button type="button" className="btn btn-ghost text-sm" onClick={() => addGoal(awayTeam.id)}>
              Gol {awayTeam.name}
            </button>
          </div>
        </div>
        <p className="mb-3 text-sm text-muted">
          Elige un jugador del desplegable o escribe un nombre. Si no existe, se crea en ese equipo al
          guardar.
        </p>
        <div className="space-y-2">
          {goals.map((goal, index) => {
            const options = playersOf(goal.teamId);
            const teamName = goal.teamId === homeTeam.id ? homeTeam.name : awayTeam.name;
            return (
              <div key={`${goal.teamId}-${index}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem_auto]">
                <select
                  className="field"
                  value={goal.playerId}
                  onChange={(e) => setGoalPlayer(index, e.target.value, goal.teamId)}
                >
                  <option value="">Lista · {teamName}</option>
                  {options.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
                <input
                  className="field"
                  placeholder="O escribe el nombre"
                  value={goal.playerName}
                  onChange={(e) => setGoalName(index, e.target.value, goal.teamId)}
                />
                <input
                  className="field"
                  type="number"
                  min={1}
                  placeholder="Min"
                  value={goal.minute}
                  onChange={(e) =>
                    setGoals((current) =>
                      current.map((item, i) => (i === index ? { ...item, minute: e.target.value } : item)),
                    )
                  }
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setGoals((current) => current.filter((_, i) => i !== index))}
                >
                  Quitar
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="display text-xl">Foto de la planilla</h3>
        <p className="text-sm text-muted">
          Toma o sube una foto de la planilla para dejar evidencia del marcador.
        </p>
        {initial.scoresheet && !removeScoresheet && !preview ? (
          <p className="text-sm font-semibold text-lime">
            Ya hay una planilla cargada: {initial.scoresheet.fileName}
          </p>
        ) : null}
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Vista previa de la planilla" className="max-h-72 w-full rounded-xl object-contain bg-black/5" />
        ) : initial.scoresheet && !removeScoresheet ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/planillas/${matchId}`}
            alt="Planilla actual"
            className="max-h-72 w-full rounded-xl object-contain bg-black/5"
          />
        ) : null}
        <input
          className="field"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setScoresheet(file);
            setRemoveScoresheet(false);
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
        />
        {initial.scoresheet ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={removeScoresheet && !scoresheet}
              onChange={(event) => {
                setRemoveScoresheet(event.target.checked);
                if (event.target.checked) {
                  setScoresheet(null);
                  setPreview(null);
                }
              }}
            />
            Quitar la planilla actual
          </label>
        ) : null}
      </div>

      {error ? <p className="font-semibold text-red-400">{error}</p> : null}
      <button type="button" className="btn btn-lime" disabled={pending} onClick={submit}>
        {pending ? "Guardando..." : "Guardar resultado"}
      </button>
    </div>
  );
}
