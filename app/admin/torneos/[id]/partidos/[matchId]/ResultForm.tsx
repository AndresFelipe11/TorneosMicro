"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetMatchResultAction, saveMatchResultAction } from "@/lib/actions/tournaments";
import { CardWarning } from "@/components/CardWarning";
import { playerLabel } from "@/lib/format";
import { fromBogotaDateTimeLocal, toBogotaDateTimeLocal } from "@/lib/tournament/dates";

type Player = { id: string; name: string; number: number | null; teamId: string };
type GoalDraft = { playerId: string; playerName: string; teamId: string; minute: string };
type CardDraft = {
  playerId: string;
  playerName: string;
  teamId: string;
  type: "YELLOW" | "RED";
  minute: string;
  paid: boolean;
};

export function ResultForm({
  matchId,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  initial,
  knockout,
  cardWarnings,
}: {
  matchId: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  homePlayers: Player[];
  awayPlayers: Player[];
  knockout: boolean;
  cardWarnings: {
    playerName: string;
    playerNumber: number | null;
    teamName: string;
    yellows: number;
    reds: number;
    unpaidYellowIds: string[];
  }[];
  initial: {
    status: "SCHEDULED" | "PLAYED" | "WALKOVER";
    homeScore: number | null;
    awayScore: number | null;
    homePenalties: number | null;
    awayPenalties: number | null;
    winnerId: string | null;
    scheduledAt: Date | string;
    venue: string;
    goals: { playerId: string; playerName: string; teamId: string; minute: number | null }[];
    cards: {
      playerId: string;
      playerName: string;
      teamId: string;
      type: "YELLOW" | "RED";
      minute: number | null;
      paid: boolean;
    }[];
    scoresheet: { fileName: string; uploadedAt: Date | string } | null;
  };
}) {
  const router = useRouter();
  const [homeScore, setHomeScore] = useState(String(initial.homeScore ?? 0));
  const [awayScore, setAwayScore] = useState(String(initial.awayScore ?? 0));
  const [homePenalties, setHomePenalties] = useState(String(initial.homePenalties ?? ""));
  const [awayPenalties, setAwayPenalties] = useState(String(initial.awayPenalties ?? ""));
  const [scheduledAt, setScheduledAt] = useState(toBogotaDateTimeLocal(new Date(initial.scheduledAt)));
  const [venue, setVenue] = useState(initial.venue);
  const [goals, setGoals] = useState<GoalDraft[]>(
    initial.goals.map((goal) => ({
      playerId: goal.playerId,
      playerName: goal.playerName,
      teamId: goal.teamId,
      minute: goal.minute == null ? "" : String(goal.minute),
    })),
  );
  const [cards, setCards] = useState<CardDraft[]>(
    initial.cards.map((card) => ({
      playerId: card.playerId,
      playerName: card.playerName,
      teamId: card.teamId,
      type: card.type,
      minute: card.minute == null ? "" : String(card.minute),
      paid: card.paid,
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [scoresheet, setScoresheet] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeScoresheet, setRemoveScoresheet] = useState(false);

  const players = useMemo(() => [...homePlayers, ...awayPlayers], [homePlayers, awayPlayers]);
  const isDraw = Number(homeScore) === Number(awayScore);
  const closed = initial.status === "PLAYED" || initial.status === "WALKOVER";

  function playersOf(teamId: string) {
    return players.filter((player) => player.teamId === teamId);
  }

  function setGoalPlayer(index: number, playerId: string, teamId: string) {
    const selected = playersOf(teamId).find((player) => player.id === playerId);
    setGoals((current) =>
      current.map((item, i) =>
        i === index ? { ...item, playerId, playerName: selected?.name ?? "" } : item,
      ),
    );
  }

  function setGoalName(index: number, playerName: string, teamId: string) {
    const found = playersOf(teamId).find((player) => player.name.toLowerCase() === playerName.trim().toLowerCase());
    setGoals((current) =>
      current.map((item, i) =>
        i === index ? { ...item, playerName, playerId: found?.id ?? "" } : item,
      ),
    );
  }

  function setCardPlayer(index: number, playerId: string, teamId: string) {
    const selected = playersOf(teamId).find((player) => player.id === playerId);
    setCards((current) =>
      current.map((item, i) =>
        i === index ? { ...item, playerId, playerName: selected?.name ?? "" } : item,
      ),
    );
  }

  function setCardName(index: number, playerName: string, teamId: string) {
    const found = playersOf(teamId).find((player) => player.name.toLowerCase() === playerName.trim().toLowerCase());
    setCards((current) =>
      current.map((item, i) =>
        i === index ? { ...item, playerName, playerId: found?.id ?? "" } : item,
      ),
    );
  }

  function submitPlayed() {
    setError(null);
    setMessage(null);
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
      if (cards.some((card) => !card.playerId && !card.playerName.trim())) {
        setError("Cada tarjeta necesita un jugador de la lista o un nombre nuevo.");
        return;
      }
      const result = await saveMatchResultAction({
        matchId,
        outcome: "PLAYED",
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
        homePenalties: knockout && isDraw && homePenalties !== "" ? Number(homePenalties) : null,
        awayPenalties: knockout && isDraw && awayPenalties !== "" ? Number(awayPenalties) : null,
        scheduledAt: when.toISOString(),
        venue,
        goals: goals.map((goal) => ({
          playerId: goal.playerId || undefined,
          playerName: goal.playerName,
          teamId: goal.teamId,
          minute: goal.minute === "" ? null : Number(goal.minute),
        })),
        cards: cards.map((card) => ({
          playerId: card.playerId || undefined,
          playerName: card.playerName,
          teamId: card.teamId,
          type: card.type,
          minute: card.minute === "" ? null : Number(card.minute),
          paid: card.type === "YELLOW" && card.paid,
        })),
        scoresheet,
        removeScoresheet,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setMessage("Resultado guardado.");
      router.refresh();
    });
  }

  function submitWalkover(winnerId: string, winnerName: string) {
    if (!confirm(`¿Dar el partido por W.O. a favor de ${winnerName}? Queda 3-0 y no se registran goles.`)) {
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const when = fromBogotaDateTimeLocal(scheduledAt);
      const result = await saveMatchResultAction({
        matchId,
        outcome: "WALKOVER",
        walkoverWinnerId: winnerId,
        scheduledAt: when?.toISOString(),
        venue,
        scoresheet,
        removeScoresheet,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setMessage(`W.O. a favor de ${winnerName}.`);
      router.refresh();
    });
  }

  function resetResult() {
    if (!confirm("¿Anular el resultado? El partido vuelve a programado. Se borran goles y tarjetas.")) {
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await resetMatchResultAction(matchId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Resultado anulado.");
      router.refresh();
    });
  }

  return (
    <div className="card space-y-5 p-5">
      {initial.status === "SCHEDULED" ? <CardWarning rows={cardWarnings} canMarkPaid /> : null}

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
      <label className="block space-y-1">
        <span className="text-sm font-semibold">Cancha / sede</span>
        <input
          className="field"
          placeholder="Ej. Cancha 1 · Parque El Salitre"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
        />
      </label>
      {knockout && isDraw ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-semibold">Penales {homeTeam.name}</span>
            <input
              className="field"
              type="number"
              min={0}
              value={homePenalties}
              onChange={(e) => setHomePenalties(e.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold">Penales {awayTeam.name}</span>
            <input
              className="field"
              type="number"
              min={0}
              value={awayPenalties}
              onChange={(e) => setAwayPenalties(e.target.value)}
            />
          </label>
          <p className="sm:col-span-2 text-sm text-muted">El que metió más penales queda como ganador.</p>
        </div>
      ) : null}

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="display text-xl">Goleadores</h3>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost text-sm" onClick={() => setGoals((current) => [...current, { playerId: "", playerName: "", teamId: homeTeam.id, minute: "" }])}>
              Gol {homeTeam.name}
            </button>
            <button type="button" className="btn btn-ghost text-sm" onClick={() => setGoals((current) => [...current, { playerId: "", playerName: "", teamId: awayTeam.id, minute: "" }])}>
              Gol {awayTeam.name}
            </button>
          </div>
        </div>
        <p className="mb-3 text-sm text-muted">
          Elige un jugador del desplegable o escribe un nombre. Si no existe, se crea en ese equipo al guardar.
        </p>
        <div className="space-y-2">
          {goals.map((goal, index) => {
            const options = playersOf(goal.teamId);
            const teamName = goal.teamId === homeTeam.id ? homeTeam.name : awayTeam.name;
            return (
              <div key={`${goal.teamId}-${index}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem_auto]">
                <select className="field" value={goal.playerId} onChange={(e) => setGoalPlayer(index, e.target.value, goal.teamId)}>
                  <option value="">Lista · {teamName}</option>
                  {options.map((player) => (
                    <option key={player.id} value={player.id}>
                      {playerLabel(player.name, player.number)}
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
                    setGoals((current) => current.map((item, i) => (i === index ? { ...item, minute: e.target.value } : item)))
                  }
                />
                <button type="button" className="btn btn-ghost" onClick={() => setGoals((current) => current.filter((_, i) => i !== index))}>
                  Quitar
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="display text-xl">Tarjetas</h3>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost text-sm"
              onClick={() =>
                setCards((current) => [
                  ...current,
                  { playerId: "", playerName: "", teamId: homeTeam.id, type: "YELLOW", minute: "", paid: false },
                ])
              }
            >
              Tarjeta {homeTeam.name}
            </button>
            <button
              type="button"
              className="btn btn-ghost text-sm"
              onClick={() =>
                setCards((current) => [
                  ...current,
                  { playerId: "", playerName: "", teamId: awayTeam.id, type: "YELLOW", minute: "", paid: false },
                ])
              }
            >
              Tarjeta {awayTeam.name}
            </button>
          </div>
        </div>
        <p className="mb-3 text-sm text-muted">
          La amarilla avisa en el próximo partido programado hasta que la marques como pagada.
        </p>
        <div className="space-y-2">
          {cards.map((card, index) => {
            const options = playersOf(card.teamId);
            const teamName = card.teamId === homeTeam.id ? homeTeam.name : awayTeam.name;
            return (
              <div
                key={`${card.teamId}-card-${index}`}
                className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem_6rem_auto_auto]"
              >
                <select className="field" value={card.playerId} onChange={(e) => setCardPlayer(index, e.target.value, card.teamId)}>
                  <option value="">Lista · {teamName}</option>
                  {options.map((player) => (
                    <option key={player.id} value={player.id}>
                      {playerLabel(player.name, player.number)}
                    </option>
                  ))}
                </select>
                <input
                  className="field"
                  placeholder="O escribe el nombre"
                  value={card.playerName}
                  onChange={(e) => setCardName(index, e.target.value, card.teamId)}
                />
                <select
                  className="field"
                  value={card.type}
                  onChange={(e) =>
                    setCards((current) =>
                      current.map((item, i) =>
                        i === index
                          ? { ...item, type: e.target.value as "YELLOW" | "RED", paid: e.target.value === "YELLOW" ? item.paid : false }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="YELLOW">Amarilla</option>
                  <option value="RED">Roja</option>
                </select>
                <input
                  className="field"
                  type="number"
                  min={1}
                  placeholder="Min"
                  value={card.minute}
                  onChange={(e) =>
                    setCards((current) => current.map((item, i) => (i === index ? { ...item, minute: e.target.value } : item)))
                  }
                />
                {card.type === "YELLOW" ? (
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={card.paid}
                      onChange={(e) =>
                        setCards((current) => current.map((item, i) => (i === index ? { ...item, paid: e.target.checked } : item)))
                      }
                    />
                    Pagada
                  </label>
                ) : (
                  <span className="text-sm text-muted">—</span>
                )}
                <button type="button" className="btn btn-ghost" onClick={() => setCards((current) => current.filter((_, i) => i !== index))}>
                  Quitar
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="display text-xl">Foto de la planilla</h3>
        <p className="text-sm text-muted">Toma o sube una foto de la planilla para dejar evidencia del marcador.</p>
        {initial.scoresheet && !removeScoresheet && !preview ? (
          <p className="text-sm font-semibold text-lime">Ya hay una planilla cargada: {initial.scoresheet.fileName}</p>
        ) : null}
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Vista previa de la planilla" className="max-h-72 w-full rounded-xl object-contain bg-black/5" />
        ) : initial.scoresheet && !removeScoresheet ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/planillas/${matchId}`} alt="Planilla actual" className="max-h-72 w-full rounded-xl object-contain bg-black/5" />
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
      {message ? <p className="font-semibold text-lime">{message}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-lime" disabled={pending} onClick={submitPlayed}>
          {pending ? "Guardando..." : closed ? "Corregir resultado" : "Guardar resultado"}
        </button>
        <button type="button" className="btn btn-dark" disabled={pending} onClick={() => submitWalkover(homeTeam.id, homeTeam.name)}>
          W.O. {homeTeam.name}
        </button>
        <button type="button" className="btn btn-dark" disabled={pending} onClick={() => submitWalkover(awayTeam.id, awayTeam.name)}>
          W.O. {awayTeam.name}
        </button>
        {closed ? (
          <button type="button" className="btn btn-ghost text-red-400" disabled={pending} onClick={resetResult}>
            Anular resultado
          </button>
        ) : null}
      </div>
    </div>
  );
}
