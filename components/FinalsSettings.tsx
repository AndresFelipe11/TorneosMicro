"use client";

import { useState, useTransition } from "react";
import { updateTournamentFinalsAction } from "@/lib/actions/tournaments";

type FinalsMode = "NONE" | "KO4" | "KO8" | "QUAD4";

function modeFrom(nextPhase: string, qualifyCount: number): FinalsMode {
  if (nextPhase === "QUADRANGULAR") return "QUAD4";
  if (nextPhase === "KNOCKOUT") return qualifyCount <= 4 ? "KO4" : "KO8";
  return "NONE";
}

function toPayload(mode: FinalsMode) {
  if (mode === "KO4") return { nextPhase: "KNOCKOUT" as const, qualifyCount: 4 };
  if (mode === "KO8") return { nextPhase: "KNOCKOUT" as const, qualifyCount: 8 };
  if (mode === "QUAD4") return { nextPhase: "QUADRANGULAR" as const, qualifyCount: 4 };
  return { nextPhase: "NONE" as const, qualifyCount: 8 };
}

export function FinalsSettings({
  tournamentId,
  nextPhase,
  qualifyCount,
  locked,
}: {
  tournamentId: string;
  nextPhase: "NONE" | "KNOCKOUT" | "QUADRANGULAR";
  qualifyCount: number;
  locked?: boolean;
}) {
  const [mode, setMode] = useState<FinalsMode>(modeFrom(nextPhase, qualifyCount));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="card mb-6 space-y-3 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        startTransition(async () => {
          const result = await updateTournamentFinalsAction({
            tournamentId,
            ...toPayload(mode),
          });
          setMessage(result.error ?? result.message ?? "Listo.");
        });
      }}
    >
      <div>
        <h2 className="display text-2xl">Instancias finales</h2>
        <p className="text-sm text-muted">
          Al terminar la liga, clasifican los primeros de la tabla. Las llaves quedan 1 vs último,
          2 vs penúltimo, y así.
        </p>
      </div>
      <label className="block space-y-1">
        <span className="text-sm font-semibold">Cómo se define el campeón</span>
        <select
          className="field"
          disabled={locked || pending}
          value={mode}
          onChange={(event) => setMode(event.target.value as FinalsMode)}
        >
          <option value="NONE">Solo liga (campeón por tabla)</option>
          <option value="KO4">Semifinales y final (mejores 4)</option>
          <option value="KO8">Cuartos, semis y final (mejores 8)</option>
          <option value="QUAD4">Cuadrangular de los mejores 4</option>
        </select>
      </label>
      {locked ? (
        <p className="text-sm text-muted">Ya hay partidos de la fase final. No se puede cambiar.</p>
      ) : (
        <button className="btn btn-dark" disabled={pending} type="submit">
          {pending ? "Guardando..." : "Guardar instancias finales"}
        </button>
      )}
      {message ? <p className="text-sm font-semibold">{message}</p> : null}
    </form>
  );
}
