"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAskConfirm } from "@/components/ConfirmDialog";
import { requestPostponeAction } from "@/lib/actions/postpone";
import { formatDateTime, POSTPONE_WINDOWS, postponeWindowLabel, type PostponeWindowId } from "@/lib/format";

export function PostponeForm({
  matchId,
  homeTeam,
  awayTeam,
  currentScheduledAt,
}: {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  currentScheduledAt: Date | string;
}) {
  const router = useRouter();
  const ask = useAskConfirm();
  const [when, setWhen] = useState<PostponeWindowId | "">("");
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
        if (!when) {
          setError("Elige cuándo pueden jugar.");
          return;
        }
        const whenLabel = postponeWindowLabel(when);
        void (async () => {
          const ok = await ask({
            title: "Pedir aplazamiento",
            message: `¿Pedir aplazar ${homeTeam} vs ${awayTeam}?\nAhora: ${formatDateTime(currentScheduledAt)}\nPiden: ${whenLabel}.\nEl administrador confirma el día y la hora.`,
            confirmLabel: "Enviar petición",
          });
          if (!ok) return;
          startTransition(async () => {
            try {
              const result = await requestPostponeAction({
                matchId,
                window: when,
                reason,
              });
              if ("error" in result && result.error) {
                setError(result.error);
                return;
              }
              setMessage(result.message ?? "Petición enviada.");
              setWhatsappUrl(result.whatsappUrl ?? null);
              router.refresh();
            } catch {
              setError("No se pudo enviar. Intenta de nuevo.");
            }
          });
        })();
      }}
    >
      <p className="text-sm font-semibold">Pedir aplazar este partido</p>
      <fieldset className="space-y-2">
        <legend className="text-sm">¿Cuándo pueden jugar?</legend>
        {POSTPONE_WINDOWS.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 px-3 py-2">
            <input
              type="radio"
              name={`postpone-${matchId}`}
              checked={when === item.id}
              onChange={() => setWhen(item.id)}
            />
            <span className="text-sm font-semibold">{item.label}</span>
          </label>
        ))}
      </fieldset>
      <label className="block space-y-1">
        <span className="text-sm">Motivo (opcional)</span>
        <textarea
          className="field min-h-20"
          placeholder="Ej. Nos falta gente esa hora."
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
