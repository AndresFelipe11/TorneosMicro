"use client";

import { useState, useTransition } from "react";
import { advancePhaseAction, deleteTournamentAction, finishTournamentAction } from "@/lib/actions/tournaments";

export function AdvanceButton({ tournamentId }: { tournamentId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn btn-lime"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await advancePhaseAction(tournamentId);
            setMessage(result.error ?? result.message ?? "Listo.");
          });
        }}
      >
        {pending ? "Avanzando..." : "Avanzar de fase"}
      </button>
      {message ? <p className="text-sm font-semibold">{message}</p> : null}
    </div>
  );
}

export function FinishButton({ tournamentId }: { tournamentId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-dark"
      disabled={pending}
      onClick={() => startTransition(() => finishTournamentAction(tournamentId))}
    >
      Marcar finalizado
    </button>
  );
}

export function DeleteTournamentButton({ tournamentId }: { tournamentId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-ghost text-red-400"
      disabled={pending}
      onClick={() => {
        if (!confirm("¿Eliminar este torneo y todos sus partidos?")) return;
        startTransition(() => deleteTournamentAction(tournamentId));
      }}
    >
      Eliminar torneo
    </button>
  );
}
