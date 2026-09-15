"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAskConfirm } from "@/components/ConfirmDialog";
import { requestPostponeAction } from "@/lib/actions/postpone";
import { formatDateTime } from "@/lib/format";

export function PostponeForm({
  matchId,
  homeTeam,
  awayTeam,
  currentScheduledAt,
  initialLocal,
}: {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  currentScheduledAt: Date | string;
  initialLocal: string;
}) {
  const router = useRouter();
  const ask = useAskConfirm();
  const [proposedAt, setProposedAt] = useState(initialLocal);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-pitch/40 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        startTransition(async () => {
          const ok = await ask({
            title: "Pedir aplazamiento",
            message: `¿Pedir aplazar ${homeTeam} vs ${awayTeam}?\nAhora: ${formatDateTime(currentScheduledAt)}\nEl administrador confirma si se mueve.`,
            confirmLabel: "Enviar petición",
          });
          if (!ok) return;
          const result = await requestPostponeAction({
            matchId,
            reason,
            proposedAt,
          });
          if ("error" in result && result.error) {
            setError(result.error);
            return;
          }
          setMessage(result.message ?? "Petición enviada.");
          setWhatsappUrl(result.whatsappUrl ?? null);
          router.refresh();
        });
      }}
    >
      <p className="text-sm font-semibold">Pedir aplazar este partido</p>
      <label className="block space-y-1">
        <span className="text-sm">Nueva fecha propuesta (Bogotá)</span>
        <input
          className="field"
          type="datetime-local"
          value={proposedAt}
          onChange={(event) => setProposedAt(event.target.value)}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm">Motivo</span>
        <textarea
          className="field min-h-20"
          placeholder="Ej. Nos falta gente ese día, ¿podemos jugar el sábado?"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      {error ? <p className="text-sm font-semibold text-red-400">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-lime">{message}</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button className="btn btn-lime w-full sm:w-auto" disabled={pending} type="submit">
          {pending ? "Enviando..." : "Pedir aplazamiento"}
        </button>
        {whatsappUrl ? (
          <a className="btn btn-dark w-full text-center sm:w-auto" href={whatsappUrl}>
            Avisar por WhatsApp
          </a>
        ) : null}
      </div>
    </form>
  );
}
