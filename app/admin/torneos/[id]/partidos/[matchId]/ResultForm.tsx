"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetMatchResultAction, saveMatchResultAction } from "@/lib/actions/tournaments";
import { CardWarning } from "@/components/CardWarning";
import { useAskConfirm } from "@/components/ConfirmDialog";
import { playerLabel } from "@/lib/format";
import { fromBogotaDateTimeLocal, toBogotaDateTimeLocal } from "@/lib/tournament/dates";

type Player = { id: string; name: string; number: number | null; teamId: string };
type GoalDraft = { playerId: string; playerName: string; teamId: string; count: string };
type CardDraft = {
  playerId: string;
  playerName: string;
  teamId: string;
  type: "YELLOW" | "RED";
  paid: boolean;
};

function groupGoals(goals: { playerId: string; playerName: string; teamId: string }[]): GoalDraft[] {
  const grouped: GoalDraft[] = [];
  for (const goal of goals) {
    const match = grouped.find(
      (item) =>
        item.teamId === goal.teamId &&
        ((goal.playerId && item.playerId === goal.playerId) ||
          (!goal.playerId && item.playerName.toLowerCase() === goal.playerName.toLowerCase())),
    );
    if (match) match.count = String(Number(match.count) + 1);
    else grouped.push({ playerId: goal.playerId, playerName: goal.playerName, teamId: goal.teamId, count: "1" });
  }
  return grouped;
}

function scoredIn(goals: GoalDraft[], teamId: string) {
  return goals.filter((goal) => goal.teamId === teamId).reduce((sum, goal) => sum + (Number(goal.count) || 0), 0);
}

function Stepper({
  value,
  onChange,
  min = 0,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  label: string;
}) {
  return (
    <div className="mt-3 flex items-center justify-center gap-3">
      <button
        type="button"
        aria-label={`Quitar gol a ${label}`}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#232a45] text-2xl leading-none text-cream disabled:opacity-30"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <p className="display w-14 text-center text-5xl leading-none text-lime">{value}</p>
      <button
        type="button"
        aria-label={`Sumar gol a ${label}`}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-lime text-2xl leading-none text-pitch"
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}

export function ResultForm({
  matchId,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  initial,
  knockout,
  canSchedule = true,
  cardWarnings,
}: {
  matchId: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  homePlayers: Player[];
  awayPlayers: Player[];
  knockout: boolean;
  canSchedule?: boolean;
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
    goals: { playerId: string; playerName: string; teamId: string }[];
    cards: {
      playerId: string;
      playerName: string;
      teamId: string;
      type: "YELLOW" | "RED";
      paid: boolean;
    }[];
    scoresheet: { fileName: string; uploadedAt: Date | string } | null;
  };
}) {
  const router = useRouter();
  const ask = useAskConfirm();
  const [homeScore, setHomeScore] = useState(String(initial.homeScore ?? 0));
  const [awayScore, setAwayScore] = useState(String(initial.awayScore ?? 0));
  const [homePenalties, setHomePenalties] = useState(String(initial.homePenalties ?? ""));
  const [awayPenalties, setAwayPenalties] = useState(String(initial.awayPenalties ?? ""));
  const [scheduledAt, setScheduledAt] = useState(toBogotaDateTimeLocal(new Date(initial.scheduledAt)));
  const [venue, setVenue] = useState(initial.venue);
  const [goals, setGoals] = useState<GoalDraft[]>(() => groupGoals(initial.goals));
  const [cards, setCards] = useState<CardDraft[]>(
    initial.cards.map((card) => ({
      playerId: card.playerId,
      playerName: card.playerName,
      teamId: card.teamId,
      type: card.type,
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
  const homeGoalsCount = Number(homeScore) || 0;
  const awayGoalsCount = Number(awayScore) || 0;
  const isDraw = homeGoalsCount === awayGoalsCount;
  const closed = initial.status === "PLAYED" || initial.status === "WALKOVER";
  const homeAssigned = scoredIn(goals, homeTeam.id);
  const awayAssigned = scoredIn(goals, awayTeam.id);

  useEffect(() => {
    document.body.classList.add("has-result-bar");
    return () => document.body.classList.remove("has-result-bar");
  }, []);

  function playersOf(teamId: string) {
    return players.filter((player) => player.teamId === teamId);
  }

  function bumpPlayerGoal(teamId: string, player: Player, delta: number) {
    const maxGoals = teamId === homeTeam.id ? homeGoalsCount : awayGoalsCount;
    setGoals((current) => {
      const assigned = scoredIn(current, teamId);
      const index = current.findIndex((item) => item.teamId === teamId && item.playerId === player.id);
      if (index < 0) {
        if (delta <= 0 || assigned >= maxGoals) return current;
        return [...current, { playerId: player.id, playerName: player.name, teamId, count: "1" }];
      }
      const next = Number(current[index].count) + delta;
      if (delta > 0 && assigned >= maxGoals) return current;
      if (next <= 0) return current.filter((_, i) => i !== index);
      return current.map((item, i) => (i === index ? { ...item, count: String(next) } : item));
    });
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

  async function submitPlayed() {
    setError(null);
    setMessage(null);
    const when = canSchedule ? fromBogotaDateTimeLocal(scheduledAt) : null;
    if (canSchedule && !when) {
      setError("La fecha y hora no son válidas.");
      return;
    }
    if (goals.some((goal) => !goal.playerId && !goal.playerName.trim())) {
      setError("Cada goleador necesita un jugador de la lista o un nombre nuevo.");
      return;
    }
    if (goals.some((goal) => !Number.isInteger(Number(goal.count)) || Number(goal.count) < 1)) {
      setError("Cada goleador necesita al menos 1 gol.");
      return;
    }
    if (homeAssigned > homeGoalsCount) {
      setError(`${homeTeam.name} tiene ${homeAssigned} goles anotados y el marcador es ${homeGoalsCount}.`);
      return;
    }
    if (awayAssigned > awayGoalsCount) {
      setError(`${awayTeam.name} tiene ${awayAssigned} goles anotados y el marcador es ${awayGoalsCount}.`);
      return;
    }
    if (cards.some((card) => !card.playerId && !card.playerName.trim())) {
      setError("Cada tarjeta necesita un jugador de la lista o un nombre nuevo.");
      return;
    }
    const scoreText = `${homeTeam.name} ${homeGoalsCount} – ${awayGoalsCount} ${awayTeam.name}`;
    const extra =
      knockout && isDraw && homePenalties !== "" && awayPenalties !== ""
        ? ` (${homePenalties}-${awayPenalties} en penales)`
        : "";
    const ok = closed
      ? await ask({
          title: "Corregir resultado",
          message: `¿Corregir el resultado a ${scoreText}${extra}?\nSe reemplazan goles y tarjetas.`,
          confirmLabel: "Corregir",
        })
      : await ask({
          title: "Guardar resultado",
          message: `¿Guardar el resultado ${scoreText}${extra}?`,
          confirmLabel: "Guardar",
        });
    if (!ok) return;
    startTransition(async () => {
      const result = await saveMatchResultAction({
        matchId,
        outcome: "PLAYED",
        homeScore: homeGoalsCount,
        awayScore: awayGoalsCount,
        homePenalties: knockout && isDraw && homePenalties !== "" ? Number(homePenalties) : null,
        awayPenalties: knockout && isDraw && awayPenalties !== "" ? Number(awayPenalties) : null,
        scheduledAt: canSchedule && when ? when.toISOString() : undefined,
        venue: canSchedule ? venue : undefined,
        goals: goals.flatMap((goal) =>
          Array.from({ length: Number(goal.count) }, () => ({
            playerId: goal.playerId || undefined,
            playerName: goal.playerName,
            teamId: goal.teamId,
          })),
        ),
        cards: cards.map((card) => ({
          playerId: card.playerId || undefined,
          playerName: card.playerName,
          teamId: card.teamId,
          type: card.type,
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

  async function submitWalkover(winnerId: string, winnerName: string) {
    const ok = await ask({
      title: "Walkover",
      message: `¿Dar el partido por W.O. a favor de ${winnerName}?\nQueda 3-0 y no se registran goles.`,
      confirmLabel: "Confirmar W.O.",
    });
    if (!ok) return;
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

  async function resetResult() {
    const ok = await ask({
      title: "Anular resultado",
      message: "¿Anular el resultado? El partido vuelve a programado.\nSe borran goles y tarjetas.",
      confirmLabel: "Anular",
      danger: true,
    });
    if (!ok) return;
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

  const saveLabel = pending
    ? "Guardando..."
    : closed
      ? `Corregir ${homeGoalsCount} – ${awayGoalsCount}`
      : `Guardar ${homeGoalsCount} – ${awayGoalsCount}`;

  function goalIndex(teamId: string, localIndex: number) {
    let seen = -1;
    return goals.findIndex((goal) => {
      if (goal.teamId !== teamId) return false;
      seen += 1;
      return seen === localIndex;
    });
  }

  function cardIndex(teamId: string, localIndex: number) {
    let seen = -1;
    return cards.findIndex((card) => {
      if (card.teamId !== teamId) return false;
      seen += 1;
      return seen === localIndex;
    });
  }

  return (
    <div className="space-y-4">
      {initial.status === "SCHEDULED" ? <CardWarning rows={cardWarnings} canMarkPaid /> : null}

      <section className="card p-4 sm:p-5">
        <p className="text-center text-xs font-bold uppercase tracking-[0.18em] text-lime">Marcador</p>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <div className="min-w-0 text-center">
            <p className="display text-base leading-tight sm:text-lg">{homeTeam.name}</p>
            <Stepper
              label={homeTeam.name}
              value={homeGoalsCount}
              onChange={(next) => setHomeScore(String(next))}
            />
          </div>
          <p className="display mt-10 text-2xl text-muted">–</p>
          <div className="min-w-0 text-center">
            <p className="display text-base leading-tight sm:text-lg">{awayTeam.name}</p>
            <Stepper
              label={awayTeam.name}
              value={awayGoalsCount}
              onChange={(next) => setAwayScore(String(next))}
            />
          </div>
        </div>
        {knockout && isDraw ? (
          <div className="mt-5 rounded-2xl bg-black/20 p-3">
            <p className="text-center text-sm font-semibold">Penales</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-xs text-muted">{homeTeam.name}</p>
                <Stepper
                  label={`penales ${homeTeam.name}`}
                  value={Number(homePenalties) || 0}
                  onChange={(next) => setHomePenalties(String(next))}
                />
              </div>
              <div className="text-center">
                <p className="text-xs text-muted">{awayTeam.name}</p>
                <Stepper
                  label={`penales ${awayTeam.name}`}
                  value={Number(awayPenalties) || 0}
                  onChange={(next) => setAwayPenalties(String(next))}
                />
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-muted">El que meta más penales gana.</p>
          </div>
        ) : null}
      </section>

      <TeamGoals
        team={homeTeam}
        players={homePlayers}
        goals={goals.filter((goal) => goal.teamId === homeTeam.id)}
        assigned={homeAssigned}
        score={homeGoalsCount}
        onBump={(player, delta) => bumpPlayerGoal(homeTeam.id, player, delta)}
        onAddOther={() =>
          setGoals((current) => [...current, { playerId: "", playerName: "", teamId: homeTeam.id, count: "1" }])
        }
        onName={(index, name) => setGoalName(goalIndex(homeTeam.id, index), name, homeTeam.id)}
        onPlayer={(index, playerId) => setGoalPlayer(goalIndex(homeTeam.id, index), playerId, homeTeam.id)}
        onCount={(index, count) =>
          setGoals((current) => current.map((item, i) => (i === goalIndex(homeTeam.id, index) ? { ...item, count } : item)))
        }
        onRemove={(index) => setGoals((current) => current.filter((_, i) => i !== goalIndex(homeTeam.id, index)))}
      />

      <TeamGoals
        team={awayTeam}
        players={awayPlayers}
        goals={goals.filter((goal) => goal.teamId === awayTeam.id)}
        assigned={awayAssigned}
        score={awayGoalsCount}
        onBump={(player, delta) => bumpPlayerGoal(awayTeam.id, player, delta)}
        onAddOther={() =>
          setGoals((current) => [...current, { playerId: "", playerName: "", teamId: awayTeam.id, count: "1" }])
        }
        onName={(index, name) => setGoalName(goalIndex(awayTeam.id, index), name, awayTeam.id)}
        onPlayer={(index, playerId) => setGoalPlayer(goalIndex(awayTeam.id, index), playerId, awayTeam.id)}
        onCount={(index, count) =>
          setGoals((current) => current.map((item, i) => (i === goalIndex(awayTeam.id, index) ? { ...item, count } : item)))
        }
        onRemove={(index) => setGoals((current) => current.filter((_, i) => i !== goalIndex(awayTeam.id, index)))}
      />

      <TeamCards
        team={homeTeam}
        players={homePlayers}
        cards={cards.filter((card) => card.teamId === homeTeam.id)}
        onAdd={() =>
          setCards((current) => [
            ...current,
            { playerId: "", playerName: "", teamId: homeTeam.id, type: "YELLOW", paid: false },
          ])
        }
        onPlayer={(index, playerId) => setCardPlayer(cardIndex(homeTeam.id, index), playerId, homeTeam.id)}
        onName={(index, name) => setCardName(cardIndex(homeTeam.id, index), name, homeTeam.id)}
        onChange={(index, patch) =>
          setCards((current) => current.map((item, i) => (i === cardIndex(homeTeam.id, index) ? { ...item, ...patch } : item)))
        }
        onRemove={(index) => setCards((current) => current.filter((_, i) => i !== cardIndex(homeTeam.id, index)))}
      />

      <TeamCards
        team={awayTeam}
        players={awayPlayers}
        cards={cards.filter((card) => card.teamId === awayTeam.id)}
        onAdd={() =>
          setCards((current) => [
            ...current,
            { playerId: "", playerName: "", teamId: awayTeam.id, type: "YELLOW", paid: false },
          ])
        }
        onPlayer={(index, playerId) => setCardPlayer(cardIndex(awayTeam.id, index), playerId, awayTeam.id)}
        onName={(index, name) => setCardName(cardIndex(awayTeam.id, index), name, awayTeam.id)}
        onChange={(index, patch) =>
          setCards((current) => current.map((item, i) => (i === cardIndex(awayTeam.id, index) ? { ...item, ...patch } : item)))
        }
        onRemove={(index) => setCards((current) => current.filter((_, i) => i !== cardIndex(awayTeam.id, index)))}
      />

      <section className="card space-y-3 p-4 sm:p-5">
        <h3 className="display text-xl">Foto de la planilla</h3>
        <p className="text-sm text-muted">Opcional. Sirve como evidencia del marcador.</p>
        {initial.scoresheet && !removeScoresheet && !preview ? (
          <p className="text-sm font-semibold text-lime">Ya hay una planilla: {initial.scoresheet.fileName}</p>
        ) : null}
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Vista previa de la planilla" className="max-h-72 w-full rounded-xl bg-black/5 object-contain" />
        ) : initial.scoresheet && !removeScoresheet ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/planillas/${matchId}`} alt="Planilla actual" className="max-h-72 w-full rounded-xl bg-black/5 object-contain" />
        ) : null}
        <label className="btn btn-dark w-full cursor-pointer">
          {scoresheet ? "Cambiar foto" : "Tomar o subir foto"}
          <input
            className="sr-only"
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
        </label>
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
      </section>

      {canSchedule ? (
        <details className="card p-4 sm:p-5">
          <summary className="cursor-pointer text-sm font-bold">Fecha y cancha</summary>
          <div className="mt-3 space-y-3">
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
          </div>
        </details>
      ) : null}

      <details className="card p-4 sm:p-5">
        <summary className="cursor-pointer text-sm font-bold">Otras acciones</summary>
        <div className="mt-3 flex flex-col gap-2">
          <button type="button" className="btn btn-dark w-full" disabled={pending} onClick={() => submitWalkover(homeTeam.id, homeTeam.name)}>
            W.O. {homeTeam.name}
          </button>
          <button type="button" className="btn btn-dark w-full" disabled={pending} onClick={() => submitWalkover(awayTeam.id, awayTeam.name)}>
            W.O. {awayTeam.name}
          </button>
          {closed ? (
            <button type="button" className="btn btn-ghost w-full text-red-400" disabled={pending} onClick={resetResult}>
              Anular resultado
            </button>
          ) : null}
        </div>
      </details>

      {error ? <p className="font-semibold text-red-400">{error}</p> : null}
      {message ? <p className="font-semibold text-lime">{message}</p> : null}

      <div className="hidden sm:block">
        <button type="button" className="btn btn-lime w-full" disabled={pending} onClick={submitPlayed}>
          {saveLabel}
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-lime bg-[#0c1020] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
        {error ? <p className="mb-2 text-center text-sm font-semibold text-red-400">{error}</p> : null}
        <button type="button" className="btn btn-lime w-full" disabled={pending} onClick={submitPlayed}>
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

function TeamGoals({
  team,
  players,
  goals,
  assigned,
  score,
  onBump,
  onAddOther,
  onName,
  onPlayer,
  onCount,
  onRemove,
}: {
  team: { id: string; name: string };
  players: Player[];
  goals: GoalDraft[];
  assigned: number;
  score: number;
  onBump: (player: Player, delta: number) => void;
  onAddOther: () => void;
  onName: (index: number, name: string) => void;
  onPlayer: (index: number, playerId: string) => void;
  onCount: (index: number, count: string) => void;
  onRemove: (index: number) => void;
}) {
  const extras = goals.filter((goal) => !goal.playerId);
  const over = assigned > score;

  return (
    <section className="card space-y-3 p-4 sm:p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="display text-xl">Goles · {team.name}</h3>
          <p className={`text-sm ${over ? "font-semibold text-red-400" : "text-muted"}`}>
            {assigned} de {score} asignados
            {over ? " · quita goles" : ""}
          </p>
        </div>
      </div>
      {score === 0 ? (
        <p className="text-sm text-muted">Primero suma los goles en el marcador.</p>
      ) : players.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {players.map((player) => {
            const row = goals.find((goal) => goal.playerId === player.id);
            const count = Number(row?.count) || 0;
            return (
              <div key={player.id} className="flex overflow-hidden rounded-full border border-white/10">
                {count > 0 ? (
                  <button
                    type="button"
                    className="bg-[#232a45] px-3 py-2 text-lg leading-none"
                    aria-label={`Quitar gol de ${player.name}`}
                    onClick={() => onBump(player, -1)}
                  >
                    −
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`px-3 py-2 text-sm font-bold ${count > 0 ? "bg-lime text-pitch" : "bg-card text-cream"}`}
                  onClick={() => onBump(player, 1)}
                >
                  {playerLabel(player.name, player.number)}
                  {count > 0 ? ` · ${count}` : ""}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted">Este equipo aún no tiene jugadores. Escribe el nombre.</p>
      )}
      {extras.map((goal) => {
        const extraIndex = goals.indexOf(goal);
        return (
          <div key={`extra-${extraIndex}`} className="space-y-2 rounded-2xl bg-black/20 p-3">
            <select className="field" value="" onChange={(event) => onPlayer(extraIndex, event.target.value)}>
              <option value="">Elegir de la lista</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {playerLabel(player.name, player.number)}
                </option>
              ))}
            </select>
            <input
              className="field"
              placeholder="O escribe el nombre"
              value={goal.playerName}
              onChange={(event) => onName(extraIndex, event.target.value)}
            />
            <div className="flex gap-2">
              <input
                className="field"
                type="number"
                min={1}
                value={goal.count}
                onChange={(event) => onCount(extraIndex, event.target.value)}
              />
              <button type="button" className="btn btn-ghost shrink-0" onClick={() => onRemove(extraIndex)}>
                Quitar
              </button>
            </div>
          </div>
        );
      })}
      <button type="button" className="btn btn-ghost w-full text-sm" onClick={onAddOther}>
        Gol de alguien que no está en la lista
      </button>
    </section>
  );
}

function TeamCards({
  team,
  players,
  cards,
  onAdd,
  onPlayer,
  onName,
  onChange,
  onRemove,
}: {
  team: { id: string; name: string };
  players: Player[];
  cards: CardDraft[];
  onAdd: () => void;
  onPlayer: (index: number, playerId: string) => void;
  onName: (index: number, name: string) => void;
  onChange: (index: number, patch: Partial<CardDraft>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <section className="card space-y-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="display text-xl">Tarjetas · {team.name}</h3>
        <button type="button" className="btn btn-ghost shrink-0 text-sm" onClick={onAdd}>
          Agregar
        </button>
      </div>
      {cards.length === 0 ? <p className="text-sm text-muted">Sin tarjetas.</p> : null}
      {cards.map((card, index) => (
        <div key={`${team.id}-card-${index}`} className="space-y-2 rounded-2xl bg-black/20 p-3">
          <select className="field" value={card.playerId} onChange={(event) => onPlayer(index, event.target.value)}>
            <option value="">Jugador de la lista</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {playerLabel(player.name, player.number)}
              </option>
            ))}
          </select>
          <input
            className="field"
            placeholder="O escribe el nombre"
            value={card.playerName}
            onChange={(event) => onName(index, event.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`rounded-full px-3 py-3 text-sm font-bold ${
                card.type === "YELLOW" ? "bg-lime text-pitch" : "bg-[#232a45] text-cream"
              }`}
              onClick={() => onChange(index, { type: "YELLOW" })}
            >
              Amarilla
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-3 text-sm font-bold ${
                card.type === "RED" ? "bg-red-500 text-white" : "bg-[#232a45] text-cream"
              }`}
              onClick={() => onChange(index, { type: "RED", paid: false })}
            >
              Roja
            </button>
          </div>
          {card.type === "YELLOW" ? (
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={card.paid} onChange={(event) => onChange(index, { paid: event.target.checked })} />
              Pagada
            </label>
          ) : null}
          <button type="button" className="btn btn-ghost w-full" onClick={() => onRemove(index)}>
            Quitar
          </button>
        </div>
      ))}
    </section>
  );
}
