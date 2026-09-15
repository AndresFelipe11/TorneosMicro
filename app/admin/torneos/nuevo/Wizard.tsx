"use client";

import { useMemo, useState, useTransition } from "react";
import { useAskConfirm } from "@/components/ConfirmDialog";
import { createTournamentAction } from "@/lib/actions/tournaments";
import { generateTournamentSchedule, withDistributedGroups } from "@/lib/tournament/generate";
import { groupNameAt } from "@/lib/tournament/groups";
import type { NextPhase, TeamInput, TournamentConfig, TournamentFormat } from "@/lib/tournament/types";
import { formatDateTime, phaseLabel, WEEKDAYS, teamNameInput } from "@/lib/format";

function toInputDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function nextSaturday() {
  const date = new Date();
  const add = (6 - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + add);
  return date;
}

function emptyTeam(groupName?: string): TeamInput {
  return { name: "", players: [""], groupName };
}

export function Wizard() {
  const start = nextSaturday();
  const end = new Date(start);
  end.setDate(end.getDate() + 56);

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ask = useAskConfirm();
  const [config, setConfig] = useState<TournamentConfig>({
    name: "",
    startDate: toInputDate(start),
    endDate: toInputDate(end),
    format: "ROUND_ROBIN",
    groupCount: 2,
    qualifyPerGroup: 2,
    nextPhase: "KNOCKOUT",
    playingDays: [0, 6],
    maxMatchesPerDay: 4,
    matchDurationMinutes: 40,
    startTime: "09:00",
    venue: "",
    description: "",
    registrationFee: "",
    prizes: "",
    rulesHighlights: "",
    rules: "",
    teams: [emptyTeam(), emptyTeam(), emptyTeam(), emptyTeam()],
  });

  const prepared = useMemo(
    () => (config.format === "GROUPS" ? withDistributedGroups(config) : config),
    [config],
  );
  const preview = useMemo(() => generateTournamentSchedule(prepared), [prepared]);

  function update<K extends keyof TournamentConfig>(key: K, value: TournamentConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  function setFormat(format: TournamentFormat) {
    setConfig((current) => {
      let teams = current.teams;
      if (format === "QUADRANGULAR") {
        teams = [...current.teams, emptyTeam(), emptyTeam(), emptyTeam(), emptyTeam()].slice(0, 4);
      } else if (teams.length < 4) {
        teams = [...teams, ...Array.from({ length: 4 - teams.length }, () => emptyTeam())];
      }
      return { ...current, format, teams };
    });
  }

  function setTeam(index: number, patch: Partial<TeamInput>) {
    setConfig((current) => ({
      ...current,
      teams: current.teams.map((team, i) => (i === index ? { ...team, ...patch } : team)),
    }));
  }

  function addTeam() {
    const groupName = config.format === "GROUPS" ? groupNameAt(config.teams.length % (config.groupCount ?? 2)) : undefined;
    setConfig((current) => ({ ...current, teams: [...current.teams, emptyTeam(groupName)] }));
  }

  function removeTeam(index: number) {
    setConfig((current) => ({ ...current, teams: current.teams.filter((_, i) => i !== index) }));
  }

  function toggleDay(day: number) {
    update(
      "playingDays",
      config.playingDays.includes(day)
        ? config.playingDays.filter((item) => item !== day)
        : [...config.playingDays, day],
    );
  }

  async function submit() {
    setError(null);
    if (preview.error) {
      setError(preview.error);
      return;
    }
    const title = config.name.trim() || "este torneo";
    const ok = await ask({
      title: "Crear torneo",
      message: `¿Crear ${title} con ${preview.matches.length} partidos?`,
      confirmLabel: "Crear",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await createTournamentAction({
        config: prepared,
        matches: preview.matches,
      });
      if (result?.error) setError(result.error);
    });
  }

  const steps = ["Datos", "Formato", "Equipos", "Fechas", "Calendario"];

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2">
        {steps.map((label, index) => (
          <li
            key={label}
            className={`rounded-full px-3 py-1 text-sm font-bold ${index === step ? "bg-lime text-pitch" : "bg-card"}`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="card space-y-4 p-5">
          <Field label="Nombre del torneo">
            <input className="field" value={config.name} onChange={(e) => update("name", e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Inicio">
              <input className="field" type="date" value={config.startDate} onChange={(e) => update("startDate", e.target.value)} />
            </Field>
            <Field label="Fin">
              <input className="field" type="date" value={config.endDate} onChange={(e) => update("endDate", e.target.value)} />
            </Field>
          </div>
          <Field label="Cancha / sede">
            <input
              className="field"
              placeholder="Ej. Cancha 1 · Parque El Salitre"
              value={config.venue ?? ""}
              onChange={(e) => update("venue", e.target.value)}
            />
          </Field>
          <Field label="Descripción">
            <textarea
              className="field min-h-24"
              placeholder="Cuéntale a los equipos de qué se trata el torneo."
              value={config.description ?? ""}
              onChange={(e) => update("description", e.target.value)}
            />
          </Field>
          <Field label="Valor de la inscripción">
            <textarea
              className="field min-h-20"
              placeholder="Ej. $50.000 por equipo, incluye balón y hidratación."
              value={config.registrationFee ?? ""}
              onChange={(e) => update("registrationFee", e.target.value)}
            />
          </Field>
          <Field label="Premiación">
            <textarea
              className="field min-h-20"
              placeholder="Ej. 1° $400.000 · 2° $200.000 · Goleador medalla."
              value={config.prizes ?? ""}
              onChange={(e) => update("prizes", e.target.value)}
            />
          </Field>
          <Field label="Reglas importantes">
            <textarea
              className="field min-h-24"
              placeholder="Las normas clave que se ven en el resumen: duración, tarjetas, W.O., etc."
              value={config.rulesHighlights ?? ""}
              onChange={(e) => update("rulesHighlights", e.target.value)}
            />
          </Field>
          <Field label="Reglamento completo">
            <textarea
              className="field min-h-40"
              placeholder="Texto completo para la pestaña Reglamento y el PDF."
              value={config.rules ?? ""}
              onChange={(e) => update("rules", e.target.value)}
            />
          </Field>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="card space-y-4 p-5">
          <div className="grid gap-3">
            {(
              [
                ["ROUND_ROBIN", "Todos contra todos", "Un solo partido por pareja, sin ida y vuelta."],
                ["GROUPS", "Fases de grupos", "Grupos ajustables y, si quieres, eliminación o cuadrangular final."],
                ["QUADRANGULAR", "Cuadrangular", "Exactamente 4 equipos, todos contra todos."],
              ] as [TournamentFormat, string, string][]
            ).map(([value, title, help]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormat(value)}
                className={`rounded-2xl border p-4 text-left ${config.format === value ? "border-lime bg-lime/15" : "border-white/10 bg-card"}`}
              >
                <span className="display block text-xl">{title}</span>
                <span className="text-sm text-muted">{help}</span>
              </button>
            ))}
          </div>
          {config.format === "GROUPS" ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Cantidad de grupos">
                <input
                  className="field"
                  type="number"
                  min={2}
                  max={8}
                  value={config.groupCount}
                  onChange={(e) => update("groupCount", Number(e.target.value))}
                />
              </Field>
              <Field label="Clasifican por grupo">
                <input
                  className="field"
                  type="number"
                  min={1}
                  max={4}
                  value={config.qualifyPerGroup}
                  onChange={(e) => update("qualifyPerGroup", Number(e.target.value))}
                />
              </Field>
              <Field label="Fase siguiente">
                <select
                  className="field"
                  value={config.nextPhase}
                  onChange={(e) => update("nextPhase", e.target.value as NextPhase)}
                >
                  <option value="NONE">Solo grupos</option>
                  <option value="KNOCKOUT">Eliminación directa</option>
                  <option value="QUADRANGULAR">Cuadrangular final</option>
                </select>
              </Field>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          {config.teams.map((team, index) => (
            <div key={index} className="card space-y-3 p-4">
              <div className="flex gap-3">
                <input
                  className="field uppercase"
                  placeholder={`Equipo ${index + 1}`}
                  value={team.name}
                  onChange={(e) => setTeam(index, { name: teamNameInput(e.target.value) })}
                />
                {config.format === "GROUPS" ? (
                  <select
                    className="field max-w-40"
                    value={team.groupName ?? groupNameAt(index % (config.groupCount ?? 2))}
                    onChange={(e) => setTeam(index, { groupName: e.target.value })}
                  >
                    {Array.from({ length: config.groupCount ?? 2 }, (_, i) => (
                      <option key={i} value={groupNameAt(i)}>
                        {groupNameAt(i)}
                      </option>
                    ))}
                  </select>
                ) : null}
                <button type="button" className="btn btn-ghost" onClick={() => removeTeam(index)}>
                  Quitar
                </button>
              </div>
              <input
                className="field"
                placeholder="Jugadores separados por coma"
                value={team.players.join(", ")}
                onChange={(e) =>
                  setTeam(index, {
                    players: e.target.value.split(",").map((name) => name.trimStart()),
                  })
                }
              />
            </div>
          ))}
          <button type="button" className="btn btn-dark" onClick={addTeam}>
            Agregar equipo
          </button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="card space-y-4 p-5">
          <p className="text-sm font-semibold">Días de juego</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`rounded-full px-3 py-2 text-sm font-bold ${
                  config.playingDays.includes(day.value) ? "bg-lime text-pitch" : "bg-card"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Partidos por día">
              <input
                className="field"
                type="number"
                min={1}
                max={12}
                value={config.maxMatchesPerDay}
                onChange={(e) => update("maxMatchesPerDay", Number(e.target.value))}
              />
            </Field>
            <Field label="Hora de inicio">
              <input className="field" type="time" value={config.startTime} onChange={(e) => update("startTime", e.target.value)} />
            </Field>
            <Field label="Cancha / sede">
              <input
                className="field"
                placeholder="Ej. Cancha 1 · Parque El Salitre"
                value={config.venue ?? ""}
                onChange={(e) => update("venue", e.target.value)}
              />
            </Field>
          </div>
          <p className="text-sm text-muted">
            Los partidos se programan cada hora. Si el primero es a las 7:00, el siguiente queda a las 8:00.
          </p>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-4">
          <div className="card p-4 text-sm">
            {preview.error ? (
              <p className="font-semibold text-red-400">{preview.error}</p>
            ) : (
              <p>
                Se programaron <strong>{preview.matches.length}</strong> partidos en{" "}
                <strong>{preview.slotsAvailable}</strong> franjas disponibles.
              </p>
            )}
          </div>
          <div className="grid gap-2">
            {preview.matches.map((match, index) => (
              <div key={`${match.homeTeamName}-${match.awayTeamName}-${index}`} className="card p-3">
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
        </div>
      ) : null}

      {error ? <p className="font-semibold text-red-400">{error}</p> : null}

      <div className="flex justify-between">
        <button type="button" className="btn btn-ghost" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>
          Atrás
        </button>
        {step < 4 ? (
          <button type="button" className="btn btn-lime" onClick={() => setStep((value) => value + 1)}>
            Continuar
          </button>
        ) : (
          <button type="button" className="btn btn-lime" disabled={pending} onClick={submit}>
            {pending ? "Guardando..." : "Confirmar torneo"}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}
