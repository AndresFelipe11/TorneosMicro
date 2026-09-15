"use client";

import { useState, useTransition } from "react";
import { useAskConfirm } from "@/components/ConfirmDialog";
import { advancePhaseAction, deleteTournamentAction, finishTournamentAction } from "@/lib/actions/tournaments";

export function AdvanceButton({ tournamentId }: { tournamentId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ask = useAskConfirm();

  return (
    <div className="w-full space-y-2 sm:w-auto">
      <button
        type="button"
        className="btn btn-lime w-full sm:w-auto"
        disabled={pending}
        onClick={async () => {
          const ok = await ask({
            title: "Avanzar de fase",
            message: "¿Avanzar de fase? Se crean los partidos de la siguiente ronda según la clasificación.",
            confirmLabel: "Avanzar",
          });
          if (!ok) return;
          setMessage(null);
          startTransition(async () => {
            const result = await advancePhaseAction(tournamentId);
            setMessage(result.error ?? ("message" in result ? result.message : undefined) ?? "Listo.");
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
  const ask = useAskConfirm();
  return (
    <button
      type="button"
      className="btn btn-dark w-full sm:w-auto"
      disabled={pending}
      onClick={async () => {
        const ok = await ask({
          title: "Finalizar torneo",
          message: "¿Marcar el torneo como finalizado? Ya no se podrán cargar resultados ni reprogramar.",
          confirmLabel: "Finalizar",
          danger: true,
        });
        if (!ok) return;
        startTransition(() => void finishTournamentAction(tournamentId));
      }}
    >
      Marcar finalizado
    </button>
  );
}

export function DeleteTournamentButton({ tournamentId }: { tournamentId: string }) {
  const [pending, startTransition] = useTransition();
  const ask = useAskConfirm();
  return (
    <button
      type="button"
      className="btn btn-ghost w-full text-red-400 sm:w-auto"
      disabled={pending}
      onClick={async () => {
        const ok = await ask({
          title: "Eliminar torneo",
          message: "¿Eliminar este torneo y todos sus partidos?",
          confirmLabel: "Eliminar",
          danger: true,
        });
        if (!ok) return;
        startTransition(() => {
          void deleteTournamentAction(tournamentId);
        });
      }}
    >
      Eliminar torneo
    </button>
  );
}
